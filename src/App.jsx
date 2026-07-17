import { useState, useEffect } from "react";
import { ProviderUser, estadoInicial } from "./contexto/Contexto";
import { DISPOSITIVOS, getDevice } from "./contexto/dispositivos";
import Body from "./componentes/Body";

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
  const [estado, setEstado] = useState(() => {
    const saved = localStorage.getItem("estadoApp");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed._version || parsed._version < 1) {
          const migrated = migrarEstado(parsed);
          // Save migrated data back immediately
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
          return migrated;
        }
        return parsed;
      } catch {
        return estadoInicial;
      }
    }
    return estadoInicial;
  });

  // Guardando el estado dentro de localstorage
  useEffect(() => {
    localStorage.setItem("estadoApp", JSON.stringify(estado));
  }, [estado]);

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
      <Body />
    </ProviderUser>
  );
};

export default App;
