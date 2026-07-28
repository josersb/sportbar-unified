import { useContext } from "react";
import ContextoUser from "../contexto/Contexto";
import styles from "./AudioStatus.module.css";

const AudioStatus = () => {
  const { estado } = useContext(ContextoUser);
  const audio = estado.audio;

  // ── Empty state ──
  if (!audio || audio.length === 0) {
    return (
      <section className={styles.section} aria-label="Estado del audio">
        <h2 className={styles.heading}>Estado del audio</h2>
        <p className={styles.empty}>No hay zonas de audio disponibles.</p>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-label="Estado del audio">
      <h2 className={styles.heading}>Estado del audio</h2>

      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            <th scope="col">Zona</th>
            <th scope="col">Deco</th>
            <th scope="col">Vol</th>
            <th scope="col">Mute</th>
          </tr>
        </thead>
        <tbody>
          {audio.map((zona, i) => {
            const zoneClass =
              i === 0
                ? styles.rowSur
                : i === 1
                  ? styles.rowCentro
                  : styles.rowNorte;
            return (
              <tr key={zona.nombreZona} className={zoneClass}>
                <td className={styles.cell}>{zona.nombreZona}</td>
                <td className={styles.cell}>{zona.fuenteAudio}</td>
                <td className={styles.cell}>{zona.volumen}</td>
                <td className={styles.cell}>{zona.mute ? "ON" : "OFF"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};

export default AudioStatus;
