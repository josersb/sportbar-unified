import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ContextoUser from "../contexto/Contexto";
import ZonasFueraStatus from "./ZonasFueraStatus";
import { ZONAS_FUERA, ZONA_FUERA_IDS } from "../data/zonasFuera";

// Regresión del CRITICAL de sdd-verify (vwall-libertador): con estado CARGADO,
// el componente crasheaba (ReferenceError: data is not defined) porque el
// refactor a ids.map perdió la destructuración. Este test cierra ese gap —
// antes solo se cubría el estado de loading.

const renderStatus = (value) =>
  render(
    <ContextoUser.Provider value={value}>
      <ZonasFueraStatus />
    </ContextoUser.Provider>
  );

const estadoConTodasLasZonas = Object.fromEntries(
  ZONA_FUERA_IDS.map((id) => [id, { video: "DTV1", audio: "DTV2", link: false }])
);

describe("ZonasFueraStatus — Estado de otras zonas", () => {
  it("muestra el loading si el estado todavía no está cargado", () => {
    renderStatus({ estadoLoaded: false, zonasFueraState: null });
    expect(screen.getByText(/Cargando estado de zonas/i)).toBeTruthy();
  });

  it("con estado cargado renderiza las 11 zonas (no crashea) con video y audio", () => {
    renderStatus({ estadoLoaded: true, zonasFueraState: estadoConTodasLasZonas });

    const section = screen.getByLabelText("Estado de otras zonas");
    for (const { label } of ZONAS_FUERA) {
      expect(section.textContent).toContain(label);
    }
    // Video y audio de cada una de las 11 zonas.
    expect(screen.getAllByText("DTV1").length).toBe(11);
    expect(screen.getAllByText("DTV2").length).toBe(11);
  });

  it("respeta el ORDEN CANÓNICO de las 11 zonas", () => {
    renderStatus({ estadoLoaded: true, zonasFueraState: estadoConTodasLasZonas });

    const text = screen.getByLabelText("Estado de otras zonas").textContent;
    let cursor = -1;
    for (const { label } of ZONAS_FUERA) {
      const idx = text.indexOf(label);
      expect(idx).toBeGreaterThan(cursor);
      cursor = idx;
    }
  });

  it("ubica las zonas desconocidas al final con label derivado (fallback)", () => {
    renderStatus({
      estadoLoaded: true,
      zonasFueraState: {
        "a-Zona-Desconocida": { video: "DTV3", audio: "DTV3" },
        ...estadoConTodasLasZonas,
      },
    });

    const text = screen.getByLabelText("Estado de otras zonas").textContent;
    expect(text).toContain("Zona Desconocida");
    expect(text.indexOf("Escenario -1 (2)")).toBeLessThan(text.indexOf("Zona Desconocida"));
  });
});
