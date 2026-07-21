import { useRef, useContext } from "react";
import ContextoUser from "../contexto/Contexto";
import { usePreset } from "../hooks/usePreset";
import "./Toast.css";
import { useToast } from "./Toast";
import styles from "./MatrizPreset.module.css";

const MatrizPreset = () => {
  const { estado } = useContext(ContextoUser);
  const descripcionPreset = estado.descripcionPreset;
  const toast = useToast();

  // Generic preset hook — one instance per preset (1..5)
  const preset1 = usePreset(1);
  const preset2 = usePreset(2);
  const preset3 = usePreset(3);
  const preset4 = usePreset(4);
  const preset5 = usePreset(5);

  const inputRef1 = useRef();
  const inputRef2 = useRef();
  const inputRef3 = useRef();
  const inputRef4 = useRef();
  const inputRef5 = useRef();

  const handleLoadPreset = (preset, label) => async () => {
    try {
      await preset.load();
      toast.success(`Preset ${label} cargado`);
    } catch {
      toast.error("Error al comunicar con el Arranger");
    }
  };

  const handleSavePreset = (preset, ref, label) => () => {
    preset.save(ref.current.value || "");
    toast.success(`Preset ${label} guardado`);
  };

  return (
    <div className={styles.presetContainer}>
      <h3 className={styles.titulo}>Presets</h3>
      <ul>
        <li className={styles.item}>
          <button onClick={handleLoadPreset(preset1, "1")} className={styles.btnCargarPreset}>
            Preset 1
          </button>
          <input
            type="text"
            name="preset1"
            ref={inputRef1}
            placeholder={descripcionPreset[0]?.preset1 || ""}
            className="canales-form-input"
          />
          <button
            onClick={handleSavePreset(preset1, inputRef1, "1")}
            className={styles.btnGrabarPreset}
            aria-label="Grabar preset 1"
          ></button>
        </li>
        <li className={styles.item}>
          <button onClick={handleLoadPreset(preset2, "2")} className={styles.btnCargarPreset}>
            Preset 2
          </button>
          <input
            type="text"
            name="preset2"
            ref={inputRef2}
            placeholder={descripcionPreset[1]?.preset2 || ""}
            className="canales-form-input"
          />
          <button
            onClick={handleSavePreset(preset2, inputRef2, "2")}
            className={styles.btnGrabarPreset}
            aria-label="Grabar preset 2"
          ></button>
        </li>
        <li className={styles.item}>
          <button onClick={handleLoadPreset(preset3, "3")} className={styles.btnCargarPreset}>
            Preset 3
          </button>
          <input
            type="text"
            name="preset3"
            ref={inputRef3}
            placeholder={descripcionPreset[2]?.preset3 || ""}
            className="canales-form-input"
          />
          <button
            onClick={handleSavePreset(preset3, inputRef3, "3")}
            className={styles.btnGrabarPreset}
            aria-label="Grabar preset 3"
          ></button>
        </li>
        <li className={styles.item}>
          <button onClick={handleLoadPreset(preset4, "4")} className={styles.btnCargarPreset}>
            Preset 4
          </button>
          <input
            type="text"
            name="preset4"
            ref={inputRef4}
            placeholder={descripcionPreset[3]?.preset4 || ""}
            className="canales-form-input"
          />
          <button
            onClick={handleSavePreset(preset4, inputRef4, "4")}
            className={styles.btnGrabarPreset}
            aria-label="Grabar preset 4"
          ></button>
        </li>
        <li className={styles.item}>
          <button onClick={handleLoadPreset(preset5, "5")} className={styles.btnCargarPreset}>
            Preset 5
          </button>
          <input
            type="text"
            name="preset5"
            ref={inputRef5}
            placeholder={descripcionPreset[4]?.preset5 || ""}
            className="canales-form-input"
          />
          <button
            onClick={handleSavePreset(preset5, inputRef5, "5")}
            className={styles.btnGrabarPreset}
            aria-label="Grabar preset 5"
          ></button>
        </li>
      </ul>
    </div>
  );
};

export default MatrizPreset;
