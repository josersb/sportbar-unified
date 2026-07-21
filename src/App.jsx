import { useState, useEffect } from "react";
import { ProviderUser, estadoInicial } from "./contexto/Contexto";
import { DISPOSITIVOS, getDevice } from "./contexto/dispositivos";
import Body from "./componentes/Body";
import { ToastProvider } from "./componentes/Toast";
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

  return (
    <ThemeProvider>
      <ProviderUser
        value={{
          estado,
          handleChangeEstadoDecos,
          handleChangeEstadoAudio,
          handleChangeEstadoVideo,
          handleChangeEstadoPreset,
          handleUpdateDispositivo,
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
