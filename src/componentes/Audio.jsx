import React, { useRef, useState, useEffect, useContext } from "react";
import { Formik, Form } from "formik";
import CheckBox from "./CheckBox";
import Select from "./Select";
import TextInput from "./TextInput";

import ContextoUser from "../contexto/Contexto";
import "./Audio.css";

const Audio = () => {
  const { estado, handleChangeEstadoDecos, handleChangeEstadoAudio } =
    useContext(ContextoUser);

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

          // send serial DTV1 "Mute1 set mute 1 true x0A"
          // send serial DTV1 "Mute1 set mute 1 false x0A"
          const myInit = { method: "GET", mode: "no-cors", cache: "default" };
          try {
            await fetch(
              `http://192.168.2.254/api/command/send%20serial%20DTV1%20%22Mute1%20set%20mute%201%20${values.muteNorte}%5cx0A%22/TOKEN_REMOVED`,
              myInit
            );
            await fetch(
              `http://192.168.2.254/api/command/send%20serial%20DTV1%20%22Mute2%20set%20mute%201%20${values.muteCentro}%5cx0A%22/TOKEN_REMOVED`,
              myInit
            );
            await fetch(
              `http://192.168.2.254/api/command/send%20serial%20DTV1%20%22Mute3%20set%20mute%201%20${values.muteSur}%5cx0A%22/TOKEN_REMOVED`,
              myInit
            );
            await fetch(
              `http://192.168.2.254/api/command/send%20serial%20DTV1%20%22Level3%20set%20level%201%20${values.volumenNorte}%5cx0A%22/TOKEN_REMOVED`,
              myInit
            );
            await fetch(
              `http://192.168.2.254/api/command/send%20serial%20DTV1%20%22Level4%20set%20level%201%20${values.volumenNorte}%5cx0A%22/TOKEN_REMOVED`,
              myInit
            );
            await fetch(
              `http://192.168.2.254/api/command/send%20serial%20DTV1%20%22Level5%20set%20level%201%20${values.volumenNorte}%5cx0A%22/TOKEN_REMOVED`,
              myInit
            );
            await fetch(
              `http://192.168.2.254/api/command/send%20serial%20DTV1%20%22SourceSelector1%20set%20sourceSelection%20${values.audioNorte.slice(
                3,
                5
              )}%5cx0A%22/TOKEN_REMOVED`,
              myInit
            );
            await fetch(
              `http://192.168.2.254/api/command/send%20serial%20DTV1%20%22SourceSelector2%20set%20sourceSelection%20${values.audioCentro.slice(
                3,
                5
              )}%5cx0A%22/TOKEN_REMOVED`,
              myInit
            );
            await fetch(
              `http://192.168.2.254/api/command/send%20serial%20DTV1%20%22SourceSelector3%20set%20sourceSelection%20${values.audioSur.slice(
                3,
                5
              )}%5cx0A%22/TOKEN_REMOVED`,
              myInit
            );
          } catch (error) {
            console.log("error solicitud Arranger 5000");
          }
        }}
      >
        <div className="audio-main-container">
          <h3 className="audio-main-titulo">
            Ajuste de audio - zonas Sur-Centro-Norte
          </h3>
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
                    <option value="DTV1">DTV 1</option>
                    <option value="DTV2">DTV 2</option>
                    <option value="DTV3">DTV 3</option>
                    <option value="DTV4">DTV 4</option>
                    <option value="DTV5">DTV 5</option>
                    <option value="DTV6">DTV 6</option>
                    <option value="DTV7">DTV 7</option>
                    <option value="DTV8">DTV 8</option>
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
                    <option value="DTV1">DTV 1</option>
                    <option value="DTV2">DTV 2</option>
                    <option value="DTV3">DTV 3</option>
                    <option value="DTV4">DTV 4</option>
                    <option value="DTV5">DTV 5</option>
                    <option value="DTV6">DTV 6</option>
                    <option value="DTV7">DTV 7</option>
                    <option value="DTV8">DTV 8</option>
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
                    <option value="DTV1">DTV 1</option>
                    <option value="DTV2">DTV 2</option>
                    <option value="DTV3">DTV 3</option>
                    <option value="DTV4">DTV 4</option>
                    <option value="DTV5">DTV 5</option>
                    <option value="DTV6">DTV 6</option>
                    <option value="DTV7">DTV 7</option>
                    <option value="DTV8">DTV 8</option>
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
