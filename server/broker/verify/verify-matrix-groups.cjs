"use strict";

/**
 * Verify — WS4b matrix-groups (MG-1..MG-6).
 *
 * Sin hardware (mock Arranger): monta el server en puerto efímero y verifica
 * el dominio server-authoritative `matrixGroups`:
 *
 *   A. MG-1: submit válido persiste desired, expande a TVs y responde 200.
 *   B. MG-5: rechazo 400 de DTV9, combo de tamaño incorrecto, subgrupo
 *      desconocido y body malformado — sin mutar el store.
 *   C. MG-3/MG-4: snapshot /api/broker/state con `matrixModel` top-level
 *      (3 zonas / 10 subgrupos / combosBySize) + versions.matrixGroups +
 *      domains.matrixGroups (reported null).
 *   D. Broadcast: `matrixGroups` se publica por el bus (SSE incremental).
 *   E. MG-2/MG-6: preset load deriva matrixGroups server-side — mixto → null,
 *      uniforme → fuente única, patrón → combo, pantallas faltantes → null.
 *   F. Persistencia: la intención sobrevive reload (nuevo server, mismo dbPath).
 *   G. SSE: el evento `snapshot` transporta `matrixModel` + `matrixGroups`.
 *
 * Uso: node server/broker/verify/verify-matrix-groups.cjs
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.VITE_MOCK_ARRANGER = "1";
process.env.VITE_ARRANGER_TOKEN = process.env.VITE_ARRANGER_TOKEN || "verify-token";
process.env.BROKER_FILE_LOG = "0";

const { createServer } = require("../../server.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const postJson = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** Monta el broker con mock; devuelve { base, broker, server }. */
async function startServer(dbPath) {
  const { app, broker } = await createServer({
    dbPath,
    silent: true,
    mock: true,
    reconcilerIntervalMs: 3_600_000,
  });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, broker, server };
}

async function stopServer(server, broker) {
  if (typeof server.closeAllConnections === "function") server.closeAllConnections();
  server.close();
  // Drain de escrituras en vuelo antes de seguir (patrón confirm-settling).
  const drainStart = Date.now();
  while (broker.writeQueue.pendingCount > 0 && Date.now() - drainStart < 30_000) {
    await sleep(100);
  }
}

/** A+B+D: submit válido, rechazos MG-5 y broadcast. */
async function scenarioSubmit(tmpDir) {
  const dbPath = path.join(tmpDir, "state-submit.json");
  const { base, broker, server } = await startServer(dbPath);
  try {
    // Espía del bus para el broadcast (D) — después del scan de arranque.
    const scanStart = Date.now();
    while (broker.reconciler.isScanning() && Date.now() - scanStart < 5000) await sleep(50);
    const publishes = [];
    const origPublish = broker.bus.publish.bind(broker.bus);
    broker.bus.publish = (domain, ...rest) => {
      publishes.push(domain);
      return origPublish(domain, ...rest);
    };

    console.log("\n── Escenario A: submit válido → desired + expansión (MG-1/MG-4) ──");
    const v0 = broker.store.getDomain("matrixGroups").version;
    const res = await postJson(`${base}/api/matrix-groups`, {
      values: { TvsBarraLibertador: "DTV123", VWN: "DTV2", TvsEscaleraSur: "DTV5" },
    });
    const body = await res.json();
    check(`[A] POST → 200 ok`, res.status === 200 && body.ok === true && body.noop === false);
    check(`[A] respuesta values.TvsBarraLibertador="DTV123"`, body.values && body.values.TvsBarraLibertador === "DTV123");
    check(`[A] store desired persistido`, broker.store.getDomain("matrixGroups").desired.TvsBarraLibertador === "DTV123");
    check(`[A] store desired VWN="DTV2"`, broker.store.getDomain("matrixGroups").desired.VWN === "DTV2");
    check(`[A] versión bumpada (${broker.store.getDomain("matrixGroups").version} > ${v0})`, broker.store.getDomain("matrixGroups").version > v0);
    check(`[A] tvsPatch: patrón DTV123 → TV01=DTV1`, body.tvsPatch && body.tvsPatch.TV01 === "DTV1");
    check(`[A] tvsPatch: TV02=DTV2, TV03=DTV3`, body.tvsPatch.TV02 === "DTV2" && body.tvsPatch.TV03 === "DTV3");
    check(`[A] tvsPatch: VWN=DTV2 (valor único 1 pantalla)`, body.tvsPatch.VWN === "DTV2");
    check(`[A] tvsPatch: DTV5 → 4 pantallas de TvsEscaleraSur`, ["TV15", "TV16", "TV17", "TV18"].every((t) => body.tvsPatch[t] === "DTV5"));
    // Convergencia del reported en background (mock: joins instantáneos).
    let conv = false;
    for (let i = 0; i < 30 && !conv; i++) {
      const poll = await fetch(`${base}/api/broker/state`);
      const pollBody = await poll.json();
      if (pollBody.domains.tvs.desired.TV01 === "DTV1" && pollBody.domains.tvs.desired.TV15 === "DTV5") conv = true;
      else await sleep(50);
    }
    check(`[A] expansión aplicada al dominio tvs (desired TV01=DTV1, TV15=DTV5)`, conv);
    check(`[D] broadcast matrixGroups publicado`, publishes.includes("matrixGroups"));

    console.log("\n── Escenario B: rechazos MG-5 sin mutar el store ──");
    const resDtv9 = await postJson(`${base}/api/matrix-groups`, { values: { TvsBarraLibertador: "DTV9" } });
    check(`[B] DTV9 → 400`, resDtv9.status === 400);
    const resBig = await postJson(`${base}/api/matrix-groups`, { values: { TvsBarraLibertador: "DTV1234" } });
    check(`[B] combo de 4 en subgrupo de 3 → 400`, resBig.status === 400);
    const bigBody = await resBig.json();
    check(`[B] detalle del rechazo menciona el subgrupo`, bigBody.error === "valores de grupo inválidos" && Array.isArray(bigBody.details) && bigBody.details.some((d) => d.includes("TvsBarraLibertador")));
    const resSmall = await postJson(`${base}/api/matrix-groups`, { values: { TvsEscaleraNorte: "DTV123" } });
    check(`[B] combo de 3 en subgrupo de 4 → 400`, resSmall.status === 400);
    const resUnknown = await postJson(`${base}/api/matrix-groups`, { values: { TvsBarraLivertador: "DTV1" } });
    check(`[B] subgrupo desconocido (key vieja Livertador) → 400`, resUnknown.status === 400);
    const resNoValues = await postJson(`${base}/api/matrix-groups`, {});
    check(`[B] sin values → 400`, resNoValues.status === 400);
    const resBadValues = await postJson(`${base}/api/matrix-groups`, { values: "DTV1" });
    check(`[B] values no-objeto → 400`, resBadValues.status === 400);
    const resNull = await postJson(`${base}/api/matrix-groups`, { values: { VWC: null } });
    check(`[B] null explícito (mixto) aceptado`, resNull.status === 200);
    check(`[B] null persistido en desired`, broker.store.getDomain("matrixGroups").desired.VWC === null);
    const desiredNow = broker.store.getDomain("matrixGroups").desired;
    check(`[B] rechazos 400 no persistieron valores ni claves inválidas`, !Object.values(desiredNow).some((v) => v === "DTV9" || v === "DTV1234") && !("TvsBarraLivertador" in desiredNow));
    check(`[B] DTV123 de A sigue intacto tras los rechazos`, broker.store.getDomain("matrixGroups").desired.TvsBarraLibertador === "DTV123");

    console.log("\n── Escenario C: snapshot con matrixModel + versions (MG-3/MG-4) ──");
    const resState = await fetch(`${base}/api/broker/state`);
    const state = await resState.json();
    check(`[C] matrixModel top-level presente`, !!state.matrixModel && Array.isArray(state.matrixModel.zones));
    check(`[C] matrixModel: 3 zonas`, state.matrixModel && state.matrixModel.zones.length === 3);
    const subgroupCount = state.matrixModel ? state.matrixModel.zones.reduce((n, z) => n + z.subgroups.length, 0) : 0;
    check(`[C] matrixModel: 10 subgrupos`, subgroupCount === 10);
    check(`[C] matrixModel: combosBySize 3 y 4`, !!(state.matrixModel.combosBySize[3] && state.matrixModel.combosBySize[4]));
    check(`[C] versions.matrixGroups presente`, typeof state.versions.matrixGroups === "number");
    check(`[C] domains.matrixGroups presente`, !!state.domains.matrixGroups);
    check(`[C] matrixGroups.reported === null`, state.domains.matrixGroups.reported === null);

    console.log("\n── Escenario G: SSE snapshot transporta matrixModel + matrixGroups ──");
    const ctrl = new AbortController();
    const sse = await fetch(`${base}/api/stream`, { signal: ctrl.signal });
    const reader = sse.body.getReader();
    const chunk = new TextDecoder().decode((await reader.read()).value || "");
    check(`[G] snapshot SSE incluye matrixModel`, chunk.includes("matrixModel"));
    check(`[G] snapshot SSE incluye matrixGroups`, chunk.includes("matrixGroups"));
    ctrl.abort();
    await reader.cancel().catch(() => {});
  } finally {
    await stopServer(server, broker);
  }
}

/** E: preset load deriva matrixGroups server-side (MG-2/MG-6). */
async function scenarioPreset(tmpDir) {
  const dbPath = path.join(tmpDir, "state-preset.json");
  const { base, broker, server } = await startServer(dbPath);
  try {
    console.log("\n── Escenario E: preset mixed → null, uniforme → fuente, patrón → combo ──");
    // Guardar preset: Libertador mixto (DTV1/DTV4/DTV5), BarraSur uniforme
    // (DTV2), EscaleraNorte en patrón DTV1234, VideoWall ausente.
    const resSave = await postJson(`${base}/api/presets/1`, {
      tvs: {
        TV01: "DTV1", TV02: "DTV4", TV03: "DTV5",
        TV04: "DTV2", TV05: "DTV2", TV06: "DTV2", TV07: "DTV2",
        TV23: "DTV1", TV24: "DTV2", TV25: "DTV3", TV26: "DTV4",
      },
      zonasFuera: {},
      tvrack: {},
    });
    check(`[E] preset 1 guardado`, resSave.status === 200);
    const resLoad = await postJson(`${base}/api/presets/1/load`, {});
    const loadBody = await resLoad.json();
    check(`[E] preset load → 200 ok`, resLoad.status === 200 && loadBody.ok === true);
    const mg = broker.store.getDomain("matrixGroups").desired;
    check(`[E] MG-6: mixto (DTV1/DTV4/DTV5) → null, NUNCA values[0]`, mg.TvsBarraLibertador === null);
    check(`[E] uniforme (DTV2 x4) → "DTV2"`, mg.TvsBarraSur === "DTV2");
    check(`[E] patrón (DTV1,DTV2,DTV3,DTV4) → combo "DTV1234"`, mg.TvsEscaleraNorte === "DTV1234");
    check(`[E] pantallas faltantes (VideoWall) → null`, mg.VWN === null && mg.VWC === null && mg.VWS === null);
    check(`[E] subgrupos sin datos en el preset (EscaleraCentro) → null`, mg.TvsEscaleraCentro === null);
    check(`[E] derivación completa: 10 claves presentes`, Object.keys(mg).length === 10);
    check(`[E] matrixGroups.reported sigue null tras el load`, broker.store.getDomain("matrixGroups").reported === null);

    // F2: sobrevive reload — mismo dbPath, server nuevo.
    console.log("\n── Escenario F: persistencia de matrixGroups tras reload ──");
    await stopServer(server, broker);
    const second = await startServer(dbPath);
    try {
      const reloaded = second.broker.store.getDomain("matrixGroups").desired;
      check(`[F] reload: intención persistida (TvsBarraLibertador=null)`, reloaded.TvsBarraLibertador === null);
      check(`[F] reload: TvsEscaleraNorte="DTV1234"`, reloaded.TvsEscaleraNorte === "DTV1234");
      const resState2 = await fetch(`${second.base}/api/broker/state`);
      const state2 = await resState2.json();
      check(`[F] 2º server expone matrixModel + matrixGroups`, !!(state2.matrixModel && state2.domains.matrixGroups));
    } finally {
      await stopServer(second.server, second.broker);
    }
  } finally {
    if (server.listening) await stopServer(server, broker);
  }
}

(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sbr-matrix-groups-"));
  try {
    await scenarioSubmit(tmpDir);
    await scenarioPreset(tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const failed = checks.filter((c) => !c.ok).length;
  console.log(
    `\n${failed === 0 ? "✓ MATRIX-GROUPS OK (MG-1..MG-6: dominio server-authoritative, validación optionsFor, snapshot matrixModel, preset server-side, reload)" : `✗ ${failed} chequeos fallaron`}`,
  );
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALLO:", e);
  process.exit(1);
});
