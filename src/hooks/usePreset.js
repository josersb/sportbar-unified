import { useContext, useCallback } from "react";
import ContextoUser from "../contexto/Contexto";
import { joinMultipleTVs } from "../api/arrangerApi";

export function usePreset(n) {
  const { estado, handleChangeEstadoVideo, handleChangeEstadoPreset } =
    useContext(ContextoUser);
  const key = `estadoApp_Preset${n}`;

  const buildMappings = useCallback((tvs) => {
    return [
      { source: tvs.VWN, dest: "VW-Norte" },
      { source: tvs.VWC, dest: "VW-Centro" },
      { source: tvs.VWS, dest: "VW-Sur" },
      { source: tvs.TV01, dest: "TV01" },
      { source: tvs.TV02, dest: "TV02" },
      { source: tvs.TV03, dest: "TV03" },
      { source: tvs.TV04, dest: "TV04" },
      { source: tvs.TV05, dest: "TV05" },
      { source: tvs.TV06, dest: "TV06" },
      { source: tvs.TV07, dest: "TV07" },
      { source: tvs.TV08, dest: "TV08" },
      { source: tvs.TV09, dest: "TV09" },
      { source: tvs.TV10, dest: "TV10" },
      { source: tvs.TV11, dest: "TV11" },
      { source: tvs.TV12, dest: "TV12" },
      { source: tvs.TV13, dest: "TV13" },
      { source: tvs.TV14, dest: "TV14" },
      { source: tvs.TV15, dest: "TV15" },
      { source: tvs.TV16, dest: "TV16" },
      { source: tvs.TV17, dest: "TV17" },
      { source: tvs.TV18, dest: "TV18" },
      { source: tvs.TV19, dest: "TV19" },
      { source: tvs.TV20, dest: "TV20" },
      { source: tvs.TV21, dest: "TV21" },
      { source: tvs.TV22, dest: "TV22" },
      { source: tvs.TV23, dest: "TV23" },
      { source: tvs.TV24, dest: "TV24" },
      { source: tvs.TV25, dest: "TV25" },
      { source: tvs.TV26, dest: "TV26" },
    ];
  }, []);

  const load = useCallback(async () => {
    let data = null;

    // 1. Intentar servidor (compartido entre PCs)
    try {
      const res = await fetch(`/api/presets/${n}`);
      if (res.ok) {
        const { preset } = await res.json();
        if (preset && preset.tvs) data = preset;
      }
    } catch {}

    // 2. Fallback a localStorage
    if (!data) {
      const saved = localStorage.getItem(key);
      if (!saved) return;
      try { data = JSON.parse(saved); } catch { throw new Error("Preset data is corrupted"); }
    }

    handleChangeEstadoVideo(data.tvs);
    const mappings = buildMappings(data.tvs);
    try {
      await joinMultipleTVs(mappings);
    } catch {
      /* Error logged upstream */
    }
  }, [key, n, handleChangeEstadoVideo, buildMappings]);

  const save = useCallback(
    async (desc) => {
      const newDescripcion = estado.descripcionPreset.map((item, i) =>
        i === n - 1 ? { ...item, [`preset${n}`]: desc } : item
      );
      handleChangeEstadoPreset(newDescripcion);
      localStorage.setItem(key, JSON.stringify(estado));

      try {
        await fetch(`/api/presets/${n}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(estado),
        });
      } catch {}
    },
    [key, n, estado, handleChangeEstadoPreset]
  );

  const isLoaded = !!localStorage.getItem(key);

  return { load, save, isLoaded };
}
