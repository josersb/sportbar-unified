import { useContext } from "react";
import ContextoUser from "../contexto/Contexto";
import { getAllDevices } from "../contexto/dispositivos";
import styles from "./DecosStatus.module.css";

const DecosStatus = () => {
  const { estado, estadoLoaded } = useContext(ContextoUser);
  const dispositivos = estado.dispositivos;
  const decos = getAllDevices();

  // ── Loading state ──
  if (!estadoLoaded) {
    return (
      <section className={styles.section} aria-label="Estado de canales">
        <h2 className={styles.heading}>Estado de canales</h2>
        <p className={styles.loading} aria-busy="true">
          Cargando estado de decodificadores…
        </p>
      </section>
    );
  }

  // ── Empty state ──
  if (!dispositivos || Object.keys(dispositivos).length === 0) {
    return (
      <section className={styles.section} aria-label="Estado de canales">
        <h2 className={styles.heading}>Estado de canales</h2>
        <p className={styles.empty}>No hay decodificadores disponibles.</p>
      </section>
    );
  }

  // ── Default state ──
  return (
    <section className={styles.section} aria-label="Estado de canales">
      <h2 className={styles.heading}>
        Estado de canales
        <button
          type="button"
          className={styles.reloadBtn}
          aria-label="Recargar estado de canales"
          onClick={() => window.location.reload()}
        >
          Recargar
        </button>
      </h2>

      <ul className={styles.list} role="list">
        <li className={styles.headerRow}>
          <span>DECO</span>
          <span>CANAL</span>
        </li>
        {decos.map((device) => {
          const estadoDevice = dispositivos[device.id];
          const label = device.provider
            ? (estadoDevice?.canalActual ?? "—")
            : device.connected;
          return (
            <li
              key={device.id}
              className={styles.decoRow}
              style={{ backgroundColor: `var(--${device.id})` }}
            >
              <span className={styles.decoId}>{device.id}</span>
              <span className={styles.decoChannel}>{label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default DecosStatus;
