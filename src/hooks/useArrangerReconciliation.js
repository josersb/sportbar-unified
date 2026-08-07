import { useCallback, useEffect, useReducer, useRef } from "react";
import { fetchMatrixState } from "../api/arrangerApi";

// Clave del cache en localStorage (PR3: read en mount + badge de stale)
const CACHE_KEY = "arrangerSyncCache";

// Un sync se considera "stale" (desfasado) después de 1 hora sin refrescar.
const STALE_SYNC_MS = 60 * 60 * 1000;
// Un cache de más de 24 h se ignora por completo (datos demasiado viejos).
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * true si el último sync es null (nunca sincronizado) o tiene más de 1 h (PR3 4.5).
 * @param {string|null} lastSync — ISO timestamp del último sync
 * @param {number} [now] — epoch ms (inyectable para tests)
 */
export function isStaleSync(lastSync, now = Date.now()) {
  if (!lastSync) return true;
  const t = new Date(lastSync).getTime();
  if (Number.isNaN(t)) return true;
  return now - t > STALE_SYNC_MS;
}

// Mapeo de nombres reales del Arranger (VW-*) a los usados por la app (VW*).
const VW_REVERSE = { "VW-Norte": "VWN", "VW-Centro": "VWC", "VW-Sur": "VWS" };

// Máquina de estados (useReducer): idle → fetching → comparing → done | error
const initialState = {
  status: "idle",
  progress: { done: 0, total: 0, subscription: "video" },
  diffs: [],
  elapsedMs: 0,
  lastSync: null,
  // PR3: último resultado conocido (cache de localStorage + cada DONE) para
  // mostrarlo con badge de stale cuando el Arranger está offline.
  cachedDiffs: [],
  cachedAt: null,
  // PR3 4.3: corridas fallidas consecutivas (se resetea al lograr un DONE).
  retryCount: 0,
  // PR3 4.2: resumen de destinos sin respuesta por suscripción (video/audio).
  partial: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "START":
      return {
        ...state,
        status: "fetching",
        progress: { done: 0, total: 2, subscription: "video" },
        diffs: [],
        elapsedMs: 0,
        partial: null,
      };
    case "FETCH_PROGRESS":
      return {
        ...state,
        progress: { ...state.progress, done: action.done, subscription: action.subscription },
      };
    case "COMPARING":
      return { ...state, status: "comparing" };
    case "DONE":
      return {
        ...state,
        status: "done",
        diffs: action.diffs,
        elapsedMs: action.elapsedMs,
        lastSync: action.lastSync,
        cachedDiffs: action.diffs,
        cachedAt: action.lastSync,
        retryCount: 0,
        partial: action.partial,
      };
    case "ERROR":
      // PR3 4.3: cada fallo consecutivo incrementa el contador de reintentos.
      return { ...state, status: "error", elapsedMs: action.elapsedMs, retryCount: state.retryCount + 1 };
    case "CACHE_LOAD":
      // PR3 4.1: cache < 24 h leído en mount — inicializa lastSync + datos viejos.
      return {
        ...state,
        cachedDiffs: action.diffs,
        cachedAt: action.timestamp,
        lastSync: state.lastSync ?? action.timestamp,
      };
    case "CLEAR_DIFFS":
      // PR3 4.4: diffs ya aplicados automáticamente por App.jsx — se limpian.
      return { ...state, diffs: [] };
    default:
      return state;
  }
}

/**
 * Compara el estado real del Arranger (video + audio) contra el estado de la app
 * en 5 dominios: TVs, TVRACK video, TVRACK audio, zonas-fuera video, zonas-fuera audio.
 * Devuelve solo diferencias donde el Arranger tiene un encoder conectado y distinto,
 * más los destinos que NO respondieron (arranger null, PR3 4.2) cuando la app tiene
 * un valor para ellos — se muestran con "—" y Aplicar deshabilitado.
 */
function buildDiffs(videoData, audioData, tvs, tvrackState, zonasFueraState) {
  const diffs = [];

  // Dominio 1: TVs (TV01-TV26 + VW-Norte/Centro/Sur → VWN/VWC/VWS)
  for (const [dest, encoder] of Object.entries(videoData)) {
    if (dest === "TVRACK") continue; // TVRACK tiene dominio propio
    const key = VW_REVERSE[dest] || dest;
    if (tvs[key] !== undefined && tvs[key] !== encoder) {
      diffs.push({ dest: key, type: "tv", app: tvs[key], arranger: encoder ?? null });
    }
  }

  // Dominio 2: TVRACK video
  const tvrackVideo = videoData.TVRACK ?? null;
  if (tvrackState.video !== undefined && tvrackState.video !== tvrackVideo) {
    diffs.push({ dest: "TVRACK", type: "tvrack-video", app: tvrackState.video, arranger: tvrackVideo });
  }

  // Dominio 3: TVRACK audio
  const tvrackAudio = audioData.TVRACK ?? null;
  if (tvrackState.audio !== undefined && tvrackState.audio !== tvrackAudio) {
    diffs.push({ dest: "TVRACK", type: "tvrack-audio", app: tvrackState.audio, arranger: tvrackAudio });
  }

  // Dominio 4: zonas-fuera video
  for (const [dest, encoder] of Object.entries(videoData)) {
    if (!zonasFueraState[dest]) continue;
    const enc = encoder ?? null;
    if (zonasFueraState[dest].video !== enc) {
      diffs.push({ dest, type: "zona-video", app: zonasFueraState[dest].video, arranger: enc });
    }
  }

  // Dominio 5: zonas-fuera audio
  for (const [dest, encoder] of Object.entries(audioData)) {
    if (!zonasFueraState[dest]) continue;
    const enc = encoder ?? null;
    if (zonasFueraState[dest].audio !== enc) {
      diffs.push({ dest, type: "zona-audio", app: zonasFueraState[dest].audio, arranger: enc });
    }
  }

  return diffs;
}

/**
 * Resumen de parcialidad por suscripción (PR3 4.2).
 * Devuelve { video, audio } con { total, connected, disconnected } solo para
 * las suscripciones que tuvieron destinos sin respuesta; null en el resto.
 */
function buildPartial(videoRes, audioRes) {
  const summarize = (res) =>
    res && res.status === "fulfilled" && res.value && res.value.disconnected > 0
      ? {
          total: res.value.destinations,
          connected: res.value.connected,
          disconnected: res.value.disconnected,
        }
      : null;
  return { video: summarize(videoRes), audio: summarize(audioRes) };
}

/**
 * Hook de reconciliación Arranger ↔ app.
 *
 * @param {Object} tvs — estado.tvs de la app (TV01-TV26, VWN/VWC/VWS, ...)
 * @param {Object} zonasFueraState — zonas fuera de sportbar (video/audio por zona)
 * @param {Object} tvrackState — { video, audio, link } del TV del rack
 * @returns {{ progress: {done:number,total:number,subscription:string}, diffs:Array,
 *            status: 'idle'|'fetching'|'comparing'|'done'|'error',
 *            elapsedMs:number, lastSync:string|null, cachedDiffs:Array, cachedAt:string|null,
 *            retryCount:number, partial:Object|null, reconcile: () => void, clearDiffs: () => void }}
 */
export function useArrangerReconciliation(tvs, zonasFueraState, tvrackState) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Refs frescos: mantienen reconcile() estable sin closures obsoletos
  const tvsRef = useRef(tvs);
  const zonasRef = useRef(zonasFueraState);
  const tvrackRef = useRef(tvrackState);
  const statusRef = useRef(state.status);
  const controllerRef = useRef(null);

  useEffect(() => {
    tvsRef.current = tvs;
  }, [tvs]);
  useEffect(() => {
    zonasRef.current = zonasFueraState;
  }, [zonasFueraState]);
  useEffect(() => {
    tvrackRef.current = tvrackState;
  }, [tvrackState]);
  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  // Abort de la corrida en vuelo al desmontar (task 1.3)
  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  // PR3 4.1: cache de localStorage en mount — último resultado conocido < 24 h.
  // Poblá lastSync + cachedDiffs para que SyncPanel muestre datos viejos con
  // badge de stale mientras (o si) el Arranger está offline.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.timestamp) return;
      const age = Date.now() - new Date(parsed.timestamp).getTime();
      if (Number.isNaN(age) || age > CACHE_MAX_AGE_MS) return; // cache demasiado viejo
      dispatch({ type: "CACHE_LOAD", diffs: Array.isArray(parsed.diffs) ? parsed.diffs : [], timestamp: parsed.timestamp });
    } catch {
      // cache corrupto — se ignora, el sync normal funciona igual
    }
  }, []);

  const reconcile = useCallback(() => {
    // Prevención de doble llamada (task 1.2): mientras corre, no-op
    if (statusRef.current === "fetching" || statusRef.current === "comparing") return;

    // Abortar corrida previa y arrancar con un controller nuevo (task 1.3)
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;

    const start = Date.now();
    dispatch({ type: "START" });

    let done = 0;
    const track = (subscription) => {
      done += 1;
      dispatch({ type: "FETCH_PROGRESS", done, subscription });
    };

    Promise.allSettled([
      fetchMatrixState("video", signal).then((data) => {
        track("video");
        return data;
      }),
      fetchMatrixState("audio", signal).then((data) => {
        track("audio");
        return data;
      }),
    ]).then(([videoRes, audioRes]) => {
      if (signal.aborted) return;

      // Arranger completamente offline → error (PR3 refina con parciales/stale)
      if (videoRes.status === "rejected" && audioRes.status === "rejected") {
        dispatch({ type: "ERROR", elapsedMs: Date.now() - start });
        return;
      }

      dispatch({ type: "COMPARING" });
      const videoData = videoRes.status === "fulfilled" ? videoRes.value.state || {} : {};
      const audioData = audioRes.status === "fulfilled" ? audioRes.value.state || {} : {};
      const diffs = buildDiffs(
        videoData,
        audioData,
        tvsRef.current,
        tvrackRef.current,
        zonasRef.current
      );
      const elapsedMs = Date.now() - start;
      const lastSync = new Date().toISOString();
      // PR3 4.2: cuántos destinos no respondieron por suscripción (banner parcial).
      const partial = buildPartial(videoRes, audioRes);
      dispatch({ type: "DONE", diffs, elapsedMs, lastSync, partial });

      // Persistencia del último sync exitoso (task 1.4) — PR3 lo lee en mount
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ diffs, timestamp: lastSync, status: "done" }));
      } catch {
        // localStorage no disponible — el sync funciona igual
      }
    });
  }, []);

  // PR3 4.4: App.jsx limpia los diffs tras aplicarlos automáticamente en batch.
  const clearDiffs = useCallback(() => {
    dispatch({ type: "CLEAR_DIFFS" });
  }, []);

  return {
    progress: state.progress,
    diffs: state.diffs,
    status: state.status,
    elapsedMs: state.elapsedMs,
    lastSync: state.lastSync,
    cachedDiffs: state.cachedDiffs,
    cachedAt: state.cachedAt,
    retryCount: state.retryCount,
    partial: state.partial,
    reconcile,
    clearDiffs,
  };
}
