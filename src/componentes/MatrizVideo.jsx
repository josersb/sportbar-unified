import { useContext, useState } from "react";
import { Formik, Form } from "formik";
import Select from "./Select";
import ContextoUser from "../contexto/Contexto";
import { getByCapability } from "../contexto/dispositivos";
import "./MatrizVideo.css";
import { joinMultipleTVs, assignSourceToDestination } from "../api/arrangerApi";

const MatrizVideo = () => {
  const { estado, handleChangeEstadoVideo } = useContext(ContextoUser);

  const tvs = estado.tvs;
  const [loadingBtn, setLoadingBtn] = useState(null);

  const handleBtnDTV = (deviceId) => async () => {
    setLoadingBtn(deviceId);
    try {
      await assignSourceToDestination(deviceId, "TVRACK");
    } catch (error) {
      console.error("[ArrangerAPI] Error:", error);
    }
    handleChangeEstadoVideo({ ...tvs, TVRACK: deviceId });
    setLoadingBtn(null);
  };

  return (
    <main className="matriz-main">
      <div className="matriz-main-container">
        <h3 className="matriz-main-titulo">Ajustes de la matriz de video</h3>
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
            TVRACK: tvs.TVRACK,
          }}
          onSubmit={async (values) => {
            tvs.VWN = values.VWN;
            tvs.VWC = values.VWC;
            tvs.VWS = values.VWS;
            tvs.TVRACK = values.TVRACK;
            tvs.TvsBarraLivertador = values.TvsBarraLivertador;
            switch (values.TvsBarraLivertador) {
              case "DTV123":
                tvs.TV01 = "DTV1";
                tvs.TV02 = "DTV2";
                tvs.TV03 = "DTV3";
                break;
              case "DTV121":
                tvs.TV01 = "DTV1";
                tvs.TV02 = "DTV2";
                tvs.TV03 = "DTV1";
                break;
              case "DTV542":
                tvs.TV01 = "DTV5";
                tvs.TV02 = "DTV4";
                tvs.TV03 = "DTV2";
                break;
              case "DTV143":
                tvs.TV01 = "DTV1";
                tvs.TV02 = "DTV4";
                tvs.TV03 = "DTV3";
                break;
              case "DTV153":
                tvs.TV01 = "DTV1";
                tvs.TV02 = "DTV5";
                tvs.TV03 = "DTV3";
                break;
              default:
                tvs.TV01 = values.TvsBarraLivertador;
                tvs.TV02 = values.TvsBarraLivertador;
                tvs.TV03 = values.TvsBarraLivertador;
            }
            tvs.TvsBarraSur = values.TvsBarraSur;
            switch (values.TvsBarraSur) {
              case "DTV1234":
                tvs.TV04 = "DTV1";
                tvs.TV05 = "DTV2";
                tvs.TV06 = "DTV3";
                tvs.TV07 = "DTV4";
                break;
              case "DTV1212":
                tvs.TV04 = "DTV1";
                tvs.TV05 = "DTV2";
                tvs.TV06 = "DTV1";
                tvs.TV07 = "DTV2";
                break;
              case "DTV1231":
                tvs.TV04 = "DTV1";
                tvs.TV05 = "DTV2";
                tvs.TV06 = "DTV3";
                tvs.TV07 = "DTV1";
                break;
              case "DTV5432":
                tvs.TV04 = "DTV5";
                tvs.TV05 = "DTV4";
                tvs.TV06 = "DTV3";
                tvs.TV07 = "DTV2";
                break;
              case "DTV3254":
                tvs.TV04 = "DTV3";
                tvs.TV05 = "DTV2";
                tvs.TV06 = "DTV5";
                tvs.TV07 = "DTV4";
                break;
              case "DTV1354":
                tvs.TV04 = "DTV1";
                tvs.TV05 = "DTV3";
                tvs.TV06 = "DTV5";
                tvs.TV07 = "DTV4";
                break;
              default:
                tvs.TV04 = values.TvsBarraSur;
                tvs.TV05 = values.TvsBarraSur;
                tvs.TV06 = values.TvsBarraSur;
                tvs.TV07 = values.TvsBarraSur;
            }
            tvs.TvsBarraPista = values.TvsBarraPista;
            switch (values.TvsBarraPista) {
              case "DTV123":
                tvs.TV08 = "DTV1";
                tvs.TV09 = "DTV2";
                tvs.TV10 = "DTV3";
                break;
              case "DTV121":
                tvs.TV08 = "DTV1";
                tvs.TV09 = "DTV2";
                tvs.TV10 = "DTV1";
                break;
              case "DTV542":
                tvs.TV08 = "DTV5";
                tvs.TV09 = "DTV4";
                tvs.TV10 = "DTV2";
                break;
              case "DTV143":
                tvs.TV08 = "DTV1";
                tvs.TV09 = "DTV4";
                tvs.TV10 = "DTV3";
                break;
              case "DTV153":
                tvs.TV08 = "DTV1";
                tvs.TV09 = "DTV5";
                tvs.TV10 = "DTV3";
                break;
              default:
                tvs.TV08 = values.TvsBarraPista;
                tvs.TV09 = values.TvsBarraPista;
                tvs.TV10 = values.TvsBarraPista;
            }
            tvs.TvsBarraNorte = values.TvsBarraNorte;
            switch (values.TvsBarraNorte) {
              case "DTV1234":
                tvs.TV11 = "DTV1";
                tvs.TV12 = "DTV2";
                tvs.TV13 = "DTV3";
                tvs.TV14 = "DTV4";
                break;
              case "DTV1212":
                tvs.TV11 = "DTV1";
                tvs.TV12 = "DTV2";
                tvs.TV13 = "DTV1";
                tvs.TV14 = "DTV2";
                break;
              case "DTV1231":
                tvs.TV11 = "DTV1";
                tvs.TV12 = "DTV2";
                tvs.TV13 = "DTV3";
                tvs.TV14 = "DTV1";
                break;
              case "DTV5432":
                tvs.TV11 = "DTV5";
                tvs.TV12 = "DTV4";
                tvs.TV13 = "DTV3";
                tvs.TV14 = "DTV2";
                break;
              case "DTV3254":
                tvs.TV11 = "DTV3";
                tvs.TV12 = "DTV2";
                tvs.TV13 = "DTV5";
                tvs.TV14 = "DTV4";
                break;
              case "DTV1354":
                tvs.TV11 = "DTV1";
                tvs.TV12 = "DTV3";
                tvs.TV13 = "DTV5";
                tvs.TV14 = "DTV4";
                break;
              default:
                tvs.TV11 = values.TvsBarraNorte;
                tvs.TV12 = values.TvsBarraNorte;
                tvs.TV13 = values.TvsBarraNorte;
                tvs.TV14 = values.TvsBarraNorte;
            }
            tvs.TvsEscaleraNorte = values.TvsEscaleraNorte;
            switch (values.TvsEscaleraNorte) {
              case "DTV1234":
                tvs.TV23 = "DTV1";
                tvs.TV24 = "DTV2";
                tvs.TV25 = "DTV3";
                tvs.TV26 = "DTV4";
                break;
              case "DTV1212":
                tvs.TV23 = "DTV1";
                tvs.TV24 = "DTV2";
                tvs.TV25 = "DTV1";
                tvs.TV26 = "DTV2";
                break;
              case "DTV1231":
                tvs.TV23 = "DTV1";
                tvs.TV24 = "DTV2";
                tvs.TV25 = "DTV3";
                tvs.TV26 = "DTV1";
                break;
              case "DTV5432":
                tvs.TV23 = "DTV5";
                tvs.TV24 = "DTV4";
                tvs.TV25 = "DTV3";
                tvs.TV26 = "DTV2";
                break;
              case "DTV3254":
                tvs.TV23 = "DTV3";
                tvs.TV24 = "DTV2";
                tvs.TV25 = "DTV5";
                tvs.TV26 = "DTV4";
                break;
              case "DTV1354":
                tvs.TV23 = "DTV1";
                tvs.TV24 = "DTV3";
                tvs.TV25 = "DTV5";
                tvs.TV26 = "DTV4";
                break;
              default:
                tvs.TV23 = values.TvsEscaleraNorte;
                tvs.TV24 = values.TvsEscaleraNorte;
                tvs.TV25 = values.TvsEscaleraNorte;
                tvs.TV26 = values.TvsEscaleraNorte;
            }
            tvs.TvsEscaleraCentro = values.TvsEscaleraCentro;
            switch (values.TvsEscaleraCentro) {
              case "DTV1234":
                tvs.TV19 = "DTV1";
                tvs.TV20 = "DTV2";
                tvs.TV21 = "DTV3";
                tvs.TV22 = "DTV4";
                break;
              case "DTV1212":
                tvs.TV19 = "DTV1";
                tvs.TV20 = "DTV2";
                tvs.TV21 = "DTV1";
                tvs.TV22 = "DTV2";
                break;
              case "DTV1231":
                tvs.TV19 = "DTV1";
                tvs.TV20 = "DTV2";
                tvs.TV21 = "DTV3";
                tvs.TV22 = "DTV1";
                break;
              case "DTV5432":
                tvs.TV19 = "DTV5";
                tvs.TV20 = "DTV4";
                tvs.TV21 = "DTV3";
                tvs.TV22 = "DTV2";
                break;
              case "DTV3254":
                tvs.TV19 = "DTV3";
                tvs.TV20 = "DTV2";
                tvs.TV21 = "DTV5";
                tvs.TV22 = "DTV4";
                break;
              case "DTV1354":
                tvs.TV19 = "DTV1";
                tvs.TV20 = "DTV3";
                tvs.TV21 = "DTV5";
                tvs.TV22 = "DTV4";
                break;
              default:
                tvs.TV19 = values.TvsEscaleraCentro;
                tvs.TV20 = values.TvsEscaleraCentro;
                tvs.TV21 = values.TvsEscaleraCentro;
                tvs.TV22 = values.TvsEscaleraCentro;
            }
            tvs.TvsEscaleraSur = values.TvsEscaleraSur;
            switch (values.TvsEscaleraSur) {
              case "DTV1234":
                tvs.TV15 = "DTV1";
                tvs.TV16 = "DTV2";
                tvs.TV17 = "DTV3";
                tvs.TV18 = "DTV4";
                break;
              case "DTV1212":
                tvs.TV15 = "DTV1";
                tvs.TV16 = "DTV2";
                tvs.TV17 = "DTV1";
                tvs.TV18 = "DTV2";
                break;
              case "DTV1231":
                tvs.TV15 = "DTV1";
                tvs.TV16 = "DTV2";
                tvs.TV17 = "DTV3";
                tvs.TV18 = "DTV1";
                break;
              case "DTV5432":
                tvs.TV15 = "DTV5";
                tvs.TV16 = "DTV4";
                tvs.TV17 = "DTV3";
                tvs.TV18 = "DTV2";
                break;
              case "DTV3254":
                tvs.TV15 = "DTV3";
                tvs.TV16 = "DTV2";
                tvs.TV17 = "DTV5";
                tvs.TV18 = "DTV4";
                break;
              case "DTV1354":
                tvs.TV15 = "DTV1";
                tvs.TV16 = "DTV3";
                tvs.TV17 = "DTV5";
                tvs.TV18 = "DTV4";
                break;
              default:
                tvs.TV15 = values.TvsEscaleraSur;
                tvs.TV16 = values.TvsEscaleraSur;
                tvs.TV17 = values.TvsEscaleraSur;
                tvs.TV18 = values.TvsEscaleraSur;
            }
            const vwDestNames = {
              VWN: "VW-Norte",
              VWC: "VW-Centro",
              VWS: "VW-Sur",
            };
            const mappings = Object.entries(estado.tvs).map(([tv, source]) => ({
              source,
              dest: vwDestNames[tv] || tv,
            }));
            await joinMultipleTVs(mappings);
            handleChangeEstadoVideo(tvs);
          }}
        >
          <Form>
            <div className="matriz-main-form">
              <div className="matriz-select-zona">
                <h3 className="matriz-select-zona-titulo">Videos Wall Norte - Centro - Sur</h3>
                <div className="matriz-select-vwallNCS">
                  <Select id="select-VWN" label="VWall Norte" name="VWN" className="matriz-select">
                    {getByCapability('videoSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
                    ))}
                  </Select>
                  <Select label="VWall Centro" name="VWC" className="matriz-select">
                    {getByCapability('videoSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
                    ))}
                  </Select>
                  <Select label="VWall Sur" name="VWS" className="matriz-select">
                    {getByCapability('videoSource').map(d => (
                      <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="matriz-select-zona">
                <h3 className="matriz-select-zona-titulo">Perimetro de TVs Norte - Centro - Sur</h3>
                <div className="matriz-select-perimetro">
                  <Select
                    label="TVs Escalera Norte"
                    name="TvsEscaleraNorte"
                    className="matriz-select"
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
                    className="matriz-select"
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
                  <Select label="TVs Escalera Sur" name="TvsEscaleraSur" className="matriz-select">
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
              <div className="matriz-select-zona">
                <h3 className="matriz-select-zona-titulo">
                  Tvs de la Barra Norte - Livertador - Sur - Pista
                </h3>
                <div className="matriz-select-barra">
                  <Select label="TVs Barra Norte" name="TvsBarraNorte" className="matriz-select">
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
                    className="matriz-select"
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
                  <Select label="TVs Barra Sur" name="TvsBarraSur" className="matriz-select">
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
                  <Select label="TVs Barra Pista" name="TvsBarraPista" className="matriz-select">
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
              <button type="submit" className="form-submit">
                Enviar
              </button>
              <div className="matriz-select-zona">
                <h3 className="matriz-select-zona-titulo">
                  Select Deco al TV de Monitoreo Multimedia - TVRACK
                </h3>
                <div className="matriz-select-rack">
                  {getByCapability('videoSource').map(d => (
                    <button key={d.id} type="button" data-testid={`btn-${d.id}`} onClick={handleBtnDTV(d.id)} className="form-submit" disabled={loadingBtn === d.id}>
                      {d.connected || d.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Form>
        </Formik>
      </div>
      <div className="matriz-main-preset"></div>
    </main>
  );
};

export default MatrizVideo;
