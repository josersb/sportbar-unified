import React from "react";
import { DISPOSITIVOS } from "./dispositivos";

const ContextoUser = React.createContext();

export const estadoInicial = {
  // @deprecated — migrate to estado.dispositivos
  decos: [
    {
      nombreDeco: "DTV1",
      canalDeco: "1603",
    },
    {
      nombreDeco: "DTV2",
      canalDeco: "1604",
    },
    {
      nombreDeco: "DTV3",
      canalDeco: "1605",
    },
    {
      nombreDeco: "DTV4",
      canalDeco: "1608",
    },
    {
      nombreDeco: "DTV5",
      canalDeco: "1621",
    },
    {
      nombreDeco: "DTV6",
      canalDeco: "1629",
    },
    {
      nombreDeco: "DTV7",
      canalDeco: "1631",
    },
    {
      nombreDeco: "DTV8",
      canalDeco: "1644",
    },
  ],
  dispositivos: Object.fromEntries(
    Object.entries(DISPOSITIVOS).map(([id, device]) => [
      id,
      {
        canalActual: device.defaultChannel,
        capabilities: device.fallbackCapabilities,
        online: true,
      }
    ])
  ),
  _version: 1,
  favoritos: [
    1603, 1604, 1605, 1608, 1609, 1610, 1612, 1613, 1614, 1620, 1621, 1622, 1623, 1625, 1628, 1629,
    1631, 1639, 1644, 1677,
  ],
  tvs: {
    VWN: "DTV1",
    VWC: "DTV1",
    VWS: "DTV1",
    TV01: "DTV1",
    TV02: "DTV1",
    TV03: "DTV1",
    TV04: "DTV1",
    TV05: "DTV1",
    TV06: "DTV1",
    TV07: "DTV1",
    TV08: "DTV1",
    TV09: "DTV1",
    TV10: "DTV1",
    TV11: "DTV1",
    TV12: "DTV1",
    TV13: "DTV1",
    TV14: "DTV1",
    TV15: "DTV1",
    TV16: "DTV1",
    TV17: "DTV1",
    TV18: "DTV1",
    TV19: "DTV1",
    TV20: "DTV1",
    TV21: "DTV1",
    TV22: "DTV1",
    TV23: "DTV1",
    TV24: "DTV1",
    TV25: "DTV1",
    TV26: "DTV1",
    TVRACK: "DTV1",
    TvsBarraLivertador: "DTV542",
    TvsBarraSur: "DTV5432",
    TvsBarraPista: "DTV542",
    TvsBarraNorte: "DTV5432",
    TvsEscaleraNorte: "DTV1234",
    TvsEscaleraCentro: "DTV1234",
    TvsEscaleraSur: "DTV1234",
    // Zonas adicionales — IPEX5002 decoders (Planta -1, +15, VIP)
    "aVip-Barra-Centro": "DTV1",
    "aVip-Lobby-Batacazo": "DTV1",
    "a-Menos1-Escenario": "DTV1",
    "a-QMR75-Menos1-TV1": "DTV1",
    "aVip-Bar-Boveda": "DTV1",
    "aMas-15-Barra": "DTV1",
    "a-QMR75-Menos1-TV2": "DTV1",
    "a-Menos1-Escenario2": "DTV1",
    "a-QMC65-Menos1-TV2": "DTV1",
    "RACK-VIP-PANTALLABATACA": "DTV1",
  },
  audio: [
    {
      nombreZona: "Sur",
      fuenteAudio: "DTV1",
      volumen: "-21",
      mute: false,
    },
    {
      nombreZona: "Centro",
      fuenteAudio: "DTV1",
      volumen: "-23",
      mute: false,
    },
    {
      nombreZona: "Norte",
      fuenteAudio: "DTV1",
      volumen: "-21",
      mute: false,
    },
  ],
  descripcionPreset: [
    {
      preset1: "ingresar descripción",
    },
    {
      preset2: "ingresar descripción",
    },
    {
      preset3: "ingresar descripción",
    },
    {
      preset4: "ingresar descripción",
    },
    {
      preset5: "ingresar descripción",
    },
  ],
};

// Los presets ya no se auto-inicializan. Se crean cuando el usuario
// guarda desde MatrizPreset y se sincronizan con el servidor (lowdb).
// Si no hay datos en localStorage ni en el servidor, el preset está libre.

export const ProviderUser = ContextoUser.Provider;
export default ContextoUser;
