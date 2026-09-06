"use strict";

/**
 * Verify (hotfix 6) — semáforo global de comandos al Arranger.
 *
 * El Arranger es un dispositivo SERIAL. Este verify prueba el semáforo de
 * arrangerClient contra un transport fake (globalThis.fetch inyectado, sin
 * mock: true — el semáforo solo aplica al camino del hardware real):
 *
 *   a) N comandos concurrentes → el transport recibe los comandos
 *      SERIALIZADOS (uno a la vez, sin overlap).
 *   b) El orden de salida respeta el orden de llegada a la cola (FIFO).
 *   c) Un comando que cuelga NO bloquea para siempre: el watchdog libera el
 *      turno tras semaphoreTimeoutMs y la cola sigue avanzando.
 *   d) Con 29 comandos, el tiempo total ≈ suma serial (sin overlap) — un
 *      batch real de "Enviar" tarda la suma, no el máximo.
 *
 * Uso: node server/broker/verify/verify-semaphore.cjs
 */

const { createArrangerClient } = require("../arrangerClient.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Instala un fetch fake que resuelve tras `delayMs` y registra overlap. */
function installFakeFetch(delayMs = 60) {
  const state = {
    active: 0,
    maxActive: 0,
    calls: [], // { url, startedAt, finishedAt }
    hangUrls: new Set(), // URLs que NUNCA resuelven (cuelgan)
  };
  globalThis.fetch = async (url) => {
    state.active += 1;
    state.maxActive = Math.max(state.maxActive, state.active);
    const startedAt = Date.now();
    const call = { url, startedAt, finishedAt: null };
    state.calls.push(call);
    if (state.hangUrls.has(url)) {
      // Cuelga para siempre (el watchdog debe liberar el turno).
      return new Promise(() => {});
    }
    await sleep(delayMs);
    state.active -= 1;
    call.finishedAt = Date.now();
    return {
      ok: true,
      status: 200,
      text: async () => `join av success ${url}`,
    };
  };
  return state;
}

(async () => {
  const realFetch = globalThis.fetch;

  // ── a) + b) 10 comandos concurrentes → serializados, FIFO ──
  {
    const fake = installFakeFetch(60);
    const client = createArrangerClient({
      mock: false,
      baseUrl: "http://fake-arranger",
      token: "verify-token",
      retries: 1,
    });

    const dests = ["TV01", "TV02", "TV03", "TV04", "TV05", "TV06", "TV07", "TV08", "TV09", "TV10"];
    const t0 = Date.now();
    await Promise.all(dests.map((d) => client.joinAv("DTV1", d, `w-${d}`)));
    const totalMs = Date.now() - t0;

    check("a) 10 joins concurrentes → serializados (max 1 in-flight)", fake.maxActive === 1);
    check("b) orden de salida = orden de llegada (FIFO)", fake.calls.every((c, i) => c.url.includes(encodeURIComponent(`join av DTV1 ${dests[i]}`))));
    // Suma serial: 10 × 60ms = ~600ms; sin serialización sería ~60ms.
    check("a) tiempo total ≈ suma serial (≥ 9 × delay)", totalMs >= 9 * 60);
    const stats = client.getSemaphoreStats();
    check("a) semáforo drenado tras el batch (inFlight 0, waiting 0)", stats.inFlight === 0 && stats.waiting === 0 && stats.maxConcurrent === 1);
  }

  // ── c) comando colgado: watchdog libera el turno ──
  {
    const fake = installFakeFetch(30);
    const client = createArrangerClient({
      mock: false,
      baseUrl: "http://fake-arranger",
      token: "verify-token",
      retries: 1,
      semaphoreTimeoutMs: 120, // watchdog corto para el verify
    });

    // El primer comando cuelga (su URL nunca resuelve).
    const hangUrl = `http://fake-arranger/api/command/${encodeURIComponent("join av DTV1 TV01")}/${encodeURIComponent("verify-token")}`;
    fake.hangUrls.add(hangUrl);

    const p1 = client.joinAv("DTV1", "TV01", "w-hang");
    await sleep(10); // p1 tomó el turno
    const p2 = client.joinAv("DTV2", "TV02", "w-next");

    // p1 debe RECHAZAR por el watchdog (~120ms) y p2 completar después.
    let p1rejected = false;
    let p1error = null;
    await p1.catch((e) => { p1rejected = true; p1error = e.message; });
    const r2 = await p2;

    check("c) comando colgado rechaza por el watchdog (turno liberado)", p1rejected && /excedió.*turno liberado por watchdog/.test(p1error));
    check("c) el comando siguiente completa tras el watchdog (cola avanza)", r2.ok === true);
    const stats = client.getSemaphoreStats();
    check("c) semáforo drenado tras watchdog (inFlight 0, waiting 0)", stats.inFlight === 0 && stats.waiting === 0);
  }

  // ── d) 29 comandos (batch real) → suma serial sin overlap ──
  {
    const fake = installFakeFetch(25);
    const client = createArrangerClient({
      mock: false,
      baseUrl: "http://fake-arranger",
      token: "verify-token",
      retries: 1,
    });

    // Orden del batch hotfix 6: VWN/VWC/VWS + TV01..TV26 (matriz de video).
    const dests = ["VWN", "VWC", "VWS", "TV01", "TV02", "TV03", "TV04", "TV05", "TV06", "TV07",
      "TV08", "TV09", "TV10", "TV11", "TV12", "TV13", "TV14", "TV15", "TV16", "TV17",
      "TV18", "TV19", "TV20", "TV21", "TV22", "TV23", "TV24", "TV25", "TV26"];
    const t0 = Date.now();
    await Promise.all(dests.map((d) => client.joinAv("DTV1", d)));
    const totalMs = Date.now() - t0;

    check("d) batch de 29: 29 comandos llegaron al transport", fake.calls.length === 29);
    check("d) batch de 29 serializado (max 1 in-flight)", fake.maxActive === 1);
    // 29 × 25ms = 725ms mínimo serial; paralelo habría sido ~25-50ms.
    check("d) batch de 29: tiempo total ≈ suma serial (≥ 28 × delay)", totalMs >= 28 * 25);
  }

  // ── e) ARRANGER_MAX_CONCURRENT configurable (>1 permite paralelismo) ──
  {
    const fake = installFakeFetch(50);
    process.env.ARRANGER_MAX_CONCURRENT = "2";
    const client = createArrangerClient({
      mock: false,
      baseUrl: "http://fake-arranger",
      token: "verify-token",
      retries: 1,
    });
    delete process.env.ARRANGER_MAX_CONCURRENT;

    await Promise.all(["TV01", "TV02", "TV03", "TV04"].map((d) => client.joinAv("DTV1", d)));
    check("e) ARRANGER_MAX_CONCURRENT=2 → hasta 2 in-flight (sin congestionar)", fake.maxActive === 2);
    const stats = client.getSemaphoreStats();
    check("e) stats expone maxConcurrent configurado", stats.maxConcurrent === 2);
  }

  // ── f) mock NO pasa por el semáforo (determinista, sin hardware) ──
  {
    globalThis.fetch = realFetch;
    const client = createArrangerClient({ mock: true, mockMode: "normal" });
    const r = await client.joinAv("DTV3", "TV01");
    const stats = client.getSemaphoreStats();
    check("f) mock: joinAv ok SIN pasar por el semáforo", r.ok === true && stats.inFlight === 0 && stats.waiting === 0);
  }

  globalThis.fetch = realFetch;
  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${failed === 0 ? "✓ verify-semaphore OK" : `✗ ${failed} check(s) fallaron`}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error("FALLO:", e); process.exit(1); });
