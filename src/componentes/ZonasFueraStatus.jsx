import { useContext } from "react";
import ContextoUser from "../contexto/Contexto";
import styles from "./ZonasFueraStatus.module.css";

/** Shorten zone IDs for display: "aVip-Barra-Centro" → "Vip Barra Centro" */
const displayName = (id) => {
  return id
    .replace(/^a-?/, "")
    .replace(/^RACK-/, "Rack ")
    .replace(/-/g, " ")
    .replace("Vip", "VIP")
    .replace("QMR", "QMR")
    .replace("QMC", "QMC")
    .trim();
};

const ZonasFueraStatus = () => {
  const { estadoLoaded, zonasFueraState } = useContext(ContextoUser);

  // ── Loading state ──
  if (!estadoLoaded || !zonasFueraState) {
    return (
      <section className={styles.section} aria-label="Estado de otras zonas">
        <h2 className={styles.heading}>Estado de otras zonas</h2>
        <p className={styles.loading} aria-busy="true">
          Cargando estado de zonas…
        </p>
      </section>
    );
  }

  const zonas = Object.entries(zonasFueraState);

  // ── Empty state ──
  if (zonas.length === 0) {
    return (
      <section className={styles.section} aria-label="Estado de otras zonas">
        <h2 className={styles.heading}>Estado de otras zonas</h2>
        <p className={styles.empty}>No hay zonas fuera configuradas.</p>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-label="Estado de otras zonas">
      <h2 className={styles.heading}>Estado de otras zonas</h2>

      <ul className={styles.list} role="list">
        <li className={styles.headerRow}>
          <span>Zona</span>
          <span>Video</span>
          <span>Audio</span>
        </li>
        {zonas.map(([id, data]) => (
          <li key={id} className={styles.row}>
            <span className={styles.zoneName}>{displayName(id)}</span>
            <span
              className={styles.signal}
              style={{ backgroundColor: `var(--${data.video || "DTV1"})` }}
            >
              {data.video || "—"}
            </span>
            <span
              className={styles.signal}
              style={{ backgroundColor: `var(--${data.audio || "DTV1"})` }}
            >
              {data.audio || "—"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ZonasFueraStatus;
