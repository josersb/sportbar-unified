import { useContext, useEffect, useRef, useState } from "react";
import ContextoUser from "../contexto/Contexto";
import styles from "./SyncPanel.module.css";

/**
 * Evento global para abrir/cerrar el panel desde el Header (UX-ADD3).
 * SyncPanel escucha; Header despacha. Sin props ni contexto adicional.
 */
export const SYNC_PANEL_TOGGLE_EVENT = "sync-panel:toggle";

const STATUS_META = {
  synced: { icon: "✅", label: "Sincronizado", modifier: "tabOk" },
  stale: { icon: "⏳", label: "Datos del último arranque", modifier: "tabWarn" },
  out_of_sync: { icon: "⚠️", label: "Diferencias con Arranger", modifier: "tabWarn" },
  offline: { icon: "❌", label: "Arranger offline", modifier: "tabError" },
};

const formatLastSync = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatRelative = (iso, now = Date.now()) => {
  if (!iso) return "nunca";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "nunca";
  const min = Math.max(0, Math.floor((now - t) / 60000));
  if (min < 1) return "hace un momento";
  if (min < 60) return min === 1 ? "hace 1 minuto" : `hace ${min} minutos`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return hrs === 1 ? "hace 1 hora" : `hace ${hrs} horas`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
};

const DIFF_LABELS = {
  tv: "TV",
  "tvrack-video": "TVRACK · video",
  "tvrack-audio": "TVRACK · audio",
  "zona-video": "Zona · video",
  "zona-audio": "Zona · audio",
};

/**
 * Indicador de estado de sincronización (spec arranger-reconciliation:
 * SyncPanel drawer → indicador). Muestra el estado global del broker
 * (synced | stale | out_of_sync | offline) y los diffs reported≠desired de
 * forma INFORMATIVA, sin acciones Apply/Ignore (la adopción es server-side).
 */
const SyncPanel = () => {
  const {
    syncStatus = { status: "stale", lastSync: null },
    syncMode = "sse",
    syncConnected = false,
    syncDiffs = [],
  } = useContext(ContextoUser);

  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);

  const status = syncStatus.status || "stale";
  const meta = STATUS_META[status] || STATUS_META.stale;
  const lastSyncLabel = formatLastSync(syncStatus.lastSync);
  const relativeLabel = formatRelative(syncStatus.lastSync);

  // Toggle desde el Header (evento global, sin acoplar props)
  useEffect(() => {
    const onToggle = () => setOpen((prev) => !prev);
    window.addEventListener(SYNC_PANEL_TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(SYNC_PANEL_TOGGLE_EVENT, onToggle);
  }, []);

  // Escape cierra; foco inicial en el botón cerrar
  useEffect(() => {
    if (!open) return undefined;
    closeBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleManualClose = () => setOpen(false);

  return (
    <>
      {open && (
        <div className={styles.backdrop} onClick={handleManualClose} aria-hidden="true" />
      )}

      {!open && (
        <button
          type="button"
          className={`${styles.tab} ${styles[meta.modifier]}`}
          onClick={() => setOpen(true)}
          aria-label={`Estado de sincronización: ${meta.label}`}
          title={meta.label}
        >
          {meta.icon}
        </button>
      )}

      <aside
        className={`${styles.drawer} ${open ? styles.drawerOpen : styles.drawerClosed}`}
        aria-label="Panel de sincronización"
        aria-hidden={!open}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Sync Broker</h2>
          <div className={styles.headerMeta}>
            {lastSyncLabel && (
              <span className={styles.lastSync}>última · {lastSyncLabel}</span>
            )}
            <button
              ref={closeBtnRef}
              type="button"
              className={styles.closeBtn}
              onClick={handleManualClose}
              aria-label="Cerrar panel"
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.progressArea} role="status">
            <p className={styles.progressMeta}>
              <strong>{meta.icon} {meta.label}</strong>
            </p>
            {syncStatus.lastSync && (
              <p className={styles.progressMeta}>
                Última sincronización: {relativeLabel} · {lastSyncLabel}
              </p>
            )}
            <p className={styles.progressMeta}>
              Canal: {syncMode === "sse" ? "SSE" : "polling de respaldo"}
              {syncConnected ? " · conectado" : " · desconectado"}
            </p>
          </div>

          {syncDiffs.length > 0 && (
            <div className={styles.section} role="tabpanel" id="sync-tabpanel">
              <div className={styles.toolbar}>
                <span className={styles.toolbarInfo}>
                  {syncDiffs.length} diferencia(s) informativas (el Arranger es la fuente)
                </span>
              </div>
              <table className={styles.diffTable}>
                <thead>
                  <tr>
                    <th scope="col">Destino</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Intención</th>
                    <th scope="col">Arranger</th>
                  </tr>
                </thead>
                <tbody>
                  {syncDiffs.map((diff) => (
                    <tr key={`${diff.type}:${diff.dest}`}>
                      <td className={styles.destCell}>{diff.dest}</td>
                      <td className={styles.typeCell}>{DIFF_LABELS[diff.type] || diff.type}</td>
                      <td className={styles.appVal}>{diff.desired}</td>
                      <td className={styles.arrangerVal}>{diff.reported}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {syncDiffs.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyText}>✅ Sin diferencias con el Arranger</p>
              {lastSyncLabel && (
                <span className={styles.lastSync}>Última sync · {lastSyncLabel}</span>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default SyncPanel;
