import { useContext, useMemo } from "react";
import ContextoUser from "../contexto/Contexto";
import styles from "./VideoMatrix.module.css";

const VW_IDS = ["VWN", "VWC", "VWS"];
const VW_DISPLAY = { VWN: "VW Norte", VWC: "VW Centro", VWS: "VW Sur" };
const ESCALERA_SUR = ["TV15", "TV16", "TV17", "TV18"];
const ESCALERA_CENTRO = ["TV19", "TV20", "TV21", "TV22"];
const BARRA = [
  "TV01", "TV02", "TV03", "TV04", "TV05",
  "TV06", "TV07", "TV08", "TV09", "TV10",
  "TV11", "TV12", "TV13", "TV14", "TVRACK",
];
const ESCALERA_NORTE = ["TV23", "TV24", "TV25", "TV26"];

const GRID_MAP = {
  TV01: "tv01", TV02: "tv02", TV03: "tv03", TV04: "tv04",
  TV05: "tv05", TV06: "tv06", TV07: "tv07", TV08: "tv08",
  TV09: "tv09", TV10: "tv10", TV11: "tv11", TV12: "tv12",
  TV13: "tv13", TV14: "tv14", TVRACK: "tvrk",
};

/** Strip leading zero from TV0X → TVX for display. TVRACK stays TVRK. */
const displayId = (id) => {
  if (id === "TVRACK") return "TVRK";
  return id.replace(/TV0(\d)/, "TV$1");
};

const VideoMatrix = () => {
  const { estado } = useContext(ContextoUser);
  const tvs = estado.tvs;

  const cssColors = useMemo(() => {
    if (!tvs) return {};
    const vars = {};
    for (const [key, value] of Object.entries(tvs)) {
      vars[`--${key}`] = `var(--${value})`;
    }
    return vars;
  }, [tvs]);

  const tvColor = (id) => tvs?.[id] ? { backgroundColor: `var(--${tvs[id]})` } : {};

  // ── Empty state ──
  if (!tvs || Object.keys(tvs).length === 0) {
    return (
      <section className={styles.section} aria-label="Estado del video">
        <h2 className={styles.heading}>Estado del video</h2>
        <p className={styles.empty}>No hay TVs disponibles.</p>
      </section>
    );
  }

  return (
    <section
      className={styles.section}
      aria-label="Estado del video"
      style={cssColors}
    >
      <h2 className={styles.heading}>Estado del video</h2>

      <div className={styles.grid}>
        {/* VW row */}
        <div className={styles.vwRow} role="list" aria-label="TVs panoramic">
          {VW_IDS.map((id) => (
            <span key={id} className={styles.tvItem} role="listitem" style={tvColor(id)}>
              {VW_DISPLAY[id]}
            </span>
          ))}
        </div>

        {/* Escalera Centro + Barra + Escaleras */}
        <div className={styles.mainSection}>
          {/* Escalera Centro */}
          <div className={styles.escaleraCentro} role="list" aria-label="Escalera centro">
          {ESCALERA_CENTRO.map((id) => (
            <span key={id} className={styles.tvItem} role="listitem" style={tvColor(id)}>
              {id}
            </span>
          ))}
        </div>

        {/* Escalera + Barra */}
        <div className={styles.escaleraBarra}>
          {/* Escalera Sur */}
          <div className={styles.escalera} role="list" aria-label="Escalera sur">
            {ESCALERA_SUR.map((id) => (
              <span key={id} className={styles.tvItem} role="listitem" style={tvColor(id)}>
                {id}
              </span>
            ))}
          </div>

            <div className={styles.barraGrid} role="list" aria-label="Barra de TVs">
              {BARRA.map((id) => (
                <span
                  key={id}
                  className={styles.barraItem}
                  role="listitem"
                  style={{ ...tvColor(id), gridArea: GRID_MAP[id] }}
                >
                  {displayId(id)}
                </span>
              ))}
            </div>

          {/* Escalera Norte */}
          <div className={styles.escalera} role="list" aria-label="Escalera norte">
            {ESCALERA_NORTE.map((id) => (
              <span key={id} className={styles.tvItem} role="listitem" style={tvColor(id)}>
                {id}
              </span>
            ))}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
};

export default VideoMatrix;
