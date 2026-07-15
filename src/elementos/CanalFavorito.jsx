import PropTypes from "prop-types";
import "./CanalFavorito.css";

const CanalFavorito = ({ CanalFavorito, imgCanalFavorito }) => {
  return (
    <button className="CanalFavorito">
      <img src={imgCanalFavorito} alt="" />
      <h3>{CanalFavorito}</h3>
    </button>
  );
};

CanalFavorito.propTypes = {
  CanalFavorito: PropTypes.number,
  imgCanalFavorito: PropTypes.string,
};

export default CanalFavorito;
