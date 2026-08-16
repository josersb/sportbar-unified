import PageContainer from "./ui/PageContainer";
import styles from "./Soporte.module.css";

const Soporte = () => {
  return (
    <main>
      <PageContainer>
        <h3 className={styles.titulo}>Wetech Latam soporte técnico</h3>
        <ul className={styles.grillaLinks}>
          <a
            href="http://www.wetechlatam.com"
            target="blank"
            className={styles.link}
          >
            Home Page Wetech Latam
          </a>
          <a
            href="mailto:soporte@wetechar.com"
            target="blank"
            className={styles.link}
          >
            Correo electrónico soporte técnico
          </a>
        </ul>
      </PageContainer>
    </main>
  );
};

export default Soporte;
