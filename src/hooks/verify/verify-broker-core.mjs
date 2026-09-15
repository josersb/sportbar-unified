"use strict";

/**
 * Verify 3.1 — brokerClientCore (lógica pura del cliente broker, sin DOM):
 *   - parser SSE incremental (snapshot/state/sync/heartbeat)
 *   - buildSinceQuery para polling versionado
 *   - applySnapshot / applyStateEvent / applySync / applyPollBody
 *   - applyOptimistic: merge por clave + limpieza por confirmación (hotfix 4)
 *   - nextPollDelay (5s → 10s → 20s → 30s cap)
 *   - deriveUiState (reported gana, link app-only, TVRACK desde dominio)
 *   - buildDiffsInfo (solo reported confirmado)
 *   - collapseGroup / expandFromModel (derivados del matrixModel SERVIDO)
 *   - matrixModel (helpers del modelo declarativo del server, T-4a.4)
 *   - WS4c: preservación de matrixModel en snapshot/poll, dominio
 *     matrixGroups (desired), exposición por deriveUiState, API setMatrixGroups
 *
 * Uso: node src/hooks/verify/verify-broker-core.mjs
 */

import {
  createSseParser,
  buildSinceQuery,
  applySnapshot,
  applyStateEvent,
  applySync,
  applyPollBody,
  applyOptimistic,
  revertOptimistic,
  writeErrorMessage,
  nextPollDelay,
  deriveUiState,
  buildDiffsInfo,
  collapseGroup,
  expandFromModel,
} from "../brokerClientCore.js";
import { TV_GROUPS, GROUP_ORDER, sortTvsByGroup } from "../../data/tvGroups.js";
// matrixModel (WS4a) es CJS del server: el verify ESM lo importa por interop
// default (module.exports) — el cliente lo recibe SERVIDO, nunca lo duplica.
import matrixModel from "../../../server/broker/matrixModel.js";
const MODEL = matrixModel.MATRIX_MODEL;

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

// ── 1. Parser SSE ──
{
  const events = [];
  let heartbeats = 0;
  let retryMs = null;
  const parser = createSseParser({
    onEvent: (name, data) => events.push({ name, data: JSON.parse(data) }),
    onHeartbeat: () => { heartbeats += 1; },
    onRetry: (ms) => { retryMs = ms; },
  });

  parser.push("retry: 3000\n\n");
  parser.push(": heartbeat 12345\n\n");
  parser.push("event: snapshot\ndata: {\"schemaVersion\":3,\"sync\":{\"status\":\"stale\"}}\n\n");
  parser.push("event: state\ndata: {\"domain\":\"tvs\",\"payload\":{\"TV01\":\"DTV3\"},\"version\":5}\n\n");
  parser.push("event: sync\ndata: {\"status\":\"synced\",\"lastSync\":\"2026-08-14T00:00:00Z\"}\n\n");
  parser.close();

  check("SSE: retry 3000 parseado", retryMs === 3000);
  check("SSE: heartbeat comentario detectado", heartbeats === 1);
  check("SSE: 3 eventos (snapshot/state/sync)", events.length === 3);
  check("SSE: snapshot con schemaVersion", events[0]?.name === "snapshot" && events[0]?.data?.schemaVersion === 3);
  check("SSE: state con domain tvs y version 5", events[1]?.name === "state" && events[1]?.data?.domain === "tvs" && events[1]?.data?.version === 5);
  check("SSE: sync con status synced", events[2]?.name === "sync" && events[2]?.data?.status === "synced");
}

// ── 2. buildSinceQuery ──
{
  check("since: vacío sin versiones", buildSinceQuery({}) === "");
  check("since: una versión", buildSinceQuery({ tvs: 12 }) === "tvs:12");
  check("since: varias versiones en orden", buildSinceQuery({ tvs: 12, zonasFuera: 3 }) === "tvs:12,zonasFuera:3");
  check("since: ignora versiones <= 0", buildSinceQuery({ tvs: 0 }) === "");
}

// ── 3. applySnapshot ──
{
  const snap = applySnapshot({}, {
    schemaVersion: 3,
    sync: { status: "stale", lastSync: null },
    versions: { tvs: 1 },
    domains: { tvs: { desired: { TV01: "DTV1" }, reported: {}, version: 1, lastUpdated: "x" } },
    appOnly: { tvrack: { link: false } },
  });
  check("snapshot: schemaVersion aplicado", snap.schemaVersion === 3);
  check("snapshot: dominio tvs presente", snap.domains?.tvs?.desired?.TV01 === "DTV1");
  check("snapshot: appOnly presente", snap.appOnly?.tvrack?.link === false);
}

// ── 4. applyStateEvent ──
{
  let st = applySnapshot({}, {
    schemaVersion: 3,
    sync: { status: "stale", lastSync: null },
    versions: { tvs: 1 },
    domains: { tvs: { desired: { TV01: "DTV1" }, reported: {}, version: 1, lastUpdated: "x" } },
    appOnly: {},
  });
  st = applyStateEvent(st, { domain: "tvs", payload: { TV01: "DTV3" }, version: 5, lastUpdated: "y" });
  check("state: reported reemplazado", st.domains.tvs.reported.TV01 === "DTV3");
  check("state: version actualizada", st.domains.tvs.version === 5);
  check("state: desired conservado", st.domains.tvs.desired.TV01 === "DTV1");

  // presets: payload = desired
  st = applyStateEvent(st, { domain: "presets", payload: { preset1: { tvs: {} } }, version: 2, lastUpdated: "z" });
  check("state: presets actualizan desired", st.domains.presets.desired.preset1?.tvs !== undefined);

  let linkState = applySnapshot({}, {
    schemaVersion: 3,
    domains: {
      tvrack: { desired: { video: "DTV1", audio: "DTV1" }, reported: {} },
      zonasFuera: { desired: { Z1: { video: "DTV1", audio: "DTV1" } }, reported: {} },
    },
    appOnly: { tvrack: { link: false }, zonasFuera: { Z1: { link: false } } },
  });
  linkState = applyStateEvent(linkState, {
    domain: "tvrack",
    payload: { video: "DTV2", audio: "DTV3", link: true },
    version: 2,
  });
  linkState = applyStateEvent(linkState, {
    domain: "zonasFuera",
    payload: { Z1: { video: "DTV4", audio: "DTV5", link: true } },
    version: 2,
  });
  const linkUi = deriveUiState(linkState);
  check("state: TVRACK link incremental migra a appOnly y UI", linkUi.tvrackState.link === true && linkState.domains.tvrack.reported.link === undefined);
  check("state: zona link incremental migra a appOnly y UI", linkUi.zonasFueraState.Z1.link === true && linkState.domains.zonasFuera.reported.Z1.link === undefined);

  // dominio inválido se ignora
  const before = st.domains;
  const after = applyStateEvent(st, { domain: "bogus", payload: {} });
  check("state: dominio inválido ignorado", after.domains === before);
}

// ── 4b. Optimistic overlay: merge por clave + limpieza por confirmación (hotfix 4) ──
{
  let st = applySnapshot({}, {
    schemaVersion: 3,
    sync: { status: "synced", lastSync: null },
    versions: { tvrack: 1 },
    domains: {
      tvrack: {
        desired: { video: "DTV1", audio: "DTV1" },
        reported: { video: "DTV1", audio: "DTV1" },
        version: 1,
        lastUpdated: "x",
      },
    },
    appOnly: { tvrack: { link: false } },
  });

  // MERGE por clave: video y luego link al MISMO dominio → ambas claves
  // conviven en el overlay (evidencia #908: el toggle de link NO borra el
  // optimistic pendiente del video).
  st = applyOptimistic(st, "tvrack", { video: "DTV3" });
  check("opt: apply video → overlay tvrack.video=DTV3", st.optimistic.tvrack?.video === "DTV3");
  st = applyOptimistic(st, "tvrack", { link: true });
  check(
    "opt: MERGE por clave — link no borra el video pendiente (overlay con ambas claves)",
    st.optimistic.tvrack?.video === "DTV3" && st.optimistic.tvrack?.link === true,
  );

  // Limpieza por CONFIRMACIÓN: evento con valor ≠ optimistic (stale, e.g. el
  // broadcast inmediato previo al confirm del propio write) RETIENE la
  // clave; evento con valor == optimistic (confirmación real) limpia SOLO
  // esa clave. Link (app-only autoritativo) siempre se limpia.
  st = applyStateEvent(st, { domain: "tvrack", payload: { video: "DTV1", audio: "DTV1", link: true }, version: 2, lastUpdated: "y" });
  check(
    "opt: evento stale (video DTV1 ≠ optimistic DTV3) RETIENE el video",
    st.optimistic.tvrack?.video === "DTV3",
  );
  check("opt: link confirmado se limpia del overlay (app-only autoritativo)", st.optimistic.tvrack?.link === undefined);
  check(
    "opt: ui conserva el optimistic retenido (overlay gana sobre reported stale, sin oscilación)",
    deriveUiState(st).tvrackState.video === "DTV3",
  );
  st = applyStateEvent(st, { domain: "tvrack", payload: { video: "DTV3", audio: "DTV1" }, version: 3, lastUpdated: "z" });
  check(
    "opt: confirmación real (video DTV3) limpia SOLO esa clave (overlay vacío)",
    st.optimistic.tvrack === undefined,
  );
  check("opt: reported mergeado con el evento confirmado (video DTV3)", st.domains.tvrack.reported.video === "DTV3");

  // zonasFuera: MERGE por zona + retención/cleanup por clave confirmada.
  st = applyOptimistic(st, "zonasFuera", { "aVip-Barra-Centro": { video: "DTV5" } });
  st = applyOptimistic(st, "zonasFuera", { "aVip-Barra-Centro": { link: true } });
  check(
    "opt: zonasFuera MERGE por zona (video + link conviven)",
    st.optimistic.zonasFuera?.["aVip-Barra-Centro"]?.video === "DTV5" &&
      st.optimistic.zonasFuera?.["aVip-Barra-Centro"]?.link === true,
  );
  st = applyStateEvent(st, {
    domain: "zonasFuera",
    payload: { "aVip-Barra-Centro": { video: "DTV1", audio: "DTV1", link: true } },
    version: 4,
    lastUpdated: "w",
  });
  check(
    "opt: zonasFuera evento stale RETIENE video, link se limpia",
    st.optimistic.zonasFuera?.["aVip-Barra-Centro"]?.video === "DTV5" &&
      st.optimistic.zonasFuera?.["aVip-Barra-Centro"]?.link === undefined,
  );
  st = applyStateEvent(st, {
    domain: "zonasFuera",
    payload: { "aVip-Barra-Centro": { video: "DTV5" } },
    version: 5,
    lastUpdated: "v",
  });
  check(
    "opt: zonasFuera confirmación limpia la clave (overlay de la zona vacío)",
    st.optimistic.zonasFuera?.["aVip-Barra-Centro"] === undefined,
  );
}

// ── 4c. Rollback del optimistic en write fallido (hotfix 5, evidencia #908) ──
{
  let st = applySnapshot({}, {
    schemaVersion: 3,
    sync: { status: "synced", lastSync: null },
    versions: { tvs: 1 },
    domains: {
      tvs: { desired: { TV01: "DTV1", TV02: "DTV1" }, reported: { TV01: "DTV1", TV02: "DTV1" }, version: 1, lastUpdated: "x" },
    },
    appOnly: {},
  });

  // Rollback de un apply simple: el POST 429 → la clave vuelve al estado real
  // del snapshot (overlay vacío), reported/desired intactos.
  const prev0 = {};
  st = applyOptimistic(st, "tvs", { TV01: "DTV3" });
  check("revert: apply optimistic TV01=DTV3 (overlay)", st.optimistic.tvs?.TV01 === "DTV3");
  st = revertOptimistic(st, "tvs", { TV01: "DTV3" }, prev0);
  check("revert: rollback 429 limpia la clave (overlay vacío)", st.optimistic.tvs === undefined);
  check("revert: UI vuelve al reported real (TV01=DTV1)", deriveUiState(st).tvs.TV01 === "DTV1");

  // Rollback convive con otros writes pendientes: solo la clave fallida se
  // revierte; el write pendiente de OTRA clave sobrevive.
  const prev1 = {}; // overlay vacío antes del batch
  st = applyOptimistic(st, "tvs", { TV01: "DTV4", TV02: "DTV5" });
  const prev2 = JSON.parse(JSON.stringify(st.optimistic.tvs)); // TV01/TV02 pendientes
  st = applyOptimistic(st, "tvs", { TV03: "DTV6" }); // un write más
  check(
    "revert: precondición — 3 claves pendientes en el overlay",
    st.optimistic.tvs?.TV01 === "DTV4" && st.optimistic.tvs?.TV02 === "DTV5" && st.optimistic.tvs?.TV03 === "DTV6",
  );
  // El POST de TV03 falla con 429 → revert SOLO de TV03 contra el overlay previo.
  st = revertOptimistic(st, "tvs", { TV03: "DTV6" }, prev2);
  check(
    "revert: solo la clave fallida se revierte — TV03 fuera, TV01/TV02 pendientes",
    st.optimistic.tvs?.TV03 === undefined && st.optimistic.tvs?.TV01 === "DTV4" && st.optimistic.tvs?.TV02 === "DTV5",
  );

  // Rollback restaura el valor PREVIO del overlay (no lo vacía si había otro
  // write pendiente a la misma clave).
  st = revertOptimistic(st, "tvs", { TV01: "DTV4" }, prev1);
  check(
    "revert: clave con overlay previo restaurada a ese valor (TV01 sin overlay)",
    st.optimistic.tvs?.TV01 === undefined && st.optimistic.tvs?.TV02 === "DTV5",
  );

  // tvrack: rollback de video con link pendiente — el link (otra clave) sobrevive.
  let stv = applySnapshot({}, {
    schemaVersion: 3,
    sync: { status: "synced", lastSync: null },
    versions: { tvrack: 1 },
    domains: {
      tvrack: { desired: { video: "DTV1", audio: "DTV1" }, reported: { video: "DTV1", audio: "DTV1" }, version: 1, lastUpdated: "x" },
    },
    appOnly: { tvrack: { link: false } },
  });
  const prevV = {};
  stv = applyOptimistic(stv, "tvrack", { video: "DTV3" });
  stv = applyOptimistic(stv, "tvrack", { link: true });
  check("revert: precondición tvrack — video + link pendientes", stv.optimistic.tvrack?.video === "DTV3" && stv.optimistic.tvrack?.link === true);
  stv = revertOptimistic(stv, "tvrack", { video: "DTV3" }, prevV);
  check(
    "revert: video revertido, link pendiente sobrevive",
    stv.optimistic.tvrack?.video === undefined && stv.optimistic.tvrack?.link === true,
  );
  check("revert: UI tvrack vuelve a video real DTV1", deriveUiState(stv).tvrackState.video === "DTV1");

  // zonasFuera: rollback de video de una zona — la otra zona y el link sobreviven.
  let stz = applyOptimistic(stv, "zonasFuera", { "aVip-Barra-Centro": { video: "DTV5" } });
  stz = applyOptimistic(stz, "zonasFuera", { "a-Menos1-Escenario": { video: "DTV7" } });
  const prevZ = JSON.parse(JSON.stringify(stz.optimistic.zonasFuera));
  stz = applyOptimistic(stz, "zonasFuera", { "aVip-Barra-Centro": { link: true } });
  stz = revertOptimistic(stz, "zonasFuera", { "aVip-Barra-Centro": { link: true } }, prevZ);
  check(
    "revert: zonasFuera link revertido, video pendiente de la zona + otra zona intactos",
    stz.optimistic.zonasFuera?.["aVip-Barra-Centro"]?.video === "DTV5" &&
      stz.optimistic.zonasFuera?.["aVip-Barra-Centro"]?.link === undefined &&
      stz.optimistic.zonasFuera?.["a-Menos1-Escenario"]?.video === "DTV7",
  );

  // writeErrorMessage: 429 vs 5xx vs network.
  const e429 = new Error("x"); e429.status = 429;
  const e500 = new Error("x"); e500.status = 502;
  const eNet = new Error("Failed to fetch");
  check("msg: 429 → rate limit con retry", /rate limit/i.test(writeErrorMessage(e429)) && /Reintentá/.test(writeErrorMessage(e429)));
  check("msg: 5xx → servidor no procesó", /servidor no pudo procesar/.test(writeErrorMessage(e500)) && /502/.test(writeErrorMessage(e500)));
  check("msg: network → genérico no procesada", /no fue procesada/.test(writeErrorMessage(eNet)));
  check("msg: acción opcional incluida", writeErrorMessage(e429, "VIDEO → TVRACK").includes("VIDEO → TVRACK"));
}

// ── 5. applySync ──
{
  let st = applySync({}, { status: "synced", lastSync: "2026-08-14T00:00:00Z" });
  check("sync: status aplicado", st.sync.status === "synced");
  check("sync: lastSync aplicado", st.sync.lastSync === "2026-08-14T00:00:00Z");
  st = applySync(st, { status: "bogus" });
  check("sync: status inválido ignorado", st.sync.status === "synced");
}

// ── 6. applyPollBody ──
{
  let st = applySnapshot({}, {
    schemaVersion: 3,
    sync: { status: "stale", lastSync: null },
    versions: { tvs: 1, zonasFuera: 1 },
    domains: { tvs: { desired: { TV01: "DTV1" }, reported: {}, version: 1, lastUpdated: "x" } },
    appOnly: {},
  });
  st = applyPollBody(st, {
    sync: { status: "synced", lastSync: "t" },
    versions: { tvs: 2 },
    domains: { tvs: { desired: { TV01: "DTV1" }, reported: { TV01: "DTV2" }, version: 2, lastUpdated: "y" } },
  });
  check("poll: dominios del body mergeados", st.domains.tvs.reported.TV01 === "DTV2");
  check("poll: sync actualizado", st.sync.status === "synced");
  check("poll: versiones actualizadas", st.versions.tvs === 2);
}

// ── 7. nextPollDelay (5s → 30s cap) ──
{
  check("backoff: intento 0 → 5s", nextPollDelay(0) === 5000);
  check("backoff: intento 1 → 10s", nextPollDelay(1) === 10000);
  check("backoff: intento 2 → 20s", nextPollDelay(2) === 20000);
  check("backoff: intento 3 → 30s (cap)", nextPollDelay(3) === 30000);
  check("backoff: intento 10 → 30s (cap)", nextPollDelay(10) === 30000);
}

// ── 8. deriveUiState ──
{
  const ui = deriveUiState({
    domains: {
      tvs: { desired: { TV01: "DTV1" }, reported: { TV01: "DTV3" } },
      tvrack: { desired: { video: "DTV1", audio: "DTV1" }, reported: { video: "DTV2", audio: null } },
      zonasFuera: { desired: { Z1: { video: "DTV1", audio: "DTV1" } }, reported: { Z1: { video: "DTV4", audio: null } } },
    },
    appOnly: { tvrack: { link: true }, zonasFuera: { Z1: { link: false } } },
  });
  check("ui: reported gana en tvs", ui.tvs.TV01 === "DTV3");
  check("ui: tvrack video reported, audio fallback desired", ui.tvrackState.video === "DTV2" && ui.tvrackState.audio === "DTV1");
  check("ui: tvrack link desde appOnly", ui.tvrackState.link === true);
  check("ui: zona video reported, audio fallback desired", ui.zonasFueraState.Z1.video === "DTV4" && ui.zonasFueraState.Z1.audio === "DTV1");
  check("ui: zona link desde appOnly", ui.zonasFueraState.Z1.link === false);
}

// ── 9. buildDiffsInfo ──
{
  const diffs = buildDiffsInfo({
    domains: {
      tvs: { desired: { TV01: "DTV1", TV02: "DTV2" }, reported: { TV01: "DTV3", TV02: "DTV2" } },
      tvrack: { desired: { video: "DTV1" }, reported: { video: "DTV2" } },
      zonasFuera: { desired: { Z1: { video: "DTV1" } }, reported: { Z1: { video: "DTV5" } } },
    },
  });
  check("diffs: TV01 en diff (reported≠desired)", diffs.some((d) => d.dest === "TV01"));
  check("diffs: TV02 sin diff (iguales)", !diffs.some((d) => d.dest === "TV02"));
  check("diffs: tvrack-video en diff", diffs.some((d) => d.type === "tvrack-video"));
  check("diffs: zona-video en diff", diffs.some((d) => d.type === "zona-video"));
}

// ── 10. collapseGroup (WS4c: derivado del matrixModel SERVIDO) ──
{
  const combosBySize = MODEL.combosBySize;
  const screensOf = (key) => {
    for (const zone of MODEL.zones) {
      const sg = zone.subgroups.find((s) => s.key === key);
      if (sg) return sg.screens;
    }
    return null;
  };
  const tvs = {
    TV01: "DTV1", TV02: "DTV2", TV03: "DTV3",
    TV04: "DTV5", TV05: "DTV4", TV06: "DTV3", TV07: "DTV2",
    TV15: "DTV1", TV16: "DTV2", TV17: "DTV3", TV18: "DTV4",
    TV23: "DTV7",
  };
  check("collapse: patrón DTV123 (barra libertador, 3 TVs)", collapseGroup(tvs, screensOf("TvsBarraLibertador"), combosBySize) === "DTV123");
  check("collapse: patrón DTV5432 (barra sur, 4 TVs)", collapseGroup(tvs, screensOf("TvsBarraSur"), combosBySize) === "DTV5432");
  check("collapse: patrón DTV1234 (escalera sur)", collapseGroup(tvs, screensOf("TvsEscaleraSur"), combosBySize) === "DTV1234");
  check("collapse: TVs faltantes → undefined", collapseGroup(tvs, screensOf("TvsEscaleraNorte"), combosBySize) === undefined);
  check("collapse: todos iguales → valor único", collapseGroup({ TV08: "DTV2", TV09: "DTV2", TV10: "DTV2" }, screensOf("TvsBarraPista"), combosBySize) === "DTV2");
  // MG-6: mezcla sin patrón conocido → null ("Mixto / Personalizado"), nunca values[0]
  check("collapse: mixto → null (MG-6, nunca values[0])", collapseGroup({ TV01: "DTV1", TV02: "DTV4", TV03: "DTV5" }, screensOf("TvsBarraLibertador"), combosBySize) === null);
  check("collapse: sin combosBySize sigue colapsando el valor único", collapseGroup({ TV01: "DTV1", TV02: "DTV1", TV03: "DTV1" }, screensOf("TvsBarraLibertador")) === "DTV1");
  check("collapse: screens fuera del modelo → undefined (degradación segura)", collapseGroup(tvs, screensOf("NoExiste"), combosBySize) === undefined);
}

// ── 11. sortTvsByGroup (hotfix 6: orden de batch por grupos físicos) ──
{
  // Batch desordenado (orden TV01..TV26 + VW al final, como llega del form).
  const dests = [
    "TV01", "TV04", "TV23", "VWS", "VWN", "TV15", "TV11", "TV08", "TV19",
    "VWC", "TV02", "TV05", "TV24", "TV16", "TV12", "TV09", "TV20",
    "TV03", "TV06", "TV25", "TV17", "TV13", "TV10", "TV21",
    "TV07", "TV26", "TV18", "TV14", "TV22",
  ];
  const sorted = sortTvsByGroup(dests);
  // Video wall primero (VWN, VWC, VWS — orden interno del grupo), escaleras
  // norte (TV23-26), escaleras centro (TV19-22), escaleras sur (TV15-18),
  // barra libertador (TV01-03), barra sur (TV04-07), barra pista (TV08-10),
  // barra norte (TV11-14).
  const expected = [
    "VWN", "VWC", "VWS",
    "TV23", "TV24", "TV25", "TV26",
    "TV19", "TV20", "TV21", "TV22",
    "TV15", "TV16", "TV17", "TV18",
    "TV01", "TV02", "TV03",
    "TV04", "TV05", "TV06", "TV07",
    "TV08", "TV09", "TV10",
    "TV11", "TV12", "TV13", "TV14",
  ];
  check("sort: 29 destinos → 29 (sin perder ninguno)", sorted.length === dests.length);
  check("sort: orden exacto por grupos físicos (video-wall primero)", JSON.stringify(sorted) === JSON.stringify(expected));
  check("sort: no muta el array original", dests[0] === "TV01" && dests[3] === "VWS");
  // Destinos sin grupo al final, orden estable.
  const withUnknown = sortTvsByGroup(["TVRACK", "TV05", "aVip-Barra-Centro", "TV01"]);
  check(
    "sort: destinos sin grupo al final (orden estable)",
    withUnknown[0] === "TV01" && withUnknown[1] === "TV05" && withUnknown[2] === "TVRACK" && withUnknown[3] === "aVip-Barra-Centro",
  );
  // Sincronización con el server: TV_GROUPS del cliente ≡ DEST_GROUPS del
  // server (misma estructura de grupos, nomenclatura VW distinta por diseño).
  check(
    "sort: sincronizado con server (mismos grupos y TVs numéricas)",
    GROUP_ORDER.length === 8 &&
      TV_GROUPS["escaleras-norte"].join(",") === "TV23,TV24,TV25,TV26" &&
      TV_GROUPS["barra-libertador"].join(",") === "TV01,TV02,TV03",
  );
}

// ── 12. CANAL_ALLOWLIST (WS2, spec canales-favoritos CF-1) ──
// canalesFavoritos.js importa imágenes (svg/png) que Node puro no resuelve,
// así que el contrato se verifica leyendo el source y extrayendo los canales.
import { readFileSync } from "node:fs";
{
  const src = readFileSync(new URL("../../data/canalesFavoritos.js", import.meta.url), "utf8");
  const canales = [...src.matchAll(/canal:\s*"([^"]+)"/g)].map((m) => m[1]);
  const allowlist = new Set(canales);
  check("allowlist: 21 canales en la grilla (sin duplicados)", canales.length === 21 && allowlist.size === 21);
  check("allowlist: 1624 presente (fix del drift que lo rechazaba)", allowlist.has("1624"));
  check("allowlist: exporta CANAL_ALLOWLIST derivado de la grilla", /export const CANAL_ALLOWLIST\s*=\s*new Set\(CANALES_FAVORITOS\.map/.test(src));
  check("allowlist: exporta reconcileFavoritos (CF-3)", /export function reconcileFavoritos/.test(src));
  // Canales.jsx ya no valida contra estado.favoritos ni contra el rango 100–2000
  const canalesSrc = readFileSync(new URL("../../componentes/Canales.jsx", import.meta.url), "utf8");
  check("allowlist: Canales valida contra CANAL_ALLOWLIST", canalesSrc.includes("CANAL_ALLOWLIST.has(canal)"));
  check("allowlist: Canales sin drift de favoritos (no lee estado.favoritos)", !canalesSrc.includes("estado.favoritos"));
}

// ── 13. matrixModel servido por el server (WS4a T-4a.4, read-only) ──
// El cliente consume el modelo que el broker sirve como snapshot top-level:
// acá se verifican sus helpers y el contrato MG-3/MG-4/MG-5/MG-7.
{
  check("model: 3 zonas (MG-3)", Array.isArray(MODEL.zones) && MODEL.zones.length === 3);
  const subgroups = MODEL.zones.flatMap((z) => z.subgroups);
  check("model: 10 subgrupos (MG-3)", subgroups.length === 10);
  const allScreens = subgroups.flatMap((sg) => sg.screens);
  check(
    "model: 29 pantallas canónicas sin solapamiento (MG-3)",
    allScreens.length === 29 && new Set(allScreens).size === 29,
  );
  check(
    "model: dir es etiqueta y Libertador está bien escrito (MG-7)",
    subgroups.find((sg) => sg.key === "TvsBarraLibertador")?.dir === "Libertador" &&
      !subgroups.some((sg) => sg.dir === "Livertador"),
  );
  check(
    "model: VWN/VWC/VWS subgrupos de 1 pantalla en matrixGroups (reencuadre WS4)",
    ["VWN", "VWC", "VWS"].every((k) => matrixModel.findSubgroup(k)?.screens.length === 1),
  );
  check(
    "model: combosBySize 3→5 y 4→6",
    MODEL.combosBySize[3]?.length === 5 && MODEL.combosBySize[4]?.length === 6,
  );
  check(
    "model: optionsFor(1) = solo DTV1..DTV8 (tamaño sin combos)",
    JSON.stringify(matrixModel.optionsFor(1)) === JSON.stringify(["DTV1", "DTV2", "DTV3", "DTV4", "DTV5", "DTV6", "DTV7", "DTV8"]),
  );
  check("model: optionsFor(3) = 8 fuentes + 5 combos (MG-5)", matrixModel.optionsFor(3).length === 13);
  check("model: optionsFor(4) = 8 fuentes + 6 combos (MG-5)", matrixModel.optionsFor(4).length === 14);
  check(
    "model: findSubgroup + screensOf (por key y por objeto)",
    JSON.stringify(matrixModel.screensOf("TvsBarraLibertador")) === JSON.stringify(["TV01", "TV02", "TV03"]) &&
      matrixModel.screensOf(matrixModel.findSubgroup("VWN"))?.[0] === "VWN",
  );
  check(
    "model: decodeCombo por posición, malformado → null",
    JSON.stringify(matrixModel.decodeCombo("DTV123")) === JSON.stringify(["DTV1", "DTV2", "DTV3"]) &&
      matrixModel.decodeCombo("DTV12x") === null &&
      matrixModel.decodeCombo("no-combo") === null,
  );
}

// ── 14. WS4c: plumbing cliente de matrixModel/matrixGroups ──
{
  // applySnapshot preserva matrixModel top-level (hoy lo descartaba al
  // reconstruir el objeto — MG-4: sin modelo servido no hay opciones).
  const servedModel = { zones: [{ key: "videowall", subgroups: [] }], combosBySize: { 3: ["DTV123"] } };
  const snap = applySnapshot({}, {
    schemaVersion: 3,
    sync: { status: "synced", lastSync: null },
    versions: {},
    domains: {},
    appOnly: {},
    matrixModel: servedModel,
  });
  check("ws4c: applySnapshot preserva matrixModel top-level", snap.matrixModel === servedModel);

  const snap2 = applySnapshot(snap, {
    schemaVersion: 3,
    versions: {},
    domains: { tvs: { desired: { TV01: "DTV1" }, reported: {}, version: 2 } },
  });
  check("ws4c: snapshot sin matrixModel conserva el previo (no lo descarta)", snap2.matrixModel === servedModel);

  const snap3 = applyPollBody(snap2, {
    sync: { status: "synced", lastSync: "t" },
    versions: {},
    domains: { tvs: { desired: { TV01: "DTV2" }, reported: {}, version: 3 } },
    matrixModel: servedModel,
  });
  check("ws4c: applyPollBody preserva matrixModel del body", snap3.matrixModel === servedModel);

  // Dominio matrixGroups: evento incremental trae desired (app-only).
  let st = applySnapshot({}, {
    schemaVersion: 3,
    versions: {},
    domains: {},
    appOnly: {},
    matrixModel: servedModel,
  });
  st = applyStateEvent(st, {
    domain: "matrixGroups",
    payload: { TvsBarraLibertador: "DTV123", TvsBarraSur: null },
    version: 4,
    lastUpdated: "x",
  });
  check(
    "ws4c: evento matrixGroups mergea en desired (null mixto incluido)",
    st.domains.matrixGroups.desired.TvsBarraLibertador === "DTV123" && st.domains.matrixGroups.desired.TvsBarraSur === null,
  );
  check("ws4c: matrixGroups es app-only (reported queda vacío, MG-1)", Object.keys(st.domains.matrixGroups.reported || {}).length === 0);
  check("ws4c: matrixGroups versiona el dominio", st.domains.matrixGroups.version === 4);

  st = applyStateEvent(st, { domain: "matrixGroups", payload: { VWN: "DTV2" }, version: 5, lastUpdated: "y" });
  check(
    "ws4c: evento parcial mergea sin pisar las demás claves",
    st.domains.matrixGroups.desired.TvsBarraLibertador === "DTV123" && st.domains.matrixGroups.desired.VWN === "DTV2",
  );
  check("ws4c: evento de dominio desconocido sigue ignorado", applyStateEvent(st, { domain: "groups", payload: {} }) === st);

  // deriveUiState expone matrixGroups + matrixModel (T-4c.1).
  const ui = deriveUiState(st);
  check(
    "ws4c: deriveUiState expone matrixGroups (desired tal cual)",
    ui.matrixGroups.TvsBarraLibertador === "DTV123" && ui.matrixGroups.TvsBarraSur === null && ui.matrixGroups.VWN === "DTV2",
  );
  check("ws4c: deriveUiState expone matrixModel servido", ui.matrixModel === servedModel);
  check("ws4c: deriveUiState sin snapshot sin dominio → defaults seguros", deriveUiState({}).matrixModel === null && Object.keys(deriveUiState({}).matrixGroups).length === 0);

  // expandFromModel: expansión cliente espejo del server, desde el modelo servido
  // (la forma que viaja en el snapshot: { zones, combosBySize }).
  const expanded = expandFromModel(
    { TvsBarraLibertador: "DTV123", VWN: "DTV2", TvsBarraSur: null, TVRACK: "DTV7" },
    MODEL,
  );
  check(
    "ws4c: expandFromModel patrón por posición (TV01..03 = DTV1/2/3)",
    expanded.tvs.TV01 === "DTV1" && expanded.tvs.TV02 === "DTV2" && expanded.tvs.TV03 === "DTV3",
  );
  check("ws4c: expandFromModel fuente única a la pantalla del subgrupo", expanded.tvs.VWN === "DTV2");
  check(
    "ws4c: expandFromModel null (mixto) se omite del patch (MG-6)",
    expanded.matrixGroups.TvsBarraSur === undefined && expanded.tvs.TV04 === undefined,
  );
  check("ws4c: expandFromModel destino real no-subgrupo pasa directo", expanded.tvs.TVRACK === "DTV7");
  check(
    "ws4c: expandFromModel registra subgrupos en matrixGroups",
    expanded.matrixGroups.TvsBarraLibertador === "DTV123" && expanded.matrixGroups.VWN === "DTV2",
  );

  const rejected = expandFromModel({ TvsBarraLibertador: "DTV1234" }, MODEL);
  check(
    "ws4c: MG-5 combo de tamaño incorrecto rechazado (omitido)",
    rejected.tvs.TV01 === undefined && rejected.matrixGroups.TvsBarraLibertador === undefined,
  );
  const undeclared = expandFromModel({ TvsEscaleraSur: "DTV999" }, MODEL);
  check(
    "ws4c: combo no declarado → valor único (espejo del server, el endpoint valida MG-5)",
    undeclared.tvs.TV15 === "DTV999" && undeclared.matrixGroups.TvsEscaleraSur === "DTV999",
  );
  check("ws4c: expandFromModel sin modelo → null (degradación segura)", expandFromModel({ VWN: "DTV1" }, null) === null);
  const empty = expandFromModel(null, MODEL);
  check("ws4c: expandFromModel sin values → patch vacío", Object.keys(empty.tvs).length === 0 && Object.keys(empty.matrixGroups).length === 0);

  // Round-trip expand → collapse contra el modelo servido.
  const values = { TvsBarraLibertador: "DTV123", TvsEscaleraNorte: "DTV1234" };
  const rt = expandFromModel(values, MODEL);
  const rtScreensOf = (key) => matrixModel.findSubgroup(key)?.screens;
  check(
    "ws4c: round-trip expand→collapse (barra libertador y escalera norte)",
    collapseGroup(rt.tvs, rtScreensOf("TvsBarraLibertador"), MODEL.combosBySize) === "DTV123" &&
      collapseGroup(rt.tvs, rtScreensOf("TvsEscaleraNorte"), MODEL.combosBySize) === "DTV1234",
  );

  // El cliente no duplica el modelo (MG-4): sin literales de grupos propios.
  const coreSrc = readFileSync(new URL("../brokerClientCore.js", import.meta.url), "utf8");
  check(
    "ws4c: brokerClientCore sin GROUP_DEFS/GROUP_PATTERNS hardcodeados (MG-4)",
    !coreSrc.includes("export const GROUP_DEFS") && !coreSrc.includes("export const GROUP_PATTERNS"),
  );
  const mvSrc = readFileSync(new URL("../../componentes/MatrizVideo.jsx", import.meta.url), "utf8");
  check("ws4c: MatrizVideo sin GROUP_DEFS (colapsa del modelo servido)", !mvSrc.includes("GROUP_DEFS"));

  // API: setMatrixGroups → POST /api/matrix-groups (por parsing del source,
  // fetch no resoluble en node puro).
  const apiSrc = readFileSync(new URL("../../api/arrangerApi.js", import.meta.url), "utf8");
  check(
    "ws4c: arrangerApi exporta setMatrixGroups → POST /api/matrix-groups",
    apiSrc.includes("export async function setMatrixGroups") && apiSrc.includes('"/api/matrix-groups"'),
  );
  check("ws4c: setMatrixGroups envuelve el body como {values}", apiSrc.includes("JSON.stringify({ values })"));

  // App inyecta matrixGroups/matrixModel al contexto con precedencia server (T-4c.4).
  const appSrc = readFileSync(new URL("../../App.jsx", import.meta.url), "utf8");
  check(
    "ws4c: App deriva matrixGroups/matrixModel del snapshot y los inyecta al contexto",
    appSrc.includes("matrixGroups, matrixModel") && appSrc.includes("matrixModel,") && appSrc.includes("matrixGroups,"),
  );
}

// ── 15. WS4e: submit server-side de MatrizVideo (MG-1, un POST por submit) ──
function verifyWs4e() {
  console.log("\n── 15. WS4e — submit server-side de MatrizVideo ──");

  // Contrato funcional del merge del overlay optimista en deriveUiState:
  // el intent del submit (applyOptimistic "matrixGroups") gana sobre desired
  // hasta que el SSE lo confirma; con overlay vacío es desired tal cual.
  const st = {
    domains: { matrixGroups: { desired: { VWN: "DTV1", TvsBarraSur: null }, reported: null } },
    optimistic: { matrixGroups: { VWN: "DTV2" } },
  };
  const uiOpt = deriveUiState(st);
  check(
    "ws4e: deriveUiState overlay optimistic gana sobre desired (intent del submit)",
    uiOpt.matrixGroups.VWN === "DTV2" && uiOpt.matrixGroups.TvsBarraSur === null,
  );
  const uiClean = deriveUiState({ domains: st.domains });
  check(
    "ws4e: deriveUiState sin overlay expone desired tal cual (MG-1)",
    uiClean.matrixGroups.VWN === "DTV1" && uiClean.matrixGroups.TvsBarraSur === null,
  );

  // Contrato del submit (por parsing del source — JSX no resoluble en node puro).
  const mvSrc = readFileSync(new URL("../../componentes/MatrizVideo.jsx", import.meta.url), "utf8");
  check(
    "ws4e: submit llama setMatrixGroups (POST /api/matrix-groups)",
    mvSrc.includes("setMatrixGroups(intent)"),
  );
  check(
    "ws4e: submit sin setTvSource por TV (expansión 100% server-side)",
    !mvSrc.includes("setTvSource"),
  );
  check(
    "ws4e: submit aplica optimistic matrixGroups antes del POST",
    mvSrc.includes('applyOptimistic("matrixGroups", intent)') &&
      mvSrc.includes('getOptimisticDomain("matrixGroups")'),
  );
  check(
    "ws4e: error del POST revierte el optimistic (hotfix 5)",
    mvSrc.includes('revertOptimistic("matrixGroups", intent, prevOverlay)'),
  );
  check(
    "ws4e: grupos Mixto/Sin datos se omiten del intent (no se envían)",
    mvSrc.includes("if (isSourceValue(values[g.key])) intent[g.key] = values[g.key];"),
  );
  check(
    "ws4e: switch de expansión por grupo eliminado (~288 líneas, MG-4)",
    !mvSrc.includes("switch (values.TvsBarra"),
  );
  check(
    "ws4e: enableReinitialize presente (W-1 verify WS4d: llegada async del snapshot)",
    /<Formik[\s\S]*?enableReinitialize[\s\S]*?onSubmit=/.test(mvSrc),
  );
  check(
    "ws4e: sin batch sortTvsByGroup ni DESTINOS_TV (el server ordena la expansión)",
    !mvSrc.includes("sortTvsByGroup") && !mvSrc.includes("DESTINOS_TV"),
  );
}

verifyWs4e();

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} verificaciones OK`);
if (failed > 0) process.exit(1);
