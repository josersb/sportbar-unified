import { useContext, useMemo } from "react";
import ContextoUser from "../contexto/Contexto";
import { getAllDevices } from "../contexto/dispositivos";
import styles from "./Aside.module.css";

const Aside = () => {
  const { estado } = useContext(ContextoUser);

  const audio = estado.audio;
  const tvs = estado.tvs;

  // Compute CSS custom properties from state — replaces the old :root mutation
  const cssColors = useMemo(() => {
    const vars = {};
    for (const [key, value] of Object.entries(tvs)) {
      vars[`--${key}`] = `var(--${value})`;
    }
    vars["--ANorte"] = `var(--${audio[0]?.fuenteAudio || "DTV1"})`;
    vars["--ACentro"] = `var(--${audio[1]?.fuenteAudio || "DTV1"})`;
    vars["--ASur"] = `var(--${audio[2]?.fuenteAudio || "DTV1"})`;
    return vars;
  }, [tvs, audio]);

  return (
    <aside className={styles.asideContainer} style={cssColors}>
      <div className={styles.decosInfo}>
        <h3 className={styles.decosTitulo}>
          Estado de canales
            <form onSubmit={(e) => e.preventDefault()} className={styles.decosTituloRecargar}>
              <button type="submit" aria-label="Recargar estado de canales">Recargar</button>
            </form>
        </h3>
        <ul className={styles.listaDecos}>
          <li className={styles.listaDecosEncabezados}>
            <span>DECO</span>
            <span>CANAL</span>
          </li>
          {getAllDevices().map(device => {
            const estadoDevice = estado.dispositivos?.[device.id];
            const label = device.provider
              ? (estadoDevice?.canalActual ?? '—')
              : device.connected;
            return (
              <li key={device.id} className={styles.itemDeco} style={{ backgroundColor: device.color }}>
                <span className={styles.itemAudioZona}>{device.id}</span>
                <span className={styles.itemAudioVol}>{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className={styles.audioInfo}>
        <h3 className={styles.audioTitulo}>Estado del audio</h3>
        <ul className={styles.listaAudio}>
          <li className={styles.listaAudioEncabezados}>
            <span>Zona</span>
            <span>Deco</span>
            <span>Vol</span>
            <span>Mute</span>
          </li>
          <li className={styles.itemAudioNorte}>
            <span className={styles.itemAudioZona}>{audio[0]?.nombreZona}</span>
            <span className={styles.itemAudioDeco}>{audio[0]?.fuenteAudio}</span>
            <span className={styles.itemAudioVol}>{audio[0]?.volumen}</span>
            <span className={styles.itemAudioMute}>{audio[0]?.mute ? "ON" : "OFF"}</span>
          </li>
          <li className={styles.itemAudioCentro}>
            <span className={styles.itemAudioZona}>{audio[1]?.nombreZona}</span>
            <span className={styles.itemAudioDeco}>{audio[1]?.fuenteAudio}</span>
            <span className={styles.itemAudioVol}>{audio[1]?.volumen}</span>
            <span className={styles.itemAudioMute}>{audio[1]?.mute ? "ON" : "OFF"}</span>
          </li>
          <li className={styles.itemAudioSur}>
            <span className={styles.itemAudioZona}>{audio[2]?.nombreZona}</span>
            <span className={styles.itemAudioDeco}>{audio[2]?.fuenteAudio}</span>
            <span className={styles.itemAudioVol}>{audio[2]?.volumen}</span>
            <span className={styles.itemAudioMute}>{audio[2]?.mute ? "ON" : "OFF"}</span>
          </li>
        </ul>
      </div>
      <div className={styles.videoInfo}>
        <h3 className={styles.videoTitulo}>Estado del video</h3>
        <div className={styles.listaVideo}>
          <div className={styles.containerTvsVw}>
            <p id="VWN" style={{ backgroundColor: cssColors["--VWN"] }}>VWNorte</p>
            <p id="VWC" style={{ backgroundColor: cssColors["--VWC"] }}>VWCentro</p>
            <p id="VWS" style={{ backgroundColor: cssColors["--VWS"] }}>VWSur</p>
          </div>
          <div className={styles.containerEscaleraBarra}>
            <div className={styles.containerTvsEscaleraSur}>
              <p id="TV15" style={{ backgroundColor: cssColors["--TV15"] }}>TV15</p>
              <p id="TV16" style={{ backgroundColor: cssColors["--TV16"] }}>TV16</p>
              <p id="TV17" style={{ backgroundColor: cssColors["--TV17"] }}>TV17</p>
              <p id="TV18" style={{ backgroundColor: cssColors["--TV18"] }}>TV18</p>
            </div>
            <div>
              <div className={styles.containerTvsEscaleraCentro}>
                <p id="TV19" style={{ backgroundColor: cssColors["--TV19"] }}>TV19</p>
                <p id="TV20" style={{ backgroundColor: cssColors["--TV20"] }}>TV20</p>
                <p id="TV21" style={{ backgroundColor: cssColors["--TV21"] }}>TV21</p>
                <p id="TV22" style={{ backgroundColor: cssColors["--TV22"] }}>TV22</p>
              </div>
              <div className={styles.containerTvsBarra}>
                <p id="TV01" style={{ backgroundColor: cssColors["--TV01"] }}>TV1</p>
                <p id="TV02" style={{ backgroundColor: cssColors["--TV02"] }}>TV2</p>
                <p id="TV03" style={{ backgroundColor: cssColors["--TV03"] }}>TV3</p>
                <p id="TV04" style={{ backgroundColor: cssColors["--TV04"] }}>TV4</p>
                <p id="TV05" style={{ backgroundColor: cssColors["--TV05"] }}>TV5</p>
                <p id="TV06" style={{ backgroundColor: cssColors["--TV06"] }}>TV6</p>
                <p id="TV07" style={{ backgroundColor: cssColors["--TV07"] }}>TV7</p>
                <p id="TV08" style={{ backgroundColor: cssColors["--TV08"] }}>TV8</p>
                <p id="TV09" style={{ backgroundColor: cssColors["--TV09"] }}>TV9</p>
                <p id="TV10" style={{ backgroundColor: cssColors["--TV10"] }}>TV10</p>
                <p id="TV11" style={{ backgroundColor: cssColors["--TV11"] }}>TV11</p>
                <p id="TV12" style={{ backgroundColor: cssColors["--TV12"] }}>TV12</p>
                <p id="TV13" style={{ backgroundColor: cssColors["--TV13"] }}>TV13</p>
                <p id="TV14" style={{ backgroundColor: cssColors["--TV14"] }}>TV14</p>
                <p id="TVRACK" style={{ backgroundColor: cssColors["--TVRACK"] }}>TVRK</p>
              </div>
            </div>
            <div className={styles.containerTvsEscaleraNorte}>
              <p id="TV23" style={{ backgroundColor: cssColors["--TV23"] }}>TV23</p>
              <p id="TV24" style={{ backgroundColor: cssColors["--TV24"] }}>TV24</p>
              <p id="TV25" style={{ backgroundColor: cssColors["--TV25"] }}>TV25</p>
              <p id="TV26" style={{ backgroundColor: cssColors["--TV26"] }}>TV26</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Aside;
