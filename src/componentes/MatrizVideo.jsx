import { useContext, useState } from "react";
import { Formik, Form } from "formik";
import Select from "./Select";
import ContextoUser from "../contexto/Contexto";
import { getByCapability } from "../contexto/dispositivos";
import { setTvSource, setTvrackVideo, setTvrackAudio, setTvrackLink } from "../api/arrangerApi";
import { collapseGroup, writeErrorMessage } from "../hooks/brokerClientCore";
import { sortTvsByGroup } from "../data/tvGroups";
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

// Destinos de matriz reales del broker (TV01-TV26 + VWN/VWC/VWS). Los grupos
// TvsBarra*/TvsEscalera* del form se expanden a estas TVs individuales.
const DESTINOS_TV = [
  "VWN", "VWC", "VWS",
  "TV01", "TV02", "TV03", "TV04", "TV05", "TV06", "TV07", "TV08", "TV09", "TV10",
  "TV11", "TV12", "TV13", "TV14", "TV15", "TV16", "TV17", "TV18", "TV19", "TV20",
  "TV21", "TV22", "TV23", "TV24", "TV25", "TV26",
];

// WS4d: títulos de zona para display (las OPCIONES y subgrupos vienen del
// matrixModel servido — MG-4; estos títulos no duplican nada del modelo).
const ZONE_TITLES = {
  videowall: "Videos Wall Norte - Centro - Sur",
  perimetro: "Perímetro de TVs Norte - Centro - Sur",
  barra: "Tvs de la Barra Norte - Libertador - Sur - Pista",
};

// WS4d (MG-6): representación honesta del estado derivado.
// `null` (mixto) → opción "Mixto / Personalizado"; `undefined` (sin datos:
// pantallas faltantes o sin modelo) → sin selección.
const MIXED_OPTION = "__mixto__";
const MIXED_LABEL = "Mixto / Personalizado";
const NO_DATA_OPTION = "";
const NO_DATA_LABEL = "Sin datos";

/** "DTV123" → "DTV 1,2,3"; "DTV1" → "DTV 1" (labels de opciones del select). */
const optionLabel = (value) => {
  if (/^DTV\d+$/.test(value) && value.length > 4) {
    return `DTV ${value.slice(3).split("").join(",")}`;
  }
  return value.replace("DTV", "DTV ");
};

/** Valor representable como fuente/combo de un subgrupo (excluye sentinels). */
const isSourceValue = (v) => typeof v === "string" && /^DTV\d+$/.test(v);

const MatrizVideo = () => {
  const {
    estado,
    tvrackState,
    handleChangeTvrack,
    zonasFueraState,
    handleZonasFueraChange,
    syncStatus,
    applyOptimistic,
    getOptimisticDomain,
    revertOptimistic,
    matrixGroups,
    matrixModel,
  } = useContext(ContextoUser);

  const tvs = estado.tvs || {};
  const toast = useToast();
  const isSyncing = syncStatus?.status === "out_of_sync" || syncStatus?.status === "offline";

  const [loadingVideoBtn, setLoadingVideoBtn] = useState(null);
  const [loadingAudioBtn, setLoadingAudioBtn] = useState(null);

  // TVRACK: write-through confirmado vía broker (POST /api/tvrack/*). Con link
  // activo el server encadena video+audio (executeWrite), sin joins cliente.
  // Overlay optimista ANTES del POST (fix real-hardware A): feedback visual
  // inmediato. El SSE event del broker confirma/corrige y lo limpia.
  // Hotfix 5: POST con error (429/5xx/network) → revert del optimistic al
  // overlay previo + toast al operador (evidencia #908).
  const handleTvrackBtn = (type, deviceId) => async () => {
    const isVideo = type === "video";
    if (isVideo) setLoadingVideoBtn(deviceId);
    else setLoadingAudioBtn(deviceId);

    // Optimistic: video con link=true encadena audio; audio solo cambia audio.
    const optimisticPatch = isVideo
      ? { video: deviceId, ...(tvrackState.link ? { audio: deviceId } : {}) }
      : { audio: deviceId };
    const prevOverlay = getOptimisticDomain("tvrack");
    applyOptimistic("tvrack", optimisticPatch);

    try {
      const newState = isVideo
        ? await setTvrackVideo(deviceId)
        : await setTvrackAudio(deviceId);
      handleChangeTvrack(newState);
      toast.success(
        tvrackState.link
          ? `${deviceId} → VIDEO + AUDIO TVRACK`
          : `${deviceId} → ${type.toUpperCase()} TVRACK`
      );
    } catch (err) {
      revertOptimistic("tvrack", optimisticPatch, prevOverlay);
      toast.error(writeErrorMessage(err, `${type.toUpperCase()} → TVRACK`));
    }

    if (isVideo) setLoadingVideoBtn(null);
    else setLoadingAudioBtn(null);
  };

  const handleLinkToggle = async (e) => {
    const linked = e.target.checked;
    // Optimistic del link (app-only): el server lo persiste y broadcastea
    // como event de appOnly; el SSE confirma/corrige. Hotfix 5: error en el
    // POST → revert del optimistic + toast.
    const linkPatch = { link: linked };
    const prevOverlay = getOptimisticDomain("tvrack");
    applyOptimistic("tvrack", linkPatch);
    try {
      const newState = await setTvrackLink(linked);
      handleChangeTvrack(newState);
    } catch (err) {
      revertOptimistic("tvrack", linkPatch, prevOverlay);
      toast.error(writeErrorMessage(err, "link TVRACK"));
    }
  };

  // WS4d (MG-4/MG-6): zonas/subgrupos y opciones derivados del matrixModel
  // SERVIDO — sin bloques hardcodeados. `initialValues` toma PRECEDENCIA
  // SERVER desde `matrixGroups.desired`; si el server aún no reporta la key
  // se hace fallback al collapse de las TVs individuales del broker.
  // Representación honesta: `null` (mixto) → "Mixto / Personalizado";
  // `undefined` (sin datos) → sin selección. Sin modelo → degradación segura
  // (no se renderizan selects de grupos y Enviar queda deshabilitado).
  const hasModel = Boolean(matrixModel && Array.isArray(matrixModel.zones));
  const combosBySize = matrixModel?.combosBySize || {};
  const videoSources = getByCapability("videoSource");
  const optionsForSize = (size) => [
    ...videoSources.map((d) => d.id),
    ...(combosBySize[size] || []),
  ];

  const groupZones = hasModel
    ? matrixModel.zones.map((zone) => ({
        key: zone.key,
        title: ZONE_TITLES[zone.key] || zone.key,
        subgroups: (zone.subgroups || []).map((sg) => {
          const screens = Array.isArray(sg.screens) ? sg.screens : [];
          const serverValue = matrixGroups?.[sg.key];
          const derived =
            serverValue !== undefined
              ? serverValue
              : collapseGroup(tvs, screens, combosBySize);
          return {
            key: sg.key,
            label: sg.dir,
            options: optionsForSize(screens.length),
            value:
              derived === null
                ? MIXED_OPTION
                : derived === undefined
                  ? NO_DATA_OPTION
                  : derived,
            showMixed: derived === null,
            showNoData: derived === undefined,
          };
        }),
      }))
    : [];

  const initialValues = {};
  for (const zone of groupZones) {
    for (const g of zone.subgroups) {
      initialValues[g.key] = g.value;
    }
  }

  return (
    <main className={styles.main}>
      <PageContainer>
        <h3 className={styles.titulo}>Ajustes de la matriz de video</h3>
        {isSyncing && (
          <div className={styles.syncActions}>
            <span className={styles.syncHint}>
              {syncStatus?.status === "offline" ? "❌ Arranger offline" : "⚠️ Sin sincronizar"}
            </span>
          </div>
        )}
        <Formik
          initialValues={initialValues}
          onSubmit={async (values) => {
            // WS4d: submit legacy por-TV (WS4e lo reemplaza por
            // POST /api/matrix-groups). Cambios de esta slice:
            //  - key del form renombrada TvsBarraLivertador → TvsBarraLibertador
            //    (MG-3/MG-7 — la que el modelo y el endpoint esperan).
            //  - Grupos en estado no representable ("Mixto / Personalizado" o
            //    sin datos) NO escriben: no hay intención expandible, se
            //    conservan las TVs como están.
            const newTvs = { ...tvs };
            if (isSourceValue(values.VWN)) newTvs.VWN = values.VWN;
            if (isSourceValue(values.VWC)) newTvs.VWC = values.VWC;
            if (isSourceValue(values.VWS)) newTvs.VWS = values.VWS;
            if (isSourceValue(values.TvsBarraLibertador)) {
            newTvs.TvsBarraLibertador = values.TvsBarraLibertador;
            switch (values.TvsBarraLibertador) {
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
                newTvs.TV01 = values.TvsBarraLibertador;
                newTvs.TV02 = values.TvsBarraLibertador;
                newTvs.TV03 = values.TvsBarraLibertador;
            }
            }
            if (isSourceValue(values.TvsBarraSur)) {
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
            }
            if (isSourceValue(values.TvsBarraPista)) {
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
            }
            if (isSourceValue(values.TvsBarraNorte)) {
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
            }
            if (isSourceValue(values.TvsEscaleraNorte)) {
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
            }
            if (isSourceValue(values.TvsEscaleraCentro)) {
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
            }
            if (isSourceValue(values.TvsEscaleraSur)) {
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
            }

            // Escrituras confirmed-only vía broker (writeQueue serializa por
            // destino): POST /api/tvs/:id/source por cada TV real, en batches.
            // Overlay optimista ANTES del POST (fix real-hardware A): feedback
            // visual inmediato. El SSE event del broker confirma/corrige y lo
            // limpia. Sin estado local optimista en setEstado — el snapshot
            // SSE es la fuente de verdad.
            // Hotfix 5: los POSTs que fallan (429/5xx/network) se revierten
            // del optimistic individualmente + toast con el conteo — la UI
            // nunca muestra cambios que el server rechazó (evidencia #908).
            // Hotfix 6: el batch se ORDENA por grupos físicos (video-wall →
            // escaleras → barras) ANTES de disparar los POSTs — el orden de
            // envío = orden de enqueue = orden de ejecución con el semáforo
            // global del server. Pantallas relacionadas cambian juntas y lo
            // más visible primero (evidencia #908: los del final del batch
            // esperaban minutos).
            const mappings = sortTvsByGroup(DESTINOS_TV).map((tv) => ({ dest: tv, source: newTvs[tv] }));
            const prevOverlay = getOptimisticDomain("tvs");
            const appliedPatches = [];
            try {
              // Aplicar optimistic de TODAS las TVs del submit en una sola
              // pasada (UI se actualiza instantáneamente con la intención del
              // operador, sin esperar el batch).
              const tvsOptimisticPatch = {};
              for (const { dest, source } of mappings) {
                if (source) tvsOptimisticPatch[dest] = source;
              }
              if (Object.keys(tvsOptimisticPatch).length > 0) {
                applyOptimistic("tvs", tvsOptimisticPatch);
                appliedPatches.push(tvsOptimisticPatch);
              }
              const BATCH_SIZE = 8;
              const failures = [];
              for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
                const batch = mappings.slice(i, i + BATCH_SIZE);
                const results = await Promise.allSettled(
                  batch.map(({ dest, source }) => setTvSource(dest, source))
                );
                results.forEach((r, j) => {
                  if (r.status === "rejected") failures.push({ ...batch[j], err: r.reason });
                });
              }
              if (failures.length === 0) {
                toast.success("Matriz de video actualizada");
              } else {
                // Rollback de SOLO los fallidos: revert del patch completo
                // contra el overlay previo capturado antes del batch restaura
                // las claves fallidas a su valor pre-submit; los exitosos
                // conservan su optimistic hasta la confirmación SSE.
                const failedPatch = {};
                for (const { dest, source } of failures) {
                  if (source) failedPatch[dest] = source;
                }
                if (Object.keys(failedPatch).length > 0) {
                  revertOptimistic("tvs", failedPatch, prevOverlay);
                }
                const rateLimited = failures.some((f) => f.err && f.err.status === 429);
                if (rateLimited) {
                  toast.error(
                    `${failures.length} de ${mappings.length} órdenes no fueron procesadas por límite de tasa — esperá unos segundos y reenviá`,
                  );
                } else {
                  toast.error(
                    `${failures.length} de ${mappings.length} órdenes no fueron procesadas — revisá la conexión y reintentá`,
                  );
                }
              }
            } catch {
              // Rollback total (defensa: allSettled no debería rechazar).
              for (const patch of appliedPatches) {
                revertOptimistic("tvs", patch, prevOverlay);
              }
              toast.error("Error al actualizar la matriz de video");
            }
          }}
        >
          <Form>
            <div className={styles.formContainer}>
              {hasModel
                ? groupZones.map((zone) => (
                    <div key={zone.key} className={styles.selectZona}>
                      <h3 className={styles.selectZonaTitulo}>{zone.title}</h3>
                      <div className={styles.selectRow}>
                        {zone.subgroups.map((g) => (
                          <Select
                            key={g.key}
                            label={g.label}
                            name={g.key}
                            className={styles.formSelect}
                          >
                            {g.showNoData && (
                              <option value={NO_DATA_OPTION}>{NO_DATA_LABEL}</option>
                            )}
                            {g.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {optionLabel(opt)}
                              </option>
                            ))}
                            {g.showMixed && (
                              <option value={MIXED_OPTION}>{MIXED_LABEL}</option>
                            )}
                          </Select>
                        ))}
                      </div>
                    </div>
                  ))
                : (
                  <div className={styles.selectZona}>
                    <h3 className={styles.selectZonaTitulo}>Grupos de la matriz</h3>
                    <p className={styles.syncHint}>
                      Modelo de matriz no disponible — los grupos no se pueden editar.
                    </p>
                  </div>
                )}
              <div className={styles.submitContainer}>
                <Button type="submit" variant="primary" disabled={!hasModel}>
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
    </main>
  );
};

export default MatrizVideo;
