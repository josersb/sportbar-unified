import React, { useState, useEffect, useContext } from "react";
import { Formik, Form } from "formik";
import Select from "./Select";
import ContextoUser from "../contexto/Contexto";
import "./MatrizVideo.css";
import MatrizPreset from "./MatrizPreset";
import { joinMultipleTVs, assignSourceToDestination } from "../api/arrangerApi";

const MatrizVideo = () => {
  const { estado, handleChangeEstadoVideo } = useContext(ContextoUser);

  const tvs = estado.tvs;

  const handleBtnDTV1 = async () => {
    try {
      await assignSourceToDestination("DTV1", "TVRACK");
    } catch (error) {
      console.error("[ArrangerAPI] Error:", error);
    }
    tvs.TVRACK = "DTV1";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV2 = async () => {
    try {
      await assignSourceToDestination("DTV2", "TVRACK");
    } catch (error) {
      console.error("[ArrangerAPI] Error:", error);
    }
    tvs.TVRACK = "DTV2";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV3 = async () => {
    try {
      await assignSourceToDestination("DTV3", "TVRACK");
    } catch (error) {
      console.error("[ArrangerAPI] Error:", error);
    }
    tvs.TVRACK = "DTV3";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV4 = async () => {
    try {
      await assignSourceToDestination("DTV4", "TVRACK");
    } catch (error) {
      console.error("[ArrangerAPI] Error:", error);
    }
    tvs.TVRACK = "DTV4";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV5 = async () => {
    try {
      await assignSourceToDestination("DTV5", "TVRACK");
    } catch (error) {
      console.error("[ArrangerAPI] Error:", error);
    }
    tvs.TVRACK = "DTV5";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV6 = async () => {
    try {
      await assignSourceToDestination("DTV6", "TVRACK");
    } catch (error) {
      console.error("[ArrangerAPI] Error:", error);
    }
    tvs.TVRACK = "DTV6";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV7 = async () => {
    try {
      await assignSourceToDestination("DTV7", "TVRACK");
    } catch (error) {
      console.error("[ArrangerAPI] Error:", error);
    }
    tvs.TVRACK = "DTV7";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV8 = async () => {
    try {
      await assignSourceToDestination("DTV8", "TVRACK");
    } catch (error) {
      console.error("[ArrangerAPI] Error:", error);
    }
    tvs.TVRACK = "DTV8";
    handleChangeEstadoVideo(tvs);
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
            const mappings = [
              { source: tvs.VWN, dest: "VW-Norte" },
              { source: tvs.VWC, dest: "VW-Centro" },
              { source: tvs.VWS, dest: "VW-Sur" },
              { source: tvs.TV01, dest: "TV01" },
              { source: tvs.TV02, dest: "TV02" },
              { source: tvs.TV03, dest: "TV03" },
              { source: tvs.TV04, dest: "TV04" },
              { source: tvs.TV05, dest: "TV05" },
              { source: tvs.TV06, dest: "TV06" },
              { source: tvs.TV07, dest: "TV07" },
              { source: tvs.TV08, dest: "TV08" },
              { source: tvs.TV09, dest: "TV09" },
              { source: tvs.TV10, dest: "TV10" },
              { source: tvs.TV11, dest: "TV11" },
              { source: tvs.TV12, dest: "TV12" },
              { source: tvs.TV13, dest: "TV13" },
              { source: tvs.TV14, dest: "TV14" },
              { source: tvs.TV15, dest: "TV15" },
              { source: tvs.TV16, dest: "TV16" },
              { source: tvs.TV17, dest: "TV17" },
              { source: tvs.TV18, dest: "TV18" },
              { source: tvs.TV19, dest: "TV19" },
              { source: tvs.TV20, dest: "TV20" },
              { source: tvs.TV21, dest: "TV21" },
              { source: tvs.TV22, dest: "TV22" },
              { source: tvs.TV23, dest: "TV23" },
              { source: tvs.TV24, dest: "TV24" },
              { source: tvs.TV25, dest: "TV25" },
              { source: tvs.TV26, dest: "TV26" },
            ];
            await joinMultipleTVs(mappings);
            handleChangeEstadoVideo(tvs);
          }}
        >
          <Form>
            <div className="matriz-main-form">
              <div className="matriz-select-zona">
                <h3 className="matriz-select-zona-titulo">
                  Videos Wall Norte - Centro - Sur
                </h3>
                <div className="matriz-select-vwallNCS">
                  <Select
                    id="select-VWN"
                    label="VWall Norte"
                    name="VWN"
                    className="matriz-select"
                  >
                    <option value="DTV1">DTV 1</option>
                    <option value="DTV2">DTV 2</option>
                    <option value="DTV3">DTV 3</option>
                    <option value="DTV4">DTV 4</option>
                    <option value="DTV5">DTV 5</option>
                    <option value="DTV6">DTV 6</option>
                    <option value="DTV7">DTV 7</option>
                    <option value="DTV8">DTV 8</option>
                  </Select>
                  <Select
                    label="VWall Centro"
                    name="VWC"
                    className="matriz-select"
                  >
                    <option value="DTV1">DTV 1</option>
                    <option value="DTV2">DTV 2</option>
                    <option value="DTV3">DTV 3</option>
                    <option value="DTV4">DTV 4</option>
                    <option value="DTV5">DTV 5</option>
                    <option value="DTV6">DTV 6</option>
                    <option value="DTV7">DTV 7</option>
                    <option value="DTV8">DTV 8</option>
                  </Select>
                  <Select
                    label="VWall Sur"
                    name="VWS"
                    className="matriz-select"
                  >
                    <option value="DTV1">DTV 1</option>
                    <option value="DTV2">DTV 2</option>
                    <option value="DTV3">DTV 3</option>
                    <option value="DTV4">DTV 4</option>
                    <option value="DTV5">DTV 5</option>
                    <option value="DTV6">DTV 6</option>
                    <option value="DTV7">DTV 7</option>
                    <option value="DTV8">DTV 8</option>
                  </Select>
                </div>
              </div>
              <div className="matriz-select-zona">
                <h3 className="matriz-select-zona-titulo">
                  Perimetro de TVs Norte - Centro - Sur
                </h3>
                <div className="matriz-select-perimetro">
                  <Select
                    label="TVs Escalera Norte"
                    name="TvsEscaleraNorte"
                    className="matriz-select"
                  >
                    <option value="DTV1">DTV 1</option>
                    <option value="DTV2">DTV 2</option>
                    <option value="DTV3">DTV 3</option>
                    <option value="DTV4">DTV 4</option>
                    <option value="DTV5">DTV 5</option>
                    <option value="DTV6">DTV 6</option>
                    <option value="DTV7">DTV 7</option>
                    <option value="DTV8">DTV 8</option>
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
                    <option value="DTV1">DTV 1</option>
                    <option value="DTV2">DTV 2</option>
                    <option value="DTV3">DTV 3</option>
                    <option value="DTV4">DTV 4</option>
                    <option value="DTV5">DTV 5</option>
                    <option value="DTV6">DTV 6</option>
                    <option value="DTV7">DTV 7</option>
                    <option value="DTV8">DTV 8</option>
                    <option value="DTV1234">DTV1,2,3,4</option>
                    <option value="DTV1212">DTV1,2,1,2</option>
                    <option value="DTV1231">DTV1,2,3,1</option>
                    <option value="DTV5432">DTV5,4,3,2</option>
                    <option value="DTV3254">DTV3,2,5,4</option>
                    <option value="DTV1354">DTV1,3,5,4</option>
                  </Select>
                  <Select
                    label="TVs Escalera Sur"
                    name="TvsEscaleraSur"
                    className="matriz-select"
                  >
                    <option value="DTV1">DTV 1</option>
                    <option value="DTV2">DTV 2</option>
                    <option value="DTV3">DTV 3</option>
                    <option value="DTV4">DTV 4</option>
                    <option value="DTV5">DTV 5</option>
                    <option value="DTV6">DTV 6</option>
                    <option value="DTV7">DTV 7</option>
                    <option value="DTV8">DTV 8</option>
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
                  <Select
                    label="TVs Barra Norte"
                    name="TvsBarraNorte"
                    className="matriz-select"
                  >
                    <option value="DTV1">DTV 1</option>
                    <option value="DTV2">DTV 2</option>
                    <option value="DTV3">DTV 3</option>
                    <option value="DTV4">DTV 4</option>
                    <option value="DTV5">DTV 5</option>
                    <option value="DTV6">DTV 6</option>
                    <option value="DTV7">DTV 7</option>
                    <option value="DTV8">DTV 8</option>
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
                    <option value="DTV1">DTV 1</option>
                    <option value="DTV2">DTV 2</option>
                    <option value="DTV3">DTV 3</option>
                    <option value="DTV4">DTV 4</option>
                    <option value="DTV5">DTV 5</option>
                    <option value="DTV6">DTV 6</option>
                    <option value="DTV7">DTV 7</option>
                    <option value="DTV8">DTV 8</option>
                    <option value="DTV123">DTV1,2,3</option>
                    <option value="DTV121">DTV1,2,1</option>
                    <option value="DTV542">DTV5,4,2</option>
                    <option value="DTV143">DTV1,4,3</option>
                    <option value="DTV153">DTV1,5,3</option>
                  </Select>
                  <Select
                    label="TVs Barra Sur"
                    name="TvsBarraSur"
                    className="matriz-select"
                  >
                    <option value="DTV1">DTV 1</option>
                    <option value="DTV2">DTV 2</option>
                    <option value="DTV3">DTV 3</option>
                    <option value="DTV4">DTV 4</option>
                    <option value="DTV5">DTV 5</option>
                    <option value="DTV6">DTV 6</option>
                    <option value="DTV7">DTV 7</option>
                    <option value="DTV8">DTV 8</option>
                    <option value="DTV1234">DTV1,2,3,4</option>
                    <option value="DTV1212">DTV1,2,1,2</option>
                    <option value="DTV1231">DTV1,2,3,1</option>
                    <option value="DTV5432">DTV5,4,3,2</option>
                    <option value="DTV3254">DTV3,2,5,4</option>
                    <option value="DTV1354">DTV1,3,5,4</option>
                  </Select>
                  <Select
                    label="TVs Barra Pista"
                    name="TvsBarraPista"
                    className="matriz-select"
                  >
                    <option value="DTV1">DTV 1</option>
                    <option value="DTV2">DTV 2</option>
                    <option value="DTV3">DTV 3</option>
                    <option value="DTV4">DTV 4</option>
                    <option value="DTV5">DTV 5</option>
                    <option value="DTV6">DTV 6</option>
                    <option value="DTV7">DTV 7</option>
                    <option value="DTV8">DTV 8</option>
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
                  <button
                    type="button"
                    onClick={handleBtnDTV1}
                    className="form-submit"
                  >
                    DTV 1
                  </button>
                  <button
                    type="button"
                    onClick={handleBtnDTV2}
                    className="form-submit"
                  >
                    DTV 2
                  </button>
                  <button
                    type="button"
                    onClick={handleBtnDTV3}
                    className="form-submit"
                  >
                    DTV 3
                  </button>
                  <button
                    type="button"
                    onClick={handleBtnDTV4}
                    className="form-submit"
                  >
                    DTV 4
                  </button>
                  <button
                    type="button"
                    onClick={handleBtnDTV5}
                    className="form-submit"
                  >
                    DTV 5
                  </button>
                  <button
                    type="button"
                    onClick={handleBtnDTV6}
                    className="form-submit"
                  >
                    DTV 6
                  </button>
                  <button
                    type="button"
                    onClick={handleBtnDTV7}
                    className="form-submit"
                  >
                    DTV 7
                  </button>
                  <button
                    type="button"
                    onClick={handleBtnDTV8}
                    className="form-submit"
                  >
                    DTV 8
                  </button>
                </div>
              </div>
            </div>
          </Form>
        </Formik>
      </div>
      <div className="matriz-main-preset">
        
      </div>
    </main>
  );
};

export default MatrizVideo;
