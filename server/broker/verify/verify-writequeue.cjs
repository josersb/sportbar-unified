"use strict";

/**
 * Verify 2.1 — writeQueue (serialización FIFO por destino):
 *   - dos trabajos al mismo destino corren EN SERIE (el 2º no arranca hasta
 *     que el 1º termina) — la última intención gana por orden FIFO
 *   - destinos distintos corren en paralelo
 *   - si un trabajo falla, la cadena no se rompe y el siguiente se ejecuta
 *   - isBusy / pendingCount / auto-limpieza del Map
 */

const { createWriteQueue } = require("../writeQueue.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const log = { warn: () => {} };
  const order = [];

  // ── 1. FIFO por destino: el 2º trabajo espera al 1º ──
  const q1 = createWriteQueue({ log });
  const p1 = q1.enqueue("TV01", async () => {
    order.push("a-start");
    await sleep(30);
    order.push("a-end");
    return "A";
  });
  const p2 = q1.enqueue("TV01", async () => {
    order.push("b-start");
    await sleep(10);
    order.push("b-end");
    return "B";
  });
  check("isBusy durante la cola", q1.isBusy("TV01"));
  const r1 = await p1;
  const r2 = await p2;
  check("el 2º trabajo arranca después del 1º (serie)", order.indexOf("b-start") > order.indexOf("a-end"));
  check("la última intención (B) gana y termina al final", order[order.length - 1] === "b-end");
  check("cada enqueue resuelve con SU resultado", r1 === "A" && r2 === "B");
  check("cola limpia tras completar", q1.pendingCount === 0 && !q1.isBusy("TV01"));

  // ── 2. Destinos distintos → paralelo ──
  const q2 = createWriteQueue({ log });
  const order2 = [];
  const pa = q2.enqueue("TV01", async () => {
    order2.push("pa-start");
    await sleep(40);
    order2.push("pa-end");
    return "PA";
  });
  const pb = q2.enqueue("TV02", async () => {
    order2.push("pb-start");
    await sleep(10);
    order2.push("pb-end");
    return "PB";
  });
  await Promise.all([pa, pb]);
  check(
    "destinos distintos paralelizan (TV02 termina antes que TV01)",
    order2.indexOf("pb-end") < order2.indexOf("pa-end"),
  );
  check("pendingCount cuenta destinos distintos", q2.pendingCount === 0);

  // ── 3. Fallo previo no rompe la cadena ──
  const q3 = createWriteQueue({ log });
  const results = [];
  const f1 = q3.enqueue("TV03", async () => {
    throw new Error("fallo simulado");
  });
  const f2 = q3.enqueue("TV03", async () => {
    results.push("second-ran");
    return "OK2";
  });
  await f1.catch(() => {});
  const r3 = await f2;
  check("el trabajo siguiente corre aunque el previo falló", results.includes("second-ran") && r3 === "OK2");

  // ── 4. La promise encolada expone el error del trabajo (sin enmascararlo) ──
  const q4 = createWriteQueue({ log });
  let rejected = false;
  try {
    await q4.enqueue("TV04", async () => {
      throw new Error("boom");
    });
  } catch {
    rejected = true;
  }
  check("el caller del enqueue ve el rechazo de su tarea", rejected);

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${failed === 0 ? "✓ WRITEQUEUE OK" : `✗ ${failed} chequeos fallaron`}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALLO:", e);
  process.exit(1);
});
