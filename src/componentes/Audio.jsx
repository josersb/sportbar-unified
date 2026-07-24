import { useContext, useState } from "react";
import { Formik, Form } from "formik";
import CheckBox from "./CheckBox";
import Select from "./Select";
import TextInput from "./TextInput";

import ContextoUser from "../contexto/Contexto";
import { getByCapability } from "../contexto/dispositivos";
import { sendSerialCommand } from "../api/arrangerApi";
import { useAhmZone, useAhmConnection } from "../contexto/ContextoAHM";
import { isEnabled as isAhmEnabled } from "../api/ahmApi";
import "./Toast.css";
import { useToast } from "./Toast";
import PageContainer from "./ui/PageContainer";
import styles from "./Audio.module.css";

// ── Zone Number Mapping (user-facing → AHM) ────────────────────────────────
// useAhmZone(1) = Norte, useAhmZone(2) = Centro, useAhmZone(3) = Sur
const AHM_ZONE_NORTE = 1;
const AHM_ZONE_CENTRO = 2;
const AHM_ZONE_SUR = 3;

const Audio = () => {
  const { estado, handleChangeEstadoAudio } = useContext(ContextoUser);
  const audio = estado.audio;
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  // ── Feature flag ──────────────────────────────────────────────────────
  const ahmEnabled = isAhmEnabled();

  // ── AHM hooks (always called — returns defaults when disabled) ───────
  const ahmNorte = useAhmZone(AHM_ZONE_NORTE);
  const ahmCentro = useAhmZone(AHM_ZONE_CENTRO);
  const ahmSur = useAhmZone(AHM_ZONE_SUR);
  const ahmConn = useAhmConnection();

  // ── Volume range depends on active DSP ────────────────────────────────
  const volumeMin = ahmEnabled ? -100 : -40;
  const volumeMax = ahmEnabled ? 10 : 0;

  return (
    <main>
      <Formik
        enableReinitialize={ahmEnabled}
        initialValues={{
          // Source selection always comes from old Contexto (AHM doesn't control routing)
          audioNorte: audio[2].fuenteAudio,
          muteNorte: ahmEnabled ? ahmNorte.muted : audio[2].mute,
          volumenNorte: ahmEnabled ? ahmNorte.level : audio[2].volumen,
          audioCentro: audio[1].fuenteAudio,
          muteCentro: ahmEnabled ? ahmCentro.muted : audio[1].mute,
          volumenCentro: ahmEnabled ? ahmCentro.level : audio[1].volumen,
          audioSur: audio[0].fuenteAudio,
          muteSur: ahmEnabled ? ahmSur.muted : audio[0].mute,
          volumenSur: ahmEnabled ? ahmSur.level : audio[0].volumen,
          unicaZona: "false",
        }}
        onSubmit={async (values) => {
          setSubmitting(true);
          const newAudio = audio.map((zona, i) => ({
            ...zona,
            fuenteAudio: i === 0 ? values.audioSur : i === 1 ? values.audioCentro : values.audioNorte,
            volumen: i === 0 ? values.volumenSur : i === 1 ? values.volumenCentro : values.volumenNorte,
            mute: i === 0 ? values.muteSur : i === 1 ? values.muteCentro : values.muteNorte,
          }));
          handleChangeEstadoAudio(newAudio);

          try {
            if (ahmEnabled) {
              // ── AHM-32 path: level/mute via WebSocket ──────────────
              ahmNorte.setMute(values.muteNorte);
              ahmCentro.setMute(values.muteCentro);
              ahmSur.setMute(values.muteSur);

              // Volume is submitted as number string → parse to float
              ahmNorte.setLevel(parseFloat(values.volumenNorte));
              ahmCentro.setLevel(parseFloat(values.volumenCentro));
              ahmSur.setLevel(parseFloat(values.volumenSur));

              // Source selection still via Arranger (AHM doesn't route sources)
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
            } else {
              // ── Legacy path: via Tesira DSP + Arranger serial ──────
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
            }
            toast.success("Audio actualizado correctamente");
          } catch {
            toast.error("Error al comunicar con el sistema de audio");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <PageContainer>
          <h3 className={styles.titulo}>Ajuste de audio - zonas Sur-Centro-Norte</h3>

          {/* ── AHM Connection Indicator ───────────────────────────────── */}
          {ahmEnabled && (
            <div className={styles.statusBar}>
              <span
                className={styles.connectionDot}
                style={{
                  backgroundColor: ahmConn.connected ? "#4CAF50" : "#F44336",
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  marginRight: 8,
                  verticalAlign: "middle",
                }}
              />
              <span style={{ verticalAlign: "middle" }}>
                {ahmConn.connected
                  ? "AHM-32 Conectado"
                  : "AHM-32 Desconectado"}
              </span>
            </div>
          )}

          <div className={styles.formWrapper}>
            <Form>
              <div className={styles.selectZona}>
                {/* ── Zona Norte ───────────────────────────────────── */}
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
                    min={volumeMin}
                    max={volumeMax}
                    step={ahmEnabled ? "1" : "1"}
                    className={styles.formInput}
                  />
                  <CheckBox name="muteNorte">Mute</CheckBox>
                </div>

                {/* ── Zona Centro ───────────────────────────────────── */}
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
                    min={volumeMin}
                    max={volumeMax}
                    step={ahmEnabled ? "1" : "1"}
                    className={styles.formInput}
                  />
                  <CheckBox name="muteCentro">Mute</CheckBox>
                </div>

                {/* ── Zona Sur ──────────────────────────────────────── */}
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
                    min={volumeMin}
                    max={volumeMax}
                    step={ahmEnabled ? "1" : "1"}
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
