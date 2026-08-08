import { useContext, useEffect, useRef, useState } from "react";
import ContextoUser from "../contexto/Contexto";
import { assignVideoSource, assignAudioSource } from "../api/arrangerApi";
import { isStaleSync } from "../hooks/useArrangerReconciliation";
import { useToast } from "./Toast";
import Button from "./ui/Button";
import styles from "./SyncPanel.module.css";

/**
 * Evento global para abrir/cerrar el panel desde el Header (UX-ADD3).
 * SyncPanel escucha; Header despacha. Sin props ni contexto adicional.
 */
export const SYNC_PANEL_TOGGLE_EVENT = "sync-panel:toggle";

// 6 tabs (UX-ADD2): Todas + los 5 dominios del hook buildDiffs
const TABS = [
  { id: "all", label: "Todas" },
  { id: "TVs", label: "TVs" },
  { id: "TVRACK Video", label: "TVRACK Video" },
  { id: "TVRACK Audio", label: "TVRACK Audio" },
  { id: "Zonas Video", label: "Zonas Video" },
  { id: "Zonas Audio", label: "Zonas Audio" },
];

// diff.type → dominio (mismo mapeo que buildDiffs en useArrangerReconciliation)
const DIFF_DOMAIN = {
  tv: "TVs",
  "tvrack-video": "TVRACK Video",
  "tvrack-audio": "TVRACK Audio",
  "zona-video": "Zonas Video",
  "zona-audio": "Zonas Audio",
};

const TYPE_LABELS = {
  tv: "TV",
  "tvrack-video": "TVRACK · video",
  "tvrack-audio": "TVRACK · audio",
  "zona-video": "Zona · video",
  "zona-audio": "Zona · audio",
};

// Nombres de los video walls en el Arranger (VW-Norte) vs app (VWN)
const VW_FORWARD = { VWN: "VW-Norte", VWC: "VW-Centro", VWS: "VW-Sur" };

const isVideoType = (type) =>
  type === "tv" || type === "tvrack-video" || type === "zona-video";

const diffKey = (diff) => `${diff.type}:${diff.dest}`;

/** Destino en nomenclatura del Arranger (VWN → VW-Norte). */
const arrangerDest = (diff) => VW_FORWARD[diff.dest] || diff.dest;

const isBusy = (status) => status === "fetching" || status === "comparing";

const formatElapsed = (ms) => `${((ms || 0) / 1000).toFixed(1)}s`;

const formatLastSync = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

/** "hace 2 horas" / "hace 30 minutos" / "hace 3 días" (PR3 4.5 footer). */
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

const DEFAULT_STATUS = {
  status: "idle",
  progress: { done: 0, total: 0, subscription: "video" },
  diffs: [],
  elapsedMs: 0,
  lastSync: null,
  cachedDiffs: [],
  cachedAt: null,
  retryCount: 0,
  partial: null,
  reconcile: undefined,
};

/**
 * Drawer lateral de sincronización con el Arranger (AR-R3).
 * - Abre automáticamente al detectar diffs nuevos (UX-ADD4).
 * - Cierre manual suprime el auto-open hasta la próxima corrida.
 * - Pestaña lateral visible cuando está cerrado (AR-R4).
 * - Tabs por dominio + tabla de diffs con Aplicar/Ignorar (UX-ADD2).
 */
const SyncPanel = () => {
  const {
    reconciliationStatus = DEFAULT_STATUS,
    estado,
    tvrackState,
    handleChangeEstadoVideo,
    handleChangeTvrack,
    handleZonasFueraChange,
  } = useContext(ContextoUser);

  const toast = useToast();

  const { status, progress, diffs, elapsedMs, lastSync, cachedDiffs = [], cachedAt = null, retryCount = 0, partial = null, reconcile } = reconciliationStatus;

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [dismissed, setDismissed] = useState(() => new Set()); // aplicadas/ignoradas (vista local)
  const [applyingKeys, setApplyingKeys] = useState(() => new Set());
  const [applyingAll, setApplyingAll] = useState(false);

  // Cierre manual suprime el auto-open hasta la próxima corrida (UX-ADD4)
  const autoOpenSuppressed = useRef(false);
  const closeBtnRef = useRef(null);

  // Reloj local durante la corrida (el hook congela elapsedMs hasta DONE)
  const startedAtRef = useRef(null);
  const [tick, setTick] = useState(0);

  // ── Auto-open / auto-close semantics (UX-ADD4) ──
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    // Nueva corrida → se vuelve a habilitar el auto-open
    if (status === "fetching" && prev !== "fetching") {
      autoOpenSuppressed.current = false;
      return;
    }
    // Diffs nuevos al completar → auto-open salvo cierre manual previo
    if (status === "done" && diffs.length > 0 && prev !== "done" && !autoOpenSuppressed.current) {
      setOpen(true);
    }
  }, [status, diffs.length]);

  // Reloj de la corrida en vivo (progreso · 12.3s).
  // El hook congela elapsedMs hasta DONE, así que SyncPanel mantiene su propio
  // contador mientras la corrida está activa (busy: fetching | comparing).
  const busy = isBusy(status);
  useEffect(() => {
    if (status === "fetching") {
      startedAtRef.current = Date.now();
    }
  }, [status]);

  useEffect(() => {
    if (!busy) return undefined;
    // Reset asíncrono del contador al arrancar la corrida (evita setState síncrono)
    const reset = setTimeout(() => setTick(0), 0);
    const timer = setInterval(() => setTick(Date.now() - startedAtRef.current), 500);
    return () => {
      clearTimeout(reset);
      clearInterval(timer);
    };
  }, [busy]);

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
      if (e.key === "Escape") {
        autoOpenSuppressed.current = true;
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleManualClose = () => {
    autoOpenSuppressed.current = true;
    setOpen(false);
  };

  const dismissRow = (key) => setDismissed((prev) => new Set(prev).add(key));

  /**
   * Aplica un diff: empuja el valor de la columna "App" al Arranger
   * (join video/audio) y sincroniza el estado local de la app para que
   * la próxima corrida no vuelva a marcarlo. Devuelve true si el comando
   * al hardware fue exitoso.
   */
  const applyDiff = async (diff, { quiet = false } = {}) => {
    // PR3 4.2: destino sin respuesta (arranger null) → no aplicable
    if (diff.arranger == null) return false;
    const key = diffKey(diff);
    setApplyingKeys((prev) => new Set(prev).add(key));
    try {
      const source = diff.app;
      const dest = arrangerDest(diff);

      if (diff.type === "zona-video" || diff.type === "zona-audio") {
        // El handler de zonas hace hardware + estado + toast (respeta link av)
        await handleZonasFueraChange(diff.dest, diff.type === "zona-video" ? "video" : "audio", source);
        dismissRow(key);
        return true;
      }

      if (isVideoType(diff.type)) await assignVideoSource(source, dest);
      else await assignAudioSource(source, dest);

      // Sincroniza el estado de la app para que la próxima reconciliación no lo marque
      if (diff.type === "tv" && estado) {
        handleChangeEstadoVideo({ ...estado.tvs, [diff.dest]: source });
      } else if (diff.type === "tvrack-video" && tvrackState) {
        handleChangeTvrack({ ...tvrackState, video: source });
      } else if (diff.type === "tvrack-audio" && tvrackState) {
        handleChangeTvrack({ ...tvrackState, audio: source });
      }

      if (!quiet) toast.success(`${dest} ← ${source}`);
      dismissRow(key);
      return true;
    } catch {
      if (!quiet) toast.error(`No se pudo aplicar ${arrangerDest(diff)}`);
      return false;
    } finally {
      setApplyingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleApplyAll = async () => {
    if (applicableDiffs.length === 0) return;
    setApplyingAll(true);
    let ok = 0;
    for (const diff of applicableDiffs) {
      if (await applyDiff(diff, { quiet: true })) ok += 1;
    }
    setApplyingAll(false);
    if (ok === applicableDiffs.length) toast.success(`${ok} destino(s) aplicado(s)`);
    else toast.error(`${ok}/${applicableDiffs.length} aplicados`);
  };

  // ── Derivaciones de vista ──
  // PR3 4.1: en error/idle se muestran los datos del último sync conocido (cache).
  const cachedMode = status === "error" || status === "idle";
  const sourceDiffs = cachedMode ? cachedDiffs : diffs;
  const visibleDiffs = (sourceDiffs || []).filter((d) => !dismissed.has(diffKey(d)));
  const tabDiffs =
    activeTab === "all"
      ? visibleDiffs
      : visibleDiffs.filter((d) => DIFF_DOMAIN[d.type] === activeTab);
  // PR3 4.2: solo filas con valor Arranger conocido son aplicables.
  const applicableDiffs = tabDiffs.filter((d) => d.arranger != null);

  // PR3 4.5: estado stale (nunca sync o hace >1 h) para footer + banner.
  // Se suprime durante la corrida activa: está sincronizando, no desfasado.
  const stale = !isBusy(status) && isStaleSync(lastSync);
  const relativeLabel = formatRelative(lastSync || cachedAt);
  const hasPartial =
    (partial?.video && partial.video.disconnected > 0) ||
    (partial?.audio && partial.audio.disconnected > 0);

  const tabCount = (tabId) =>
    tabId === "all"
      ? visibleDiffs.length
      : visibleDiffs.filter((d) => DIFF_DOMAIN[d.type] === tabId).length;

  const videoDone =
    progress.done === 2 || (progress.done === 1 && progress.subscription === "video");
  const audioDone =
    progress.done === 2 || (progress.done === 1 && progress.subscription === "audio");
  const barChars = (done) => (done ? "██████████" : "░░░░░░░░░░");
  const liveElapsed = isBusy(status) ? tick : elapsedMs;

  // Pestaña lateral: ✅ / ⚠️ N / 🔄 / ❌ (AR-R4)
  let tabIcon = "·";
  let tabTitle = "Sin sincronizar";
  let tabModifier = "";
  if (isBusy(status)) {
    tabIcon = "🔄";
    tabTitle = "Sincronizando…";
    tabModifier = styles.tabBusy;
  } else if (status === "error") {
    tabIcon = "❌";
    tabTitle = "Error de sincronización";
    tabModifier = styles.tabError;
  } else if (status === "done" && diffs.length > 0) {
    tabIcon = `⚠️ ${diffs.length}`;
    tabTitle = `${diffs.length} diferencia(s)`;
    tabModifier = styles.tabWarn;
  } else if (status === "done") {
    tabIcon = "✅";
    tabTitle = "Todo sincronizado";
    tabModifier = styles.tabOk;
  }

  const lastSyncLabel = formatLastSync(lastSync);

  return (
    <>
      {open && (
        <div className={styles.backdrop} onClick={handleManualClose} aria-hidden="true" />
      )}

      {!open && (
        <button
          type="button"
          className={`${styles.tab} ${tabModifier}`}
          onClick={() => setOpen(true)}
          aria-label={`Abrir panel de sincronización · ${tabTitle}`}
          title={tabTitle}
        >
          {tabIcon}
        </button>
      )}

      <aside
        className={`${styles.drawer} ${open ? styles.drawerOpen : styles.drawerClosed}`}
        aria-label="Panel de sincronización"
        aria-hidden={!open}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Sync Arranger</h2>
          <div className={styles.headerMeta}>
            {lastSyncLabel && status === "done" && (
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
          {status === "fetching" && (
            <div className={styles.progressArea} role="status" aria-live="polite">
              <div className={styles.progressRow}>
                <span className={styles.progressLabel}>Video</span>
                <span
                  className={`${styles.progressChars} ${videoDone ? styles.progressCharsDone : ""}`}
                  aria-hidden="true"
                >
                  {barChars(videoDone)}
                </span>
                <span className={styles.progressCheck}>{videoDone ? "✓" : "…"}</span>
              </div>
              <div className={styles.progressRow}>
                <span className={styles.progressLabel}>Audio</span>
                <span
                  className={`${styles.progressChars} ${audioDone ? styles.progressCharsDone : ""}`}
                  aria-hidden="true"
                >
                  {barChars(audioDone)}
                </span>
                <span className={styles.progressCheck}>{audioDone ? "✓" : "…"}</span>
              </div>
              <p className={styles.progressMeta}>
                Paso {progress.done}/{progress.total} · {formatElapsed(liveElapsed)}
              </p>
            </div>
          )}

          {status === "comparing" && (
            <p className={styles.comparing} role="status">
              Comparando con el Arranger…
            </p>
          )}

          {status === "error" && (
            <div className={styles.errorBox} role="alert">
              <p className={styles.errorText}>
                ❌ {retryCount >= 3
                  ? "Arranger no disponible. Verificá la conexión de red."
                  : "Arranger no disponible"}
              </p>
              {retryCount > 0 && retryCount < 3 && (
                <p className={styles.retryInfo}>Reintento {retryCount}/3</p>
              )}
              {reconcile && (
                <Button variant="secondary" size="sm" onClick={reconcile}>
                  Reintentar
                </Button>
              )}
            </div>
          )}

          {cachedMode && cachedAt && (
            <div className={styles.staleBanner} role="status">
              ⚠️ Mostrando datos de {relativeLabel} ({formatLastSync(cachedAt)}) — pueden
              estar desfasados.
            </div>
          )}

          {hasPartial && (
            <div className={styles.partialBanner} role="status">
              {partial?.video?.disconnected > 0 && (
                <p className={styles.partialLine}>
                  ⚠️ Video · {partial.video.connected}/{partial.video.total} destinos
                  respondieron · {partial.video.disconnected} sin respuesta
                </p>
              )}
              {partial?.audio?.disconnected > 0 && (
                <p className={styles.partialLine}>
                  ⚠️ Audio · {partial.audio.connected}/{partial.audio.total} destinos
                  respondieron · {partial.audio.disconnected} sin respuesta
                </p>
              )}
            </div>
          )}

          {visibleDiffs.length > 0 && (
            <div
              className={styles.section}
              role="tabpanel"
              id="sync-tabpanel"
              aria-labelledby={`sync-tab-${activeTab}`}
            >
              <div className={styles.tabsRow} role="tablist" aria-label="Filtrar por dominio">
                {TABS.map((tab) => {
                  const count = tabCount(tab.id);
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`sync-tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ""}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className={styles.badge} aria-label={`${count} diferencias`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className={styles.toolbar}>
                <span className={styles.toolbarInfo}>
                  {tabDiffs.length} diferencia(s)
                  {!cachedMode && applicableDiffs.length < tabDiffs.length && (
                    <> · {tabDiffs.length - applicableDiffs.length} sin respuesta</>
                  )}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={applyingAll}
                  disabled={cachedMode || applicableDiffs.length === 0}
                  onClick={handleApplyAll}
                >
                  Aplicar todas
                </Button>
              </div>

              {tabDiffs.length === 0 ? (
                <p className={styles.emptyText}>Sin diferencias en este dominio</p>
              ) : (
                <table className={styles.diffTable}>
                  <thead>
                    <tr>
                      <th scope="col">Destino</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">App</th>
                      <th scope="col">Arranger</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabDiffs.map((diff) => {
                      const key = diffKey(diff);
                      const applying = applyingKeys.has(key);
                      const unresponsive = diff.arranger == null;
                      return (
                        <tr key={key}>
                          <td className={styles.destCell}>{diff.dest}</td>
                          <td className={styles.typeCell}>{TYPE_LABELS[diff.type] || diff.type}</td>
                          <td className={styles.appVal}>{diff.app}</td>
                          <td className={`${styles.arrangerVal} ${unresponsive ? styles.arrangerNull : ""}`}>
                            {unresponsive ? "—" : diff.arranger}
                          </td>
                          <td className={styles.actions}>
                            <Button
                              size="sm"
                              loading={applying}
                              disabled={cachedMode || unresponsive}
                              onClick={() => applyDiff(diff)}
                            >
                              Aplicar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={applying}
                              onClick={() => dismissRow(key)}
                            >
                              Ignorar
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {status === "done" && visibleDiffs.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyText}>✅ Todo sincronizado</p>
              {lastSyncLabel && (
                <span className={styles.lastSync}>Última sync · {lastSyncLabel}</span>
              )}
            </div>
          )}
        </div>

        {/* PR3 4.5: footer de staleness — nunca sincronizado o hace >1 h */}
        {stale && (
          <footer className={styles.footer}>
            <span className={styles.staleBadge}>
              ⚠️ {lastSync ? "datos pueden estar desfasados" : "nunca sincronizado"}
            </span>
            {lastSync && (
              <span className={styles.staleMeta}>
                Última sincronización: {relativeLabel} · {formatLastSync(lastSync)}
              </span>
            )}
          </footer>
        )}
      </aside>
    </>
  );
};

export default SyncPanel;
