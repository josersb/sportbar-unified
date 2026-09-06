const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Hotfix 5: intercepta console.log/warn/error y persiste TODA la salida a
// server/logs/sportbar-<boot>.txt con timestamp por línea y rollover 900KB.
// Debe requerirse antes que cualquier módulo que loguee al arrancar. Desactivable
// con BROKER_FILE_LOG=0 (verify/CI sin escritura a disco).
if (String(process.env.BROKER_FILE_LOG || "1") !== "0") {
  require("./broker/fileLogger.js").installFileLogger();
}

const { createStore } = require("./broker/store.js");
const { createArrangerClient } = require("./broker/arrangerClient.js");
const { createEventBus } = require("./broker/eventBus.js");
const { createWriteQueue } = require("./broker/writeQueue.js");
const { createReconciler } = require("./broker/reconciler.js");
const {
  ZONA_FUERA_IDS,
  TVRACK_ID,
  toApp,
  toArranger,
  isDestination,
} = require("./broker/destinations.js");

// Leer configuración específica del worktree (gitignored)
let wtConfig = { vitePort: 5173, expressPort: 3101 };
try {
  wtConfig = JSON.parse(require("fs").readFileSync(path.join(__dirname, "..", "worktree.config.json"), "utf-8"));
} catch { /* usar defaults */ }

const PORT = process.env.PORT || wtConfig.expressPort || 3000;
const VITE_URL = `http://localhost:${wtConfig.vitePort}`;

const ARRANGER_HOST = process.env.ARRANGER_HOST || "192.168.2.254";
const ARRANGER_PORT = process.env.ARRANGER_PORT || "80";
const ARRANGER_BASE = `http://${ARRANGER_HOST}:${ARRANGER_PORT}`;

// ── Token único consolidado (gap 2 del spec) ──
// Antes divergían: línea 20 usaba VITE_ARRANGER_TOKEN y la 460 usaba
// ARRANGER_TOKEN || "TOKEN_REMOVED". Ahora UN solo token, fail-fast al arranque.
const ARRANGER_TOKEN = process.env.VITE_ARRANGER_TOKEN || process.env.ARRANGER_TOKEN;

// Intervalo de reconciliación (env var, default 300000 ms = 5 min, post-design)
const RECONCILER_INTERVAL_MS = parseInt(process.env.RECONCILER_INTERVAL_MS || "", 10) || 300000;

// ── Rate limiters rediseñados (spec state-broker) ──
// El presupuesto refleja el patrón nuevo: SSE (conexiones largas, no cuentan
// por evento) y polling versionado contra el broker. `/api/stream` y el proxy
// `/api/command` NO llevan limiter.
const readsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // GETs de polling/respaldo del broker
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, try again later" },
});
const writesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Hotfix 5 (evidencia #908: 168 respuestas 429): el patrón legítimo es un
  // batch de 29 writes por "Enviar" del operador, que puede repetir varias
  // veces en 15 min (~8 batches agotaban los 240). El writeQueue sigue
  // serializando el tráfico REAL al Arranger — el limiter solo acota POSTs.
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, try again later" },
});

function makeLog(silent) {
  if (silent) return { info: () => {}, warn: () => {}, error: () => {} };
  return {
    info: (m) => console.log(m),
    warn: (m) => console.warn(m),
    error: (m) => console.error(m),
  };
}

/**
 * Composition root del State Broker.
 *
 * Crea el broker completo (client → store v3 → eventBus → writeQueue →
 * reconciler), monta los endpoints del broker y conserva únicamente las
 * escrituras legacy que siguen siendo usadas por IR/serial y controles
 * write-through. El store unificado es el único dueño de state.json. NO
 * escucha: devuelve { app, broker } para que el caller decida (main) o para
 * verificación sin levantar server visible (verify).
 *
 * options: { dbPath, backupPath, token, mock, mockMode, silent,
 *            reconcilerIntervalMs }
 */
async function createServer(options = {}) {
  const log = makeLog(options.silent);
  const token = options.token || ARRANGER_TOKEN;
  if (!token) {
    throw new Error(
      "[broker] FALTA el token del Arranger (fail-fast). Configurá VITE_ARRANGER_TOKEN o ARRANGER_TOKEN " +
        "(env del sistema). El server no arranca sin token.",
    );
  }

  // ── 1. Broker: client → store (migración v3 / fresh-start) → bus → cola → reconciler ──
  const client = createArrangerClient({ token, mock: options.mock, mockMode: options.mockMode, log });
  const store = await createStore({
    dbPath: options.dbPath,
    backupPath: options.backupPath,
    readEncoder: (dest, sub) => client.getEncoder(dest, sub),
    log,
  });
  const bus = createEventBus({ getSnapshot: () => store.getSnapshot(), log });
  const writeQueue = createWriteQueue({ log });
  const reconciler = createReconciler({
    client,
    store,
    bus,
    log,
    intervalMs: options.reconcilerIntervalMs || RECONCILER_INTERVAL_MS,
  });

  // Arranque background + stale: servimos el persistido marcado stale y el
  // reconciler escanea el Arranger en background (spec: UI usable <1s).
  store.setSync("stale", null);
  await store.write();
  reconciler.start();

  const app = express();

  // ── Security: Helmet (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.) ──
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: [
            "'self'",
            VITE_URL,
            `http://localhost:${PORT}`,
            ARRANGER_BASE,
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          frameSrc: ["'self'", ARRANGER_BASE],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ── CORS: restringido a orígenes conocidos ──
  const allowedOrigins = [
    VITE_URL,
    `http://localhost:${PORT}`,
    "http://localhost:3000",
    `http://127.0.0.1:${wtConfig.vitePort}`,
    `http://127.0.0.1:${PORT}`,
    "http://127.0.0.1:3000",
    /^http:\/\/192\.168\.2\.\d{1,3}(:\d+)?$/,
  ];
  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (origin && allowedOrigins.some((o) => (typeof o === "string" ? o === origin : o.test(origin)))) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // ── Body parser con límite de tamaño ──
  app.use(express.json({ limit: "1mb" }));

  // ── Request logger ──
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - start;
      log.info(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
    });
    next();
  });

  // ══════════════════════════════════════════════════════════════════════
  // HELPERS DEL BROKER
  // ══════════════════════════════════════════════════════════════════════

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Confirmación post-join con retry (fix real-hardware, Arranger v1.3.4).
   *
   * El firmware necesita settling time entre `join` y `get encoder`: la
   * lectura INMEDIATA puede devolver el valor ANTERIOR aunque el comando ya
   * se aplicó físicamente (el TV cambia, pero el routing table aún no
   * refleja el join). Hasta 3 lecturas con backoff 250/500/750ms; corta
   * apenas `reported` coincide con `source`.
   *
   * HOTFIX 4 (one-join-lag): contra el hardware físico el lag es POR COMANDO,
   * no por tiempo (evidence w-001..w-008: 3 retries en 1.4s leen stale el
   * 100% de las veces). Si agota los intentos, devuelve
   * `{ value, confirmed: false }` — el caller NO debe guardar ese valor como
   * reported (no envenenar); queda para el re-read postergado (3s/9s) o el
   * scan del reconciler.
   *
   * Total max wait ~1.5s por stream.
   *
   * @returns {{ value: string|null, confirmed: boolean }}
   */
  async function confirmEncoder(dest, sub, source, writeId) {
    let reported = null;
    let confirmed = false;
    const startMs = Date.now();
    for (let attempt = 0; attempt < 3; attempt++) {
      reported = await client.getEncoder(dest, sub);
      confirmed = reported === source;
      if (writeId) {
        const elapsed = Date.now() - startMs;
        const staleTag = confirmed ? "✓ (settled)" : `(stale, retry ${250 * (attempt + 1)}ms)`;
        writeLog(writeId, "CONFIRM", `get#${attempt + 1} ${dest}/${sub} → "${reported}" ${staleTag} (t+${elapsed}ms)`);
      }
      if (confirmed) break;
      await sleep(250 * (attempt + 1)); // 250ms, 500ms, 750ms
    }
    return { value: reported, confirmed };
  }

  // ── Hotfix 4 (one-join-lag): re-read postergado de writes unconfirmed ──
  // Cuando confirmEncoder agota los retries sin coincidir, el read stale NO
  // se guarda como reported y se agenda una lectura de ese destino a los 3s
  // y, si sigue sin coincidir, otra a los 9s (máx 2 por write). La lectura es
  // safe (get encoder no modifica estado) y NO encola en writeQueue. Si
  // coincide con el desired del write: setReported + broadcast (converge en
  // segundos). Si no: queda para el scan del reconciler (degradación
  // aceptable, 5 min). Single-flight por `${dest}:${sub}`: un write más
  // nuevo al mismo destino reemplaza el re-read pendiente (nunca se
  // acumulan re-reads infinitos).
  const REREAD_DELAYS_MS = [3000, 9000];
  const pendingReReads = new Map(); // `${dest}:${sub}` → { attempts, source, timer }

  /** Aplica un read confirmado al reported (misma lógica que executeWrite §4). */
  function applyConfirmedRead(domain, key, sub, value) {
    if (domain === "tvs") {
      store.setReported(domain, key, value);
    } else if (domain === "tvrack") {
      store.setReported(domain, sub, value);
    } else {
      const d = store.getDomain(domain);
      d.reported[key] = { ...(d.reported[key] || {}), [sub]: value };
      store.bumpVersion(domain);
    }
  }

  /** Agenda los re-reads postergados (3s/9s) de un write sin confirmar. */
  function scheduleDelayedReRead(dest, domain, key, sub, source, writeId) {
    const id = `${dest}:${sub}`;
    const prev = pendingReReads.get(id);
    if (prev && prev.timer) clearTimeout(prev.timer); // single-flight: el write nuevo gana
    const state = { attempts: 0, source, timer: null };
    pendingReReads.set(id, state);
    const fire = async () => {
      const s = pendingReReads.get(id);
      if (!s || s.source !== source) return; // superseded por un write más nuevo
      s.attempts += 1;
      try {
        const value = await client.getEncoder(dest, sub);
        writeLog(
          writeId,
          "CONFIRM",
          `re-read #${s.attempts} ${dest}/${sub} → "${value}" ${value === source ? "✓ (settled)" : "(still stale)"}`,
        );
        if (value === source) {
          pendingReReads.delete(id);
          applyConfirmedRead(domain, key, sub, value);
          await store.write();
          writeLog(writeId, "STORE", `re-read convergió: setReported ${domain} (key=${key}, ${sub})=${value}`);
          broadcastDomain(domain, writeId);
        } else if (s.attempts < REREAD_DELAYS_MS.length) {
          // Segunda (y última) lectura: a los 9s absolutos desde el write.
          s.timer = setTimeout(fire, REREAD_DELAYS_MS[s.attempts] - REREAD_DELAYS_MS[s.attempts - 1]);
        } else {
          pendingReReads.delete(id);
          writeLog(writeId, "CONFIRM", `re-read agotado (${s.attempts} intentos); queda para el scan del reconciler`);
        }
      } catch (err) {
        pendingReReads.delete(id);
        writeError(writeId, "CONFIRM", `re-read falló: ${err && err.message}; queda para el scan del reconciler`);
      }
    };
    state.timer = setTimeout(fire, REREAD_DELAYS_MS[0]);
  }

  /**
   * Flujo de escritura confirmada (spec state-broker):
   * desired → join (según domain/sub/link) → get encoder → reported → persistir.
   * Debe ejecutarse DENTRO de writeQueue.enqueue(dest, ...) para serializar
   * por destino. Devuelve { ok, dest, source, sub, reported, error? }.
   *
   * HOTFIX 5 (observabilidad): mide las duraciones de cada fase (queue, join,
   * confirm, re-reads) para la línea de cierre end-to-end que loggea
   * writeInBackground tras el broadcast — reconstrucción de timelines.
   */
  async function executeWrite(dest, source, sub = "video", writeId, timings) {
    const t = timings || { queuedAt: Date.now(), startedAt: Date.now() };
    t.startedAt = Date.now(); // la tarea arrancó (salió de la cola)
    const domain = dest === TVRACK_ID ? "tvrack" : ZONA_FUERA_IDS.includes(dest) ? "zonasFuera" : "tvs";
    const key = domain === "tvs" ? toApp(dest) : dest;
    const wlog = (tag, msg) => writeLog(writeId, tag, msg);
    const d = store.getDomain(domain);
    // Leer link aquí, dentro de la tarea encolada: nunca capturar una versión
    // obsoleta antes de que la cola FIFO procese la escritura.
    const appOnly = store.getAppOnly();
    const link =
      domain === "tvrack"
        ? !!appOnly.tvrack?.link
        : domain === "zonasFuera"
          ? !!appOnly.zonasFuera?.[dest]?.link
          : false;
    const linked = domain !== "tvs" && link;

    // 1. Intención del operador
    if (domain === "tvs") {
      store.setDesired(domain, key, source);
    } else if (linked && domain === "tvrack") {
      store.setDesired(domain, "video", source);
      store.setDesired(domain, "audio", source);
    } else if (domain === "tvrack") {
      store.setDesired(domain, sub, source);
    } else if (linked) {
      d.desired[key] = { ...(d.desired[key] || {}), video: source, audio: source };
      store.bumpVersion(domain);
    } else {
      d.desired[key] = { ...(d.desired[key] || {}), [sub]: source };
      store.bumpVersion(domain);
    }

    // 2. Comando al Arranger
    const joinStart = Date.now();
    const joinResult =
      domain === "tvs" || linked
        ? await client.joinAv(source, dest, writeId)
        : sub === "audio"
          ? await client.joinAudio(source, dest, writeId)
          : await client.joinVideo(source, dest, writeId);
    t.joinMs = Date.now() - joinStart;
    if (!joinResult.ok) {
      wlog("ARRANGER", `→ join ${linked ? "av" : sub} ${source} ${dest} FAILED: ${joinResult.error || joinResult.text || "?"}`);
      await store.write();
      return { ok: false, dest, source, sub, error: joinResult.error || "join falló" };
    }
    wlog("ARRANGER", `→ join ${linked ? "av" : sub} ${source} ${dest} ok (${joinResult.text || ""})`);

    // 3. Lectura post-comando (confirmación) — retry con backoff por el
    //    settling time del firmware v1.3.4 (ver confirmEncoder). En linked,
    //    ambos streams en paralelo. HOTFIX 4 (one-join-lag): si agota los
    //    retries SIN coincidir, el valor leído es stale y NO se guarda como
    //    reported (no envenenar); queda el reported anterior y se agenda el
    //    re-read postergado (3s/9s) para converger en segundos.
    const confirmStart = Date.now();
    const confirm = linked
      ? await Promise.all([
          confirmEncoder(dest, "video", source, writeId),
          confirmEncoder(dest, "audio", source, writeId),
        ]).then(([video, audio]) => ({ video, audio }))
      : await confirmEncoder(dest, sub, source, writeId);
    t.confirmMs = Date.now() - confirmStart;

    // 4. reported ← SOLO lecturas confirmadas. El valor stale del one-join-lag
    //    NUNCA pisa reported (envenenaría el estado que el broadcast y el
    //    snapshot propagan a todos los clientes). Los streams sin confirmar
    //    quedan para el re-read postergado o el scan del reconciler.
    //    HOTFIX 5 (evidencia #908): confirmed=false → SKIP TOTAL del
    //    setReported — ni null ni el read parcial/stale tocan reported; el
    //    destino conserva su último valor confirmado. El log lo hace
    //    explícito para auditoría (el log anterior decía "setReported
    //    ...=null" aunque el store nunca lo guardó — confundía el análisis).
    let confirmed;
    let reported;
    if (linked) {
      confirmed = confirm.video.confirmed && confirm.audio.confirmed;
      reported = {
        video: confirm.video.confirmed ? confirm.video.value : null,
        audio: confirm.audio.confirmed ? confirm.audio.value : null,
      };
      if (domain === "tvrack") {
        if (confirm.video.confirmed) store.setReported(domain, "video", reported.video);
        if (confirm.audio.confirmed) store.setReported(domain, "audio", reported.audio);
      } else if (confirm.video.confirmed || confirm.audio.confirmed) {
        d.reported[key] = {
          ...(d.reported[key] || {}),
          ...(confirm.video.confirmed ? { video: reported.video } : {}),
          ...(confirm.audio.confirmed ? { audio: reported.audio } : {}),
        };
        store.bumpVersion(domain);
      } else {
        wlog("STORE", `SKIP setReported ${domain} (key=${key}) — unconfirmed, read=${JSON.stringify({ video: confirm.video.value, audio: confirm.audio.value })}`);
      }
      if (!confirm.video.confirmed) scheduleDelayedReRead(dest, domain, key, "video", source, writeId);
      if (!confirm.audio.confirmed) scheduleDelayedReRead(dest, domain, key, "audio", source, writeId);
    } else {
      confirmed = confirm.confirmed;
      reported = confirmed ? confirm.value : null;
      if (confirmed) {
        if (domain === "tvs") {
          store.setReported(domain, key, reported);
        } else if (domain === "tvrack") {
          store.setReported(domain, sub, reported);
        } else {
          d.reported[key] = { ...(d.reported[key] || {}), [sub]: reported };
          store.bumpVersion(domain);
        }
      } else {
        // SKIP explícito: el read fallido (null/stale) NO toca reported.
        wlog("STORE", `SKIP setReported ${domain} (key=${key}, ${sub}) — unconfirmed, read=${JSON.stringify(confirm.value)}`);
        scheduleDelayedReRead(dest, domain, key, sub, source, writeId);
      }
    }

    const finalDomain = store.getDomain(domain);
    if (confirmed) {
      wlog("STORE", `setReported ${domain} (key=${key})=${JSON.stringify(reported)} confirmed=true (v${finalDomain.version})`);
    }
    // Re-reads postergados pendientes de ESTE write (convergen a 3s/9s).
    t.reReads = linked
      ? (confirm.video.confirmed ? 0 : 1) + (confirm.audio.confirmed ? 0 : 1)
      : confirmed
        ? 0
        : 1;

    await store.write();
    return { ok: true, dest, source, sub, link, confirmed, reported };
  }

  function validateLinkedSnapshot(snapshot) {
    const errors = [];
    const tvrack = snapshot && typeof snapshot.tvrack === "object" ? snapshot.tvrack : null;
    if (tvrack?.link === true && tvrack.video !== tvrack.audio) {
      errors.push("tvrack.link=true requiere video y audio iguales");
    }
    const zones = snapshot && typeof snapshot.zonasFuera === "object" ? snapshot.zonasFuera : {};
    for (const [zoneId, zone] of Object.entries(zones)) {
      if (zone?.link === true && zone.video !== zone.audio) {
        errors.push(`zonasFuera.${zoneId}.link=true requiere video y audio iguales`);
      }
    }
    return errors.length > 0 ? `Snapshot inconsistente: ${errors.join("; ")}` : null;
  }

  function applySnapshotLinks(snapshot) {
    if (snapshot?.tvrack && typeof snapshot.tvrack === "object") {
      // Los snapshots anteriores no persistían tvrack.link: se interpretan
      // como independientes para no dejar que un toggle previo colapse audio.
      store.setAppOnly("tvrack", "link", snapshot.tvrack.link === true);
    }
    for (const [zoneId, zone] of Object.entries(snapshot?.zonasFuera || {})) {
      if (ZONA_FUERA_IDS.includes(zoneId) && zone && typeof zone === "object") {
        store.setAppOnly("zonasFuera", zoneId, { link: zone.link === true });
      }
    }
  }

  /** Broadcast del estado de un dominio (payload = reported + link app-only). */
  function broadcastDomain(domain, writeId) {
    const d = store.getDomain(domain);
    if (!d) return;
    let payload;
    if (domain === "presets") {
      payload = d.desired;
    } else if (domain === "tvrack") {
      payload = {
        ...(d.reported || {}),
        link: !!store.getAppOnly().tvrack?.link,
      };
    } else if (domain === "zonasFuera") {
      const reported = d.reported || {};
      const desired = d.desired || {};
      const zoneIds = new Set([...Object.keys(desired), ...Object.keys(reported)]);
      const links = store.getAppOnly().zonasFuera || {};
      payload = Object.fromEntries(
        [...zoneIds].map((zoneId) => [
          zoneId,
          {
            ...(reported[zoneId] || {}),
            link: !!links[zoneId]?.link,
          },
        ]),
      );
    } else {
      payload = d.reported || {};
    }
    bus.publish(domain, payload, d.version, d.lastUpdated, writeId);
  }

  /** Snapshot broker (GET /api/broker/state y evento SSE `snapshot`). */
  function buildBrokerSnapshot(storeRef) {
    const snap = storeRef.getSnapshot();
    return {
      schemaVersion: snap.schemaVersion,
      sync: snap.sync,
      versions: {
        tvs: snap.domains.tvs.version,
        tvrack: snap.domains.tvrack.version,
        zonasFuera: snap.domains.zonasFuera.version,
        presets: snap.domains.presets.version,
      },
      domains: snap.domains,
      appOnly: snap.appOnly,
    };
  }

  /** Parsea ?since=tvs:12,zonasFuera:3 (respaldo versionado). */
  function parseSince(raw) {
    const out = {};
    if (!raw || typeof raw !== "string") return out;
    for (const part of raw.split(",")) {
      const [k, v] = part.split(":");
      if (k && v) out[k] = parseInt(v, 10);
    }
    return out;
  }

  /** Respuesta del mock para comandos arbitrarios (dev/verify sin hardware). */
  async function mockCommandResult(command) {
    const cmd = String(command || "");
    const joinMatch = cmd.match(/^join av\s+(\S+)\s+(\S+)/i);
    if (joinMatch) {
      try {
        const r = await client.joinAv(joinMatch[1], joinMatch[2]);
        return r.ok ? r.text : `error: ${r.error}`;
      } catch (e) {
        return `error: ${e.message}`;
      }
    }
    const getMatch = cmd.match(/^get encoder\s+(\S+)(?:\s+(\S+))?/i);
    if (getMatch) {
      const v = await client.getEncoder(getMatch[1], getMatch[2] || "video");
      return v ? `get encoder success ${getMatch[1]} ${v}` : "no encoder connected";
    }
    return `mock: comando no simulado (${command})`;
  }

  /**
   * Background confirmation: el POST retorna INMEDIATAMENTE con
   * `{ok: true, confirmed: false, reported: null, accepted: true}` mientras
   * el comando real (joinAv/joinVideo/joinAudio) y la confirmación
   * (confirmEncoder con retry) corren en background. El broadcast del
   * desired (sin reported) sale también inmediato, para que el cliente con
   * optimistic vea la intención YA; cuando el join asienta y el confirmEncoder
   * confirma, se emite el broadcast del reported que el SSE entrega.
   *
   * Si el join FALLA en background: log warn, el scan del reconciler
   * detecta la divergencia desired≠reported y corrige en el próximo ciclo.
   * El cliente con optimistic overlay puede mostrar toast de error si la
   * versión SSE no llega en un timeout, pero el patrón es self-healing.
   *
   * El writeQueue sigue serializando por destino: si llegan 5 POSTs al mismo
   * destino, los 5 encolan serializados en background. La cola NO se libera
   * para el siguiente POST hasta que la confirmación del anterior termina
   * (es interno al `executeWrite` que la cola sigue consumiendo FIFO).
   *
   * Activación: env `BROKER_BACKGROUND_CONFIRM=1` (default ON en este hotfix
   * porque el problema medido son POSTs de 2-22s). Para volver al modo
   * síncrono previo, setear `BROKER_BACKGROUND_CONFIRM=0`.
   */
  const BACKGROUND_CONFIRM = String(process.env.BROKER_BACKGROUND_CONFIRM || "1") !== "0";

  // ── Observabilidad: correlation ID por write (hotfix 3 instrumentación) ──
  // Contador en memoria del server. Genera IDs secuenciales `w-001`, `w-002`,
  // … que viajan por TODA la cadena del write: POST → cola → join →
  // confirmEncoder → setReported → broadcast. Es cero-overhead en prod
  // (solo un Number++) y se loggea a stdout; desactivable con `BROKER_LOG=0`.
  const BROKER_LOG = String(process.env.BROKER_LOG || "1") !== "0";
  let writeSeq = 0;
  function nextWriteId() {
    writeSeq += 1;
    return `w-${String(writeSeq).padStart(3, "0")}`;
  }
  /**
   * Logger estructurado de write: prefijo `[WRITE|QUEUE|ARRANGER|CONFIRM|STORE|BROADCAST <id>]`.
   * Es `console.log` directo (sin filtrar por nivel) — la idea es visibilidad
   * quirúrgica, no formato JSON. Si se desactiva con `BROKER_LOG=0`, retorna
   * sin escribir.
   */
  function writeLog(id, tag, msg) {
    if (!BROKER_LOG) return;
    console.log(`[${tag} ${id}] ${msg}`);
  }
  function writeError(id, tag, msg) {
    if (!BROKER_LOG) return;
    console.error(`[${tag} ${id}] ${msg}`);
  }

  /**
   * Helper: encola una escritura en background, broadcastea el desired
   * inmediato, captura errores para que no queden promesas flotantes, y
   * al asentar el reported broadcastea el dominio.
   *
   * @param {string} dest - destino Arranger
   * @param {string} domain - tvs | tvrack | zonasFuera
   * @param {string} source - source DTV
   * @param {string} sub - video | audio
   * @returns {Promise<{ok, confirmed, reported}>} - siempre se resuelve
   */
  function writeInBackground(dest, domain, source, sub, writeId) {
    if (!BACKGROUND_CONFIRM) {
      // Modo síncrono (compat): se mantiene para rollback o tests E2E
      return writeQueue.enqueue(dest, () => executeWrite(dest, source, sub, writeId));
    }
    // Fire-and-forget: la cola FIFO del writeQueue garantiza orden; el
    // broadcast del desired sale inmediato para que el cliente vea la
    // intención YA (no necesita esperar el join físico).
    const queuePos = writeQueue.pendingCount + 1;
    writeLog(writeId, "QUEUE", `enqueued ${dest} (pos ${queuePos}, pending ${writeQueue.pendingKeys.length})`);
    const timings = { queuedAt: Date.now(), startedAt: Date.now() };
    const task = writeQueue.enqueue(dest, () => executeWrite(dest, source, sub, writeId, timings));
    // Broadcast desired inmediato: el cliente con optimistic overlay o el
    // polling ven la intención sin esperar el join.
    broadcastDomain(domain, writeId);
    task
      .then((result) => {
        if (!result || !result.ok) {
          writeError(writeId, "QUEUE", `write ${dest}/${sub}=${source} falló: ${result && result.error}`);
          writeLog(writeId, "WRITE", `DONE end-to-end ${(Date.now() - timings.queuedAt) / 1000}s (queue ${((timings.startedAt - timings.queuedAt) / 1000).toFixed(2)}s · join fallido)`);
          return;
        }
        // Confirmación asienta: re-broadcast con el reported confirmado.
        // El SSE event del broker llega al cliente que ya tenía el optimistic.
        broadcastDomain(domain, writeId);
        // HOTFIX 5: línea de cierre end-to-end con desglose por fase.
        writeLog(
          writeId,
          "WRITE",
          `DONE end-to-end ${((Date.now() - timings.queuedAt) / 1000).toFixed(1)}s (queue ${((timings.startedAt - timings.queuedAt) / 1000).toFixed(2)}s · join ${(timings.joinMs || 0)}ms · confirm ${(timings.confirmMs || 0)}ms · re-reads ${timings.reReads ?? 0})`,
        );
      })
      .catch((err) => {
        writeError(writeId, "QUEUE", `error inesperado en ${dest}/${sub}: ${err && err.message}`);
      });
    return Promise.resolve({ ok: true, confirmed: false, reported: null, accepted: true });
  }

  // ══════════════════════════════════════════════════════════════════════
  // ENDPOINTS NUEVOS DEL BROKER
  // ══════════════════════════════════════════════════════════════════════

  // SSE: sin limiter (las conexiones largas no cuentan por evento; máx 10 en eventBus)
  app.get("/api/stream", (req, res) => {
    bus.handleConnection(req, res);
  });

  // Respaldo versionado: ?since=tvs:12,zonasFuera:3 → solo dominios cambiados
  app.get("/api/broker/state", readsLimiter, (req, res) => {
    const snap = store.getSnapshot();
    const since = parseSince(req.query.since);
    const body = {
      schemaVersion: snap.schemaVersion,
      sync: snap.sync,
      versions: {},
      domains: {},
      appOnly: snap.appOnly,
    };
    for (const name of ["tvs", "tvrack", "zonasFuera", "presets"]) {
      const d = snap.domains[name];
      body.versions[name] = d.version;
      if (!since[name] || d.version > since[name]) {
        body.domains[name] = d;
      }
    }
    res.json(body);
  });

  // Merge parcial del estado app-only (cliente broker PR 3)
  app.post("/api/app-state", writesLimiter, async (req, res) => {
    const patch = req.body;
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      return res.status(400).json({ error: "Se espera un objeto con el estado app-only" });
    }
    const prev = store.getAppState() && typeof store.getAppState() === "object" ? store.getAppState() : {};
    store.setAppState({ ...prev, ...patch });
    await store.write();
    res.json({ ok: true, appState: store.getAppState() });
  });

  // Escritura de matriz confirmada (spec: desired → join → get encoder → reported → broadcast)
  app.post("/api/tvs/:id/source", writesLimiter, async (req, res) => {
    const { id } = req.params;
    const { source, deviceId } = req.body || {};
    const src = source || deviceId;
    const dest = toArranger(id);
    if (!isDestination(dest)) {
      return res.status(400).json({ error: `Destino inválido: ${id}` });
    }
    if (!src || typeof src !== "string") {
      return res.status(400).json({ error: "source requerido" });
    }

    const writeId = nextWriteId();
    writeLog(writeId, "WRITE", `POST /api/tvs/${id}/source {source:"${src}"} client=${req.ip || req.socket?.remoteAddress || "?"}`);

    if (BACKGROUND_CONFIRM) {
      // Background confirmation (fix real-hardware C): respondemos rápido
      // con confirmed=false; el join + confirmEncoder + broadcast del
      // reported corren en background. El cliente con optimistic overlay ve
      // el desired YA por el broadcast inmediato que dispara writeInBackground.
      writeInBackground(dest, "tvs", src, "video", writeId);
      const d = store.getDomain("tvs");
      return res.json({
        ok: true,
        accepted: true,
        confirmed: false,
        id,
        source: src,
        dest,
        reported: null,
        version: d.version,
        lastUpdated: d.lastUpdated,
        sync: store.getSync(),
      });
    }

    const result = await writeQueue.enqueue(dest, () => executeWrite(dest, src, "video", writeId));
    if (!result.ok) {
      return res.status(502).json({ ok: false, id, source: src, error: result.error });
    }
    broadcastDomain("tvs");
    const d = store.getDomain("tvs");
    res.json({
      ok: true,
      id,
      source: src,
      dest,
      // Hotfix 4 (one-join-lag): reported solo cuando el read confirmó;
      // unconfirmed → null y el re-read postergado (3s/9s) converge.
      confirmed: !!result.confirmed,
      reported: result.reported,
      version: d.version,
      lastUpdated: d.lastUpdated,
      sync: store.getSync(),
    });
  });

  // Load de preset server-side (sin BATCH de 29 requests cliente): restaura
  // los 3 dominios vía writeQueue, batches de 4 destinos a la vez.
  app.post("/api/presets/:n/load", writesLimiter, async (req, res) => {
    const n = parseInt(req.params.n, 10);
    if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
    const preset = store.getPreset(n);
    if (!preset) {
      return res.status(404).json({ error: `Preset ${n} vacío` });
    }
    const validationError = validateLinkedSnapshot(preset);
    if (validationError) return res.status(400).json({ error: validationError });

    // El snapshot puede transportar el link app-only. Se persiste antes de
    // encolar, mientras executeWrite vuelve a leerlo dentro de cada tarea.
    applySnapshotLinks(preset);
    await store.write();

    const writes = [];
    for (const [tvKey, source] of Object.entries(preset.tvs || {})) {
      const dest = toArranger(tvKey);
      if (!isDestination(dest) || !source) continue;
      const wid = nextWriteId();
      writeLog(wid, "WRITE", `POST /api/presets/${n}/load → tvs ${dest} video=${source}`);
      writes.push(() => writeQueue.enqueue(dest, () => executeWrite(dest, source, "video", wid)));
    }
    for (const [zoneId, zone] of Object.entries(preset.zonasFuera || {})) {
      if (!isDestination(zoneId) || !zone) continue;
      if (zone.video) {
        const wid = nextWriteId();
        writeLog(wid, "WRITE", `POST /api/presets/${n}/load → zonasFuera ${zoneId} video=${zone.video}`);
        writes.push(() => writeQueue.enqueue(zoneId, () => executeWrite(zoneId, zone.video, "video", wid)));
      }
      if (zone.audio && zone.audio !== zone.video) {
        const wid = nextWriteId();
        writeLog(wid, "WRITE", `POST /api/presets/${n}/load → zonasFuera ${zoneId} audio=${zone.audio}`);
        writes.push(() => writeQueue.enqueue(zoneId, () => executeWrite(zoneId, zone.audio, "audio", wid)));
      }
    }
    const tvrack = preset.tvrack || {};
    if (tvrack.video) {
      const wid = nextWriteId();
      writeLog(wid, "WRITE", `POST /api/presets/${n}/load → tvrack video=${tvrack.video}`);
      writes.push(() => writeQueue.enqueue(TVRACK_ID, () => executeWrite(TVRACK_ID, tvrack.video, "video", wid)));
    }
    if (tvrack.audio && tvrack.audio !== tvrack.video) {
      const wid = nextWriteId();
      writeLog(wid, "WRITE", `POST /api/presets/${n}/load → tvrack audio=${tvrack.audio}`);
      writes.push(() => writeQueue.enqueue(TVRACK_ID, () => executeWrite(TVRACK_ID, tvrack.audio, "audio", wid)));
    }

    const results = [];
    let failed = 0;
    for (let i = 0; i < writes.length; i += 4) {
      const batchResults = await Promise.allSettled(writes.slice(i, i + 4).map((fn) => fn()));
      for (const r of batchResults) {
        const value = r.status === "fulfilled" ? r.value : { ok: false, error: r.reason && r.reason.message };
        results.push(value);
        if (r.status !== "fulfilled" || !value.ok) failed += 1;
      }
    }

    for (const domain of ["tvs", "tvrack", "zonasFuera"]) broadcastDomain(domain);
    res.json({ ok: failed === 0, applied: results.length - failed, failed, results });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ESCRITURAS LEGACY VIVAS — write-through confirmado
  // ══════════════════════════════════════════════════════════════════════

  // Write-through confirmado (spec: responde el estado confirmado, no fire-and-forget)
  async function tvrackWrite(req, res, sub) {
    const { deviceId, source } = req.body || {};
    const src = source || deviceId;
    if (!src) return res.status(400).json({ error: "deviceId required" });
    const writeId = nextWriteId();
    writeLog(writeId, "WRITE", `POST /api/tvrack/${sub} {source:"${src}"} client=${req.ip || req.socket?.remoteAddress || "?"}`);
    if (BACKGROUND_CONFIRM) {
      // Background confirmation: respondemos rápido; el join + confirmEncoder
      // + broadcast del reported corren en background. El broadcast del
      // desired sale inmediato vía writeInBackground (link toggle-aware:
      // executeWrite lee appOnly.tvrack.link dentro de la tarea encolada).
      writeInBackground(TVRACK_ID, "tvrack", src, sub, writeId);
      const link = !!store.getAppOnly().tvrack?.link;
      const d = store.getDomain("tvrack");
      return res.json({
        ok: true,
        accepted: true,
        confirmed: false,
        video: d.desired.video,
        audio: d.desired.audio,
        link,
        reported: null,
        lastUpdated: d.lastUpdated,
      });
    }
    const result = await writeQueue.enqueue(TVRACK_ID, () => executeWrite(TVRACK_ID, src, sub, writeId));
    if (!result.ok) return res.status(502).json({ ok: false, error: result.error });
    const link = !!store.getAppOnly().tvrack?.link;
    broadcastDomain("tvrack");
    const d = store.getDomain("tvrack");
    res.json({
      video: d.desired.video,
      audio: d.desired.audio,
      link,
      lastUpdated: d.lastUpdated,
    });
  }

  app.post("/api/tvrack/video", writesLimiter, (req, res) => tvrackWrite(req, res, "video"));
  app.post("/api/tvrack/audio", writesLimiter, (req, res) => tvrackWrite(req, res, "audio"));

  app.post("/api/tvrack/link", writesLimiter, async (req, res) => {
    const { linked } = req.body;
    if (!store) return res.status(503).json({ error: "Database not ready" });
    store.setAppOnly("tvrack", "link", !!linked);
    await store.write();
    broadcastDomain("tvrack");
    const d = store.getDomain("tvrack");
    res.json({
      video: d.desired.video,
      audio: d.desired.audio,
      link: !!linked,
      lastUpdated: d.lastUpdated,
    });
  });

  // ── Zonas Fuera — 10 zonas externas ──
  function validateZonaFueraId(req, res, next) {
    const { id } = req.params;
    if (!ZONA_FUERA_IDS.includes(id)) {
      return res.status(400).json({ error: `Invalid zone ID: ${id}. Must be one of ZONAS_FUERA_IDS.` });
    }
    next();
  }

  async function zonaFueraWrite(req, res, sub) {
    const { id } = req.params;
    const { deviceId, source } = req.body || {};
    const src = source || deviceId;
    if (!src) return res.status(400).json({ error: "deviceId required" });
    const writeId = nextWriteId();
    writeLog(writeId, "WRITE", `POST /api/zonas-fuera/${id}/${sub} {source:"${src}"} client=${req.ip || req.socket?.remoteAddress || "?"}`);
    if (BACKGROUND_CONFIRM) {
      // Background confirmation: link toggle-aware (executeWrite lee
      // appOnly.zonasFuera[id].link dentro de la tarea encolada).
      writeInBackground(id, "zonasFuera", src, sub, writeId);
      const link = !!store.getAppOnly().zonasFuera?.[id]?.link;
      const d = store.getDomain("zonasFuera");
      return res.json({
        ok: true,
        accepted: true,
        confirmed: false,
        zoneId: id,
        ...(d.desired[id] || {}),
        link,
        reported: null,
        lastUpdated: d.lastUpdated,
      });
    }
    const result = await writeQueue.enqueue(id, () => executeWrite(id, src, sub, writeId));
    if (!result.ok) return res.status(502).json({ ok: false, error: result.error });
    const link = !!store.getAppOnly().zonasFuera?.[id]?.link;
    broadcastDomain("zonasFuera");
    const d = store.getDomain("zonasFuera");
    res.json({ zoneId: id, ...d.desired[id], link, lastUpdated: d.lastUpdated });
  }

  app.post("/api/zonas-fuera/:id/video", writesLimiter, validateZonaFueraId, (req, res) => zonaFueraWrite(req, res, "video"));
  app.post("/api/zonas-fuera/:id/audio", writesLimiter, validateZonaFueraId, (req, res) => zonaFueraWrite(req, res, "audio"));

  app.post("/api/zonas-fuera/:id/link", writesLimiter, validateZonaFueraId, async (req, res) => {
    const { linked } = req.body;
    if (typeof linked === "undefined") return res.status(400).json({ error: "linked required (boolean)" });
    const { id } = req.params;
    store.setAppOnly("zonasFuera", id, { link: !!linked });
    await store.write();
    broadcastDomain("zonasFuera");
    const d = store.getDomain("zonasFuera");
    res.json({ zoneId: id, ...d.desired[id], link: !!linked, lastUpdated: d.lastUpdated });
  });

  // ── Presets Compartidos ──
  app.get("/api/presets/:n", (req, res) => {
    const n = parseInt(req.params.n, 10);
    if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
    res.json({ preset: store.getPreset(n) });
  });

  app.post("/api/presets/:n", writesLimiter, async (req, res) => {
    const n = parseInt(req.params.n, 10);
    if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
    const validationError = validateLinkedSnapshot(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    store.setPreset(n, req.body);
    await store.write();
    broadcastDomain("presets");
    res.json({ ok: true });
  });

  app.delete("/api/presets/:n", writesLimiter, async (req, res) => {
    const n = parseInt(req.params.n, 10);
    if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
    store.setPreset(n, null);
    await store.write();
    broadcastDomain("presets");
    res.json({ ok: true });
  });

  // Middleware para servir archivos estáticos desde dist (build de producción)
  app.use(express.static(path.join(__dirname, "../dist")));

  // ── Proxy genérico de comandos del Arranger (único camino, spec) ──
  // HOTFIX 6: el camino REAL pasa por client.sendRaw → semáforo global del
  // arrangerClient (el Arranger es serial sin importar el origen del
  // comando). El fetchWithRetry legacy queda solo para el mock (que no
  // toca hardware).
  app.get("/api/command/:command/:token", async (req, res) => {
    try {
      const { command } = req.params;
      if (client.isMock) {
        return res.status(200).send(await mockCommandResult(command));
      }
      const result = await client.sendRaw(command, req.params.token);
      if (result.error) {
        return res.status(502).json({ error: "Arranger unreachable", detail: result.error });
      }
      res.status(result.status).send(result.text);
    } catch (error) {
      res.status(502).json({ error: "Arranger unreachable", detail: error.message });
    }
  });

  // Ruta para servir la aplicación React (SPA)
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist", "index.html"));
  });

  // Manejo de errores
  app.use((err, req, res, next) => {
    log.error(`Error en el servidor: ${err.stack}`);
    res.status(500).send("¡Algo salió mal en el servidor SportBar!");
  });

  return { app, broker: { client, store, bus, writeQueue, reconciler } };
}

// ── Arranque: solo cuando se ejecuta directamente (el verify lo requiere sin listen) ──
if (require.main === module) {
  createServer()
    .then(({ app, broker }) => {
      app.listen(PORT, () => {
        console.log("=".repeat(50));
        console.log("🏆 SERVIDOR SPORTBAR INICIADO");
        console.log("=".repeat(50));
        console.log(`📡 Puerto: ${PORT}`);
        console.log(`🌐 URL: http://localhost:${PORT}`);
        console.log(`📂 Sirviendo archivos desde: dist/`);
        console.log(`⚡ Modo: ${process.env.NODE_ENV || "development"}`);
        console.log(`🔄 Broker: mock=${broker.client.isMock} · reconciler ${broker.reconciler.intervalMs}ms`);
        console.log("=".repeat(50));
        console.log("Sistema de control matriz audiovisual listo");
        console.log("Funcionalidades disponibles:");
        console.log("  ✓ Control de TVs y decodificadores");
        console.log("  ✓ Gestión de canales deportivos");
        console.log("  ✓ Control de audio por zonas");
        console.log("  ✓ Sistema de presets");
        console.log("  ✓ State Broker (SSE /api/stream, writeQueue, reconciler)");
        console.log("=".repeat(50));
      });
    })
    .catch((err) => {
      console.error("FALLO AL ARRANCAR EL SERVIDOR:", err.message);
      process.exit(1);
    });
}

// Manejo graceful del cierre del servidor
process.on("SIGTERM", () => {
  console.log("📴 Cerrando servidor SportBar...");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("\n📴 Cerrando servidor SportBar...");
  process.exit(0);
});

module.exports = { createServer };
