import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ProviderUser, estadoInicial } from "./contexto/Contexto";
import { DISPOSITIVOS, getDevice } from "./contexto/dispositivos";
import {
  fetchZonasFueraState,
  setZonasFueraVideo,
  setZonasFueraAudio,
  setZonasFueraLink,
  assignVideoSource,
  assignAudioSource,
  assignSourceToDestination,
} from "./api/arrangerApi";
import { useArrangerReconciliation } from "./hooks/useArrangerReconciliation";
import Body from "./componentes/Body";
import { useToast } from "./componentes/Toast";
import ThemeProvider from "./contexto/ThemeProvider";
import "./componentes/Toast.css";

// Migration function: converts v0 (decos[]) to v1 (dispositivos{})
const migrarEstado = (oldData) => {
  try {
    const dispositivos = {};
    if (oldData.decos && Array.isArray(oldData.decos)) {
      oldData.decos.forEach((deco) => {
        const device = getDevice(deco.nombreDeco);
        if (device) {
          dispositivos[deco.nombreDeco] = {
            canalActual: deco.canalDeco,
            capabilities: device.fallbackCapabilities,
            online: true,
          };
        }
      });
    }
    // Fill any devices missing from old data
    Object.entries(DISPOSITIVOS).forEach(([id, device]) => {
      if (!dispositivos[id]) {
        dispositivos[id] = {
          canalActual: device.defaultChannel,
          capabilities: device.fallbackCapabilities,
          online: true,
        };
      }
    });
    return {
      ...oldData,
      dispositivos,
      _version: 1,
    };
  } catch (error) {
    console.warn("Migration failed, using initial state:", error);
    return { ...estadoInicial, _version: 1 };
  }
};

const App = () => {
  const [estado, setEstado] = useState(estadoInicial);
  const [tvrackState, setTvrackState] = useState(() => {
    try {
      const saved = localStorage.getItem("tvrackState");
      return saved ? JSON.parse(saved) : { video: "DTV1", audio: "DTV1", link: false };
    } catch { return { video: "DTV1", audio: "DTV1", link: false }; }
  });
  const [zonasFueraState, setZonasFueraState] = useState(() => {
    try {
      const saved = localStorage.getItem("zonasFueraState");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const toast = useToast();
  const [estadoLoaded, setEstadoLoaded] = useState(false);
  const [errorDecos, setErrorDecos] = useState(false);

  // ── Reconciliación con Arranger (hook extraído) ──
  const {
    progress,
    diffs,
    status: reconciliationStatus,
    elapsedMs,
    lastSync,
    cachedDiffs,
    cachedAt,
    retryCount,
    partial,
    reconcile,
    clearDiffs,
  } = useArrangerReconciliation(estado.tvs, zonasFueraState, tvrackState);

  // Load state: server first, localStorage fallback, then initial state
  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      // 1. Try server (shared state across devices)
      try {
        const res = await fetch("/api/state");
        if (res.ok) {
          const { state } = await res.json();
          if (state && !cancelled) {
            setEstado(state);
            setEstadoLoaded(true);
            return;
          }
        }
      } catch {
        // Server not available, fall through to localStorage
        if (!cancelled) setErrorDecos(true);
      }

      // 2. Fallback to localStorage
      const saved = localStorage.getItem("estadoApp");
      if (saved && !cancelled) {
        try {
          const parsed = JSON.parse(saved);
          if (!parsed._version || parsed._version < 1) {
            const migrated = migrarEstado(parsed);
            localStorage.setItem("estadoApp", JSON.stringify(migrated));
            // Also migrate presets
            for (let i = 1; i <= 5; i++) {
              const key = `estadoApp_Preset${i}`;
              const presetSaved = localStorage.getItem(key);
              if (presetSaved) {
                try {
                  const presetParsed = JSON.parse(presetSaved);
                  if (!presetParsed._version || presetParsed._version < 1) {
                    localStorage.setItem(key, JSON.stringify(migrarEstado(presetParsed)));
                  }
                } catch {
                  // skip corrupted preset
                }
              }
            }
            setEstado(migrated);
          } else {
            setEstado(parsed);
          }
          setEstadoLoaded(true);
          return;
        } catch {
          // corrupted localStorage
        }
      }

      // 3. Use initial state
      if (!cancelled) {
        setEstado(estadoInicial);
        setEstadoLoaded(true);
        // If we reached here, both server and localStorage failed
        setErrorDecos(true);
      }
    }

    loadState();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Reconciliación con Arranger al iniciar (una sola vez) ──
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; });
  useEffect(() => {
    const timer = setTimeout(() => {
      toastRef.current.info("🔄 Sincronizando con Arranger...", { autoClose: 3000 });
      reconcile();
    }, 1000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — solo una vez al montar

  // ── Aplicar diffs en un único batch al terminar la reconciliación ──
  // PR3 4.4: tras aplicar el batch se notifica con toast y se limpian los diffs
  // (ya no representan el estado real — el Arranger pasó a ser la fuente).
  const appliedDiffsRef = useRef(null);
  const toastSuccessRef = useRef();

  // ── Polling: suspendido durante reconciliación + hasta que los POSTs al server terminen ──
  // reconcileSavedRef: TRUE = bloquea polling (POSTs pendientes). FALSE = datos ya en server.
  // Se activa cuando arranca reconciliación, se desactiva cuando los POSTs del batchApply terminan.
  const reconcileSavedRef = useRef(true); // arranca bloqueado — no hay datos reales aún

  // Al iniciar reconciliación: bloquear polling
  useEffect(() => {
    if (reconciliationStatus === "fetching") {
      reconcileSavedRef.current = true;
    }
  }, [reconciliationStatus]);

  const pollingBlocked =
    reconciliationStatus === "fetching" ||
    reconciliationStatus === "comparing" ||
    reconcileSavedRef.current;
  useEffect(() => {
    toastSuccessRef.current = toast.success;
  });
  useEffect(() => {
    if (reconciliationStatus !== "done" || diffs.length === 0) return;
    if (appliedDiffsRef.current === diffs) return; // ya aplicados en este run
    appliedDiffsRef.current = diffs;

    let tvsChanged = false;
    let zonasChanged = false;
    let tvrackChanged = false;
    let applied = 0;
    const newTvs = { ...estado.tvs };
    const newZonas = { ...zonasFueraState };
    const newTvrack = { ...tvrackState };

    for (const diff of diffs) {
      // PR3 4.2: destinos sin respuesta (arranger null) NO se auto-aplican —
      // quedan visibles en SyncPanel con Aplicar deshabilitado.
      if (diff.arranger == null) continue;
      switch (diff.type) {
        case "tv":
          newTvs[diff.dest] = diff.arranger;
          tvsChanged = true;
          applied += 1;
          break;
        case "tvrack-video":
          newTvrack.video = diff.arranger;
          tvrackChanged = true;
          applied += 1;
          break;
        case "tvrack-audio":
          newTvrack.audio = diff.arranger;
          tvrackChanged = true;
          applied += 1;
          break;
        case "zona-video":
          // Inicializar zona con defaults si no existe (deploy fresco)
          if (!newZonas[diff.dest]) newZonas[diff.dest] = { video: "DTV1", audio: "DTV1", link: false };
          newZonas[diff.dest] = { ...newZonas[diff.dest], video: diff.arranger };
          zonasChanged = true;
          applied += 1;
          break;
        case "zona-audio":
          if (!newZonas[diff.dest]) newZonas[diff.dest] = { video: "DTV1", audio: "DTV1", link: false };
          newZonas[diff.dest] = { ...newZonas[diff.dest], audio: diff.arranger };
          zonasChanged = true;
          applied += 1;
          break;
        default:
          break;
      }
    }

    if (tvsChanged) setEstado((prev) => ({ ...prev, tvs: newTvs }));
    if (zonasChanged) {
      setZonasFueraState(newZonas);
      localStorage.setItem("zonasFueraState", JSON.stringify(newZonas));
    }
    if (tvrackChanged) {
      setTvrackState(newTvrack);
      localStorage.setItem("tvrackState", JSON.stringify(newTvrack));
    }

    // Persistir al server como batch atómico y SOLTAR el bloqueo de polling
    // cuando TODOS los POSTs hayan terminado (éxito o error).
    const serverPosts = [];
    if (zonasChanged) {
      for (const [id, data] of Object.entries(newZonas)) {
        serverPosts.push(
          fetch(`/api/zonas-fuera/${id}/video`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceId: data.video }),
          }).catch(() => {}),
          fetch(`/api/zonas-fuera/${id}/audio`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceId: data.audio }),
          }).catch(() => {})
        );
      }
    }
    if (tvrackChanged) {
      serverPosts.push(
        fetch("/api/tvrack/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: newTvrack.video }),
        }).catch(() => {}),
        fetch("/api/tvrack/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: newTvrack.audio }),
        }).catch(() => {})
      );
    }

    // Cuando todos los POSTs terminan → soltar bloqueo → polling arranca
    // con los datos YA guardados en el server.
    if (serverPosts.length > 0) {
      Promise.allSettled(serverPosts).finally(() => {
        reconcileSavedRef.current = false;
      });
    } else {
      reconcileSavedRef.current = false;
    }

    // Notificación + limpieza: los diffs ya se aplicaron automáticamente.
    if (applied > 0) {
      toastSuccessRef.current(`✅ ${applied} cambio(s) aplicados desde Arranger`);
      clearDiffs();
    }
  }, [reconciliationStatus, diffs, estado.tvs, zonasFueraState, tvrackState, clearDiffs]);

  // Persist state: localStorage + server (fire-and-forget)
  useEffect(() => {
    if (!estadoLoaded) return;

    // Always persist to localStorage (fast, sync-safe for current device)
    localStorage.setItem("estadoApp", JSON.stringify(estado));

    // Also persist to server (shared state across devices, fire-and-forget)
    fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: estado }),
    }).catch(() => {
      // Server not available — state still persisted in localStorage
    });
  }, [estado, estadoLoaded]);

  // Polling interval shared across all polling effects
  const POLL_INTERVAL_MS = 5000;

  // ── Polling: sync zonas fuera state from server every 5s ──
  useEffect(() => {
    if (pollingBlocked) return; // reconciliación corriendo — polling suspendido

    let cancelled = false;

    async function loadZonasFuera() {
      try {
        const data = await fetchZonasFueraState();
        if (!cancelled) {
          setZonasFueraState((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
            return data;
          });
        }
      } catch {
        // Server not available — silently retry next poll
      }
    }

    // Delay first poll so Express has time to start
    const initialTimer = setTimeout(loadZonasFuera, 2000);
    const interval = setInterval(loadZonasFuera, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, [pollingBlocked]);

  // ── Polling: sync state from server every 5s (multi-PC support) ──
  useEffect(() => {
    if (pollingBlocked) return; // reconciliación corriendo — polling suspendido

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/state");
        if (!res.ok) return;
        const { state: serverState } = await res.json();
        if (!serverState) return;

        setEstado((prev) => {
          if (JSON.stringify(prev.tvs) === JSON.stringify(serverState.tvs)) {
            return prev;
          }
          return { ...serverState };
        });
      } catch {
        // Server not available — ignore
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pollingBlocked]);

  // ── Polling: sync TVRACK state from server every 5s ──
  useEffect(() => {
    if (pollingBlocked) return; // reconciliación corriendo — polling suspendido

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/tvrack/state");
        if (!res.ok) return;
        const tvrack = await res.json();
        setTvrackState((prev) => {
          if (
            prev.video === tvrack.video &&
            prev.audio === tvrack.audio &&
            prev.link === tvrack.link
          ) {
            return prev;
          }
          return tvrack;
        });
      } catch {
        // Server not available
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pollingBlocked]);

  const handleChangeEstadoDecos = (decos) => {
    setEstado((prev) => {
      const dispositivos = { ...prev.dispositivos };
      decos.forEach((deco) => {
        if (dispositivos[deco.nombreDeco]) {
          dispositivos[deco.nombreDeco] = {
            ...dispositivos[deco.nombreDeco],
            canalActual: deco.canalDeco,
          };
        }
      });
      return { ...prev, decos, dispositivos };
    });
  };

  const handleUpdateDispositivo = (id, updates) => {
    setEstado((prev) => ({
      ...prev,
      dispositivos: {
        ...prev.dispositivos,
        [id]: {
          ...prev.dispositivos[id],
          ...updates,
        },
      },
    }));
  };
  const handleChangeEstadoAudio = (audio) => {
    setEstado((estado) => {
      return {
        ...estado,
        audio,
      };
    });
  };
  const handleChangeEstadoVideo = (tvs) => {
    setEstado((estado) => {
      return {
        ...estado,
        tvs,
      };
    });
    //Actualiza los colores del estado delos TVs en el ASIDE
    // Get the root element
    //let r = document.querySelector(":root");
    // Create a function for setting a variable value
    // r.style.setProperty('--VWC', 'blue');
  };
  const handleChangeEstadoPreset = (descripcionPreset) => {
    setEstado((estado) => {
      return {
        ...estado,
        descripcionPreset,
      };
    });
  };
  const handleChangeTvrack = (newTvrack) => {
    setTvrackState(newTvrack);
    localStorage.setItem("tvrackState", JSON.stringify(newTvrack));
  };

  const reintentarDecos = async () => {
    setErrorDecos(false);
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const { state } = await res.json();
        if (state) {
          setEstado(state);
          setEstadoLoaded(true);
          return;
        }
      }
    } catch {
      // Server still not available
      setErrorDecos(true);
    }

    // Fallback to localStorage
    const saved = localStorage.getItem("estadoApp");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const data = !parsed._version || parsed._version < 1
          ? migrarEstado(parsed)
          : parsed;
        setEstado(data);
        setEstadoLoaded(true);
        return;
      } catch {
        // corrupted
      }
    }

    // Ultimate fallback
    setEstado(estadoInicial);
    setEstadoLoaded(true);
  };

  const handleZonasFueraChange = async (zoneId, type, deviceId) => {
    const prev = zonasFueraState[zoneId] || {};
    let response;

    try {
      if (type === "video" || type === "audio") {
        if (prev.link) {
          // Vinculado: join av en un solo comando, mismo patrón que TVRACK
          await assignSourceToDestination(deviceId, zoneId);
          response = type === "video"
            ? await setZonasFueraVideo(zoneId, deviceId)
            : await setZonasFueraAudio(zoneId, deviceId);
          toast.success(`${deviceId} → VIDEO + AUDIO ${zoneId}`);
        } else {
          // Desvinculado: comandos separados
          if (type === "video") {
            await assignVideoSource(deviceId, zoneId);
            response = await setZonasFueraVideo(zoneId, deviceId);
          } else {
            await assignAudioSource(deviceId, zoneId);
            response = await setZonasFueraAudio(zoneId, deviceId);
          }
          toast.success(`${deviceId} → ${type.toUpperCase()} ${zoneId}`);
        }
      } else if (type === "link") {
        response = await setZonasFueraLink(zoneId, deviceId);
      }

      if (response) {
        setZonasFueraState((prevState) => ({
          ...prevState,
          [zoneId]: response,
        }));
      }
    } catch (err) {
      console.error(`[zonas-fuera] Error en ${type} para ${zoneId}:`, err);
      toast.error(`Error al cambiar ${type} en ${zoneId}`);
    }
  };

  return (
    <Router>
      <ThemeProvider>
          <ProviderUser
            value={{
              estado,
              estadoLoaded,
              errorDecos,
              tvrackState,
              zonasFueraState,
              handleChangeEstadoDecos,
            handleChangeEstadoAudio,
            handleChangeEstadoVideo,
            handleChangeEstadoPreset,
            handleUpdateDispositivo,
            handleChangeTvrack,
            handleZonasFueraChange,
            reintentarDecos,
            reconciliationStatus: { status: reconciliationStatus, progress, diffs, elapsedMs, lastSync, cachedDiffs, cachedAt, retryCount, partial, reconcile, clearDiffs },
          }}
        >
          <Body />
        </ProviderUser>
      </ThemeProvider>
    </Router>
  );
};

export default App;
