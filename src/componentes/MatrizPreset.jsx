import { useRef, useContext, useEffect, useState } from "react";
import ContextoUser from "../contexto/Contexto";
import { usePreset } from "../hooks/usePreset";
import PageContainer from "./ui/PageContainer";
import "./Toast.css";
import { useToast } from "./Toast";
import styles from "./MatrizPreset.module.css";

const MatrizPreset = () => {
  const { estado } = useContext(ContextoUser);
  const descripcionPreset = estado.descripcionPreset;
  const toast = useToast();

  const presets = [
    { n: 1, hook: usePreset(1), ref: useRef() },
    { n: 2, hook: usePreset(2), ref: useRef() },
    { n: 3, hook: usePreset(3), ref: useRef() },
    { n: 4, hook: usePreset(4), ref: useRef() },
    { n: 5, hook: usePreset(5), ref: useRef() },
  ];

  // Estado de carga desde el servidor (null = cargando, false = libre, true = en uso)
  const [serverStatus, setServerStatus] = useState([null, null, null, null, null]);

  // Al montar, consultar al servidor qué presets existen
  useEffect(() => {
    let cancelled = false;

    async function syncFromServer() {
      const results = [];
      for (let n = 1; n <= 5; n++) {
        try {
          const res = await fetch(`/api/presets/${n}`);
          if (res.ok) {
            const { preset } = await res.json();
            results.push(!!preset);
          } else {
            results.push(false);
          }
        } catch {
          results.push(false);
        }
      }
      if (!cancelled) setServerStatus(results);
    }

    syncFromServer();
    return () => { cancelled = true; };
  }, []);

  const hasPreset = (idx) => {
    // Servidor manda, localStorage es respaldo
    if (serverStatus[idx] !== null) return serverStatus[idx];
    return presets[idx].hook.isLoaded;
  };

  const handleLoad = (preset, label) => async () => {
    if (!hasPreset(label - 1)) {
      toast.error(`Preset ${label} está vacío`);
      return;
    }
    try {
      await preset.load();
      toast.success(`Preset ${label} cargado`);
    } catch {
      toast.error("Error al comunicar con el Arranger");
    }
  };

  const handleSave = (preset, ref, label) => async () => {
    await preset.save(ref.current?.value || "");
    toast.success(`Preset ${label} guardado`);
    // Actualizar estado local
    setServerStatus(prev => {
      const next = [...prev];
      next[label - 1] = true;
      return next;
    });
  };

  const handleClear = (preset, label) => async () => {
    try {
      await fetch(`/api/presets/${label}`, { method: "DELETE" });
    } catch {}
    localStorage.removeItem(`estadoApp_Preset${label}`);
    toast.info(`Preset ${label} limpiado`);
    setServerStatus(prev => {
      const next = [...prev];
      next[label - 1] = false;
      return next;
    });
  };

  const usedCount = serverStatus.filter(Boolean).length;

  return (
    <main>
      <PageContainer>
        <h3 className={styles.titulo}>Presets Guardados</h3>
        <p className={styles.subtitle}>
          {serverStatus.includes(null)
            ? "Sincronizando con el servidor..."
            : `${usedCount} de 5 presets en uso`}
        </p>

        <div className={styles.grid}>
          {presets.map(({ n, hook, ref }, idx) => {
            const loaded = hasPreset(idx);
            return (
              <div
                key={n}
                className={`${styles.card} ${loaded ? styles.cardUsed : styles.cardFree}`}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.cardNumber}>Preset {n}</span>
                  <span className={`${styles.badge} ${loaded ? styles.badgeUsed : styles.badgeFree}`}>
                    {loaded ? "En uso" : "Libre"}
                  </span>
                </div>

                <input
                  type="text"
                  ref={ref}
                  key={`preset-${n}-${serverStatus[idx]}`}
                  defaultValue={descripcionPreset[idx]?.[`preset${n}`] || ""}
                  placeholder={loaded ? "Descripción del preset..." : "Nombre del preset..."}
                  className={styles.cardInput}
                />

                <div className={styles.cardActions}>
                  <button
                    onClick={handleLoad(hook, n)}
                    className={`${styles.btn} ${styles.btnLoad}`}
                    disabled={!loaded}
                  >
                    Cargar
                  </button>
                  <button
                    onClick={handleSave(hook, ref, n)}
                    className={`${styles.btn} ${styles.btnSave}`}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={handleClear(hook, n)}
                    className={`${styles.btn} ${styles.btnClear}`}
                    disabled={!loaded}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </PageContainer>
    </main>
  );
};

export default MatrizPreset;
