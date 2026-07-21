import { useContext, useState } from "react";
import { Formik, Form } from "formik";
import CheckBox from "./CheckBox";
import Select from "./Select";
import TextInput from "./TextInput";

import ContextoUser from "../contexto/Contexto";
import { getByCapability } from "../contexto/dispositivos";
import { sendSerialCommand } from "../api/arrangerApi";
import "./Toast.css";
import { useToast } from "./Toast";
import PageContainer from "./ui/PageContainer";
import styles from "./Audio.module.css";

const Audio = () => {
  const { estado, handleChangeEstadoAudio } = useContext(ContextoUser);

  const audio = estado.audio;
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

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
          setSubmitting(true);
          const newAudio = audio.map((zona, i) => ({
            ...zona,
            fuenteAudio: i === 0 ? values.audioNorte : i === 1 ? values.audioCentro : values.audioSur,
            volumen: i === 0 ? values.volumenNorte : i === 1 ? values.volumenCentro : values.volumenSur,
            mute: i === 0 ? values.muteNorte : i === 1 ? values.muteCentro : values.muteSur,
          }));
          handleChangeEstadoAudio(newAudio);

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
            toast.success("Audio actualizado correctamente");
          } catch {
            toast.error("Error al comunicar con el Arranger");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <PageContainer>
          <h3 className={styles.titulo}>Ajuste de audio - zonas Sur-Centro-Norte</h3>
          <div className={styles.formWrapper}>
            <Form>
              <div className={styles.selectZona}>
                <div className={styles.selectElementos}>
                  <Select
                    label="Fuente de audio Norte...."
                    name="audioNorte"
                    className={styles.formSelect}
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
                    className={styles.formInput}
                  />
                  <CheckBox name="muteNorte">Mute</CheckBox>
                </div>
                <div className={styles.selectElementos}>
                  <Select
                    label="Fuente de audio Centro..."
                    name="audioCentro"
                    className={styles.formSelect}
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
                    className={styles.formInput}
                  />
                  <CheckBox name="muteCentro">Mute</CheckBox>
                </div>
                <div className={styles.selectElementos}>
                  <Select
                    label="Fuente de audio Sur........"
                    name="audioSur"
                    className={styles.formSelect}
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
                    className={styles.formInput}
                  />
                  <CheckBox name="muteSur">Mute</CheckBox>
                </div>
              </div>
              <button type="submit" className={styles.formSubmit} disabled={submitting}>
                {submitting ? "Enviando..." : "Enviar"}
              </button>
            </Form>
          </div>
        </PageContainer>
      </Formik>
    </main>
  );
};

export default Audio;
