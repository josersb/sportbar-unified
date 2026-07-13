import React, { useState, useEffect, useContext } from "react";
import { Formik, Form } from "formik";
import Select from "./Select";
import ContextoUser from "../contexto/Contexto";
import "./MatrizVideo.css";
import MatrizPreset from "./MatrizPreset";

const MatrizVideo = () => {
  const { estado, handleChangeEstadoVideo } = useContext(ContextoUser);

  const tvs = estado.tvs;

  // Matriz arranger
  const myInit = { method: "GET", mode: "no-cors", cache: "default" };

  const handleBtnDTV1 = async () => {
    // console.log(
    //   `http://192.168.2.254/api/command/join%20av%20DTV1%20TVRACK/TOKEN_REMOVED`
    // );
    try {
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20DTV1%20TVRACK/TOKEN_REMOVED`,
        myInit
      );
    } catch (error) {
      console.log("error solicitud Arranger 5000");
    }
    tvs.TVRACK = "DTV1";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV2 = async () => {
    try {
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20DTV2%20TVRACK/TOKEN_REMOVED`,
        myInit
      );
    } catch (error) {
      console.log("error solicitud Arranger 5000");
    }
    tvs.TVRACK = "DTV2";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV3 = async () => {
    try {
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20DTV3%20TVRACK/TOKEN_REMOVED`,
        myInit
      );
    } catch (error) {
      console.log("error solicitud Arranger 5000");
    }
    tvs.TVRACK = "DTV3";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV4 = async () => {
    try {
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20DTV4%20TVRACK/TOKEN_REMOVED`,
        myInit
      );
    } catch (error) {
      console.log("error solicitud Arranger 5000");
    }
    tvs.TVRACK = "DTV4";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV5 = async () => {
    try {
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20DTV5%20TVRACK/TOKEN_REMOVED`,
        myInit
      );
    } catch (error) {
      console.log("error solicitud Arranger 5000");
    }
    tvs.TVRACK = "DTV5";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV6 = async () => {
    try {
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20DTV6%20TVRACK/TOKEN_REMOVED`,
        myInit
      );
    } catch (error) {
      console.log("error solicitud Arranger 5000");
    }
    tvs.TVRACK = "DTV6";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV7 = async () => {
    try {
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20DTV7%20TVRACK/TOKEN_REMOVED`,
        myInit
      );
    } catch (error) {
      console.log("error solicitud Arranger 5000");
    }
    tvs.TVRACK = "DTV7";
    handleChangeEstadoVideo(tvs);
  };
  const handleBtnDTV8 = async () => {
    try {
      await fetch(
        `http://192.168.2.254/api/command/join%20av%20DTV8%20TVRACK/TOKEN_REMOVED`,
        myInit
      );
    } catch (error) {
      console.log("error solicitud Arranger 5000");
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
            handleChangeEstadoVideo(tvs);
            try {
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.VWN}%20VW-Norte/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.VWC}%20VW-Centro/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.VWS}%20VW-Sur/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV01}%20TV01/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV02}%20TV02/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV03}%20TV03/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV04}%20TV04/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV05}%20TV05/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV06}%20TV06/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV07}%20TV07/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV08}%20TV08/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV09}%20TV09/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV10}%20TV10/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV11}%20TV11/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV12}%20TV12/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV13}%20TV13/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV14}%20TV14/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV15}%20TV15/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV16}%20TV16/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV17}%20TV17/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV18}%20TV18/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV19}%20TV19/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV20}%20TV20/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV21}%20TV21/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV22}%20TV22/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV23}%20TV23/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV24}%20TV24/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV25}%20TV25/TOKEN_REMOVED`,
                myInit
              );
              await fetch(
                `http://192.168.2.254/api/command/join%20av%20${tvs.TV26}%20TV26/TOKEN_REMOVED`,
                myInit
              );
            } catch (error) {
              console.log("error solicitud Arranger 5000");
            }
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
