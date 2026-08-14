import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ContextoUser from "../contexto/Contexto";
import { estadoInicial } from "../contexto/Contexto";
import Portada from "./Portada";
import MatrizVideo from "./MatrizVideo";
import Canales from "./Canales";
import Audio from "./Audio";
import Arranger from "./Arranger";
import Soporte from "./Soporte";

// ── Mock arrangerApi module (contrato PR 3: cliente del broker) ──
vi.mock("../api/arrangerApi", () => ({
  setTvSource: vi.fn().mockResolvedValue({ ok: true, reported: "DTV1" }),
  setAppState: vi.fn().mockResolvedValue({ ok: true }),
  setTvrackVideo: vi.fn().mockResolvedValue({ video: "DTV1", audio: "DTV1", link: false }),
  setTvrackAudio: vi.fn().mockResolvedValue({ video: "DTV1", audio: "DTV1", link: false }),
  setTvrackLink: vi.fn().mockResolvedValue({ video: "DTV1", audio: "DTV1", link: false }),
  setZonasFueraVideo: vi.fn().mockResolvedValue({ zoneId: "z", video: "DTV1" }),
  setZonasFueraAudio: vi.fn().mockResolvedValue({ zoneId: "z", audio: "DTV1" }),
  setZonasFueraLink: vi.fn().mockResolvedValue({ zoneId: "z", link: false }),
  savePreset: vi.fn().mockResolvedValue({ ok: true }),
  loadPreset: vi.fn().mockResolvedValue({ ok: true, applied: 30, failed: 0 }),
  deletePresetServer: vi.fn().mockResolvedValue({ ok: true }),
  fetchPreset: vi.fn().mockResolvedValue(null),
  fetchBrokerState: vi.fn().mockResolvedValue({ domains: {}, versions: {}, sync: { status: "stale" } }),
  sendChannelDigits: vi.fn(),
  sendSerialCommand: vi.fn(),
}));

// ── Mock Toast hook ──
vi.mock("./Toast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

// ── Mock usePreset hook ──
vi.mock("../hooks/usePreset", () => ({
  usePreset: () => ({ save: vi.fn(), load: vi.fn(), clear: vi.fn() }),
}));

// ── Shared mock context value ──
const mockContextValue = {
  estado: estadoInicial,
  estadoLoaded: true,
  errorDecos: false,
  reintentarDecos: vi.fn(),
  tvrackState: { video: "DTV1", audio: "DTV1", link: false },
  zonasFueraState: {},
  handleChangeEstadoDecos: vi.fn(),
  handleChangeEstadoAudio: vi.fn(),
  handleChangeEstadoVideo: vi.fn(),
  handleChangeEstadoPreset: vi.fn(),
  handleUpdateDispositivo: vi.fn(),
  handleChangeTvrack: vi.fn(),
  handleZonasFueraChange: vi.fn(),
};

// ── Wrapper helper ──
const renderWithContext = (ui) =>
  render(
    <ContextoUser.Provider value={mockContextValue}>
      {ui}
    </ContextoUser.Provider>
  );

// ================================================================
// Route: /  — Portada
// ================================================================
describe("Route / (Portada)", () => {
  it("renders without crashing and shows logo", () => {
    renderWithContext(<Portada />);
    // Portada renders an img with alt=""
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "");
  });
});

// ================================================================
// Route: /matrizvideo — MatrizVideo
// ================================================================
describe("Route /matrizvideo (MatrizVideo)", () => {
  it("renders without crashing and shows title", () => {
    renderWithContext(<MatrizVideo />);
    expect(
      screen.getByText("Ajustes de la matriz de video")
    ).toBeInTheDocument();
  });

  it("renders TVRACK section", () => {
    renderWithContext(<MatrizVideo />);
    expect(
      screen.getByText("TV Monitoreo Multimedia — TVRACK")
    ).toBeInTheDocument();
  });

  it("renders Zonas Fuera section", () => {
    renderWithContext(<MatrizVideo />);
    expect(
      screen.getByText("ZONAS FUERA DE SPORTBAR")
    ).toBeInTheDocument();
  });
});

// ================================================================
// Route: /canales — Canales
// ================================================================
describe("Route /canales (Canales)", () => {
  it("renders without crashing and shows title", () => {
    renderWithContext(<Canales />);
    expect(
      screen.getByText("Ajuste de canales - canales Favoritos")
    ).toBeInTheDocument();
  });

  it("renders the channel form with submit button", () => {
    renderWithContext(<Canales />);
    expect(
      screen.getByRole("button", { name: "Aplicar" })
    ).toBeInTheDocument();
  });

  it("renders favorite channels grid", () => {
    renderWithContext(<Canales />);
    expect(
      screen.getByText("Canales Favoritos")
    ).toBeInTheDocument();
  });
});

// ================================================================
// Route: /audio — Audio
// ================================================================
describe("Route /audio (Audio)", () => {
  it("renders without crashing and shows title", () => {
    renderWithContext(<Audio />);
    expect(
      screen.getByText("Ajuste de audio - zonas Sur-Centro-Norte")
    ).toBeInTheDocument();
  });

  it("renders audio form with submit button", () => {
    renderWithContext(<Audio />);
    expect(
      screen.getByRole("button", { name: "Enviar" })
    ).toBeInTheDocument();
  });

  it("renders mute checkboxes for each zone", () => {
    renderWithContext(<Audio />);
    const muteCheckboxes = screen.getAllByText("Mute");
    expect(muteCheckboxes).toHaveLength(3);
  });
});

// ================================================================
// Route: /arranger — Arranger
// ================================================================
describe("Route /arranger (Arranger)", () => {
  it("renders without crashing and shows title", () => {
    renderWithContext(<Arranger />);
    expect(
      screen.getByText("Links a ventanas de software Arranger IPEX5000")
    ).toBeInTheDocument();
  });

  it("renders all 5 Arranger links", () => {
    renderWithContext(<Arranger />);
    expect(
      screen.getByText("Estados de Fuentes y TVs")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Matriz de Audio Video")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Preview de Fuentes de Señal")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ajustes de Dispositivos")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Herramientas")
    ).toBeInTheDocument();
  });
});

// ================================================================
// Route: /soporte — Soporte
// ================================================================
describe("Route /soporte (Soporte)", () => {
  it("renders without crashing and shows title", () => {
    renderWithContext(<Soporte />);
    expect(
      screen.getByText("Wetech Latam soporte técnico")
    ).toBeInTheDocument();
  });

  it("renders support links", () => {
    renderWithContext(<Soporte />);
    expect(
      screen.getByText("Home Page Wetech Latam")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Correo electrónico soporte técnico")
    ).toBeInTheDocument();
  });
});
