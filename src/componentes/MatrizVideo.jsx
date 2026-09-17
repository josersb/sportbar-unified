import { useContext, useState } from "react";
import { Formik, Form } from "formik";
import Select from "./Select";
import ContextoUser from "../contexto/Contexto";
import { getByCapability } from "../contexto/dispositivos";
import { setMatrixGroups, setTvrackVideo, setTvrackAudio, setTvrackLink } from "../api/arrangerApi";
import { collapseGroup, writeErrorMessage } from "../hooks/brokerClientCore";
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
            // WS5 (T-5.4): pantallas del subgrupo para el pre-filtro del
            // submit (collapse del estado confirmado por pantalla).
            screens,
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

  // WS4e: intent completo del operador — solo valores representables
  // (isSourceValue); "Mixto / Personalizado" y "Sin datos" se omiten.
  const buildIntent = (values) => {
    const intent = {};
    for (const zone of groupZones) {
      for (const g of zone.subgroups) {
        if (isSourceValue(values[g.key])) intent[g.key] = values[g.key];
      }
    }
    return intent;
  };

  // WS5 (UXF-2, T-5.4): submit con pre-filtro cliente. Los subgrupos cuyo
  // valor ya coincide con el estado confirmado (collapse del `estado.tvs`,
  // que es reported-wins: solo refleja valor confirmado u overlay propio
  // en vuelo) NO viajan en el POST — el server los deduplicaría igual
  // (guard pre-join), pero así ni siquiera sale la intención. Si NADA
  // cambia → toast "sin cambios" sin POST. `force:true` (acción explícita
  // "forzar reenvío") envía el intent COMPLETO y le pide al server que
  // saltee su guard — escape del one-join-lag.
  const submitIntent = async (values, { force = false } = {}) => {
    let toSend = buildIntent(values);
    if (!force) {
      const changed = {};
      for (const zone of groupZones) {
        for (const g of zone.subgroups) {
          if (toSend[g.key] === undefined) continue;
          const confirmedDerived = collapseGroup(tvs, g.screens, combosBySize);
          if (confirmedDerived !== toSend[g.key]) changed[g.key] = toSend[g.key];
        }
      }
      toSend = changed;
    }

    if (Object.keys(toSend).length === 0) {
      // UXF-2: no-op confirmado → "sin cambios", sin POST ni optimistic.
      toast.info("sin cambios");
      return;
    }

    // Optimistic ANTES del POST (mismo patrón fix real-hardware A):
    // overlay de matrixGroups con la intención que VIAJA (pre-filtrada)
    // para feedback visual inmediato; el SSE del server la confirma y
    // limpia. Error en el POST (429/5xx/network) → revert al overlay
    // previo + toast (hotfix 5, evidencia #908).
    const prevOverlay = getOptimisticDomain("matrixGroups");
    applyOptimistic("matrixGroups", toSend);
    try {
      // WS5: force:true pide al server saltear su guard dedupe (UXF-2).
      await (force ? setMatrixGroups(toSend, { force: true }) : setMatrixGroups(toSend));
      toast.success(force ? "Matriz de video reenviada" : "Matriz de video actualizada");
    } catch (err) {
      revertOptimistic("matrixGroups", toSend, prevOverlay);
      toast.error(writeErrorMessage(err, "Matriz de video"));
    }
  };

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
          // W-1 (verify WS4d): los selects de grupos se montan tarde cuando el
          // snapshot async llega después del mount (hard reload en /matrizvideo)
          // y Formik no inicializa campos registrados tarde. Con
          // enableReinitialize el form se reinicializa cuando initialValues
          // cambia de contenido (deep-compare interno de Formik: no resetea por
          // churn de identidad) — los selects reflejan el valor real del
          // server apenas llega. Efecto colateral deseado: tras un submit, el
          // broadcast SSE de matrixGroups resincroniza el form con el desired
          // aceptado por el server (MG-1).
          enableReinitialize
          onSubmit={(values) => submitIntent(values)}
        >
          {(formik) => (
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
                {/* WS5 (UXF-2): escape explícito "forzar reenvío" — envía el
                    intent completo (sin pre-filtro) con force:true; el server
                    saltea su guard dedupe y re-emite los joins. */}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!hasModel}
                  onClick={() => submitIntent(formik.values, { force: true })}
                >
                  Forzar reenvío
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
          )}
        </Formik>
      </PageContainer>
    </main>
  );
};

export default MatrizVideo;
