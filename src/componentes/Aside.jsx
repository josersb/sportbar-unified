import { useContext } from "react";
import ContextoUser from "../contexto/Contexto";
import { getAllDevices } from "../contexto/dispositivos";
import "./Aside.css";

const Aside = () => {
  const { estado } = useContext(ContextoUser);

  const audio = estado.audio;
  const tvs = estado.tvs;

  // Actualiza por colores CSS el estado de cada TV y zona de audio segun deco instalado y color asignado al deco
  let r = document.querySelector(":root");
  const refreshEstadoAudioVideo = (r, tvs, audio) => {
    for (const [key, value] of Object.entries(tvs)) {
      r.style.setProperty(`--${key}`, `var(--${value})`);
    }
    r.style.setProperty("--ANorte", `var(--${audio[0].fuenteAudio})`);
    r.style.setProperty("--ACentro", `var(--${audio[1].fuenteAudio})`);
    r.style.setProperty("--ASur", `var(--${audio[2].fuenteAudio})`);
  };
  refreshEstadoAudioVideo(r, tvs, audio);

  // Boton de recarga de todos los canales selecionado en cada deco por infrarrojo
  const submitCanales = async (e) => {
    e.preventDefault();
    // Recarga implementada via sendChannelDigits en arrangerApi.js
  };

  return (
    <aside className="aside-container">
      <div className="decos-info">
        <h3 className="decos-titulo">
          Estado de canales
          <form onSubmit={submitCanales} className="decos-titulo-recargar">
            <button type="submit">Recargar</button>
          </form>
        </h3>
        <ul className="lista-decos">
          <li className="lista-decos-encabezados">
            <span>DECO</span>
            <span>CANAL</span>
          </li>
          {getAllDevices().map(device => {
            const estadoDevice = estado.dispositivos?.[device.id];
            const label = device.provider
              ? (estadoDevice?.canalActual ?? '—')
              : device.connected;
            return (
              <li key={device.id} className="item-deco" style={{ backgroundColor: device.color }}>
                <span className="item-deco-titulo">{device.id}</span>
                <span className="item-deco-canal">{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="audio-info">
        <h3 className="audio-titulo">Estado del audio</h3>
        <ul className="lista-zonas">
          <li className="lista-audio-encabezados">
            <span>Zona</span>
            <span>Deco</span>
            <span>Vol</span>
            <span>Mute</span>
          </li>
          <li className="item-audio item-audio-norte">
            <span className="item-audio-zona">{audio[0].nombreZona}</span>
            <span className="item-audio-deco">{audio[0].fuenteAudio}</span>
            <span className="item-audio-Vol">{audio[0].volumen}</span>
            <span className="item-audio-Mute">{audio[0].mute ? "ON" : "OFF"}</span>
          </li>
          <li className="item-audio item-audio-centro">
            <span className="item-audio-zona">{audio[1].nombreZona}</span>
            <span className="item-audio-deco">{audio[1].fuenteAudio}</span>
            <span className="item-audio-Vol">{audio[1].volumen}</span>
            <span className="item-audio-Mute">{audio[1].mute ? "ON" : "OFF"}</span>
          </li>
          <li className="item-audio item-audio-sur">
            <span className="item-audio-zona">{audio[2].nombreZona}</span>
            <span className="item-audio-deco">{audio[2].fuenteAudio}</span>
            <span className="item-audio-Vol">{audio[2].volumen}</span>
            <span className="item-audio-Mute">{audio[2].mute ? "ON" : "OFF"}</span>
          </li>
        </ul>
      </div>
      <div className="video-info">
        <h3 className="video-titulo">Estado del video</h3>
        <div className="lista-video">
          <li className="container-tvs-vw">
            <p id="VWN">VWNorte</p>
            <p id="VWC">VWCentro</p>
            <p id="VWS">VWSur</p>
          </li>
          <div className="container-escalera-barra">
            <li className="container-tvs-escalera_sur">
              <p id="TV15">TV15</p>
              <p id="TV16">TV16</p>
              <p id="TV17">TV17</p>
              <p id="TV18">TV18</p>
            </li>
            <div>
              <li className="container-tvs-escalera_centro">
                <p id="TV19">TV19</p>
                <p id="TV20">TV20</p>
                <p id="TV21">TV21</p>
                <p id="TV22">TV22</p>
              </li>
              <li className="container-tvs-barra">
                <p id="TV01">TV1</p>
                <p id="TV02">TV2</p>
                <p id="TV03">TV3</p>
                <p id="TV04">TV4</p>
                <p id="TV05">TV5</p>
                <p id="TV06">TV6</p>
                <p id="TV07">TV7</p>
                <p id="TV08">TV8</p>
                <p id="TV09">TV9</p>
                <p id="TV10">TV10</p>
                <p id="TV11">TV11</p>
                <p id="TV12">TV12</p>
                <p id="TV13">TV13</p>
                <p id="TV14">TV14</p>
                <p id="TVRACK">TVRK</p>
              </li>
            </div>
            <li className="container-tvs-escalera_norte">
              <p id="TV23">TV23</p>
              <p id="TV24">TV24</p>
              <p id="TV25">TV25</p>
              <p id="TV26">TV26</p>
            </li>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Aside;
