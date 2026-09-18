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
// WS4a/WS4b — modelo declarativo único + helpers de grupos (MG-4: única fuente
// de opciones/expansión; el server es dueño de matrixGroups).
const matrixModel = require("./broker/matrixModel.js");
const { expandGroups, collapseGroup } = require("./broker/groups.js");

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

// Modelo declarativo servido read-only en el snapshot (design WS4: el cliente
// renderiza los selects desde `matrixModel` — sin copias cliente-side).
const MATRIX_MODEL = matrixModel.MATRIX_MODEL;

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
 * options: { dbPath, backupPath, token, mock, mockMode, mockLagSettleMs, silent,
 *            reconcilerIntervalMs, client }
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
  // Seam de test: el verify puede inyectar un cliente fake (p.ej. con settling
  // configurable) sin tocar el hardware ni el mock global. Default: el cliente
  // real/mock de siempre — behavior-preserving.
  const client = options.client || createArrangerClient({ token, mock: options.mock, mockMode: options.mockMode, mockLagSettleMs: options.mockLagSettleMs, log });
  const store = await createStore({
    dbPath: options.dbPath,
    backupPath: options.backupPath,
    readEncoder: (dest, sub) => client.getEncoder(dest, sub),
    log,
  });
  const bus = createEventBus({
    // T-4b.2: el snapshot SSE lleva `matrixModel` top-level además del store,
    // para que el cliente (WS4c/d) renderice desde el modelo servido.
    getSnapshot: () => ({ ...store.getSnapshot(), matrixModel: MATRIX_MODEL }),
    log,
  });
  const writeQueue = createWriteQueue({ log });
  // Fix clobber reconciler/write: timestamp del último write (o intento) por
  // destino. El reconciler NO adopta destinos tocados durante su scan — un
  // scan tarda ~20s y la lectura pudo tomarse ANTES del write (pisaría un
  // estado más nuevo: reported confirmado + desired del operador).
  const writeTouchedAt = new Map();
  const reconciler = createReconciler({
    client,
    store,
    bus,
    log,
    intervalMs: options.reconcilerIntervalMs || RECONCILER_INTERVAL_MS,
    recentlyWritten: (dest, sinceMs) => {
      const t = writeTouchedAt.get(dest);
      return t != null && t >= sinceMs;
    },
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
          // LAN HTTP-only: esta directiva elevaría todos los subrecursos a
          // HTTPS (no hay nada en 443) → página en blanco. DEBE ser null.
          upgradeInsecureRequests: null,
        },
      },
      crossOriginEmbedderPolicy: false,
      // LAN HTTP-only: HSTS fuerza HTTPS en el navegador. La skill de deploy
      // lo exige deshabilitado (rompe el SPA en la red del bar).
      strictTransportSecurity: false,
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

  // ── Ventana de confirmación por tipo de comando (settling Arranger v1.3.4) ──
  // El firmware v1.3.4 refleja el join recién tras el settling medido en
  // hardware (39/39 trials, determinístico ±20 ms): `join av` ~3340 ms y
  // `join video`/`join audio` ~2302 ms. La ventana espera ese settling con
  // margen ≥300 ms. ⚠ Re-medir el settling si se actualiza el firmware
  // (v1.3.4 → ≥1.4.0.0) o se reemplaza el hardware.
  const CONFIRM_SETTLE_AV_MS = 3700;     // join av: 3340 ms medido + 360 ms
  const CONFIRM_SETTLE_STREAM_MS = 2700; // join video/audio: 2302 ms medido + 398 ms
  const CONFIRM_FIRST_READ_MS = 200;     // piso del read definitivo / fast-path no-op
  const CONFIRM_POLICY = Object.freeze({
    av: { settleMs: CONFIRM_SETTLE_AV_MS },
    video: { settleMs: CONFIRM_SETTLE_STREAM_MS },
    audio: { settleMs: CONFIRM_SETTLE_STREAM_MS },
  });

  /**
   * Confirmación post-join por ventana del comando (fix real-hardware, v1.3.4).
   *
   * El firmware necesita settling time entre `join` y `get encoder`: la
   * lectura INMEDIATA puede devolver el valor ANTERIOR aunque el comando ya
   * se aplicó físicamente (el TV cambia, pero el routing table aún no
   * refleja el join). La ventana depende del comando emitido: mayor para
   * `join av` (CONFIRM_SETTLE_AV_MS) que para `join video`/`join audio`
   * (CONFIRM_SETTLE_STREAM_MS).
   *
   * Secuencia: read#1 inmediato (fast-path no-op/ya-settleado) y, si quedó
   * stale, un read definitivo anclado al settling del comando. El ancla es
   * `startMs` (post-join): si un read#1 tardío por congestión del semáforo ya
   * consumió la ventana, el read#2 sale enseguida (ya settleado) — nunca antes
   * del settling.
   *
   * HOTFIX 4 (one-join-lag): si agota la ventana sin coincidir, devuelve
   * `{ value, confirmed: false }` — el caller NO debe guardar ese valor como
   * reported (no envenenar); queda para el re-read postergado (3s/9s) o el
   * scan del reconciler.
   *
   * @param {{ settleMs: number }} [policy] política del comando emitido
   * @returns {{ value: string|null, confirmed: boolean }}
   */
  async function confirmEncoder(dest, sub, source, writeId, policy = CONFIRM_POLICY.video) {
    const settleMs = policy && Number.isFinite(policy.settleMs) ? policy.settleMs : CONFIRM_SETTLE_STREAM_MS;
    const startMs = Date.now();

    // Read#1 inmediato: resuelve el no-op/ya-settleado sin esperar la ventana.
    let reported = await client.getEncoder(dest, sub);
    let confirmed = reported === source;
    if (writeId) {
      const elapsed = Date.now() - startMs;
      const tag = confirmed ? "✓ (settled)" : "(stale, espera settling)";
      writeLog(writeId, "CONFIRM", `get#1 ${dest}/${sub} → "${reported}" ${tag} (t+${elapsed}ms)`);
    }
    if (confirmed) return { value: reported, confirmed };

    // Read#2 definitivo anclado a la ventana del comando: nunca antes del
    // settling; si el read#1 tardó más que la ventana (semáforo congestionado),
    // lee enseguida porque el destino ya settleó.
    const remaining = Math.max(CONFIRM_FIRST_READ_MS, settleMs - (Date.now() - startMs));
    await sleep(remaining);
    reported = await client.getEncoder(dest, sub);
    confirmed = reported === source;
    if (writeId) {
      const elapsed = Date.now() - startMs;
      const tag = confirmed ? "✓ (settled)" : "(stale, ventana agotada)";
      writeLog(writeId, "CONFIRM", `get#2 ${dest}/${sub} → "${reported}" ${tag} (t+${elapsed}ms)`);
    }
    return { value: reported, confirmed };
  }

  // ── Hotfix 4 (one-join-lag): re-read postergado de writes unconfirmed ──
  // Cuando confirmEncoder agota la ventana sin coincidir, el read stale NO
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

  // ── WS5-DEDUPE (T-5.2): lastBatch — último write por destino, in-memory ──
  // Map<dest, { source, sub, at }>. NO se persiste (decisión del change):
  // sobrevive solo al proceso. Marca resubmits idénticas y da el `reason`
  // del no-op en la respuesta del guard ("resubmit idéntica" vs
  // "reported confirmado"). Se actualiza en CADA executeWrite, emita join
  // o lo saltee, así que refleja la última intención efectiva del destino.
  const lastBatch = new Map();

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
    *
    * WS5-DEDUPE (T-5.1): `opts.force` saltea el guard pre-join. El guard
    * corre ANTES de emitir el join y NO toca `confirmEncoder` ni su ventana
    * de settling (PR #13): solo evita emitir un comando que el hardware ya
    * confirmó. Traducción de la condición del spec dentro de la tarea
    * encolada: `writeQueue.isBusy(dest)` es SIEMPRE true durante la ejecución
    * de la propia tarea (la tarea vive en la cadena), así que el "no busy"
    * real es `!writeQueue.hasPending(dest)` — nada pendiente detrás de esta.
    */
  async function executeWrite(dest, source, sub = "video", writeId, timings, opts = {}) {
    const force = opts.force === true;
    const t = timings || { queuedAt: Date.now(), startedAt: Date.now() };
    t.startedAt = Date.now(); // la tarea arrancó (salió de la cola)
    const domain = dest === TVRACK_ID ? "tvrack" : ZONA_FUERA_IDS.includes(dest) ? "zonasFuera" : "tvs";
    const key = domain === "tvs" ? toApp(dest) : dest;
    const wlog = (tag, msg) => writeLog(writeId, tag, msg);
    // Marca el destino como tocado AHORA: el reconciler que esté escaneando no
    // debe adoptarlo con una lectura previa (fix clobber scan/write).
    writeTouchedAt.set(dest, Date.now());
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

    // ── WS5-DEDUPE (T-5.1): guard pre-join ──
    // No-op iff `reported` CONFIRMADO ya es la fuente pedida (todas las
    // corrientes si linked) y no hay writes pendientes detrás de esta tarea.
    // `reported` solo lo escriben lecturas confirmadas (executeWrite §4,
    // re-reads y scan del reconciler), así que es confiable; si difiere
    // (one-join-lag) el join se emite — ante duda, NO saltear. `force:true`
    // saltea el guard (escape explícito del operador). `lastBatch` solo
    // informa el `reason`; NO participa de la decisión (evitar no-ops falsos).
    let confirmedReported; // valor confirmado actual del destino (para el no-op)
    let confirmedSame;
    if (linked) {
      const rep = domain === "tvrack" ? d.reported : d.reported ? d.reported[key] : undefined;
      confirmedReported = { video: source, audio: source };
      confirmedSame = !!rep && rep.video === source && rep.audio === source;
    } else if (domain === "tvs") {
      confirmedReported = d.reported[key];
      confirmedSame = confirmedReported === source;
    } else if (domain === "tvrack") {
      confirmedReported = d.reported ? d.reported[sub] : undefined;
      confirmedSame = confirmedReported === source;
    } else {
      confirmedReported = d.reported && d.reported[key] ? d.reported[key][sub] : undefined;
      confirmedSame = confirmedReported === source;
    }
    const skipJoin = !force && confirmedSame && !writeQueue.hasPending(dest);

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

    // ── WS5-DEDUPE (T-5.1): no-op confirmado → sin join ──
    // El desired YA quedó seteado (intención registrada y coherente con el
    // reported); se broadcastea y se responde {ok, noop:true, confirmed:true}
    // SIN emitir el comando al Arranger. `confirmEncoder` y su ventana de
    // settling (PR #13) quedan intactos: el guard termina aquí.
    if (skipJoin) {
      const prevBatch = lastBatch.get(dest);
      const reason =
        prevBatch && prevBatch.source === source && (prevBatch.sub || "video") === sub
          ? "resubmit idéntica (lastBatch)"
          : "reported confirmado";
      lastBatch.set(dest, { source, sub, at: Date.now() });
      wlog(
        "DEDUPE",
        `no-op ${dest}/${sub}=${source} — ${reason}; join NO emitido`,
      );
      await store.write();
      broadcastDomain(domain, writeId);
      return { ok: true, noop: true, confirmed: true, dest, source, sub, reported: confirmedReported };
    }

    // 2. Comando al Arranger — `joinKind` es la ÚNICA fuente de verdad: decide
    //    el dispatch del join y la política de confirmación (settling por comando).
    const joinKind = domain === "tvs" || linked ? "av" : sub === "audio" ? "audio" : "video";
    const joinStart = Date.now();
    const joinResult =
      joinKind === "av"
        ? await client.joinAv(source, dest, writeId)
        : joinKind === "audio"
          ? await client.joinAudio(source, dest, writeId)
          : await client.joinVideo(source, dest, writeId);
    t.joinMs = Date.now() - joinStart;
    if (!joinResult.ok) {
      wlog("ARRANGER", `→ join ${joinKind} ${source} ${dest} FAILED: ${joinResult.error || joinResult.text || "?"}`);
      await store.write();
      return { ok: false, dest, source, sub, error: joinResult.error || "join falló" };
    }
    wlog("ARRANGER", `→ join ${joinKind} ${source} ${dest} ok (${joinResult.text || ""})`);
    // WS5-DEDUPE: la intención efectiva de este destino quedó emitida.
    lastBatch.set(dest, { source, sub, at: Date.now() });

    // 3. Lectura post-comando (confirmación) — ventana por tipo de comando
    //    (ver confirmEncoder/CONFIRM_POLICY): read#1 inmediato + read#2 anclado
    //    al settling. En linked, ambos streams en paralelo con la política `av`.
    //    HOTFIX 4 (one-join-lag): si agota la ventana SIN coincidir, el valor
    //    leído es stale y NO se guarda como reported (no envenenar); queda el
    //    reported anterior y se agenda el re-read postergado (3s/9s) para
    //    converger en segundos.
    const confirmPolicy = CONFIRM_POLICY[joinKind];
    const confirmStart = Date.now();
    const confirm = linked
      ? await Promise.all([
          confirmEncoder(dest, "video", source, writeId, confirmPolicy),
          confirmEncoder(dest, "audio", source, writeId, confirmPolicy),
        ]).then(([video, audio]) => ({ video, audio }))
      : await confirmEncoder(dest, sub, source, writeId, confirmPolicy);
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
    } else if (domain === "channelIntent") {
      // App-only (CD-5): se difunde el desired (intención), nunca reported (null).
      payload = d.desired;
    } else if (domain === "matrixGroups") {
      // App-only (MG-1): se difunde el desired (intención de grupos),
      // nunca reported (null).
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
        channelIntent: snap.domains.channelIntent ? snap.domains.channelIntent.version : 1,
        matrixGroups: snap.domains.matrixGroups ? snap.domains.matrixGroups.version : 1,
      },
      domains: snap.domains,
      appOnly: snap.appOnly,
      matrixModel: MATRIX_MODEL,
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
   * @param {object} [opts] - { force } → saltea el guard WS5-DEDUPE en executeWrite
   * @returns {Promise<{ok, confirmed, reported}>} - siempre se resuelve
   */
  function writeInBackground(dest, domain, source, sub, writeId, opts = {}) {
    if (!BACKGROUND_CONFIRM) {
      // Modo síncrono (compat): se mantiene para rollback o tests E2E
      return writeQueue.enqueue(dest, () => executeWrite(dest, source, sub, writeId, undefined, opts));
    }
    // Fire-and-forget: la cola FIFO del writeQueue garantiza orden; el
    // broadcast del desired sale inmediato para que el cliente vea la
    // intención YA (no necesita esperar el join físico).
    const queuePos = writeQueue.pendingCount + 1;
    writeLog(writeId, "QUEUE", `enqueued ${dest} (pos ${queuePos}, pending ${writeQueue.pendingKeys.length})`);
    const timings = { queuedAt: Date.now(), startedAt: Date.now() };
    const task = writeQueue.enqueue(dest, () => executeWrite(dest, source, sub, writeId, timings, opts));
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
        if (result.noop) {
          // WS5-DEDUPE: no hubo join (el guard lo salteó); el broadcast del
          // desired ya salió desde el guard y la cola sigue limpia.
          writeLog(writeId, "WRITE", `DONE end-to-end ${((Date.now() - timings.queuedAt) / 1000).toFixed(1)}s (dedupe no-op, sin join)`);
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

  // Liveness probe para HEALTHCHECK del container Docker: sin limiter, sin
  // acceso al store — responde si el proceso Express y las rutas están vivos.
  app.get("/healthz", (req, res) => {
    res.json({ ok: true });
  });

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
      matrixModel: MATRIX_MODEL,
    };
    for (const name of ["tvs", "tvrack", "zonasFuera", "presets", "channelIntent", "matrixGroups"]) {
      const d = snap.domains[name];
      if (!d) continue; // seed sin backfill — dominio nuevo, se omite
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
  // WS5-DEDUPE: `force:true` en el body saltea el guard pre-join (escape
  // explícito "forzar reenvío" del operador, UXF-2).
  app.post("/api/tvs/:id/source", writesLimiter, async (req, res) => {
    const { id } = req.params;
    const { source, deviceId, force } = req.body || {};
    const src = source || deviceId;
    const dest = toArranger(id);
    if (!isDestination(dest)) {
      return res.status(400).json({ error: `Destino inválido: ${id}` });
    }
    if (!src || typeof src !== "string") {
      return res.status(400).json({ error: "source requerido" });
    }
    const writeOpts = { force: force === true };

    const writeId = nextWriteId();
    writeLog(writeId, "WRITE", `POST /api/tvs/${id}/source {source:"${src}"}${writeOpts.force ? " [force]" : ""} client=${req.ip || req.socket?.remoteAddress || "?"}`);

    if (BACKGROUND_CONFIRM) {
      // Background confirmation (fix real-hardware C): respondemos rápido
      // con confirmed=false; el join + confirmEncoder + broadcast del
      // reported corren en background. El cliente con optimistic overlay ve
      // el desired YA por el broadcast inmediato que dispara writeInBackground.
      writeInBackground(dest, "tvs", src, "video", writeId, writeOpts);
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

    const result = await writeQueue.enqueue(dest, () => executeWrite(dest, src, "video", writeId, undefined, writeOpts));
    if (!result.ok) {
      return res.status(502).json({ ok: false, id, source: src, error: result.error });
    }
    if (!result.noop) broadcastDomain("tvs");
    const d = store.getDomain("tvs");
    res.json({
      ok: true,
      // WS5-DEDUPE: no-op del guard → sin join, confirmado por el reported.
      noop: !!result.noop,
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

    // MG-2: resolver los valores de grupo EXCLUSIVAMENTE en el server,
    // derivando matrixGroups de las TVs individuales del preset con
    // collapseGroup. Mixed → null ("Mixto / Personalizado", MG-6); pantallas
    // faltantes del preset → null (no representable como opción conocida).
    const derived = {};
    for (const sg of matrixModel.subgroups()) {
      const v = collapseGroup(preset.tvs || {}, sg.screens);
      derived[sg.key] = v === undefined ? null : v;
    }
    store.setMatrixGroups(derived);
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

    for (const domain of ["tvs", "tvrack", "zonasFuera", "matrixGroups"]) broadcastDomain(domain);
    res.json({ ok: failed === 0, applied: results.length - failed, failed, results });
  });

  // ── WS3 — Intención de canal DTV (app-only, CD-1..CD-5) ──
  // El canal se modela como INTENCIÓN server-side, nunca como estado confirmado
  // del deco: la API V210826 no permite leer el canal; `send ir` solo da ACK del
  // controlador. Los dígitos IR siguen client-side (transporte /api/command) y el
  // cliente reporta el resultado del controlador vía el endpoint de ACK.
  const DECO_ID_RE = /^DTV[1-8]$/;

  app.post("/api/decos/:id/channel", writesLimiter, async (req, res) => {
    const { id } = req.params;
    if (!DECO_ID_RE.test(id)) {
      return res.status(400).json({ error: `Decodificador inválido: ${id}` });
    }
    const canal = req.body && req.body.canal != null ? String(req.body.canal).trim() : "";
    if (!canal) {
      return res.status(400).json({ error: "canal requerido" });
    }

    // CD-2: mismo canal vigente → "canal ya sintonizado" sin emitir IR. SOLO
    // si el canal vigente está CONFIRMADO (ack accepted): un intent
    // pending/rejected NO bloquea el reintento (y no debe "mentir" que cambió).
    const current = store.getDomain("channelIntent")?.desired[id];
    if (current && current.canalActual === canal && current.ack === "accepted") {
      return res.json({
        ok: true,
        noop: true,
        reason: "canal ya sintonizado",
        decoId: id,
        canalActual: canal,
        intent: current,
      });
    }

    const writeId = nextWriteId();
    writeLog(writeId, "WRITE", `channel intent ${id} → ${canal} (IR client-side, ACK pendiente)`);
    store.setChannelIntentEntry(id, {
      canalActual: canal,
      previousCanal: current && current.canalActual != null ? current.canalActual : null,
      lastSentAt: new Date().toISOString(),
      ack: "pending",
    });
    await store.write();
    broadcastDomain("channelIntent", writeId);
    const d = store.getDomain("channelIntent");
    res.json({
      ok: true,
      noop: false,
      message: `cambiando al canal ${canal}`,
      decoId: id,
      canalActual: canal,
      intent: d.desired[id],
      version: d.version,
    });
  });

  // ACK del controlador (resultado del IR client-side, CD-1): accepted
  // (`send ir success`) o rejected (fallo del controlador).
  app.post("/api/decos/:id/channel/ack", writesLimiter, async (req, res) => {
    const { id } = req.params;
    if (!DECO_ID_RE.test(id)) {
      return res.status(400).json({ error: `Decodificador inválido: ${id}` });
    }
    const { ack } = req.body || {};
    if (ack !== "accepted" && ack !== "rejected") {
      return res.status(400).json({ error: "ack debe ser 'accepted' o 'rejected'" });
    }
    if (!store.getDomain("channelIntent")?.desired[id]) {
      return res.status(404).json({ error: `Sin intención de canal para ${id}` });
    }
    const cur = store.getDomain("channelIntent")?.desired[id];
    if (ack === "rejected" && cur && cur.previousCanal != null) {
      // El IR falló: el cambio NO se implementó. Restaurar el canal vigente
      // para no dejar un estado falso (el panel debe reflejar la realidad).
      store.setChannelIntentEntry(id, { ack, canalActual: cur.previousCanal });
    } else {
      store.setChannelIntentEntry(id, { ack });
    }
    await store.write();
    broadcastDomain("channelIntent");
    const d = store.getDomain("channelIntent");
    res.json({ ok: true, decoId: id, intent: d.desired[id], version: d.version });
  });

  // ── WS4b — matrixGroups (MG-1..MG-6) ──
  // Dominio server-authoritative de la intención de grupos. El cliente envía
  // SOLO valores de subgrupo; el server valida contra el modelo declarativo
  // (MG-5: cada valor debe estar en optionsFor(size) del subgrupo — rechaza
  // p. ej. DTV9 o un combo de longitud incorrecta), expande a TVs (MG-4) y
  // encola los writes por el writeQueue. La dedupe no-op pre-join es WS5
  // (guard dentro de executeWrite); acá el writeQueue serializa por destino.
  app.post("/api/matrix-groups", writesLimiter, async (req, res) => {
    const values = req.body && req.body.values ? req.body.values : null;
    // WS5-DEDUPE: `force:true` reenvía todos los writes del submit salteando
    // el guard pre-join (escape explícito "forzar reenvío", UXF-2).
    const force = !!(req.body && req.body.force === true);
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      return res.status(400).json({ error: "Se espera { values: { [subgroupKey]: valor } }" });
    }

    // Validación MG-5 contra el modelo: clave = subgrupo conocido, valor ∈
    // optionsFor(size) o null (mixto explícito). Rechazo con 400 ANTES de
    // tocar el store ni expandir (cierra la SUGGESTION de la verificación WS4a).
    const errors = [];
    const valid = {};
    for (const [key, value] of Object.entries(values)) {
      const sg = matrixModel.findSubgroup(key);
      if (!sg) {
        errors.push(`${key}: subgrupo desconocido`);
        continue;
      }
      if (value === null) {
        valid[key] = null;
        continue;
      }
      if (!matrixModel.optionsFor(sg.screens.length).includes(value)) {
        errors.push(`${key}: valor inválido ${JSON.stringify(value)} (opciones válidas: tamaño ${sg.screens.length})`);
        continue;
      }
      valid[key] = value;
    }
    if (errors.length > 0) {
      return res.status(400).json({ error: "valores de grupo inválidos", details: errors });
    }
    if (Object.keys(valid).length === 0) {
      return res.json({ ok: true, noop: true, values: store.getMatrixGroups().desired });
    }

    // Expansión MG-4 (módulo puro): valores validados → patch de TVs.
    const { tvs } = expandGroups(valid);

    // Persistir la intención ANTES de encolar: los clientes ven matrixGroups
    // ya (broadcast inmediato) mientras los joins asientan en background.
    store.setMatrixGroups(valid);
    await store.write();
    const writeId = nextWriteId();
    writeLog(
      writeId,
      "WRITE",
      `POST /api/matrix-groups {${Object.entries(valid).map(([k, v]) => `${k}="${v}"`).join(", ")}} → ${Object.keys(tvs).length} writes`,
    );
    broadcastDomain("matrixGroups", writeId);

    // Write-through por pantalla (mismo pipeline que el batch de MatrizVideo).
    // Claves app del patch (VWN..TV26) → nomenclatura Arranger, igual que el
    // preset load (VWN viaja como VW-Norte al hardware).
    for (const [tvKey, source] of Object.entries(tvs)) {
      const dest = toArranger(tvKey);
      if (!isDestination(dest) || !source) continue;
      writeInBackground(dest, "tvs", source, "video", nextWriteId(), { force });
    }

    const d = store.getDomain("matrixGroups");
    res.json({
      ok: true,
      noop: false,
      values: d.desired,
      tvsPatch: tvs,
      version: d.version,
      lastUpdated: d.lastUpdated,
      sync: store.getSync(),
    });
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
    // WS5-DEDUPE: no-op del guard → sin join (el guard ya broadcasteó el desired).
    if (!result.noop) broadcastDomain("tvrack");
    const d = store.getDomain("tvrack");
    res.json({
      ok: true,
      // WS5-DEDUPE: no-op del guard → sin join, confirmado por el reported.
      noop: !!result.noop,
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

  // ── Zonas Fuera — 11 zonas externas ──
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
    // WS5-DEDUPE: no-op del guard → sin join (el guard ya broadcasteó el desired).
    if (!result.noop) broadcastDomain("zonasFuera");
    const d = store.getDomain("zonasFuera");
    res.json({
      ok: true,
      // WS5-DEDUPE: no-op del guard → sin join, confirmado por el reported.
      noop: !!result.noop,
      zoneId: id,
      ...d.desired[id],
      link,
      lastUpdated: d.lastUpdated,
    });
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
