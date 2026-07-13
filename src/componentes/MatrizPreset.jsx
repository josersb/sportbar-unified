import React, { useRef, useContext } from "react";
import ContextoUser from "../contexto/Contexto";
import "./MatrizPreset.css";

const MatrizPreset = () => {
  const { estado, handleChangeEstadoVideo, handleChangeEstadoPreset } =
    useContext(ContextoUser);
  const tvs = estado.tvs;
  const descripcionPreset = estado.descripcionPreset;

  const useInputRefPreset1 = useRef();
  const useInputRefPreset2 = useRef();
  const useInputRefPreset3 = useRef();
  const useInputRefPreset4 = useRef();
  const useInputRefPreset5 = useRef();

  const handleCargaMatriz = async () => {
    // Matriz arranger
    const myInit = { method: "GET", mode: "no-cors", cache: "default" };
    try {
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.VWN}%20VW-Norte/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.VWC}%20VW-Centro/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.VWS}%20VW-Sur/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV01}%20TV01/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV02}%20TV02/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV03}%20TV03/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV04}%20TV04/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV05}%20TV05/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV06}%20TV06/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV07}%20TV07/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV08}%20TV08/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV09}%20TV09/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV10}%20TV10/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV11}%20TV11/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV12}%20TV12/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV13}%20TV13/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV14}%20TV14/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV15}%20TV15/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV16}%20TV16/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV17}%20TV17/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV18}%20TV18/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV19}%20TV19/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV20}%20TV20/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV21}%20TV21/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV22}%20TV22/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV23}%20TV23/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV24}%20TV24/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV25}%20TV25/TOKEN_REMOVED`,
        myInit
      );
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20${tvs.TV26}%20TV26/TOKEN_REMOVED`,
        myInit
      );
    } catch (error) {
      console.log("error solicitud Arranger 5000");
    }
  };

  const handlePreset1 = () => {
    // Obtenemos las tareas guardadas de localstorage Preset 1.
    const estadoApp_Preset1_Guardado = localStorage.getItem("estadoApp_Preset1")
      ? JSON.parse(localStorage.getItem("estadoApp_Preset1"))
      : null;
    handleChangeEstadoVideo(estadoApp_Preset1_Guardado.tvs);
    handleCargaMatriz();
    window.location.reload();
  };
  const handleGrabar1 = () => {
    descripcionPreset[0].preset1 = useInputRefPreset1.current.value;
    handleChangeEstadoPreset(descripcionPreset);
    localStorage.setItem("estadoApp_Preset1", JSON.stringify(estado));
  };
  const handlePreset2 = () => {
    // Obtenemos las tareas guardadas de localstorage Preset 2.
    const estadoApp_Preset2_Guardado = localStorage.getItem("estadoApp_Preset2")
      ? JSON.parse(localStorage.getItem("estadoApp_Preset2"))
      : null;
    handleChangeEstadoVideo(estadoApp_Preset2_Guardado.tvs);
    handleCargaMatriz();
    window.location.reload();
  };
  const handleGrabar2 = () => {
    console.log("antes", descripcionPreset[1].preset2);
    descripcionPreset[1].preset2 = useInputRefPreset2.current.value;
    console.log("despues", descripcionPreset[1].preset2);
    handleChangeEstadoPreset(descripcionPreset);
    localStorage.setItem("estadoApp_Preset2", JSON.stringify(estado));
  };
  const handlePreset3 = () => {
    // Obtenemos las tareas guardadas de localstorage Preset 3.
    const estadoApp_Preset3_Guardado = localStorage.getItem("estadoApp_Preset3")
      ? JSON.parse(localStorage.getItem("estadoApp_Preset3"))
      : null;
    handleChangeEstadoVideo(estadoApp_Preset3_Guardado.tvs);
    handleCargaMatriz();
    window.location.reload();
  };
  const handleGrabar3 = () => {
    descripcionPreset[2].preset3 = useInputRefPreset3.current.value;
    handleChangeEstadoPreset(descripcionPreset);
    localStorage.setItem("estadoApp_Preset3", JSON.stringify(estado));
  };
  const handlePreset4 = () => {
    // Obtenemos las tareas guardadas de localstorage Preset 4.
    const estadoApp_Preset4_Guardado = localStorage.getItem("estadoApp_Preset4")
      ? JSON.parse(localStorage.getItem("estadoApp_Preset4"))
      : null;
    handleChangeEstadoVideo(estadoApp_Preset4_Guardado.tvs);
    handleCargaMatriz();
    window.location.reload();
  };
  const handleGrabar4 = () => {
    descripcionPreset[3].preset4 = useInputRefPreset4.current.value;
    handleChangeEstadoPreset(descripcionPreset);
    localStorage.setItem("estadoApp_Preset4", JSON.stringify(estado));
  };
  const handlePreset5 = () => {
    // Obtenemos las tareas guardadas de localstorage Preset 5.
    const estadoApp_Preset5_Guardado = localStorage.getItem("estadoApp_Preset5")
      ? JSON.parse(localStorage.getItem("estadoApp_Preset5"))
      : null;
    handleChangeEstadoVideo(estadoApp_Preset5_Guardado.tvs);
    handleCargaMatriz();
    window.location.reload();
  };
  const handleGrabar5 = () => {
    descripcionPreset[4].preset5 = useInputRefPreset5.current.value;
    handleChangeEstadoPreset(descripcionPreset);
    localStorage.setItem("estadoApp_Preset5", JSON.stringify(estado));
  };

  return (
    <div>
      <h3 className="matriz-main-titulo">Presets</h3>
      <ul>
        <li className="matriz-main-item">
          <button onClick={handlePreset1} className="btnCargarPreset">
            Preset 1
          </button>
          <input
            type="text"
            name="preset1"
            ref={useInputRefPreset1}
            placeholder={descripcionPreset[0].preset1}
            className="canales-form-input"
          />
          <button onClick={handleGrabar1} className="btnGrabarPreset"></button>
        </li>
        <li className="matriz-main-item">
          <button onClick={handlePreset2} className="btnCargarPreset">
            Preset 2
          </button>
          <input
            type="text"
            name="preset2"
            ref={useInputRefPreset2}
            placeholder={descripcionPreset[1].preset2}
            className="canales-form-input"
          />
          <button onClick={handleGrabar2} className="btnGrabarPreset"></button>
        </li>
        <li className="matriz-main-item">
          <button onClick={handlePreset3} className="btnCargarPreset">
            Preset 3
          </button>
          <input
            type="text"
            name="preset3"
            ref={useInputRefPreset3}
            placeholder={descripcionPreset[2].preset3}
            className="canales-form-input"
          />
          <button onClick={handleGrabar3} className="btnGrabarPreset"></button>
        </li>
        <li className="matriz-main-item">
          <button onClick={handlePreset4} className="btnCargarPreset">
            Preset 4
          </button>
          <input
            type="text"
            name="preset4"
            ref={useInputRefPreset4}
            placeholder={descripcionPreset[3].preset4}
            className="canales-form-input"
          />
          <button onClick={handleGrabar4} className="btnGrabarPreset"></button>
        </li>
        <li className="matriz-main-item">
          <button onClick={handlePreset5} className="btnCargarPreset">
            Preset 5
          </button>
          <input
            type="text"
            name="preset5"
            ref={useInputRefPreset5}
            placeholder={descripcionPreset[4].preset5}
            className="canales-form-input"
          />
          <button onClick={handleGrabar5} className="btnGrabarPreset"></button>
        </li>
      </ul>
    </div>
  );
};

export default MatrizPreset;
