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
 *   - collapseGroup (inverso de la expansión de MatrizVideo)
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
  GROUP_DEFS,
} from "../brokerClientCore.js";

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

// ── 10. collapseGroup ──
{
  const tvs = {
    TV01: "DTV1", TV02: "DTV2", TV03: "DTV3",
    TV04: "DTV5", TV05: "DTV4", TV06: "DTV3", TV07: "DTV2",
    TV15: "DTV1", TV16: "DTV2", TV17: "DTV3", TV18: "DTV4",
    TV23: "DTV7",
  };
  check("collapse: patrón DTV123 (3 TVs)", collapseGroup(tvs, GROUP_DEFS.TvsBarraLivertador) === "DTV123");
  check("collapse: patrón DTV5432 (4 TVs)", collapseGroup(tvs, GROUP_DEFS.TvsBarraSur) === "DTV5432");
  check("collapse: patrón DTV1234 (escalera sur)", collapseGroup(tvs, GROUP_DEFS.TvsEscaleraSur) === "DTV1234");
  check("collapse: TVs faltantes → undefined", collapseGroup(tvs, GROUP_DEFS.TvsEscaleraNorte) === undefined);
  check("collapse: todos iguales → valor único", collapseGroup({ TV08: "DTV2", TV09: "DTV2", TV10: "DTV2" }, GROUP_DEFS.TvsBarraPista) === "DTV2");
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} verificaciones OK`);
if (failed > 0) process.exit(1);
