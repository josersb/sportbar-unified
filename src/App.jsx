import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ProviderUser, estadoInicial } from "./contexto/Contexto";
import { useBrokerState } from "./hooks/useBrokerState";
import { deriveUiState, buildDiffsInfo } from "./hooks/brokerClientCore";
import {
  setAppState,
  setZonasFueraVideo,
  setZonasFueraAudio,
  setZonasFueraLink,
} from "./api/arrangerApi";
import Body from "./componentes/Body";
import { useToast } from "./componentes/Toast";
import ThemeProvider from "./contexto/ThemeProvider";
import "./componentes/Toast.css";

// Key legacy del estado app (v1, localStorage) para migrar al broker al arrancar.
const ESTADO_APP_KEY = "estadoApp";

const App = () => {
  const toast = useToast();
  const { snapshot, syncStatus, mode, connected, lastError } = useBrokerState();

  // Estado app-only local (decos, dispositivos, audio, favoritos, descripcionPreset).
  // El server es dueño del estado app (appOnly.appState); la UI lo mantiene en
  // memoria y persiste cambios con POST /api/app-state (merge parcial).
  const [estado, setEstado] = useState(() => {
    try {
      const saved = localStorage.getItem(ESTADO_APP_KEY);
      if (saved) return { ...estadoInicial, ...JSON.parse(saved), _version: 1 };
    } catch {
      // localStorage corrupto → estado inicial
    }
    return estadoInicial;
  });
  const [tvrackState, setTvrackState] = useState({ video: "DTV1", audio: "DTV1", link: false });
  const [zonasFueraState, setZonasFueraState] = useState({});
  const [estadoLoaded, setEstadoLoaded] = useState(false);
  const [errorDecos, setErrorDecos] = useState(false);

  // ── Estado de matriz desde el broker (snapshot SSE + deltas) ──
  // La UI de tvs/tvrack/zonas-fuera es derivada del snapshot; NO hay estado
  // local de matriz ni polls (eliminados en PR 3). Escrituras → broker con await.
  const { tvs, tvrackState: brokerTvrack, zonasFueraState: brokerZonas } = useMemo(
    () => deriveUiState(snapshot),
    [snapshot],
  );

  useEffect(() => {
    if (!snapshot) return;
    setTvrackState(brokerTvrack);
    setZonasFueraState(brokerZonas);
    setEstadoLoaded(true);
    setErrorDecos(false);
  }, [snapshot, brokerTvrack, brokerZonas]);

  // tvs del broker se inyectan en `estado` (la UI lee estado.tvs).
  const estadoConTvs = useMemo(() => ({ ...estado, tvs }), [estado, tvs]);

  // ── Migración localStorage → broker al primer arranque (spec migracion-localstorage) ──
  // Si el broker no tiene appState y existe estadoApp viejo, se sube (merge
  // parcial) y se conserva localmente como backup. El estado de matriz NUNCA
  // se migra desde localStorage: el broker lo reconstruye desde el Arranger.
  useEffect(() => {
    if (!snapshot || !estadoLoaded) return;
    const serverHasApp = snapshot.appOnly && snapshot.appOnly.appState != null;
    if (serverHasApp) return;
    try {
      const saved = localStorage.getItem(ESTADO_APP_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object") return;
      const patch = {};
      for (const key of ["decos", "dispositivos", "favoritos", "audio", "descripcionPreset"]) {
        if (parsed[key] !== undefined) patch[key] = parsed[key];
      }
      if (Object.keys(patch).length > 0) {
        setAppState(patch).catch(() => {});
      }
    } catch {
      // localStorage corrupto — el broker arranca igual
    }
  }, [snapshot, estadoLoaded]);

  // Persistencia app-only: localStorage (backup local) + broker (merge parcial).
  const persistAppState = useCallback((patch) => {
    setEstado((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(ESTADO_APP_KEY, JSON.stringify(next));
      } catch {
        // localStorage lleno/indisponible — el broker es la fuente
      }
      return next;
    });
    setAppState(patch).catch((err) => {
      console.warn("[app-state] No se pudo persistir al broker:", err?.message);
    });
  }, []);

  const handleChangeEstadoDecos = useCallback(
    (decos) => {
      const dispositivos = { ...estado.dispositivos };
      decos.forEach((deco) => {
        if (dispositivos[deco.nombreDeco]) {
          dispositivos[deco.nombreDeco] = {
            ...dispositivos[deco.nombreDeco],
            canalActual: deco.canalDeco,
          };
        }
      });
      persistAppState({ decos, dispositivos });
    },
    [estado.dispositivos, persistAppState],
  );

  const handleUpdateDispositivo = useCallback(
    (id, updates) => {
      const dispositivos = {
        ...estado.dispositivos,
        [id]: { ...estado.dispositivos[id], ...updates },
      };
      persistAppState({ dispositivos });
    },
    [estado.dispositivos, persistAppState],
  );

  const handleChangeEstadoAudio = useCallback((audio) => {
    persistAppState({ audio });
  }, [persistAppState]);

  const handleChangeEstadoPreset = useCallback((descripcionPreset) => {
    persistAppState({ descripcionPreset });
  }, [persistAppState]);

  // TVRACK: escrituras write-through confirmadas (POST /api/tvrack/*); la
  // respuesta del broker ES el estado confirmado (video/audio/link).
  const handleChangeTvrack = useCallback((newTvrack) => {
    setTvrackState((prev) => ({
      video: newTvrack.video ?? prev.video,
      audio: newTvrack.audio ?? prev.audio,
      link: newTvrack.link ?? prev.link,
    }));
  }, []);

  // Zonas fuera: escrituras write-through confirmadas vía broker (con link,
  // el server encadena video+audio). Sin joins directos al Arranger.
  const handleZonasFueraChange = useCallback(
    async (zoneId, type, deviceId) => {
      try {
        if (type === "video" || type === "audio") {
          const response =
            type === "video"
              ? await setZonasFueraVideo(zoneId, deviceId)
              : await setZonasFueraAudio(zoneId, deviceId);
          setZonasFueraState((prev) => ({ ...prev, [zoneId]: { ...prev[zoneId], ...response } }));
          toast.success(`${deviceId} → ${type.toUpperCase()} ${zoneId}`);
        } else if (type === "link") {
          const response = await setZonasFueraLink(zoneId, deviceId);
          setZonasFueraState((prev) => ({ ...prev, [zoneId]: { ...prev[zoneId], ...response } }));
        }
      } catch (err) {
        console.error(`[zonas-fuera] Error en ${type} para ${zoneId}:`, err);
        toast.error(`Error al cambiar ${type} en ${zoneId}`);
      }
    },
    [toast],
  );

  const reintentarDecos = useCallback(() => {
    // El broker reconecta solo (SSE/poll). Reintentar = limpiar el error y
    // confiar en el snapshot; si no hay conexión, el hook sigue reintentando.
    setErrorDecos(false);
    if (snapshot) setEstadoLoaded(true);
  }, [snapshot]);

  // syncStatus estable (mismo objeto entre renders si status/lastSync no cambian).
  const contextValue = useMemo(
    () => ({
      estado: estadoConTvs,
      estadoLoaded,
      errorDecos,
      tvrackState,
      zonasFueraState,
      syncStatus,
      syncMode: mode,
      syncConnected: connected,
      syncError: lastError,
      handleChangeEstadoDecos,
      handleChangeEstadoAudio,
      handleChangeEstadoPreset,
      handleUpdateDispositivo,
      handleChangeTvrack,
      handleZonasFueraChange,
      reintentarDecos,
      syncDiffs: buildDiffsInfo(snapshot),
    }),
    [
      estadoConTvs,
      estadoLoaded,
      errorDecos,
      tvrackState,
      zonasFueraState,
      syncStatus,
      mode,
      connected,
      lastError,
      snapshot,
      handleChangeEstadoDecos,
      handleChangeEstadoAudio,
      handleChangeEstadoPreset,
      handleUpdateDispositivo,
      handleChangeTvrack,
      handleZonasFueraChange,
      reintentarDecos,
    ],
  );

  return (
    <Router>
      <ThemeProvider>
        <ProviderUser value={contextValue}>
          <Body />
        </ProviderUser>
      </ThemeProvider>
    </Router>
  );
};

export default App;
