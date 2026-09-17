import { useContext } from "react";
import ContextoUser from "../contexto/Contexto";
// Fuente única de orden y labels de las 11 zonas fuera (zonasFuera.js).
import { zonaFueraLabel, orderedZonaFueraIds } from "../data/zonasFuera";
import styles from "./ZonasFueraStatus.module.css";

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

  // Orden canónico: canónicas presentes + desconocidas al final (nunca el
  // insertion-order del state.json).
  const ids = orderedZonaFueraIds(zonasFueraState);

  // ── Empty state ──
  if (ids.length === 0) {
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
        {ids.map((id) => (
          <li key={id} className={styles.row}>
            <span className={styles.zoneName}>{zonaFueraLabel(id)}</span>
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
