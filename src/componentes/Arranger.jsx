import PageContainer from "./ui/PageContainer";
import styles from "./Arranger.module.css";

const Arranger = () => {
  const ARRANGER_UI = `http://${import.meta.env.VITE_ARRANGER_HOST || "192.168.2.254"}`;

  return (
    <main>
      <PageContainer>
        <h3 className={styles.titulo}>Links a ventanas de software Arranger IPEX5000</h3>
        <ul className={styles.grillaLinks}>
          <a href={`${ARRANGER_UI}/#/status`} target="_blank" rel="noopener noreferrer" className={styles.link}>
            Estados de Fuentes y TVs
          </a>
          <a href={`${ARRANGER_UI}/#/matrix`} target="_blank" rel="noopener noreferrer" className={styles.link}>
            Matriz de Audio Video
          </a>
          <a href={`${ARRANGER_UI}/#/tools/previews`} className={styles.link} target="_blank" rel="noopener noreferrer">
            Preview de Fuentes de Señal
          </a>
          <a href={`${ARRANGER_UI}/#/device-settings`} className={styles.link} target="_blank" rel="noopener noreferrer">
            Ajustes de Dispositivos
          </a>
          <a href={`${ARRANGER_UI}/#/tools`} className={styles.link} target="_blank" rel="noopener noreferrer">
            Herramientas
          </a>
        </ul>
      </PageContainer>
    </main>
  );
};

export default Arranger;
