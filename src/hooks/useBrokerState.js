import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createSseParser,
  buildSinceQuery,
  applySnapshot,
  applyStateEvent,
  applySync,
  applyOptimistic,
  applyPollBody,
  deriveVersions,
  nextPollDelay,
  isBrokerLoggingEnabled,
} from "./brokerClientCore";

const STREAM_URL = "/api/stream";
const BROKER_STATE_URL = "/api/broker/state";

// Heartbeat del server: 25s. Watchdog: 35s sin heartbeat/evento → degradar.
const HEARTBEAT_WATCHDOG_MS = 35 * 1000;
// Polling de respaldo: base 5s, backoff → 30s (design).
const POLL_BASE_MS = 5000;
const POLL_MAX_MS = 30000;
// Tras un poll exitoso, reintentar SSE (sin flapping: delay fijo).
const SSE_RETRY_AFTER_POLL_MS = 3000;

const INITIAL_SYNC = { status: "stale", lastSync: null };

/**
 * useBrokerState — conexión del cliente con el State Broker.
 *
 * - SSE /api/stream: snapshot al conectar + eventos `state` {domain, payload,
 *   version, lastUpdated} + eventos `sync` {status, lastSync} + heartbeat 25s.
 * - Reconexión automática con backoff.
 * - Degradación a polling versionado (GET /api/broker/state?since=...) cuando
 *   SSE falla o el heartbeat deja de llegar (gatillo del design), backoff
 *   5s→30s; vuelve a SSE tras un poll exitoso.
 * - Expone `syncStatus` {status, lastSync} estable y `snapshot` (estado broker
 *   crudo para derivar la UI).
 *
 * @returns {{ snapshot, syncStatus, mode, connected, lastError }}
 */
export function useBrokerState() {
  const [snapshot, setSnapshot] = useState(null);
  const [sync, setSync] = useState(INITIAL_SYNC);
  const [mode, setMode] = useState("sse"); // "sse" | "poll"
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Refs de control (sin re-render)
  const versionsRef = useRef({});
  const abortRef = useRef(null); // controller del stream SSE actual
  const watchdogRef = useRef(null); // timer del heartbeat
  const pollTimerRef = useRef(null); // timer del polling
  const sseRetryTimerRef = useRef(null); // timer de reintento SSE tras poll
  const modeRef = useRef("sse");
  const connectedRef = useRef(false);
  const disposedRef = useRef(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (sseRetryTimerRef.current) {
      clearTimeout(sseRetryTimerRef.current);
      sseRetryTimerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    clearWatchdog();
  }, [clearWatchdog]);

  /**
   * Degrada al polling de respaldo (spec sync-broadcast): cierra SSE, marca
   * mode=poll y dispara el primer poll inmediato.
   */
  const degradeToPoll = useCallback(
    (reason) => {
      if (disposedRef.current || modeRef.current === "poll") return;
      // Hotfix 3 observability: loggear la transición SSE→poll con motivo
      if (isBrokerLoggingEnabled()) {
        // eslint-disable-next-line no-console
        console.debug("[BROKER-CLIENT] SSE→poll:", reason);
      }
      stopStream();
      modeRef.current = "poll";
      setMode("poll");
      setConnected(false);
      connectedRef.current = false;
      setLastError(reason || "SSE no disponible, usando polling de respaldo");
      // Poll inmediato
      pollTimerRef.current = setTimeout(runPoll, 0);
    },
    [stopStream],
  );

  /**
   * Ciclo de polling versionado: GET /api/broker/state?since=... con backoff
   * 5s→30s. Tras un poll exitoso, reintenta la conexión SSE.
   */
  const runPoll = useCallback(
    async (attempt = 0) => {
      if (disposedRef.current || modeRef.current !== "poll") return;
      try {
        const since = buildSinceQuery(versionsRef.current);
        const url = since ? `${BROKER_STATE_URL}?since=${encodeURIComponent(since)}` : BROKER_STATE_URL;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`poll HTTP ${res.status}`);
        const body = await res.json();
        if (disposedRef.current || modeRef.current !== "poll") return;
        setSnapshot((prev) => applyPollBody(prev, body));
        if (body.sync) setSync({ status: body.sync.status || "stale", lastSync: body.sync.lastSync ?? null });
        if (body.versions) versionsRef.current = { ...versionsRef.current, ...body.versions };
        setConnected(true);
        connectedRef.current = true;
        setLastError(null);
        // SSE volvió a ser viable: reintentar conexión (sin flapping)
        sseRetryTimerRef.current = setTimeout(() => {
          if (disposedRef.current || modeRef.current !== "poll") return;
          stopStream();
          connectSse(true);
        }, SSE_RETRY_AFTER_POLL_MS);
} catch (err) {
      if (disposedRef.current || modeRef.current !== "poll") return;
      setConnected(false);
      connectedRef.current = false;
      setLastError(err?.message || "Polling falló");
      if (isBrokerLoggingEnabled()) {
        // eslint-disable-next-line no-console
        console.debug("[BROKER-CLIENT] poll fail attempt=", attempt, "err=", err?.message);
      }
      pollTimerRef.current = setTimeout(() => runPoll(attempt + 1), nextPollDelay(attempt, POLL_BASE_MS, POLL_MAX_MS));
    }
    },
    [stopStream],
  );

  /**
   * Conexión SSE con parser manual (detecta heartbeat, que el EventSource
   * nativo oculta). `fromPoll` indica que venimos de un poll exitoso.
   */
  const connectSse = useCallback(
    (fromPoll = false) => {
      if (disposedRef.current) return;
      if (modeRef.current === "sse" && abortRef.current && connectedRef.current) return; // ya conectado

      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      // Watchdog: si no llega heartbeat/evento en 35s → degradar a polling.
      const armWatchdog = () => {
        clearWatchdog();
        watchdogRef.current = setTimeout(() => {
          if (abortRef.current === controller) {
            degradeToPoll("heartbeat timeout (35s sin datos SSE)");
          }
        }, HEARTBEAT_WATCHDOG_MS);
      };

      const onEvent = (name, data) => {
        if (disposedRef.current || abortRef.current !== controller) return;
        armWatchdog();
        try {
          const payload = JSON.parse(data);
          if (name === "snapshot") {
            setSnapshot((prev) => applySnapshot(prev, payload));
            // El snapshot SSE del store raw no trae `versions` top-level;
            // derivarla de los dominios para el polling versionado.
            versionsRef.current = payload.versions || deriveVersions(payload.domains) || {};
            if (payload.sync) setSync({ status: payload.sync.status || "stale", lastSync: payload.sync.lastSync ?? null });
          } else if (name === "state") {
            setSnapshot((prev) => applyStateEvent(prev, payload));
            if (payload.domain && typeof payload.version === "number") {
              versionsRef.current = { ...versionsRef.current, [payload.domain]: payload.version };
            }
          } else if (name === "sync") {
            setSync({ status: payload.status || "stale", lastSync: payload.lastSync ?? null });
          }
        } catch {
          // evento malformado — ignorar
        }
      };

      fetch(STREAM_URL, { signal: controller.signal })
        .then(async (res) => {
          if (disposedRef.current || abortRef.current !== controller) return;
          if (res.status === 503) {
            // Máximo de conexiones SSE alcanzado → polling de respaldo
            degradeToPoll("503: máx conexiones SSE");
            return;
          }
          if (!res.ok || !res.body) {
            degradeToPoll(`SSE HTTP ${res.status}`);
            return;
          }
          modeRef.current = "sse";
          setMode("sse");
          setConnected(true);
          connectedRef.current = true;
          setLastError(null);
          if (isBrokerLoggingEnabled()) {
            // eslint-disable-next-line no-console
            console.debug("[BROKER-CLIENT] SSE conectado (fromPoll=", fromPoll, ")");
          }

          const parser = createSseParser({
            onEvent,
            onHeartbeat: () => armWatchdog(),
            onRetry: () => {}, // sin replay: snapshot en cada connect
          });
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (disposedRef.current || abortRef.current !== controller) {
              reader.cancel().catch(() => {});
              break;
            }
            parser.push(decoder.decode(value, { stream: true }));
          }
          if (disposedRef.current || abortRef.current !== controller) return;
          // Stream cerrado por el server sin degradación previa
          degradeToPoll("SSE stream cerrado");
        })
        .catch((err) => {
          if (disposedRef.current || abortRef.current !== controller) return;
          if (err?.name === "AbortError") return; // cierre intencional
          degradeToPoll(err?.message || "SSE error");
        });

      armWatchdog();
    },
    [clearWatchdog, degradeToPoll],
  );

  // Conexión inicial + cleanup
  useEffect(() => {
    disposedRef.current = false;
    connectSse(false);
    return () => {
      disposedRef.current = true;
      stopStream();
      clearPoll();
      clearWatchdog();
    };
  }, [connectSse, stopStream, clearPoll, clearWatchdog]);

  const syncStatus = useMemo(
    () => ({ status: sync.status || "stale", lastSync: sync.lastSync ?? null }),
    [sync.status, sync.lastSync],
  );

  /**
   * Overlay optimista del snapshot local (fix real-hardware A): los handlers
   * lo aplican al disparar un write para feedback visual inmediato. El evento
   * SSE del broker (confirmación real) o un snapshot/poll lo limpian.
   * @param {string} domain - tvs | tvrack | zonasFuera
   * @param {object} patch - parche del dominio (ver brokerClientCore.applyOptimistic)
   */
  const applyOptimisticState = useCallback((domain, patch) => {
    setSnapshot((prev) => applyOptimistic(prev, domain, patch));
  }, []);

  return { snapshot, syncStatus, mode, connected, lastError, applyOptimistic: applyOptimisticState };
}
