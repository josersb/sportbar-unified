import { useContext } from "react";
import { Formik, Form } from "formik";
import CheckBox from "./CheckBox";
import Select from "./Select";
import TextInput from "./TextInput";

import ContextoUser from "../contexto/Contexto";
import { getByCapability } from "../contexto/dispositivos";
import { sendSerialCommand } from "../api/arrangerApi";
import "./Audio.css";

const Audio = () => {
  const { estado, handleChangeEstadoAudio } = useContext(ContextoUser);

  const audio = estado.audio;

  //Tesira
  // TesiraMute1
  // send serial DTV1 "Mute1 set mute 1 true\x0A"

  return (
    <main>
      <Formik
        initialValues={{
          audioNorte: audio[0].fuenteAudio,
          muteNorte: audio[0].mute,
          volumenNorte: audio[0].volumen,
          audioCentro: audio[1].fuenteAudio,
          muteCentro: audio[1].mute,
          volumenCentro: audio[1].volumen,
          audioSur: audio[2].fuenteAudio,
          muteSur: audio[2].mute,
          volumenSur: audio[2].volumen,
          unicaZona: "false",
        }}
        onSubmit={async (values) => {
          audio[0].fuenteAudio = values.audioNorte;
          audio[0].volumen = values.volumenNorte;
          audio[0].mute = values.muteNorte;
          audio[1].fuenteAudio = values.audioCentro;
          audio[1].volumen = values.volumenCentro;
          audio[1].mute = values.muteCentro;
          audio[2].fuenteAudio = values.audioSur;
          audio[2].volumen = values.volumenSur;
          audio[2].mute = values.muteSur;
          handleChangeEstadoAudio(audio);
          console.log(audio);

          try {
            // DTV1 = RS232 gateway to Tesira DSP (not a DirecTV decoder for audio purposes)
            await sendSerialCommand("DTV1", `Mute1 set mute 1 ${values.muteNorte}`);
            await sendSerialCommand("DTV1", `Mute2 set mute 1 ${values.muteCentro}`);
            await sendSerialCommand("DTV1", `Mute3 set mute 1 ${values.muteSur}`);
            await sendSerialCommand("DTV1", `Level3 set level 1 ${values.volumenNorte}`);
            await sendSerialCommand("DTV1", `Level4 set level 1 ${values.volumenCentro}`);
            await sendSerialCommand("DTV1", `Level5 set level 1 ${values.volumenSur}`);
            await sendSerialCommand(
              "DTV1",
              `SourceSelector1 set sourceSelection ${values.audioNorte}`
            );
            await sendSerialCommand(
              "DTV1",
              `SourceSelector2 set sourceSelection ${values.audioCentro}`
            );
            await sendSerialCommand(
              "DTV1",
              `SourceSelector3 set sourceSelection ${values.audioSur}`
            );
          } catch {
            console.log("error solicitud Arranger 5000");
          }
        }}
      >
        <div className="audio-main-container">
          <h3 className="audio-main-titulo">Ajuste de audio - zonas Sur-Centro-Norte</h3>
          <div className="audio-main-form">
            <Form>
              <div className="audio-select-zona">
                <div className="audio-select-elementos">
                  <Select
                    label="Fuente de audio Norte...."
                    name="audioNorte"
                    className="audio-form-select"
                  >
                    <option value="">--Seleccione Deco--</option>
                    {getByCapability('audioSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id}</option>
                    ))}
                  </Select>
                  <TextInput
                    name="volumenNorte"
                    label="Volumen"
                    type="number"
                    min="-40"
                    max="0"
                    step="1"
                    className="audio-form-input"
                  />
                  <CheckBox name="muteNorte">Mute</CheckBox>
                </div>
                <div className="audio-select-elementos">
                  <Select
                    label="Fuente de audio Centro..."
                    name="audioCentro"
                    className="audio-form-select"
                  >
                    <option value="">--Seleccione Deco--</option>
                    {getByCapability('audioSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id}</option>
                    ))}
                  </Select>
                  <TextInput
                    name="volumenCentro"
                    label="Volumen"
                    type="number"
                    min="-40"
                    max="0"
                    step="1"
                    className="audio-form-input"
                  />
                  <CheckBox name="muteCentro">Mute</CheckBox>
                </div>
                <div className="audio-select-elementos">
                  <Select
                    label="Fuente de audio Sur........"
                    name="audioSur"
                    className="audio-form-select"
                  >
                    <option value="">--Seleccione Deco--</option>
                    {getByCapability('audioSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id}</option>
                    ))}
                  </Select>
                  <TextInput
                    name="volumenSur"
                    label="Volumen"
                    type="number"
                    min="-40"
                    max="0"
                    step="1"
                    className="audio-form-input"
                  />
                  <CheckBox name="muteSur">Mute</CheckBox>
                </div>
              </div>
              <button type="submit" className="form-submit">
                Enviar
              </button>
            </Form>
          </div>
        </div>
      </Formik>
    </main>
  );
};

export default Audio;
