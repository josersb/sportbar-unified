import React from "react";
import img_espn from "./../imagenes/espn.png";
import "./CanalFavorito.css";

const CanalFavorito = ({CanalFavorito,imgCanalFavorito}) => {

  return (
    <button className="CanalFavorito">
      <img src={imgCanalFavorito} alt='' />
      <h3>{CanalFavorito}</h3>
    </button>
  );
};

export default CanalFavorito;
