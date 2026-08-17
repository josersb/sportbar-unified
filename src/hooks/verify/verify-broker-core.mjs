"use strict";

/**
 * Verify 3.1 — brokerClientCore (lógica pura del cliente broker, sin DOM):
 *   - parser SSE incremental (snapshot/state/sync/heartbeat)
 *   - buildSinceQuery para polling versionado
 *   - applySnapshot / applyStateEvent / applySync / applyPollBody
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
