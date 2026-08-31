"use strict";

/**
 * reconciler — reconciliación server-side del State Broker.
 *
 * Reemplaza el hook cliente `useArrangerReconciliation`: el server escanea la
 * matriz y auto-adopta "Arranger gana" por destino, SOLO con lectura confirmada
 * válida (null/blip nunca pisa). El cliente deja de tocar el Arranger.
 *
 * Ciclo:
 *   1. Lee get encoder de los 40 destinos en batches de 4 (video + audio,
 *      TVRACK y zonas-fuera leen audio separado).
 *   2. Actualiza `reported` con las lecturas confirmadas (null nunca pisa).
 *   3. Auto-adopta `desired ← reported` por destino (y por sub-key video/audio
 *      para tvrack y zonas-fuera) — el Arranger es la verdad.
 *   4. Emite eventos `state` por dominio al eventBus cuando hay cambios, y
 *      `sync` cuando el estado global transiciona (stale→synced, →offline, ...).
 *   5. Single-flight: un ciclo en curso ignora nuevos ciclos (no-op).
 *
 * Intervalo: `RECONCILER_INTERVAL_MS` env var (default 300000 ms = 5 min,
 * decisión post-design: el duty cycle de 60s era ~20% del Arranger).
 *
 * Estados sync (spec sync-broadcast):
 *   stale      — persistido servido sin escanear (arranque)
 *   synced     — escaneo completo sin diffs deseados≠reportados
 *   out_of_sync— quedan diffs tras el escaneo (lectura pendiente de destino)
 *   offline    — ninguna lectura confirmada en el ciclo (Arranger inalcanzable)
 */

const { MATRIX_DESTINATIONS, TVRACK_ID, ZONA_FUERA_IDS, toApp } = require("./destinations");

const DEFAULT_INTERVAL_MS = 300000; // 5 min — decisión post-design

/** Compara valores desired vs reported tolerando objetos (zonas-fuera). */
function valuesEqual(a, b) {
  if (a === b) return true;
  if (a != null && b != null && typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return String(a ?? "") === String(b ?? "");
}

/**
 * Crea el reconciler.
 * options: { client, store, bus, log, batchSize (default 4), intervalMs }
 *   client: arrangerClient (getEncoder)
 *   store:  broker store (getDomain/setDesired/setReported/setReportedAll/bumpVersion/write/setSync)
 *   bus:    eventBus (publish/publishSync) — opcional: sin bus no hay eventos
 */
function createReconciler({ client, store, bus = null, log = console, batchSize = 4, intervalMs } = {}) {
  if (!client || !store) {
    throw new Error("[reconciler] client y store son requeridos");
  }
  const resolvedInterval =
    intervalMs ?? (parseInt(process.env.RECONCILER_INTERVAL_MS || "", 10) || DEFAULT_INTERVAL_MS);

  let running = false;
  let timer = null;
  let lastStatus = null;

  /**
   * buildDiffs — primitiva desired↔reported (conservada del hook cliente,
   * spec arranger-reconciliation): lista los destinos donde desired difiere de
   * reported CONFIRMADO. Sin lectura confirmada (reported ausente) NO es diff.
   *
   * Para objetos (zonasFuera: {video, audio}) compara por SUB-STREAM: un
   * sub-stream sin lectura confirmada (ausente/null en reported) NO es diff —
   * el audio que un scan no pudo leer (blip/desconectado) no mantiene el
   * dominio en out_of_sync para siempre (fix sync-status real-hardware).
   */
  function buildDiffs(domain) {
    const d = store.getDomain(domain);
    if (!d || !d.reported) return [];
    const diffs = [];
    for (const [key, value] of Object.entries(d.desired || {})) {
      if (value == null) continue;
      const r = d.reported[key];
      if (r == null) continue; // sin lectura confirmada → no diff
      if (typeof value === "object" && typeof r === "object" && value !== null && r !== null) {
        for (const [sub, desiredSub] of Object.entries(value)) {
          if (desiredSub == null) continue;
          const reportedSub = r[sub];
          if (reportedSub == null || valuesEqual(reportedSub, desiredSub)) continue;
          diffs.push({ domain, key, sub, desired: desiredSub, reported: reportedSub });
        }
        continue;
      }
      if (valuesEqual(r, value)) continue;
      diffs.push({ domain, key, desired: value, reported: r });
    }
    return diffs;
  }

  /** Cantidad de destinos desired≠reported confirmado (para out_of_sync). */
  function countDiffs(domain) {
    return buildDiffs(domain).length;
  }

  /** Publica el dominio si su versión cambió desde `prevVersion`. */
  function publishDomain(domain, prevVersion) {
    if (!bus) return;
    const d = store.getDomain(domain);
    if (!d || d.version === prevVersion) return;
    const payload = domain === "presets" ? d.desired : d.reported || {};
    bus.publish(domain, payload, d.version, d.lastUpdated);
  }

  /**
   * Auto-adopta un dominio: reported ← lecturas confirmadas; desired ← reported
   * por destino/sub-key. Devuelve la cantidad de adopciones (desired cambiados).
   */
  function adoptDomain(domain, readings) {
    const keys = Object.keys(readings || {});
    if (keys.length === 0) return 0;
    const d = store.getDomain(domain);
    if (!d) return 0;

    const prevVersion = d.version;
    const prevReportedJson = JSON.stringify(d.reported || {});

    // reported ← lecturas confirmadas (solo si realmente cambió, para no
    // inflar versiones en escaneos sin novedades).
    if (JSON.stringify(readings) !== prevReportedJson) {
      store.setReportedAll(domain, readings); // filtra nulls; bumpVersion
    }

    // desired ← reported confirmado (Arranger gana), por sub-key en objetos.
    let adopted = 0;
    for (const [key, value] of Object.entries(readings)) {
      if (value == null) continue;
      if (domain === "zonasFuera") {
        const cur = d.desired[key] || {};
        if (value.video != null && !valuesEqual(cur.video, value.video)) {
          d.desired[key] = { ...(d.desired[key] || {}), video: value.video };
          store.bumpVersion(domain);
          adopted += 1;
          log.info(`[reconciler] adoptado zonasFuera.${key}.video: ${cur.video} → ${value.video}`);
        }
        if (value.audio != null && !valuesEqual(cur.audio, value.audio)) {
          d.desired[key] = { ...(d.desired[key] || {}), audio: value.audio };
          store.bumpVersion(domain);
          adopted += 1;
          log.info(`[reconciler] adoptado zonasFuera.${key}.audio: ${cur.audio} → ${value.audio}`);
        }
      } else if (!valuesEqual(d.desired[key], value)) {
        store.setDesired(domain, key, value); // bumpVersion
        adopted += 1;
        log.info(`[reconciler] adoptado ${domain}.${key}: ${d.desired[key]} → ${value}`);
      }
    }

    if (d.version !== prevVersion) publishDomain(domain, prevVersion);
    return adopted;
  }

  /**
   * Ejecuta un ciclo de reconciliación. Single-flight: si ya hay uno en curso
   * devuelve { skipped: true } sin lanzar otro.
   */
  async function scanOnce() {
    if (running) {
      log.warn("[reconciler] ciclo ya en curso, ignorando (single-flight)");
      return { skipped: true, adopted: 0, status: lastStatus };
    }
    running = true;
    let adoptedTotal = 0;
    let anyConfirmed = false;
    try {
      const start = Date.now();
      const tvsReadings = {};
      const tvrackReadings = {};
      const zonesReadings = {};

      for (let i = 0; i < MATRIX_DESTINATIONS.length; i += batchSize) {
        const batch = MATRIX_DESTINATIONS.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (arrDest) => {
            const video = await client.getEncoder(arrDest, "video");
            const audio = await client.getEncoder(arrDest, "audio");
            if (video == null && audio == null) return; // sin lectura confirmada
            anyConfirmed = true;
            if (arrDest === TVRACK_ID) {
              if (video != null) tvrackReadings.video = video;
              if (audio != null) tvrackReadings.audio = audio;
            } else if (ZONA_FUERA_IDS.includes(arrDest)) {
              zonesReadings[arrDest] = {};
              if (video != null) zonesReadings[arrDest].video = video;
              if (audio != null) zonesReadings[arrDest].audio = audio;
            } else {
              if (video != null) tvsReadings[toApp(arrDest)] = video;
            }
          }),
        );
      }

      adoptedTotal += adoptDomain("tvs", tvsReadings);
      adoptedTotal += adoptDomain("tvrack", tvrackReadings);
      adoptedTotal += adoptDomain("zonasFuera", zonesReadings);
      await store.write();

      const diffTotal = ["tvs", "tvrack", "zonasFuera"].reduce((n, d) => n + countDiffs(d), 0);
      const nextStatus = !anyConfirmed ? "offline" : diffTotal > 0 ? "out_of_sync" : "synced";
      const now = new Date().toISOString();
      const statusChanged = nextStatus !== lastStatus;
      // Fix sync-status: un scan convergido (synced) SIEMPRE refresca lastSync,
      // aunque el status ya fuera synced — el estado fue re-verificado contra el
      // Arranger en este scan. (Antes: solo se persistía en transiciones →
      // lastSync quedaba congelado del boot en scans post-boot synced→synced,
      // y el status podía quedar pegado en out_of_sync con diffs espurios.)
      const convergedScan = nextStatus === "synced";
      if (statusChanged || convergedScan) {
        store.setSync(nextStatus, now);
        await store.write();
        if (bus) bus.publishSync(nextStatus, now);
        log.info(statusChanged ? `[reconciler] sync → ${nextStatus} @ ${now}` : `[reconciler] sync re-confirmado ${nextStatus} @ ${now}`);
        lastStatus = nextStatus;
      }

      if (adoptedTotal > 0) {
        log.info(`[reconciler] scan completo (${Date.now() - start}ms): ${adoptedTotal} adopción(es), sync=${nextStatus}`);
      }
      return { skipped: false, adopted: adoptedTotal, status: nextStatus };
    } finally {
      running = false;
    }
  }

  /** Arranca: scan inmediato (background) + intervalo. Idempotente. */
  function start() {
    if (timer) return;
    scanOnce().catch((err) => log.error(`[reconciler] scan de arranque falló: ${err.message}`));
    timer = setInterval(() => {
      scanOnce().catch((err) => log.error(`[reconciler] scan periódico falló: ${err.message}`));
    }, resolvedInterval);
    if (typeof timer.unref === "function") timer.unref(); // no retiene el proceso
  }

  /** Detiene el intervalo (el scan en curso termina solo). */
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    scanOnce,
    buildDiffs,
    start,
    stop,
    isScanning: () => running,
    get intervalMs() {
      return resolvedInterval;
    },
    DEFAULT_INTERVAL_MS,
  };
}

module.exports = { createReconciler, DEFAULT_INTERVAL_MS };
