import { useState, useEffect } from "react";
import { ProviderUser, estadoInicial } from "./contexto/Contexto";
import { DISPOSITIVOS, getDevice } from "./contexto/dispositivos";
import {
  fetchZonasFueraState,
  setZonasFueraVideo,
  setZonasFueraAudio,
  setZonasFueraLink,
  assignVideoSource,
  assignAudioSource,
} from "./api/arrangerApi";
import Body from "./componentes/Body";
import { ToastProvider } from "./componentes/Toast";
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
  const [tvrackState, setTvrackState] = useState({ video: "DTV1", audio: "DTV1", link: false });
  const [zonasFueraState, setZonasFueraState] = useState({});
  const toast = useToast();
  const [estadoLoaded, setEstadoLoaded] = useState(false);

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
      }
    }

    loadState();
    return () => {
      cancelled = true;
    };
  }, []);

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

    // Delay first poll so Express has time to start (avoids ECONNREFUSED proxy noise)
    const initialTimer = setTimeout(loadZonasFuera, 2000);
    const interval = setInterval(loadZonasFuera, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, []);

  // ── Polling: sync state from server every 5s (multi-PC support) ──
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/state");
        if (!res.ok) return;
        const { state: serverState } = await res.json();
        if (!serverState) return;

        setEstado((prev) => {
          // Only update if tvs changed (avoids unnecessary re-renders)
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
  }, []);

  // ── Polling: sync TVRACK state from server every 5s ──
  useEffect(() => {
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
  }, []);

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
  };

  const handleZonasFueraChange = async (zoneId, type, deviceId) => {
    const prev = zonasFueraState[zoneId] || {};
    let response;

    try {
      if (type === "video") {
        response = await setZonasFueraVideo(zoneId, deviceId);
        await assignVideoSource(deviceId, zoneId);
        if (prev.link) {
          await setZonasFueraAudio(zoneId, deviceId);
          await assignAudioSource(deviceId, zoneId);
        }
        toast.success(`${deviceId} → VIDEO ${zoneId}`);
      } else if (type === "audio") {
        response = await setZonasFueraAudio(zoneId, deviceId);
        await assignAudioSource(deviceId, zoneId);
        toast.success(`${deviceId} → AUDIO ${zoneId}`);
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
    <ThemeProvider>
      <ProviderUser
        value={{
          estado,
          tvrackState,
          zonasFueraState,
          handleChangeEstadoDecos,
          handleChangeEstadoAudio,
          handleChangeEstadoVideo,
          handleChangeEstadoPreset,
          handleUpdateDispositivo,
          handleChangeTvrack,
          handleZonasFueraChange,
        }}
      >
        <ToastProvider>
          <Body />
        </ToastProvider>
      </ProviderUser>
    </ThemeProvider>
  );
};

export default App;
