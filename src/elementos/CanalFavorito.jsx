import PropTypes from "prop-types";
import Button from "../componentes/ui/Button";
import styles from "./CanalFavorito.module.css";

const CanalFavorito = ({ CanalFavorito, imgCanalFavorito }) => {
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<img src={imgCanalFavorito} alt="" />}
      className={styles.CanalFavorito}
    >
      <h3>{CanalFavorito}</h3>
    </Button>
  );
};

CanalFavorito.propTypes = {
  CanalFavorito: PropTypes.number,
  imgCanalFavorito: PropTypes.string,
};

export default CanalFavorito;
