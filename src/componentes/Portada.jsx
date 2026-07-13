import React from "react";
import "./Portada.css";
import logoSportbar1280x720 from "../imagenes/logoSportbar1280x720.png";

const Portada = () => {

  return (
    <div className="portada-main-container">
      <img src={logoSportbar1280x720} alt="" />
    </div>
  );
};

export default Portada;
