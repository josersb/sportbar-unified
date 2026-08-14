import { useContext, useCallback } from "react";
import ContextoUser from "../contexto/Contexto";
import { savePreset, loadPreset, deletePresetServer } from "../api/arrangerApi";

// Key legacy de presets en localStorage (solo-tvs). Se migran al formato
// snapshot completo al guardar/subir (spec preset-complete-snapshot).
const presetKey = (n) => `estadoApp_Preset${n}`;

/**
 * Migra un preset viejo (solo `tvs`) a snapshot completo {tvs, zonasFuera,
 * tvrack} rellenando defaults seguros. Si ya es snapshot, lo devuelve tal cual.
 * (La migración server-side la hace también migratePreset del store; esta es
 * la versión cliente para el respaldo local.)
 */
export function migrarPreset(preset, zonasFueraState = {}, tvrackState = null) {
  if (!preset || typeof preset !== "object") return null;
  if (preset.tvs && preset.zonasFuera && preset.tvrack && (preset._version || 0) >= 3) {
    return { ...preset, _version: 3 };
  }
  const tvs = preset.tvs && typeof preset.tvs === "object" ? { ...preset.tvs } : {};
  const zonasFuera = {};
  for (const [zoneId, zone] of Object.entries(zonasFueraState)) {
    zonasFuera[zoneId] = {
      video: zone?.video || "DTV1",
      audio: zone?.audio || zone?.video || "DTV1",
      link: !!zone?.link,
    };
  }
  const tvrack =
    tvrackState && typeof tvrackState === "object"
      ? { video: tvrackState.video || "DTV1", audio: tvrackState.audio || "DTV1" }
      : { video: "DTV1", audio: "DTV1" };
  return { tvs, zonasFuera, tvrack, _version: 3 };
}

export function usePreset(n) {
  const { estado, handleChangeEstadoPreset, tvrackState, zonasFueraState } =
    useContext(ContextoUser);
  const key = presetKey(n);

  /**
   * Carga el preset: restaura los 3 dominios (tvs + zonasFuera + tvrack) vía
   * el endpoint server-side POST /api/presets/:n/load (sin BATCH 8 cliente).
   * Si el server no lo tiene pero existe en localStorage, lo migra a snapshot
   * completo y lo sube antes de cargar.
   */
  const load = useCallback(async () => {
    // 1. Intentar server
    let data = null;
    try {
      const res = await fetch(`/api/presets/${n}`);
      if (res.ok) {
        const { preset } = await res.json();
        if (preset) data = preset;
      }
    } catch {}

    // 2. Fallback localStorage → migrar a snapshot completo y subir
    if (!data) {
      const saved = localStorage.getItem(key);
      if (!saved) return undefined;
      try {
        data = migrarPreset(JSON.parse(saved), zonasFueraState, tvrackState);
        if (!data) return undefined;
        await savePreset(n, data).catch(() => {});
      } catch {
        return undefined;
      }
    }

    // 3. Load server-side (restaura los 3 dominios; la UI se actualiza por SSE)
    const result = await loadPreset(n);
    if (!result || result.ok === false) {
      throw new Error(`Preset ${n}: ${result?.failed || 0} destino(s) fallaron`);
    }
    return data;
  }, [n, key, zonasFueraState, tvrackState]);

  /**
   * Guarda el preset como snapshot completo {tvs, zonasFuera, tvrack} de los
   * 3 dominios (spec preset-complete-snapshot: TVRACK incluido — fix bug (e)).
   * Persiste en el server (versión + broadcast) y en localStorage (respaldo).
   */
  const save = useCallback(
    async (desc) => {
      const snapshot = migrarPreset(
        {
          tvs: estado.tvs || {},
          descripcionPreset: desc,
        },
        zonasFueraState,
        tvrackState,
      );
      // descripcionPreset es app-only: viaja en el snapshot y en el estado app
      snapshot.descripcionPreset = desc;

      const newDescripcion = estado.descripcionPreset.map((item, i) =>
        i === n - 1 ? { ...item, [`preset${n}`]: desc } : item
      );
      handleChangeEstadoPreset(newDescripcion);
      localStorage.setItem(key, JSON.stringify(snapshot));

      try {
        await savePreset(n, snapshot);
      } catch {
        // server no disponible — queda el respaldo local
      }
    },
    [n, key, estado, zonasFueraState, tvrackState, handleChangeEstadoPreset]
  );

  /**
   * Limpia el preset: libera el slot en el server y borra el respaldo local.
   */
  const clear = useCallback(async () => {
    try {
      await deletePresetServer(n);
    } catch {}
    localStorage.removeItem(key);
  }, [n, key]);

  const isLoaded = !!localStorage.getItem(key);

  return { load, save, clear, isLoaded };
}
