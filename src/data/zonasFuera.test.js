import { describe, it, expect } from "vitest";
import {
  ZONAS_FUERA,
  ZONA_FUERA_IDS,
  zonaFueraLabel,
  orderedZonaFueraIds,
} from "./zonasFuera";

describe("zonasFuera — fuente única de orden y labels", () => {
  it("define 11 zonas en el orden canónico", () => {
    expect(ZONA_FUERA_IDS).toEqual([
      "aVip-Lobby-Batacazo",
      "aVip-Bar-Boveda",
      "aVip-Barra-Centro",
      "RACK-VIP-PANTALLABATACA",
      "aMas-15-Barra",
      "aMas15-Vwall-Libertador",
      "a-QMR75-Menos1-TV1",
      "a-QMR75-Menos1-TV2",
      "a-QMC65-Menos1-TV2",
      "a-Menos1-Escenario",
      "a-Menos1-Escenario2",
    ]);
  });

  it("incluye la zona #11 aMas15-Vwall-Libertador", () => {
    expect(ZONA_FUERA_IDS).toContain("aMas15-Vwall-Libertador");
  });

  it("existe correspondencia 1:1 entre ZONAS_FUERA y ZONA_FUERA_IDS", () => {
    expect(ZONAS_FUERA.map((z) => z.id)).toEqual(ZONA_FUERA_IDS);
    expect(new Set(ZONA_FUERA_IDS).size).toBe(ZONA_FUERA_IDS.length);
  });

  it("resuelve los labels renombrados", () => {
    expect(zonaFueraLabel("aVip-Lobby-Batacazo")).toBe("VIP Bar Lobby");
    expect(zonaFueraLabel("aMas-15-Barra")).toBe("Barra Irineo +15");
  });

  it("resuelve el label de la zona nueva", () => {
    expect(zonaFueraLabel("aMas15-Vwall-Libertador")).toBe("Led Wall +15");
  });

  it("resuelve los labels de todas las canónicas", () => {
    expect(zonaFueraLabel("aVip-Bar-Boveda")).toBe("VIP Bar Bóveda");
    expect(zonaFueraLabel("aVip-Barra-Centro")).toBe("VIP Barra Centro");
    expect(zonaFueraLabel("RACK-VIP-PANTALLABATACA")).toBe("Rack VIP Bataca");
    expect(zonaFueraLabel("a-QMR75-Menos1-TV1")).toBe("QMR75 -1 TV1");
    expect(zonaFueraLabel("a-QMR75-Menos1-TV2")).toBe("QMR75 -1 TV2");
    expect(zonaFueraLabel("a-QMC65-Menos1-TV2")).toBe("QMC65 -1 TV2");
    expect(zonaFueraLabel("a-Menos1-Escenario")).toBe("Escenario -1");
    expect(zonaFueraLabel("a-Menos1-Escenario2")).toBe("Escenario -1 (2)");
  });

  it("cae a label derivado del id para zonas desconocidas (fallback)", () => {
    expect(zonaFueraLabel("aZona-Desconocida-X")).toBe("Zona Desconocida X");
    expect(zonaFueraLabel("RACK-Nueva-Pantalla")).toBe("Rack Nueva Pantalla");
  });

  it("orderedZonaFueraIds devuelve las canónicas presentes en orden canónico", () => {
    const state = {
      "a-Menos1-Escenario": { video: "DTV1", audio: "DTV1" },
      "aVip-Lobby-Batacazo": { video: "DTV2", audio: "DTV2" },
      "aMas15-Vwall-Libertador": { video: "DTV1", audio: "DTV1" },
    };
    expect(orderedZonaFueraIds(state)).toEqual([
      "aVip-Lobby-Batacazo",
      "aMas15-Vwall-Libertador",
      "a-Menos1-Escenario",
    ]);
  });

  it("orderedZonaFueraIds coloca las desconocidas al final", () => {
    const state = {
      "zona-futura": { video: "DTV1", audio: "DTV1" },
      "aVip-Barra-Centro": { video: "DTV1", audio: "DTV1" },
    };
    expect(orderedZonaFueraIds(state)).toEqual(["aVip-Barra-Centro", "zona-futura"]);
  });

  it("orderedZonaFueraIds omite las canónicas ausentes del estado", () => {
    const state = { "aVip-Barra-Centro": { video: "DTV1", audio: "DTV1" } };
    expect(orderedZonaFueraIds(state)).toEqual(["aVip-Barra-Centro"]);
  });

  it("orderedZonaFueraIds tolera estado ausente/vacío", () => {
    expect(orderedZonaFueraIds()).toEqual([]);
    expect(orderedZonaFueraIds({})).toEqual([]);
  });
});
