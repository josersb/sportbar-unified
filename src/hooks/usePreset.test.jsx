import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ProviderUser } from "../contexto/Contexto";
import { usePreset } from "./usePreset";

// Mock arrangerApi so usePreset load() doesn't fire real HTTP calls
const { mockJoinMultipleTVs } = vi.hoisted(() => ({
  mockJoinMultipleTVs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../api/arrangerApi", () => ({
  joinMultipleTVs: mockJoinMultipleTVs,
}));

// TV keys referenced by buildMappings inside usePreset (26 TV + 3 VW)
const tvKeys = [
  "VWN", "VWC", "VWS",
  "TV01", "TV02", "TV03", "TV04", "TV05",
  "TV06", "TV07", "TV08", "TV09", "TV10",
  "TV11", "TV12", "TV13", "TV14", "TV15",
  "TV16", "TV17", "TV18", "TV19", "TV20",
  "TV21", "TV22", "TV23", "TV24", "TV25",
  "TV26",
];
const baseTvs = Object.fromEntries(tvKeys.map((k) => [k, "DTV1"]));

const baseState = {
  tvs: baseTvs,
  audio: [],
  decos: [],
  favoritos: [],
  descripcionPreset: [
    { preset1: "" },
    { preset2: "" },
    { preset3: "" },
    { preset4: "" },
    { preset5: "" },
  ],
};

function createWrapper(contextOverrides = {}) {
  const contextValue = {
    estado: baseState,
    handleChangeEstadoVideo: vi.fn(),
    handleChangeEstadoPreset: vi.fn(),
    ...contextOverrides,
  };
  // eslint-disable-next-line react/display-name
  return ({ children }) => (
    <ProviderUser value={contextValue}>{children}</ProviderUser>
  );
}

describe("usePreset()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── isLoaded ──────────────────────────────────────────────

  describe("isLoaded", () => {
    it("returns false when no preset is saved in localStorage", () => {
      const { result } = renderHook(() => usePreset(1), {
        wrapper: createWrapper(),
      });
      expect(result.current.isLoaded).toBe(false);
    });

    it("returns true when the corresponding preset key has data", () => {
      localStorage.setItem(
        "estadoApp_Preset1",
        JSON.stringify({ tvs: {}, audio: [] })
      );
      const { result } = renderHook(() => usePreset(1), {
        wrapper: createWrapper(),
      });
      expect(result.current.isLoaded).toBe(true);
    });

    it("distinguishes between different preset numbers (1 vs 5)", () => {
      localStorage.setItem(
        "estadoApp_Preset5",
        JSON.stringify({ tvs: {}, audio: [] })
      );
      const { result: res1 } = renderHook(() => usePreset(1), {
        wrapper: createWrapper(),
      });
      const { result: res5 } = renderHook(() => usePreset(5), {
        wrapper: createWrapper(),
      });
      expect(res1.current.isLoaded).toBe(false);
      expect(res5.current.isLoaded).toBe(true);
    });
  });

  // ── load ─────────────────────────────────────────────────

  describe("load", () => {
    it("loads saved preset and calls handleChangeEstadoVideo with TV values", async () => {
      const handleChangeEstadoVideo = vi.fn();
      const savedTvs = { ...baseTvs, VWN: "DTV5", VWC: "DTV6" };
      localStorage.setItem(
        "estadoApp_Preset1",
        JSON.stringify({ tvs: savedTvs })
      );

      const { result } = renderHook(() => usePreset(1), {
        wrapper: createWrapper({ handleChangeEstadoVideo }),
      });

      await act(async () => {
        await result.current.load();
      });

      expect(handleChangeEstadoVideo).toHaveBeenCalledWith(savedTvs);
    });

    it("calls joinMultipleTVs with all 29 TV mappings after load", async () => {
      const savedTvs = { ...baseTvs, TV01: "DTV5" };
      localStorage.setItem(
        "estadoApp_Preset1",
        JSON.stringify({ tvs: savedTvs })
      );

      const { result } = renderHook(() => usePreset(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.load();
      });

      expect(mockJoinMultipleTVs).toHaveBeenCalledTimes(1);
      const mappings = mockJoinMultipleTVs.mock.calls[0][0];
      expect(mappings).toHaveLength(29);
    });

    it("does nothing when no preset is saved (returns undefined)", async () => {
      const handleChangeEstadoVideo = vi.fn();
      const { result } = renderHook(() => usePreset(3), {
        wrapper: createWrapper({ handleChangeEstadoVideo }),
      });

      const ret = await act(async () => result.current.load());
      expect(handleChangeEstadoVideo).not.toHaveBeenCalled();
      expect(mockJoinMultipleTVs).not.toHaveBeenCalled();
      expect(ret).toBeUndefined();
    });

    it("handles corrupted stored data gracefully (invalid JSON returns undefined)", async () => {
      localStorage.setItem("estadoApp_Preset1", "not-valid-json");
      const { result } = renderHook(() => usePreset(1), {
        wrapper: createWrapper(),
      });

      const ret = await act(async () => result.current.load());
      expect(ret).toBeUndefined();
    });
  });

  // ── save ─────────────────────────────────────────────────

  describe("save", () => {
    it("persists the current estado to the correct localStorage key", () => {
      const handleChangeEstadoPreset = vi.fn();
      const estado = { ...baseState, tvs: { ...baseTvs } };

      const { result } = renderHook(() => usePreset(2), {
        wrapper: createWrapper({ estado, handleChangeEstadoPreset }),
      });

      act(() => {
        result.current.save("Partido Boca vs River");
      });

      const saved = JSON.parse(
        localStorage.getItem("estadoApp_Preset2")
      );
      expect(saved).toEqual(estado);
    });

    it("calls handleChangeEstadoPreset with updated description array", () => {
      const handleChangeEstadoPreset = vi.fn();
      const estado = { ...baseState };

      const { result } = renderHook(() => usePreset(1), {
        wrapper: createWrapper({ estado, handleChangeEstadoPreset }),
      });

      act(() => {
        result.current.save("Fútbol domingo");
      });

      expect(handleChangeEstadoPreset).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ preset1: "Fútbol domingo" }),
        ])
      );
    });

    it("updates the correct preset description index (preset 3 → index 2)", () => {
      const handleChangeEstadoPreset = vi.fn();
      const estado = {
        ...baseState,
        descripcionPreset: [
          { preset1: "a" },
          { preset2: "b" },
          { preset3: "c" },
          { preset4: "d" },
          { preset5: "e" },
        ],
      };

      const { result } = renderHook(() => usePreset(3), {
        wrapper: createWrapper({ estado, handleChangeEstadoPreset }),
      });

      act(() => {
        result.current.save("Nueva descripción");
      });

      const updatedDesc = handleChangeEstadoPreset.mock.calls[0][0];
      expect(updatedDesc[2]).toEqual({ preset3: "Nueva descripción" });
      expect(updatedDesc[0]).toEqual({ preset1: "a" });
      expect(updatedDesc[4]).toEqual({ preset5: "e" });
    });
  });
});
