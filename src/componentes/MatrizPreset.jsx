import { useRef, useContext } from "react";
import ContextoUser from "../contexto/Contexto";
import { DISPOSITIVOS } from "../contexto/dispositivos";
import { joinMultipleTVs } from "../api/arrangerApi";
import "./MatrizPreset.css";
import "./Toast.css";
import { useToast } from "./Toast";

const MatrizPreset = () => {
  const { estado, handleChangeEstadoVideo, handleChangeEstadoPreset } = useContext(ContextoUser);
  const tvs = estado.tvs;
  const descripcionPreset = estado.descripcionPreset;
  const toast = useToast();

  const useInputRefPreset1 = useRef();
  const useInputRefPreset2 = useRef();
  const useInputRefPreset3 = useRef();
  const useInputRefPreset4 = useRef();
  const useInputRefPreset5 = useRef();

  const handleCargaMatriz = async () => {
    const mappings = [
      { source: tvs.VWN, dest: "VW-Norte" },
      { source: tvs.VWC, dest: "VW-Centro" },
      { source: tvs.VWS, dest: "VW-Sur" },
      { source: tvs.TV01, dest: "TV01" },
      { source: tvs.TV02, dest: "TV02" },
      { source: tvs.TV03, dest: "TV03" },
      { source: tvs.TV04, dest: "TV04" },
      { source: tvs.TV05, dest: "TV05" },
      { source: tvs.TV06, dest: "TV06" },
      { source: tvs.TV07, dest: "TV07" },
      { source: tvs.TV08, dest: "TV08" },
      { source: tvs.TV09, dest: "TV09" },
      { source: tvs.TV10, dest: "TV10" },
      { source: tvs.TV11, dest: "TV11" },
      { source: tvs.TV12, dest: "TV12" },
      { source: tvs.TV13, dest: "TV13" },
      { source: tvs.TV14, dest: "TV14" },
      { source: tvs.TV15, dest: "TV15" },
      { source: tvs.TV16, dest: "TV16" },
      { source: tvs.TV17, dest: "TV17" },
      { source: tvs.TV18, dest: "TV18" },
      { source: tvs.TV19, dest: "TV19" },
      { source: tvs.TV20, dest: "TV20" },
      { source: tvs.TV21, dest: "TV21" },
      { source: tvs.TV22, dest: "TV22" },
      { source: tvs.TV23, dest: "TV23" },
      { source: tvs.TV24, dest: "TV24" },
      { source: tvs.TV25, dest: "TV25" },
      { source: tvs.TV26, dest: "TV26" },
    ];
    try {
      await joinMultipleTVs(mappings);
    } catch {
      toast.error("Error al comunicar con el Arranger");
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
