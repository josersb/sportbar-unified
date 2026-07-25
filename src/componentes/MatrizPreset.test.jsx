import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProviderUser } from "../contexto/Contexto";
import MatrizPreset from "./MatrizPreset";

const { mockJoinMultipleTVs } = vi.hoisted(() => ({
  mockJoinMultipleTVs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../api/arrangerApi", () => ({
  joinMultipleTVs: mockJoinMultipleTVs,
}));

const presetTvs = {
  VWN: "DTV1", VWC: "DTV2", VWS: "DTV3",
  TV01: "DTV4", TV02: "DTV5", TV03: "DTV6", TV04: "DTV7", TV05: "DTV8",
  TV06: "DTV1", TV07: "DTV2", TV08: "DTV3", TV09: "DTV4", TV10: "DTV5",
  TV11: "DTV6", TV12: "DTV7", TV13: "DTV8", TV14: "DTV1", TV15: "DTV2",
  TV16: "DTV3", TV17: "DTV4", TV18: "DTV5", TV19: "DTV6", TV20: "DTV7",
  TV21: "DTV8", TV22: "DTV1", TV23: "DTV2", TV24: "DTV3", TV25: "DTV4", TV26: "DTV5",
};

const presetState = {
  tvs: presetTvs,
  descripcionPreset: [
    { preset1: "Fútbol Domingo" },
    { preset2: "" }, { preset3: "" }, { preset4: "" }, { preset5: "" },
  ],
};

const baseState = {
  ...presetState,
  decos: [],
  favoritos: [],
  audio: [],
};

function renderWithContext(overrideValue = {}) {
  const contextValue = {
    estado: baseState,
    handleChangeEstadoVideo: vi.fn(),
    handleChangeEstadoPreset: vi.fn(),
    ...overrideValue,
  };
  return render(
    <ProviderUser value={contextValue}>
      <MatrizPreset />
    </ProviderUser>
  );
}

describe("MatrizPreset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch: preset 1 exists, presets 2-5 are null
    vi.stubGlobal("fetch", vi.fn((url) => {
      const match = url.match(/\/api\/presets\/(\d)$/);
      if (match && match[1] === "1") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ preset: presetState }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ preset: null }) });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra 1 de 5 presets en uso (sync desde servidor)", async () => {
    renderWithContext();

    await waitFor(() => {
      expect(screen.getByText("1 de 5 presets en uso")).toBeTruthy();
    });

    expect(screen.getByText("En uso")).toBeTruthy();
    expect(screen.getAllByText("Libre")).toHaveLength(4);
  });

  it("carga Preset 1 y llama joinMultipleTVs con 29 mappings", async () => {
    const handleChangeEstadoVideo = vi.fn();
    renderWithContext({ handleChangeEstadoVideo });

    await waitFor(() => {
      expect(screen.getByText("1 de 5 presets en uso")).toBeTruthy();
    });

    fireEvent.click(screen.getAllByText("Cargar")[0]);

    await waitFor(() => {
      expect(mockJoinMultipleTVs).toHaveBeenCalled();
    });

    expect(mockJoinMultipleTVs).toHaveBeenCalledTimes(1);
    const mappings = mockJoinMultipleTVs.mock.calls[0][0];
    expect(mappings).toHaveLength(29);
    expect(mappings[0]).toEqual({ source: "DTV1", dest: "VW-Norte" });
  });

  it("botón Cargar está disabled si el preset está libre", async () => {
    renderWithContext();

    await waitFor(() => {
      expect(screen.getByText("1 de 5 presets en uso")).toBeTruthy();
    });

    const loadButtons = screen.getAllByText("Cargar");
    expect(loadButtons[0]).not.toBeDisabled(); // Preset 1: en uso
    expect(loadButtons[1]).toBeDisabled();     // Preset 2: libre
  });
});
