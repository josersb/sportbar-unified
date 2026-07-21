import PageContainer from "./ui/PageContainer";
import styles from "./Portada.module.css";
import logoSportbar1280x720 from "../imagenes/logoSportbar1280x720.png";

const Portada = () => {
  return (
    <PageContainer className={styles.portadaMainContainer}>
      <img src={logoSportbar1280x720} alt="" />
    </PageContainer>
  );
};

export default Portada;
