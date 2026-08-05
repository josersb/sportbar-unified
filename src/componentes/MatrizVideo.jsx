import { useContext, useState, useEffect } from "react";
import { Formik, Form } from "formik";
import Select from "./Select";
import ContextoUser from "../contexto/Contexto";
import { getByCapability } from "../contexto/dispositivos";
import "./Toast.css";
import { joinMultipleTVs, assignSourceToDestination, assignVideoSource, assignAudioSource, fetchTvrackState, setTvrackVideo, setTvrackAudio, setTvrackLink, fetchMatrixState } from "../api/arrangerApi";
import { useToast } from "./Toast";
import PageContainer from "./ui/PageContainer";
import styles from "./MatrizVideo.module.css";
import Button from "./ui/Button";

const ZONE_LABELS = {
  'aVip-Barra-Centro': 'VIP Barra Centro',
  'aVip-Lobby-Batacazo': 'VIP Lobby Batacazo',
  'aVip-Bar-Boveda': 'VIP Bar Bóveda',
  'RACK-VIP-PANTALLABATACA': 'Rack VIP Bataca',
  'aMas-15-Barra': '+15 Barra',
  'a-Menos1-Escenario': 'Escenario -1',
  'a-Menos1-Escenario2': 'Escenario -1 (2)',
  'a-QMR75-Menos1-TV1': 'QMR75 -1 TV1',
  'a-QMR75-Menos1-TV2': 'QMR75 -1 TV2',
  'a-QMC65-Menos1-TV2': 'QMC65 -1 TV2',
};

const ZONAS_FUERA_IDS = [
  'aVip-Barra-Centro', 'aVip-Lobby-Batacazo', 'aVip-Bar-Boveda',
  'RACK-VIP-PANTALLABATACA', 'aMas-15-Barra', 'a-Menos1-Escenario',
  'a-Menos1-Escenario2', 'a-QMR75-Menos1-TV1', 'a-QMR75-Menos1-TV2',
  'a-QMC65-Menos1-TV2',
];

const MatrizVideo = () => {
  const { estado, handleChangeEstadoVideo, tvrackState, handleChangeTvrack, zonasFueraState, handleZonasFueraChange } = useContext(ContextoUser);

  const tvs = estado.tvs;
  const toast = useToast();

  const [loadingVideoBtn, setLoadingVideoBtn] = useState(null);
  const [loadingAudioBtn, setLoadingAudioBtn] = useState(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixResult, setMatrixResult] = useState(null);
  const [matrixDiff, setMatrixDiff] = useState([]);

  const handleSyncMatrix = async () => {
    setMatrixLoading(true);
    try {
      const data = await fetchMatrixState();
      setMatrixResult(data);

      const diffs = [];
      const vwReverse = { "VW-Norte": "VWN", "VW-Centro": "VWC", "VW-Sur": "VWS" };

      for (const [dest, arrangerEncoder] of Object.entries(data.state)) {
        const appKey = vwReverse[dest] || dest;

        if (tvs[appKey] !== undefined) {
          if (tvs[appKey] !== arrangerEncoder && arrangerEncoder !== null) {
            diffs.push({ dest: appKey, app: tvs[appKey], arranger: arrangerEncoder });
          }
        } else if (zonasFueraState[appKey] !== undefined) {
          const appVideo = zonasFueraState[appKey].video;
          if (appVideo !== arrangerEncoder && arrangerEncoder !== null) {
            diffs.push({ dest: appKey, app: appVideo, arranger: arrangerEncoder });
          }
        }
      }

      setMatrixDiff(diffs);
      if (diffs.length === 0) {
        toast.success("✅ La app coincide con el Arranger");
      }
    } catch (err) {
      toast.error("Error al consultar el Arranger");
    } finally {
      setMatrixLoading(false);
    }
  };

  useEffect(() => {
    fetchTvrackState().then(state => {
      handleChangeTvrack(state);
    }).catch(err => {
      console.warn("No se pudo cargar estado de TVRACK del server:", err);
    });
  }, []);




  const handleTvrackBtn = (type, deviceId) => async () => {
    const isVideo = type === "video";
    if (isVideo) setLoadingVideoBtn(deviceId);
    else setLoadingAudioBtn(deviceId);

    try {
      if (tvrackState.link) {
        // Vinculado: join av manda video + audio en un solo comando al Arranger
        await assignSourceToDestination(deviceId, "TVRACK");
        const newState = isVideo
          ? await setTvrackVideo(deviceId)
          : await setTvrackAudio(deviceId);
        handleChangeTvrack(newState);
        toast.success(`${deviceId} → VIDEO + AUDIO TVRACK`);
      } else if (isVideo) {
        await assignVideoSource(deviceId, "TVRACK");
        const newState = await setTvrackVideo(deviceId);
        handleChangeTvrack({ ...tvrackState, video: newState.video });
        toast.success(`${deviceId} → VIDEO TVRACK`);
      } else {
        await assignAudioSource(deviceId, "TVRACK");
        const newState = await setTvrackAudio(deviceId);
        handleChangeTvrack({ ...tvrackState, audio: newState.audio });
        toast.success(`${deviceId} → AUDIO TVRACK`);
      }
    } catch {
      toast.error(`Error al asignar ${isVideo ? "video" : "audio"}`);
    }

    if (isVideo) setLoadingVideoBtn(null);
    else setLoadingAudioBtn(null);
  };

  const handleLinkToggle = async (e) => {
    const linked = e.target.checked;
    handleChangeTvrack({ ...tvrackState, link: linked });
    try {
      const newState = await setTvrackLink(linked);
      handleChangeTvrack(newState);
    } catch {
      handleChangeTvrack({ ...tvrackState, link: !linked });
    }
  };

  return (
    <main className={styles.main}>
      <PageContainer>
        <h3 className={styles.titulo}>Ajustes de la matriz de video</h3>
        <div className={styles.syncRow}>
          <Button
            variant="secondary"
            size="sm"
            loading={matrixLoading}
            onClick={handleSyncMatrix}
          >
            ⚡ Sincronizar con Arranger
          </Button>
          {matrixResult && (
            <span className={styles.syncInfo}>
              {matrixResult.connected}/{matrixResult.connected + matrixResult.disconnected} online · {(matrixResult.elapsedMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        {matrixDiff.length > 0 && (
          <div className={styles.diffPanel}>
            <h4>⚠️ {matrixDiff.length} diferencia(s) con el Arranger</h4>
            <table className={styles.diffTable}>
              <thead><tr><th>Destino</th><th>App</th><th>Arranger</th></tr></thead>
              <tbody>
                {matrixDiff.map((d) => (
                  <tr key={d.dest}>
                    <td>{d.dest}</td>
                    <td className={styles.diffApp}>{d.app}</td>
                    <td className={styles.diffArranger}>{d.arranger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Formik
          initialValues={{
            //ALLTV: tvs.all,
            VWN: tvs.VWN,
            VWC: tvs.VWC,
            VWS: tvs.VWS,
            TvsBarraLivertador: tvs.TvsBarraLivertador,
            TvsBarraSur: tvs.TvsBarraSur,
            TvsBarraPista: tvs.TvsBarraPista,
            TvsBarraNorte: tvs.TvsBarraNorte,
            TvsEscaleraNorte: tvs.TvsEscaleraNorte,
            TvsEscaleraCentro: tvs.TvsEscaleraCentro,
            TvsEscaleraSur: tvs.TvsEscaleraSur,
          }}
          onSubmit={async (values) => {
            const newTvs = { ...tvs };
            newTvs.VWN = values.VWN;
            newTvs.VWC = values.VWC;
            newTvs.VWS = values.VWS;
            newTvs.TvsBarraLivertador = values.TvsBarraLivertador;
            switch (values.TvsBarraLivertador) {
              case "DTV123":
                newTvs.TV01 = "DTV1";
                newTvs.TV02 = "DTV2";
                newTvs.TV03 = "DTV3";
                break;
              case "DTV121":
                newTvs.TV01 = "DTV1";
                newTvs.TV02 = "DTV2";
                newTvs.TV03 = "DTV1";
                break;
              case "DTV542":
                newTvs.TV01 = "DTV5";
                newTvs.TV02 = "DTV4";
                newTvs.TV03 = "DTV2";
                break;
              case "DTV143":
                newTvs.TV01 = "DTV1";
                newTvs.TV02 = "DTV4";
                newTvs.TV03 = "DTV3";
                break;
              case "DTV153":
                newTvs.TV01 = "DTV1";
                newTvs.TV02 = "DTV5";
                newTvs.TV03 = "DTV3";
                break;
              default:
                newTvs.TV01 = values.TvsBarraLivertador;
                newTvs.TV02 = values.TvsBarraLivertador;
                newTvs.TV03 = values.TvsBarraLivertador;
            }
            newTvs.TvsBarraSur = values.TvsBarraSur;
            switch (values.TvsBarraSur) {
              case "DTV1234":
                newTvs.TV04 = "DTV1";
                newTvs.TV05 = "DTV2";
                newTvs.TV06 = "DTV3";
                newTvs.TV07 = "DTV4";
                break;
              case "DTV1212":
                newTvs.TV04 = "DTV1";
                newTvs.TV05 = "DTV2";
                newTvs.TV06 = "DTV1";
                newTvs.TV07 = "DTV2";
                break;
              case "DTV1231":
                newTvs.TV04 = "DTV1";
                newTvs.TV05 = "DTV2";
                newTvs.TV06 = "DTV3";
                newTvs.TV07 = "DTV1";
                break;
              case "DTV5432":
                newTvs.TV04 = "DTV5";
                newTvs.TV05 = "DTV4";
                newTvs.TV06 = "DTV3";
                newTvs.TV07 = "DTV2";
                break;
              case "DTV3254":
                newTvs.TV04 = "DTV3";
                newTvs.TV05 = "DTV2";
                newTvs.TV06 = "DTV5";
                newTvs.TV07 = "DTV4";
                break;
              case "DTV1354":
                newTvs.TV04 = "DTV1";
                newTvs.TV05 = "DTV3";
                newTvs.TV06 = "DTV5";
                newTvs.TV07 = "DTV4";
                break;
              default:
                newTvs.TV04 = values.TvsBarraSur;
                newTvs.TV05 = values.TvsBarraSur;
                newTvs.TV06 = values.TvsBarraSur;
                newTvs.TV07 = values.TvsBarraSur;
            }
            newTvs.TvsBarraPista = values.TvsBarraPista;
            switch (values.TvsBarraPista) {
              case "DTV123":
                newTvs.TV08 = "DTV1";
                newTvs.TV09 = "DTV2";
                newTvs.TV10 = "DTV3";
                break;
              case "DTV121":
                newTvs.TV08 = "DTV1";
                newTvs.TV09 = "DTV2";
                newTvs.TV10 = "DTV1";
                break;
              case "DTV542":
                newTvs.TV08 = "DTV5";
                newTvs.TV09 = "DTV4";
                newTvs.TV10 = "DTV2";
                break;
              case "DTV143":
                newTvs.TV08 = "DTV1";
                newTvs.TV09 = "DTV4";
                newTvs.TV10 = "DTV3";
                break;
              case "DTV153":
                newTvs.TV08 = "DTV1";
                newTvs.TV09 = "DTV5";
                newTvs.TV10 = "DTV3";
                break;
              default:
                newTvs.TV08 = values.TvsBarraPista;
                newTvs.TV09 = values.TvsBarraPista;
                newTvs.TV10 = values.TvsBarraPista;
            }
            newTvs.TvsBarraNorte = values.TvsBarraNorte;
            switch (values.TvsBarraNorte) {
              case "DTV1234":
                newTvs.TV11 = "DTV1";
                newTvs.TV12 = "DTV2";
                newTvs.TV13 = "DTV3";
                newTvs.TV14 = "DTV4";
                break;
              case "DTV1212":
                newTvs.TV11 = "DTV1";
                newTvs.TV12 = "DTV2";
                newTvs.TV13 = "DTV1";
                newTvs.TV14 = "DTV2";
                break;
              case "DTV1231":
                newTvs.TV11 = "DTV1";
                newTvs.TV12 = "DTV2";
                newTvs.TV13 = "DTV3";
                newTvs.TV14 = "DTV1";
                break;
              case "DTV5432":
                newTvs.TV11 = "DTV5";
                newTvs.TV12 = "DTV4";
                newTvs.TV13 = "DTV3";
                newTvs.TV14 = "DTV2";
                break;
              case "DTV3254":
                newTvs.TV11 = "DTV3";
                newTvs.TV12 = "DTV2";
                newTvs.TV13 = "DTV5";
                newTvs.TV14 = "DTV4";
                break;
              case "DTV1354":
                newTvs.TV11 = "DTV1";
                newTvs.TV12 = "DTV3";
                newTvs.TV13 = "DTV5";
                newTvs.TV14 = "DTV4";
                break;
              default:
                newTvs.TV11 = values.TvsBarraNorte;
                newTvs.TV12 = values.TvsBarraNorte;
                newTvs.TV13 = values.TvsBarraNorte;
                newTvs.TV14 = values.TvsBarraNorte;
            }
            newTvs.TvsEscaleraNorte = values.TvsEscaleraNorte;
            switch (values.TvsEscaleraNorte) {
              case "DTV1234":
                newTvs.TV23 = "DTV1";
                newTvs.TV24 = "DTV2";
                newTvs.TV25 = "DTV3";
                newTvs.TV26 = "DTV4";
                break;
              case "DTV1212":
                newTvs.TV23 = "DTV1";
                newTvs.TV24 = "DTV2";
                newTvs.TV25 = "DTV1";
                newTvs.TV26 = "DTV2";
                break;
              case "DTV1231":
                newTvs.TV23 = "DTV1";
                newTvs.TV24 = "DTV2";
                newTvs.TV25 = "DTV3";
                newTvs.TV26 = "DTV1";
                break;
              case "DTV5432":
                newTvs.TV23 = "DTV5";
                newTvs.TV24 = "DTV4";
                newTvs.TV25 = "DTV3";
                newTvs.TV26 = "DTV2";
                break;
              case "DTV3254":
                newTvs.TV23 = "DTV3";
                newTvs.TV24 = "DTV2";
                newTvs.TV25 = "DTV5";
                newTvs.TV26 = "DTV4";
                break;
              case "DTV1354":
                newTvs.TV23 = "DTV1";
                newTvs.TV24 = "DTV3";
                newTvs.TV25 = "DTV5";
                newTvs.TV26 = "DTV4";
                break;
              default:
                newTvs.TV23 = values.TvsEscaleraNorte;
                newTvs.TV24 = values.TvsEscaleraNorte;
                newTvs.TV25 = values.TvsEscaleraNorte;
                newTvs.TV26 = values.TvsEscaleraNorte;
            }
            newTvs.TvsEscaleraCentro = values.TvsEscaleraCentro;
            switch (values.TvsEscaleraCentro) {
              case "DTV1234":
                newTvs.TV19 = "DTV1";
                newTvs.TV20 = "DTV2";
                newTvs.TV21 = "DTV3";
                newTvs.TV22 = "DTV4";
                break;
              case "DTV1212":
                newTvs.TV19 = "DTV1";
                newTvs.TV20 = "DTV2";
                newTvs.TV21 = "DTV1";
                newTvs.TV22 = "DTV2";
                break;
              case "DTV1231":
                newTvs.TV19 = "DTV1";
                newTvs.TV20 = "DTV2";
                newTvs.TV21 = "DTV3";
                newTvs.TV22 = "DTV1";
                break;
              case "DTV5432":
                newTvs.TV19 = "DTV5";
                newTvs.TV20 = "DTV4";
                newTvs.TV21 = "DTV3";
                newTvs.TV22 = "DTV2";
                break;
              case "DTV3254":
                newTvs.TV19 = "DTV3";
                newTvs.TV20 = "DTV2";
                newTvs.TV21 = "DTV5";
                newTvs.TV22 = "DTV4";
                break;
              case "DTV1354":
                newTvs.TV19 = "DTV1";
                newTvs.TV20 = "DTV3";
                newTvs.TV21 = "DTV5";
                newTvs.TV22 = "DTV4";
                break;
              default:
                newTvs.TV19 = values.TvsEscaleraCentro;
                newTvs.TV20 = values.TvsEscaleraCentro;
                newTvs.TV21 = values.TvsEscaleraCentro;
                newTvs.TV22 = values.TvsEscaleraCentro;
            }
            newTvs.TvsEscaleraSur = values.TvsEscaleraSur;
            switch (values.TvsEscaleraSur) {
              case "DTV1234":
                newTvs.TV15 = "DTV1";
                newTvs.TV16 = "DTV2";
                newTvs.TV17 = "DTV3";
                newTvs.TV18 = "DTV4";
                break;
              case "DTV1212":
                newTvs.TV15 = "DTV1";
                newTvs.TV16 = "DTV2";
                newTvs.TV17 = "DTV1";
                newTvs.TV18 = "DTV2";
                break;
              case "DTV1231":
                newTvs.TV15 = "DTV1";
                newTvs.TV16 = "DTV2";
                newTvs.TV17 = "DTV3";
                newTvs.TV18 = "DTV1";
                break;
              case "DTV5432":
                newTvs.TV15 = "DTV5";
                newTvs.TV16 = "DTV4";
                newTvs.TV17 = "DTV3";
                newTvs.TV18 = "DTV2";
                break;
              case "DTV3254":
                newTvs.TV15 = "DTV3";
                newTvs.TV16 = "DTV2";
                newTvs.TV17 = "DTV5";
                newTvs.TV18 = "DTV4";
                break;
              case "DTV1354":
                newTvs.TV15 = "DTV1";
                newTvs.TV16 = "DTV3";
                newTvs.TV17 = "DTV5";
                newTvs.TV18 = "DTV4";
                break;
              default:
                newTvs.TV15 = values.TvsEscaleraSur;
                newTvs.TV16 = values.TvsEscaleraSur;
                newTvs.TV17 = values.TvsEscaleraSur;
                newTvs.TV18 = values.TvsEscaleraSur;
            }
            const vwDestNames = {
              VWN: "VW-Norte",
              VWC: "VW-Centro",
              VWS: "VW-Sur",
            };
            const mappings = Object.entries(newTvs)
              .filter(([tv]) => tv !== 'TVRACK')
              .map(([tv, source]) => ({
                source,
                dest: vwDestNames[tv] || tv,
              }));
            try {
              // Enviar en lotes de 8 para no saturar la red y actualizar
              // el Aside incrementalmente (no esperar al final de los 46)
              const BATCH_SIZE = 8;
              for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
                const batch = mappings.slice(i, i + BATCH_SIZE);
                await Promise.allSettled(
                  batch.map(({ source, dest }) =>
                    assignSourceToDestination(source, dest)
                  )
                );
                // Actualizar estado incremental: cada lote refresca el Aside
                handleChangeEstadoVideo({ ...newTvs });
              }
              toast.success("Matriz de video actualizada");
            } catch {
              toast.error("Error al actualizar la matriz de video");
            }
          }}
        >
          <Form>
            <div className={styles.formContainer}>
              <div className={styles.selectZona}>
                <h3 className={styles.selectZonaTitulo}>Videos Wall Norte - Centro - Sur</h3>
                <div className={styles.selectRow}>
                  <Select id="select-VWN" label="VWall Norte" name="VWN" className={styles.formSelect}>
                    {getByCapability('videoSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
                    ))}
                  </Select>
                  <Select label="VWall Centro" name="VWC" className={styles.formSelect}>
                    {getByCapability('videoSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
                    ))}
                  </Select>
                  <Select label="VWall Sur" name="VWS" className={styles.formSelect}>
                    {getByCapability('videoSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className={styles.selectZona}>
                <h3 className={styles.selectZonaTitulo}>Perimetro de TVs Norte - Centro - Sur</h3>
                <div className={styles.selectRow}>
                  <Select
                    label="TVs Escalera Norte"
                    name="TvsEscaleraNorte"
                    className={styles.formSelect}
                  >
                    {getByCapability('videoSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
                    ))}
                    <option value="DTV1234">DTV1,2,3,4</option>
                    <option value="DTV1212">DTV1,2,1,2</option>
                    <option value="DTV1231">DTV1,2,3,1</option>
                    <option value="DTV5432">DTV5,4,3,2</option>
                    <option value="DTV3254">DTV3,2,5,4</option>
                    <option value="DTV1354">DTV1,3,5,4</option>
                  </Select>
                  <Select
                    label="TVs Escalera Centro"
                    name="TvsEscaleraCentro"
                    className={styles.formSelect}
                  >
                    {getByCapability('videoSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
                    ))}
                    <option value="DTV1234">DTV1,2,3,4</option>
                    <option value="DTV1212">DTV1,2,1,2</option>
                    <option value="DTV1231">DTV1,2,3,1</option>
                    <option value="DTV5432">DTV5,4,3,2</option>
                    <option value="DTV3254">DTV3,2,5,4</option>
                    <option value="DTV1354">DTV1,3,5,4</option>
                  </Select>
                  <Select label="TVs Escalera Sur" name="TvsEscaleraSur" className={styles.formSelect}>
                    {getByCapability('videoSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
                    ))}
                    <option value="DTV1234">DTV1,2,3,4</option>
                    <option value="DTV1212">DTV1,2,1,2</option>
                    <option value="DTV1231">DTV1,2,3,1</option>
                    <option value="DTV5432">DTV5,4,3,2</option>
                    <option value="DTV3254">DTV3,2,5,4</option>
                    <option value="DTV1354">DTV1,3,5,4</option>
                  </Select>
                </div>
              </div>
              <div className={styles.selectZona}>
                <h3 className={styles.selectZonaTitulo}>
                  Tvs de la Barra Norte - Livertador - Sur - Pista
                </h3>
                <div className={styles.selectRow}>
                  <Select label="TVs Barra Norte" name="TvsBarraNorte" className={styles.formSelect}>
                    {getByCapability('videoSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
                    ))}
                    <option value="DTV1234">DTV1,2,3,4</option>
                    <option value="DTV1212">DTV1,2,1,2</option>
                    <option value="DTV1231">DTV1,2,3,1</option>
                    <option value="DTV5432">DTV5,4,3,2</option>
                    <option value="DTV3254">DTV3,2,5,4</option>
                    <option value="DTV1354">DTV1,3,5,4</option>
                  </Select>
                  <Select
                    label="TVs Barra Livertador"
                    name="TvsBarraLivertador"
                    className={styles.formSelect}
                  >
                    {getByCapability('videoSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
                    ))}
                    <option value="DTV123">DTV1,2,3</option>
                    <option value="DTV121">DTV1,2,1</option>
                    <option value="DTV542">DTV5,4,2</option>
                    <option value="DTV143">DTV1,4,3</option>
                    <option value="DTV153">DTV1,5,3</option>
                  </Select>
                  <Select label="TVs Barra Sur" name="TvsBarraSur" className={styles.formSelect}>
                    {getByCapability('videoSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
                    ))}
                    <option value="DTV1234">DTV1,2,3,4</option>
                    <option value="DTV1212">DTV1,2,1,2</option>
                    <option value="DTV1231">DTV1,2,3,1</option>
                    <option value="DTV5432">DTV5,4,3,2</option>
                    <option value="DTV3254">DTV3,2,5,4</option>
                    <option value="DTV1354">DTV1,3,5,4</option>
                  </Select>
                  <Select label="TVs Barra Pista" name="TvsBarraPista" className={styles.formSelect}>
                    {getByCapability('videoSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
                    ))}
                    <option value="DTV123">DTV1,2,3</option>
                    <option value="DTV121">DTV1,2,1</option>
                    <option value="DTV542">DTV5,4,2</option>
                    <option value="DTV143">DTV1,4,3</option>
                    <option value="DTV153">DTV1,5,3</option>
                  </Select>
                </div>
              </div>
              <div className={styles.submitContainer}>
                <Button type="submit" variant="primary">
                  Enviar
                </Button>
              </div>
              <div className={styles.selectZona}>
                <h3 className={styles.selectZonaTitulo}>
                  TV Monitoreo Multimedia — TVRACK
                </h3>
                <div className={styles.tvrackSubSection}>
                  <div className={styles.tvrackSubHeader}>
                    <span className={styles.tvrackIconVideo}>▶</span>
                    <span className={styles.tvrackLabelVideo}>Video</span>
                    <span className={styles.tvrackActiveBadge}>
                      ● {tvrackState.video}
                    </span>
                  </div>
                  <div className={styles.rackRow}>
                    {getByCapability("videoSource").map((d) => {
                      const isActive = d.id === tvrackState.video;
                      return (
                        <Button
                          key={`video-${d.id}`}
                          selected={isActive}
                          onClick={handleTvrackBtn("video", d.id)}
                          loading={loadingVideoBtn === d.id}
                          data-testid={`btn-video-${d.id}`}
                        >
                          {d.id}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className={styles.tvrackLinkRow}>
                  <span>🔗</span>
                  <label className={styles.tvrackLinkLabel}>
                    <input
                      type="checkbox"
                      checked={tvrackState.link}
                      onChange={handleLinkToggle}
                    />
                    Vincular Audio y Video
                  </label>
                </div>
                <div className={styles.tvrackSubSection}>
                  <div className={styles.tvrackSubHeader}>
                    <span className={styles.tvrackIconAudio}>♪</span>
                    <span className={styles.tvrackLabelAudio}>Audio</span>
                    <span className={styles.tvrackActiveBadge}>
                      ● {tvrackState.audio}
                    </span>
                  </div>
                  <div className={styles.rackRow}>
                    {getByCapability("videoSource").map((d) => {
                      const isActive = d.id === tvrackState.audio;
                      return (
                        <Button
                          key={`audio-${d.id}`}
                          selected={isActive}
                          onClick={handleTvrackBtn("audio", d.id)}
                          loading={loadingAudioBtn === d.id}
                          data-testid={`btn-audio-${d.id}`}
                        >
                          {d.id}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className={styles.selectZona}>
                <h3 className={styles.selectZonaTitulo}>
                  ZONAS FUERA DE SPORTBAR
                </h3>
                <div className={styles.zonasFueraGrid}>
                  {ZONAS_FUERA_IDS.map((zoneId) => {
                    const zoneState = zonasFueraState[zoneId] || {};
                    return (
                      <div key={zoneId} className={styles.zonaCard}>
                        <div className={styles.tvrackSubHeader}>
                          <span>{ZONE_LABELS[zoneId]}</span>
                          <span className={styles.tvrackActiveBadge}>
                            {zoneState.video || '—'}
                          </span>
                        </div>
                        <div className={styles.rackRow}>
                          {getByCapability('videoSource').map((d) => (
                            <Button
                              key={`zf-${zoneId}-${d.id}`}
                              selected={d.id === zoneState.video}
                              onClick={() => handleZonasFueraChange(zoneId, 'video', d.id)}
                              data-testid={`btn-zf-video-${zoneId}-${d.id}`}
                            >
                              {d.id}
                            </Button>
                          ))}
                        </div>
                        <div className={styles.tvrackLinkRow}>
                          <label className={styles.tvrackLinkLabel}>
                            <input
                              type="checkbox"
                              checked={zoneState.link || false}
                              onChange={(e) => handleZonasFueraChange(zoneId, 'link', e.target.checked)}
                            />
                            Vincular video + audio
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Form>
        </Formik>
      </PageContainer>
      {/*
        Empty div placeholder for MatrizPreset (rendered separately).
        Kept for layout compatibility — the flex row needs a sibling.
      */}
    </main>
  );
};

export default MatrizVideo;
