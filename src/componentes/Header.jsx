import { useContext } from "react";
import ContextoUser from "../contexto/Contexto";
import { SYNC_PANEL_TOGGLE_EVENT } from "./SyncPanel";
import styles from "./Header.module.css";
import ThemeToggle from "./ThemeToggle";

const STATUS_META = {
  synced: { icon: "✅", label: "Sincronizado", modifier: "syncOk" },
  stale: { icon: "⏳", label: "Datos del último arranque", modifier: "syncStale" },
  out_of_sync: { icon: "⚠️", label: "Diferencias con Arranger", modifier: "syncWarn" },
  offline: { icon: "❌", label: "Arranger offline", modifier: "syncError" },
};

const Header = () => {
  const { syncStatus = { status: "stale", lastSync: null } } = useContext(ContextoUser);
  const status = syncStatus.status || "stale";
  const meta = STATUS_META[status] || STATUS_META.stale;

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
            className={`${styles.syncIndicator} ${styles[meta.modifier]}`}
            onClick={() => window.dispatchEvent(new CustomEvent(SYNC_PANEL_TOGGLE_EVENT))}
            aria-label={`Estado de sincronización: ${meta.label}`}
            title={meta.label}
          >
            {meta.icon}
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
