import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProviderUser } from "../contexto/Contexto";
import MatrizVideo from "./MatrizVideo";

// vi.mock is hoisted to top of file — use vi.hoisted for variables the factory needs
const { mockJoinMultipleTVs, mockAssignSourceToDestination } = vi.hoisted(() => ({
  mockJoinMultipleTVs: vi.fn().mockResolvedValue(undefined),
  mockAssignSourceToDestination: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../api/arrangerApi", () => ({
  joinMultipleTVs: mockJoinMultipleTVs,
  assignSourceToDestination: mockAssignSourceToDestination,
}));

// TV values — each zone uses a different spread pattern so we can verify mapping correctness
const initialTvs = {
  VWN: "DTV1",
  VWC: "DTV2",
  VWS: "DTV3",
  TVRACK: "DTV1",
  TvsBarraLivertador: "DTV123", // → TV01=DTV1, TV02=DTV2, TV03=DTV3
  TvsBarraSur: "DTV1234", // → TV04=DTV1, TV05=DTV2, TV06=DTV3, TV07=DTV4
  TvsBarraPista: "DTV123", // → TV08=DTV1, TV09=DTV2, TV10=DTV3
  TvsBarraNorte: "DTV1234", // → TV11=DTV1, TV12=DTV2, TV13=DTV3, TV14=DTV4
  TvsEscaleraNorte: "DTV1234", // → TV23=DTV1, TV24=DTV2, TV25=DTV3, TV26=DTV4
  TvsEscaleraCentro: "DTV1234", // → TV19=DTV1, TV20=DTV2, TV21=DTV3, TV22=DTV4
  TvsEscaleraSur: "DTV1234", // → TV15=DTV1, TV16=DTV2, TV17=DTV3, TV18=DTV4
  // Placeholder TV values (will be overwritten by switch/case in onSubmit)
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
};

const baseState = {
  tvs: initialTvs,
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
      <MatrizVideo />
    </ProviderUser>
  );
}

describe("MatrizVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleBtnDTV (TVRACK buttons)", () => {
    it.each([
      ["DTV 1", "DTV1"],
      ["DTV 2", "DTV2"],
      ["DTV 3", "DTV3"],
      ["DTV 4", "DTV4"],
      ["DTV 5", "DTV5"],
      ["DTV 6", "DTV6"],
      ["DTV 7", "DTV7"],
      ["DTV 8", "DTV8"],
    ])(
      "calls assignSourceToDestination(%s, TVRACK) when %s button is clicked",
      async (buttonLabel, dtv) => {
        const handleChangeEstadoVideo = vi.fn();
        renderWithContext({ handleChangeEstadoVideo });

        fireEvent.click(screen.getByRole("button", { name: buttonLabel }));

        await vi.waitFor(() => {
          expect(mockAssignSourceToDestination).toHaveBeenCalledWith(dtv, "TVRACK");
        });

        // State should be updated with the selected DTV
        expect(handleChangeEstadoVideo).toHaveBeenCalled();
      }
    );
  });

  describe("onSubmit (Enviar button)", () => {
    it("calls joinMultipleTVs with all 29 TV mappings when Enviar is clicked", async () => {
      const handleChangeEstadoVideo = vi.fn();
      renderWithContext({ handleChangeEstadoVideo });

      fireEvent.click(screen.getByText("Enviar"));

      await vi.waitFor(() => {
        expect(mockJoinMultipleTVs).toHaveBeenCalled();
      });

      expect(mockJoinMultipleTVs).toHaveBeenCalledTimes(1);

      const mappings = mockJoinMultipleTVs.mock.calls[0][0];
      expect(mappings).toHaveLength(29);

      // VW mappings
      expect(mappings[0]).toEqual({ source: "DTV1", dest: "VW-Norte" });
      expect(mappings[1]).toEqual({ source: "DTV2", dest: "VW-Centro" });
      expect(mappings[2]).toEqual({ source: "DTV3", dest: "VW-Sur" });

      // TV01-TV03 from TvsBarraLivertador=DTV123
      expect(mappings[3]).toEqual({ source: "DTV1", dest: "TV01" });
      expect(mappings[4]).toEqual({ source: "DTV2", dest: "TV02" });
      expect(mappings[5]).toEqual({ source: "DTV3", dest: "TV03" });

      // TV04-TV07 from TvsBarraSur=DTV1234
      expect(mappings[6]).toEqual({ source: "DTV1", dest: "TV04" });
      expect(mappings[7]).toEqual({ source: "DTV2", dest: "TV05" });
      expect(mappings[8]).toEqual({ source: "DTV3", dest: "TV06" });
      expect(mappings[9]).toEqual({ source: "DTV4", dest: "TV07" });

      // TV08-TV10 from TvsBarraPista=DTV123
      expect(mappings[10]).toEqual({ source: "DTV1", dest: "TV08" });
      expect(mappings[11]).toEqual({ source: "DTV2", dest: "TV09" });
      expect(mappings[12]).toEqual({ source: "DTV3", dest: "TV10" });

      // TV11-TV14 from TvsBarraNorte=DTV1234
      expect(mappings[13]).toEqual({ source: "DTV1", dest: "TV11" });
      expect(mappings[14]).toEqual({ source: "DTV2", dest: "TV12" });
      expect(mappings[15]).toEqual({ source: "DTV3", dest: "TV13" });
      expect(mappings[16]).toEqual({ source: "DTV4", dest: "TV14" });

      // TV15-TV18 from TvsEscaleraSur=DTV1234
      expect(mappings[17]).toEqual({ source: "DTV1", dest: "TV15" });
      expect(mappings[18]).toEqual({ source: "DTV2", dest: "TV16" });
      expect(mappings[19]).toEqual({ source: "DTV3", dest: "TV17" });
      expect(mappings[20]).toEqual({ source: "DTV4", dest: "TV18" });

      // TV19-TV22 from TvsEscaleraCentro=DTV1234
      expect(mappings[21]).toEqual({ source: "DTV1", dest: "TV19" });
      expect(mappings[22]).toEqual({ source: "DTV2", dest: "TV20" });
      expect(mappings[23]).toEqual({ source: "DTV3", dest: "TV21" });
      expect(mappings[24]).toEqual({ source: "DTV4", dest: "TV22" });

      // TV23-TV26 from TvsEscaleraNorte=DTV1234
      expect(mappings[25]).toEqual({ source: "DTV1", dest: "TV23" });
      expect(mappings[26]).toEqual({ source: "DTV2", dest: "TV24" });
      expect(mappings[27]).toEqual({ source: "DTV3", dest: "TV25" });
      expect(mappings[28]).toEqual({ source: "DTV4", dest: "TV26" });
    });

    it("calls handleChangeEstadoVideo after joinMultipleTVs when API succeeds", async () => {
      const handleChangeEstadoVideo = vi.fn();
      renderWithContext({ handleChangeEstadoVideo });

      fireEvent.click(screen.getByText("Enviar"));

      await vi.waitFor(() => {
        expect(mockJoinMultipleTVs).toHaveBeenCalled();
      });

      expect(handleChangeEstadoVideo).toHaveBeenCalled();
    });

    it("does not call handleChangeEstadoVideo when joinMultipleTVs rejects", async () => {
      mockJoinMultipleTVs.mockRejectedValueOnce(new Error("Network error"));

      const handleChangeEstadoVideo = vi.fn();
      renderWithContext({ handleChangeEstadoVideo });

      fireEvent.click(screen.getByText("Enviar"));

      await vi.waitFor(() => {
        expect(mockJoinMultipleTVs).toHaveBeenCalled();
      });

      // State should NOT be updated because the API call failed
      expect(handleChangeEstadoVideo).not.toHaveBeenCalled();

      // Clean up mock
      mockJoinMultipleTVs.mockResolvedValue(undefined);
    });
  });
});
