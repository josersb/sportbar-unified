import React, { useState, useEffect } from "react";
import { ProviderUser, estadoInicial } from "./contexto/Contexto";
import Body from "./componentes/Body";

const App = () => {
  // Obtenemos las tareas guardadas de localstorage.
  const estadoAppGuardado = localStorage.getItem("estadoApp")
    ? JSON.parse(localStorage.getItem("estadoApp"))
    : estadoInicial;

  const [estado, setEstado] = useState(estadoAppGuardado);

  const decos = estado.decos;
  const audio = estado.audio;
  const tvs = estado.tvs;

  // Guardando el estado dentro de localstorage
  useEffect(() => {
    localStorage.setItem("estadoApp", JSON.stringify(estado));
  }, [estado]);

  const handleChangeEstadoDecos = (decos) => {
    setEstado((estado) => {
      return {
        ...estado,
        decos,
      };
    });
  };
  const handleChangeEstadoAudio = (audio) => {
    setEstado((estado) => {
      return {
        ...estado,
        audio,
      };
    });
  };
  const handleChangeEstadoVideo = (tvs) => {
    setEstado((estado) => {
      return {
        ...estado,
        tvs,
      };
    });
    //Actualiza los colores del estado delos TVs en el ASIDE
    // Get the root element
    //let r = document.querySelector(":root");
    // Create a function for setting a variable value
    // r.style.setProperty('--VWC', 'blue');
  };
  const handleChangeEstadoPreset = (descripcionPreset) => {
    setEstado((estado) => {
      return {
        ...estado,
        descripcionPreset,
      };
    });
  };

  return (
    <ProviderUser
      value={{
        estado,
        handleChangeEstadoDecos,
        handleChangeEstadoAudio,
        handleChangeEstadoVideo,
        handleChangeEstadoPreset,
      }}
    >
      <Body />
    </ProviderUser>
  );
};

export default App;
