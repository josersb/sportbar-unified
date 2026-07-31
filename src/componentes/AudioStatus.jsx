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

      <ul className={styles.list} role="list">
        <li className={styles.headerRow}>
          <span>Zona</span>
          <span>Deco</span>
          <span>Vol</span>
          <span>Mute</span>
          <span className={styles.emojiCol}></span>
        </li>
        {audio.map((zona) => (
          <li key={zona.nombreZona} className={styles.row}>
            <span className={styles.cell}>{zona.nombreZona}</span>
            <span
              className={styles.signal}
              style={{ backgroundColor: `var(--${zona.fuenteAudio || "DTV1"})` }}
            >
              {zona.fuenteAudio}
            </span>
            <span className={styles.signal}>{zona.volumen}</span>
            <span
              className={`${styles.signal} ${zona.mute ? styles.muteOn : styles.muteOff}`}
            >
              {zona.mute ? "OFF" : "ON"}
            </span>
            <span className={styles.emojiCol}>
              {zona.mute ? "🔇" : "🔊"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default AudioStatus;
