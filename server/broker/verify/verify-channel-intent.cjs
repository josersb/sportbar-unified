"use strict";

/**
 * Verify — WS3 canales-dtv-intent (CD-1..CD-5).
 *
 * Sin hardware (VITE_MOCK_ARRANGER=1): monta el server contra mock en puerto
 * efímero y verifica el dominio app-only `channelIntent`:
 *
 *   A. CD-3: cambio de canal persiste {canalActual, lastSentAt, ack:"pending"},
 *      bump de versión y respuesta "cambiando al canal X".
 *   B. CD-1: ACK accepted del controlador (`send ir success`) se persiste.
 *   C. CD-1: ACK rejected se persiste (conservando canalActual/lastSentAt).
 *   D. CD-2: mismo canal vigente → noop "canal ya sintonizado", SIN emitir IR
 *      (sin bump, sin nuevo lastSentAt).
 *   E. CD-1: `reported` NUNCA se modela para canal (siempre null).
 *   F. CD-5: la intención sobrevive reload (nuevo server, mismo dbPath) y el
 *      snapshot la expone en /api/broker/state (+ versions.channelIntent).
 *   G. Validaciones: deco inválido, canal vacío, ack inválido, ack sin intención.
 *   H. Broadcast: `channelIntent` se publica por el bus (evento SSE incremental).
 *
 * Uso: node server/broker/verify/verify-channel-intent.cjs
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

/** Monta el broker con mock; devuelve { base, broker, server, tmpDir }. */
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
  // Drain de escrituras en vuelo antes de borrar el tmp (patrón confirm-settling).
  const drainStart = Date.now();
  while (broker.writeQueue.pendingCount > 0 && Date.now() - drainStart < 30_000) {
    await sleep(100);
  }
}

/** Escenarios A-D: flujo completo de intención + ACK + noop sobre DTV1/DTV2. */
async function scenarioIntentFlow(tmpDir) {
  const dbPath = path.join(tmpDir, "state-flow.json");
  const { base, broker, server } = await startServer(dbPath);
  try {
    // Espía del bus para el broadcast (H) — después del scan de arranque.
    const scanStart = Date.now();
    while (broker.reconciler.isScanning() && Date.now() - scanStart < 5000) await sleep(50);
    const publishes = [];
    const origPublish = broker.bus.publish.bind(broker.bus);
    broker.bus.publish = (domain, ...rest) => {
      publishes.push(domain);
      return origPublish(domain, ...rest);
    };

    console.log("\n── Escenario A: cambio de canal → intención pending (CD-3) ──");
    const v0 = broker.store.getDomain("channelIntent").version;
    const res = await postJson(`${base}/api/decos/DTV1/channel`, { canal: "1624" });
    const body = await res.json();
    check(`[A] POST → 200 ok`, res.status === 200 && body.ok === true);
    check(`[A] noop:false`, body.noop === false);
    check(`[A] message "cambiando al canal 1624"`, body.message === "cambiando al canal 1624");
    const entry = broker.store.getDomain("channelIntent").desired.DTV1;
    check(`[A] store canalActual=1624`, entry && entry.canalActual === "1624");
    check(`[A] store ack="pending"`, entry && entry.ack === "pending");
    check(`[A] lastSentAt ISO presente`, entry && typeof entry.lastSentAt === "string" && !Number.isNaN(Date.parse(entry.lastSentAt)));
    check(`[A] versión bumpada (${broker.store.getDomain("channelIntent").version} > ${v0})`, broker.store.getDomain("channelIntent").version > v0);
    check(`[H] broadcast channelIntent publicado`, publishes.includes("channelIntent"));

    console.log("\n── Escenario B: ACK accepted (CD-1, send ir success) ──");
    const v1 = broker.store.getDomain("channelIntent").version;
    const resAck = await postJson(`${base}/api/decos/DTV1/channel/ack`, { ack: "accepted" });
    const bodyAck = await resAck.json();
    check(`[B] POST ack → 200 ok`, resAck.status === 200 && bodyAck.ok === true);
    const entryAck = broker.store.getDomain("channelIntent").desired.DTV1;
    check(`[B] ack="accepted"`, entryAck.ack === "accepted");
    check(`[B] canalActual conservado (1624)`, entryAck.canalActual === "1624");
    check(`[B] versión bumpada`, broker.store.getDomain("channelIntent").version > v1);
    check(`[H] broadcast channelIntent publicado (ack)`, publishes.includes("channelIntent"));

    console.log("\n── Escenario C: ACK rejected (fallo del controlador) ──");
    await postJson(`${base}/api/decos/DTV2/channel`, { canal: "1603" });
    const resRej = await postJson(`${base}/api/decos/DTV2/channel/ack`, { ack: "rejected" });
    const bodyRej = await resRej.json();
    check(`[C] POST ack rejected → 200 ok`, resRej.status === 200 && bodyRej.ok === true);
    const entryRej = broker.store.getDomain("channelIntent").desired.DTV2;
    check(`[C] ack="rejected"`, entryRej.ack === "rejected");
    check(`[C] canalActual conservado (1603)`, entryRej.canalActual === "1603");
    check(`[C] lastSentAt conservado`, typeof entryRej.lastSentAt === "string");

    console.log("\n── Escenario D: mismo canal vigente → noop sin IR (CD-2) ──");
    const before = broker.store.getDomain("channelIntent").desired.DTV1;
    const vBefore = broker.store.getDomain("channelIntent").version;
    const resNoop = await postJson(`${base}/api/decos/DTV1/channel`, { canal: "1624" });
    const bodyNoop = await resNoop.json();
    check(`[D] POST → 200 ok`, resNoop.status === 200 && bodyNoop.ok === true);
    check(`[D] noop:true`, bodyNoop.noop === true);
    check(`[D] reason "canal ya sintonizado"`, bodyNoop.reason === "canal ya sintonizado");
    check(`[D] versión SIN bump`, broker.store.getDomain("channelIntent").version === vBefore);
    const after = broker.store.getDomain("channelIntent").desired.DTV1;
    check(`[D] lastSentAt intacto (no se reenvió)`, after.lastSentAt === before.lastSentAt);

    console.log("\n── Escenario E: reported de canal NUNCA se modela (CD-1) ──");
    check(`[E] channelIntent.reported === null`, broker.store.getDomain("channelIntent").reported === null);
    const snap = broker.store.getSnapshot();
    check(`[E] snapshot channelIntent.reported === null`, snap.domains.channelIntent.reported === null);

    console.log("\n── Escenario F1: snapshot expone la intención (CD-5, 2º cliente) ──");
    const resState = await fetch(`${base}/api/broker/state`);
    const stateBody = await resState.json();
    check(`[F1] /api/broker/state trae channelIntent`, !!(stateBody.domains && stateBody.domains.channelIntent));
    check(
      `[F1] state DTV1.canalActual=1624`,
      stateBody.domains.channelIntent && stateBody.domains.channelIntent.desired.DTV1 && stateBody.domains.channelIntent.desired.DTV1.canalActual === "1624",
    );
    check(`[F1] versions.channelIntent presente`, typeof stateBody.versions.channelIntent === "number");

    // F2: sobrevive reload — mismo dbPath, server nuevo.
    await stopServer(server, broker);
    const second = await startServer(dbPath);
    try {
      const reloaded = second.broker.store.getDomain("channelIntent").desired.DTV1;
      check(`[F2] reload: intención persistida (DTV1=1624)`, reloaded && reloaded.canalActual === "1624");
      check(`[F2] reload: ack conservado ("accepted")`, reloaded && reloaded.ack === "accepted");
      const resState2 = await fetch(`${second.base}/api/broker/state`);
      const state2 = await resState2.json();
      check(
        `[F2] 2º server expone la intención en el snapshot`,
        !!(state2.domains.channelIntent && state2.domains.channelIntent.desired.DTV1 && state2.domains.channelIntent.desired.DTV1.canalActual === "1624"),
      );
    } finally {
      await stopServer(second.server, second.broker);
    }
  } finally {
    // Si un check intermedio falló y no pasamos por F2, asegurar el cierre.
    if (server.listening) await stopServer(server, broker);
  }
}

/** Escenario G: validaciones de entrada. */
async function scenarioValidations(tmpDir) {
  console.log("\n── Escenario G: validaciones de entrada ──");
  const dbPath = path.join(tmpDir, "state-validations.json");
  const { base, broker, server } = await startServer(dbPath);
  try {
    const resBadDeco = await postJson(`${base}/api/decos/DTV9/channel`, { canal: "1603" });
    check(`[G] deco inválido (DTV9) → 400`, resBadDeco.status === 400);
    const resNoCanal = await postJson(`${base}/api/decos/DTV1/channel`, {});
    check(`[G] canal vacío → 400`, resNoCanal.status === 400);
    const resBadAck = await postJson(`${base}/api/decos/DTV1/channel/ack`, { ack: "maybe" });
    check(`[G] ack inválido → 400`, resBadAck.status === 400);
    const resOrphanAck = await postJson(`${base}/api/decos/DTV3/channel/ack`, { ack: "accepted" });
    check(`[G] ack sin intención previa → 404`, resOrphanAck.status === 404);
    check(`[G] store sin entradas basura`, Object.keys(broker.store.getDomain("channelIntent").desired).length === 0);
  } finally {
    await stopServer(server, broker);
  }
}

(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sbr-channel-intent-"));
  try {
    await scenarioIntentFlow(tmpDir);
    await scenarioValidations(tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const failed = checks.filter((c) => !c.ok).length;
  console.log(
    `\n${failed === 0 ? "✓ CHANNEL-INTENT OK (CD-1..CD-5: intención+ACK, noop sin IR, reported null, reload, snapshot)" : `✗ ${failed} chequeos fallaron`}`,
  );
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALLO:", e);
  process.exit(1);
});
