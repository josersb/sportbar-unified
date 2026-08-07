import { useContext } from "react";
import ContextoUser from "../contexto/Contexto";
import { isStaleSync } from "../hooks/useArrangerReconciliation";
import { SYNC_PANEL_TOGGLE_EVENT } from "./SyncPanel";
import styles from "./Header.module.css";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  const { reconciliationStatus } = useContext(ContextoUser);
  const { status = "idle", diffs = [], lastSync = null } = reconciliationStatus || {};

  const busy = status === "fetching" || status === "comparing";

  // PR3 4.5: nunca sincronizado o hace >1 h → indicador stale con pulse sutil.
  const stale = !busy && status !== "error" && isStaleSync(lastSync);

  // Mini indicador de sincronización (AR-R4, UX-ADD3): ✅ / ⚠️ N / 🔄 / ❌ / ⚠️ stale
  let icon = "•";
  let label = "Sin sincronizar";
  let modifier = "";
  if (busy) {
    icon = "🔄";
    label = "Sincronizando…";
    modifier = styles.syncActive;
  } else if (status === "error") {
    icon = "❌";
    label = "Error de sincronización";
    modifier = styles.syncError;
  } else if (status === "done" && diffs.length > 0) {
    icon = "⚠️";
    label = `${diffs.length} diferencia(s)`;
    modifier = styles.syncWarn;
  } else if (stale) {
    icon = "⚠️";
    label = lastSync ? "Datos desactualizados" : "Nunca sincronizado";
    modifier = styles.syncStale;
  } else if (status === "done") {
    icon = "✅";
    label = "Todo sincronizado";
    modifier = styles.syncOk;
  }

  return (
    <header className={styles.header} role="banner">
      <div className={styles.container}>
        <img
          src="/logos/logoBetwarriorCompleto.PNG"
          alt="Logo BetWarrior"
          className={styles.logo}
        />
        <h1 className={styles.title}>
          Sportbar <span>Fuentes de señales AV</span>
        </h1>
        <div className={styles.headerRight}>
          <button
            type="button"
            className={`${styles.syncIndicator} ${modifier}`}
            onClick={() => window.dispatchEvent(new CustomEvent(SYNC_PANEL_TOGGLE_EVENT))}
            aria-label={`Estado de sincronización: ${label}`}
            title={label}
          >
            {icon}
            {status === "done" && diffs.length > 0 && (
              <span className={styles.syncCount}>{diffs.length}</span>
            )}
          </button>
          <ThemeToggle />
          <img
            src="/logos/HipodromoPalermo.jpg"
            alt="Logo Hipódromo Palermo"
            className={styles.palermoLogo}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
