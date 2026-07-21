import PageContainer from "./ui/PageContainer";
import styles from "./Arranger.module.css";

const Arranger = () => {
  return (
    <main>
      <PageContainer>
        <h3 className={styles.titulo}>Links a ventanas de software Arranger IPEX5000</h3>
        <ul className={styles.grillaLinks}>
          <a href="http://192.168.2.254/#/status" target="_blank" rel="noopener noreferrer" className={styles.link}>
            Estados de Fuentes y TVs
          </a>
          <a href="http://192.168.2.254/#/matrix" target="_blank" rel="noopener noreferrer" className={styles.link}>
            Matriz de Audio Video
          </a>
          <a href="http://192.168.2.254/#/tools/previews" className={styles.link} target="_blank" rel="noopener noreferrer">
            Preview de Fuentes de Señal
          </a>
          <a href="http://192.168.2.254/#/device-settings" className={styles.link} target="_blank" rel="noopener noreferrer">
            Ajustes de Dispositivos
          </a>
          <a href="http://192.168.2.254/#/tools" className={styles.link} target="_blank" rel="noopener noreferrer">
            Herramientas
          </a>
        </ul>
      </PageContainer>
    </main>
  );
};

export default Arranger;
