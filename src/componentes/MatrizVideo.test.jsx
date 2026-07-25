import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProviderUser } from "../contexto/Contexto";
import MatrizVideo from "./MatrizVideo";

// vi.mock is hoisted to top of file — use vi.hoisted for variables the factory needs
const { mockJoinMultipleTVs, mockAssignSourceToDestination, mockAssignVideoSource, mockAssignAudioSource, mockFetchTvrackState, mockSetTvrackVideo, mockSetTvrackAudio, mockSetTvrackLink } = vi.hoisted(() => ({
  mockJoinMultipleTVs: vi.fn().mockResolvedValue(undefined),
  mockAssignSourceToDestination: vi.fn().mockResolvedValue(undefined),
  mockAssignVideoSource: vi.fn().mockResolvedValue(undefined),
  mockAssignAudioSource: vi.fn().mockResolvedValue(undefined),
  mockFetchTvrackState: vi.fn().mockResolvedValue({ video: "DTV1", audio: "DTV1", link: false }),
  mockSetTvrackVideo: vi.fn().mockResolvedValue({ video: "DTV1", audio: "DTV1", link: false }),
  mockSetTvrackAudio: vi.fn().mockResolvedValue({ video: "DTV1", audio: "DTV1", link: false }),
  mockSetTvrackLink: vi.fn().mockResolvedValue({ video: "DTV1", audio: "DTV1", link: false }),
}));

vi.mock("../api/arrangerApi", () => ({
  joinMultipleTVs: mockJoinMultipleTVs,
  assignSourceToDestination: mockAssignSourceToDestination,
  assignVideoSource: mockAssignVideoSource,
  assignAudioSource: mockAssignAudioSource,
  fetchTvrackState: mockFetchTvrackState,
  setTvrackVideo: mockSetTvrackVideo,
  setTvrackAudio: mockSetTvrackAudio,
  setTvrackLink: mockSetTvrackLink,
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
  // Zonas adicionales
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
    tvrackState: { video: "DTV1", audio: "DTV1", link: false },
    handleChangeTvrack: vi.fn(),
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

  describe("handleTvrackBtn — TVRACK Video/Audio buttons", () => {
    it.each([
      "DTV1", "DTV2", "DTV3", "DTV4",
      "DTV5", "DTV6", "DTV7", "DTV8",
    ])(
      "calls assignVideoSource(%s, TVRACK) when video %s button is clicked",
      async (dtv) => {
        renderWithContext();

        fireEvent.click(screen.getByTestId(`btn-video-${dtv}`));

        await vi.waitFor(() => {
          expect(mockAssignVideoSource).toHaveBeenCalledWith(dtv, "TVRACK");
        });
      }
    );

    it.each([
      "DTV1", "DTV2", "DTV3", "DTV4",
      "DTV5", "DTV6", "DTV7", "DTV8",
    ])(
      "calls assignAudioSource(%s, TVRACK) when audio %s button is clicked",
      async (dtv) => {
        renderWithContext();

        fireEvent.click(screen.getByTestId(`btn-audio-${dtv}`));

        await vi.waitFor(() => {
          expect(mockAssignAudioSource).toHaveBeenCalledWith(dtv, "TVRACK");
        });
      }
    );

    it("does NOT crash when assignVideoSource fails", async () => {
      mockAssignVideoSource.mockRejectedValueOnce(new Error("Network error"));
      renderWithContext();

      fireEvent.click(screen.getByTestId("btn-video-DTV1"));

      await vi.waitFor(() => {
        expect(mockAssignVideoSource).toHaveBeenCalled();
      });

      // No error should propagate — the button just shows error toast
      expect(mockAssignVideoSource).toHaveBeenCalled();
    });
  });

  describe("onSubmit (Enviar button)", () => {
    it("calls assignSourceToDestination for all 46 mappings in batches of 8", async () => {
      const handleChangeEstadoVideo = vi.fn();
      renderWithContext({ handleChangeEstadoVideo });

      fireEvent.click(screen.getByText("Enviar"));

      await vi.waitFor(() => {
        // 46 mappings → 6 batches, state updated after each batch
        expect(handleChangeEstadoVideo).toHaveBeenCalled();
      });

      // All 46 mappings sent via assignSourceToDestination
      expect(mockAssignSourceToDestination).toHaveBeenCalledTimes(46);

      // First call should be VW-Norte
      expect(mockAssignSourceToDestination.mock.calls[0]).toEqual(["DTV1", "VW-Norte"]);

      // State updated incrementally: 6 batches for 46 items
      expect(handleChangeEstadoVideo).toHaveBeenCalledTimes(6);
    });

    it("calls handleChangeEstadoVideo incrementally when API succeeds", async () => {
      const handleChangeEstadoVideo = vi.fn();
      renderWithContext({ handleChangeEstadoVideo });

      fireEvent.click(screen.getByText("Enviar"));

      await vi.waitFor(() => {
        expect(handleChangeEstadoVideo).toHaveBeenCalled();
      });

      // Should be called once per batch (46/8 = 6 batches)
      expect(handleChangeEstadoVideo.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it("continues updating state even when some mappings fail", async () => {
      // Make some calls fail but others succeed
      mockAssignSourceToDestination
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"));

      const handleChangeEstadoVideo = vi.fn();
      renderWithContext({ handleChangeEstadoVideo });

      fireEvent.click(screen.getByText("Enviar"));

      await vi.waitFor(() => {
        expect(handleChangeEstadoVideo).toHaveBeenCalled();
      });

      // State still updated despite failures (Promise.allSettled never rejects)
      expect(handleChangeEstadoVideo).toHaveBeenCalled();

      // Clean up mock
      mockAssignSourceToDestination.mockResolvedValue(undefined);
    });
  });
});
