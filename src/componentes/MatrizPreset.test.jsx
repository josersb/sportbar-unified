import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProviderUser } from "../contexto/Contexto";
import MatrizPreset from "./MatrizPreset";

// vi.mock is hoisted to top of file — use vi.hoisted for variables the factory needs
const { mockJoinMultipleTVs } = vi.hoisted(() => ({
  mockJoinMultipleTVs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../api/arrangerApi", () => ({
  joinMultipleTVs: mockJoinMultipleTVs,
}));

const reloadSpy = vi.fn();

// Test TV values — each TV has a distinct source so we can verify mapping correctness
const presetTvs = {
  VWN: "DTV1",
  VWC: "DTV2",
  VWS: "DTV3",
  TV01: "DTV4",
  TV02: "DTV5",
  TV03: "DTV6",
  TV04: "DTV7",
  TV05: "DTV8",
  TV06: "DTV1",
  TV07: "DTV2",
  TV08: "DTV3",
  TV09: "DTV4",
  TV10: "DTV5",
  TV11: "DTV6",
  TV12: "DTV7",
  TV13: "DTV8",
  TV14: "DTV1",
  TV15: "DTV2",
  TV16: "DTV3",
  TV17: "DTV4",
  TV18: "DTV5",
  TV19: "DTV6",
  TV20: "DTV7",
  TV21: "DTV8",
  TV22: "DTV1",
  TV23: "DTV2",
  TV24: "DTV3",
  TV25: "DTV4",
  TV26: "DTV5",
};

const presetState = {
  tvs: presetTvs,
  descripcionPreset: [
    { preset1: "test" },
    { preset2: "" },
    { preset3: "" },
    { preset4: "" },
    { preset5: "" },
  ],
};

// Base context state (needed for component to render without errors)
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
    // Mock localStorage to return preset with known TV values
    localStorage.setItem("estadoApp_Preset1", JSON.stringify(presetState));
    // Stub window.location.reload
    Object.defineProperty(window, "location", {
      value: { reload: reloadSpy },
      writable: true,
    });
  });

  afterEach(() => {
    localStorage.removeItem("estadoApp_Preset1");
  });

  describe("handleCargaMatriz (triggered via Preset 1 button)", () => {
    it("calls joinMultipleTVs with all 29 TV mappings when Preset 1 is clicked", async () => {
      const handleChangeEstadoVideo = vi.fn();
      renderWithContext({ handleChangeEstadoVideo });

      // Click the "Preset 1" button
      fireEvent.click(screen.getByText("Preset 1"));

      // Wait for async state to settle
      await vi.waitFor(() => {
        expect(mockJoinMultipleTVs).toHaveBeenCalled();
      });

      // joinMultipleTVs should be called once with all 29 mappings
      expect(mockJoinMultipleTVs).toHaveBeenCalledTimes(1);

      const mappings = mockJoinMultipleTVs.mock.calls[0][0];
      expect(mappings).toHaveLength(29);

      // Verify VW mappings
      expect(mappings[0]).toEqual({ source: "DTV1", dest: "VW-Norte" });
      expect(mappings[1]).toEqual({ source: "DTV2", dest: "VW-Centro" });
      expect(mappings[2]).toEqual({ source: "DTV3", dest: "VW-Sur" });

      // Verify TV01-TV26 mappings
      expect(mappings[3]).toEqual({ source: "DTV4", dest: "TV01" });
      expect(mappings[4]).toEqual({ source: "DTV5", dest: "TV02" });
      expect(mappings[5]).toEqual({ source: "DTV6", dest: "TV03" });
      expect(mappings[6]).toEqual({ source: "DTV7", dest: "TV04" });
      expect(mappings[7]).toEqual({ source: "DTV8", dest: "TV05" });
      expect(mappings[8]).toEqual({ source: "DTV1", dest: "TV06" });
      expect(mappings[9]).toEqual({ source: "DTV2", dest: "TV07" });
      expect(mappings[10]).toEqual({ source: "DTV3", dest: "TV08" });
      expect(mappings[11]).toEqual({ source: "DTV4", dest: "TV09" });
      expect(mappings[12]).toEqual({ source: "DTV5", dest: "TV10" });
      expect(mappings[13]).toEqual({ source: "DTV6", dest: "TV11" });
      expect(mappings[14]).toEqual({ source: "DTV7", dest: "TV12" });
      expect(mappings[15]).toEqual({ source: "DTV8", dest: "TV13" });
      expect(mappings[16]).toEqual({ source: "DTV1", dest: "TV14" });
      expect(mappings[17]).toEqual({ source: "DTV2", dest: "TV15" });
      expect(mappings[18]).toEqual({ source: "DTV3", dest: "TV16" });
      expect(mappings[19]).toEqual({ source: "DTV4", dest: "TV17" });
      expect(mappings[20]).toEqual({ source: "DTV5", dest: "TV18" });
      expect(mappings[21]).toEqual({ source: "DTV6", dest: "TV19" });
      expect(mappings[22]).toEqual({ source: "DTV7", dest: "TV20" });
      expect(mappings[23]).toEqual({ source: "DTV8", dest: "TV21" });
      expect(mappings[24]).toEqual({ source: "DTV1", dest: "TV22" });
      expect(mappings[25]).toEqual({ source: "DTV2", dest: "TV23" });
      expect(mappings[26]).toEqual({ source: "DTV3", dest: "TV24" });
      expect(mappings[27]).toEqual({ source: "DTV4", dest: "TV25" });
      expect(mappings[28]).toEqual({ source: "DTV5", dest: "TV26" });
    });

    it("calls window.location.reload after joinMultipleTVs completes", async () => {
      const handleChangeEstadoVideo = vi.fn();
      renderWithContext({ handleChangeEstadoVideo });

      fireEvent.click(screen.getByText("Preset 1"));

      await vi.waitFor(() => {
        expect(reloadSpy).toHaveBeenCalled();
      });
    });

    it("does not throw when joinMultipleTVs rejects (error handled internally)", async () => {
      mockJoinMultipleTVs.mockRejectedValueOnce(new Error("Network error"));

      const handleChangeEstadoVideo = vi.fn();
      renderWithContext({ handleChangeEstadoVideo });

      // This should not throw despite the rejection
      fireEvent.click(screen.getByText("Preset 1"));

      // Wait for the async call to be made
      await vi.waitFor(() => {
        expect(mockJoinMultipleTVs).toHaveBeenCalled();
      });

      // The component catches the error internally, so no unhandled rejection
      // Verify the mock was actually called
      expect(mockJoinMultipleTVs).toHaveBeenCalledTimes(1);
    });
  });
});
