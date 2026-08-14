import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ProviderUser } from "../contexto/Contexto";
import { usePreset, migrarPreset } from "./usePreset";

// Mock arrangerApi: savePreset/loadPreset/deletePresetServer (cliente broker)
const { mockSavePreset, mockLoadPreset, mockDeletePresetServer } = vi.hoisted(() => ({
  mockSavePreset: vi.fn().mockResolvedValue({ ok: true }),
  mockLoadPreset: vi.fn().mockResolvedValue({ ok: true, applied: 30, failed: 0 }),
  mockDeletePresetServer: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("../api/arrangerApi", () => ({
  savePreset: mockSavePreset,
  loadPreset: mockLoadPreset,
  deletePresetServer: mockDeletePresetServer,
}));

// TV keys del snapshot (26 TV + 3 VW, sin TVRACK ni TvsBarra*)
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
    tvrackState: { video: "DTV1", audio: "DTV1", link: false },
    zonasFueraState: {},
    ...contextOverrides,
  };
  // eslint-disable-next-line react/display-name
  return ({ children }) => (
    <ProviderUser value={contextValue}>{children}</ProviderUser>
  );
}

describe("migrarPreset", () => {
  it("deja intacto un preset ya en formato snapshot (v3)", () => {
    const snapshot = {
      tvs: { TV01: "DTV1" },
      zonasFuera: { Z1: { video: "DTV2", audio: "DTV2", link: true } },
      tvrack: { video: "DTV3", audio: "DTV3" },
      _version: 3,
    };
    expect(migrarPreset(snapshot, {}, { video: "DTV1", audio: "DTV1" })).toEqual(snapshot);
  });

  it("migra un preset viejo (solo tvs) rellenando zonasFuera/tvrack con defaults", () => {
    const legacy = { tvs: { TV01: "DTV5" } };
    const zonasFueraState = { Z1: { video: "DTV2", audio: "DTV2", link: true } };
    const tvrackState = { video: "DTV4", audio: "DTV4", link: false };

    const migrado = migrarPreset(legacy, zonasFueraState, tvrackState);

    expect(migrado.tvs.TV01).toBe("DTV5"); // tvs conservado
    expect(migrado.zonasFuera.Z1.video).toBe("DTV2");
    expect(migrado.zonasFuera.Z1.link).toBe(true);
    expect(migrado.tvrack.video).toBe("DTV4");
    expect(migrado._version).toBe(3);
  });

  it("rellena defaults DTV1 cuando no hay zonasFuera/tvrack conocidos", () => {
    const legacy = { tvs: { TV01: "DTV5" } };
    const migrado = migrarPreset(legacy, {}, null);
    expect(migrado.tvrack.video).toBe("DTV1");
    expect(migrado.tvrack.audio).toBe("DTV1");
    expect(migrado.zonasFuera).toEqual({});
  });
});

describe("usePreset()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // fetch global: GET /api/presets/:n → null (no existe en server)
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ preset: null }) })
    ));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
    it("calls POST /api/presets/:n/load (server-side restore) when server has the preset", async () => {
      const savedTvs = { ...baseTvs, VWN: "DTV5", VWC: "DTV6" };
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ preset: { tvs: savedTvs } }) })
      ));

      const { result } = renderHook(() => usePreset(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.load();
      });

      // loadPreset (POST /api/presets/1/load) llamado una vez; sin BATCH cliente
      expect(mockLoadPreset).toHaveBeenCalledWith(1);
    });

    it("migra un preset legacy de localStorage y lo sube antes de cargar", async () => {
      const savedTvs = { ...baseTvs, TV01: "DTV5" };
      localStorage.setItem("estadoApp_Preset1", JSON.stringify({ tvs: savedTvs }));

      const { result } = renderHook(() => usePreset(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.load();
      });

      // GET no encontró en server → savePreset con snapshot migrado + loadPreset
      expect(mockSavePreset).toHaveBeenCalledWith(1, expect.objectContaining({ _version: 3 }));
      expect(mockSavePreset.mock.calls[0][1].tvs.TV01).toBe("DTV5");
      expect(mockLoadPreset).toHaveBeenCalledWith(1);
    });

    it("does nothing when no preset is saved (returns undefined)", async () => {
      const { result } = renderHook(() => usePreset(3), {
        wrapper: createWrapper(),
      });

      const ret = await act(async () => result.current.load());
      expect(mockSavePreset).not.toHaveBeenCalled();
      expect(mockLoadPreset).not.toHaveBeenCalled();
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
    it("persists snapshot completo {tvs, zonasFuera, tvrack} al server y localStorage", async () => {
      const handleChangeEstadoPreset = vi.fn();
      const estado = { ...baseState, tvs: { ...baseTvs } };
      const tvrackState = { video: "DTV3", audio: "DTV4", link: false };
      const zonasFueraState = { Z1: { video: "DTV2", audio: "DTV2", link: true } };

      const { result } = renderHook(() => usePreset(2), {
        wrapper: createWrapper({ estado, handleChangeEstadoPreset, tvrackState, zonasFueraState }),
      });

      await act(async () => {
        await result.current.save("Partido Boca vs River");
      });

      expect(mockSavePreset).toHaveBeenCalledWith(2, expect.objectContaining({
        _version: 3,
        tvs: expect.any(Object),
      }));
      const saved = JSON.parse(localStorage.getItem("estadoApp_Preset2"));
      expect(saved._version).toBe(3);
      expect(saved.tvrack.video).toBe("DTV3");
      expect(saved.zonasFuera.Z1.video).toBe("DTV2");
    });

    it("calls handleChangeEstadoPreset with updated description array", async () => {
      const handleChangeEstadoPreset = vi.fn();
      const estado = { ...baseState };

      const { result } = renderHook(() => usePreset(1), {
        wrapper: createWrapper({ estado, handleChangeEstadoPreset }),
      });

      await act(async () => {
        await result.current.save("Fútbol domingo");
      });

      expect(handleChangeEstadoPreset).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ preset1: "Fútbol domingo" }),
        ])
      );
    });

    it("updates the correct preset description index (preset 3 → index 2)", async () => {
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

      await act(async () => {
        await result.current.save("Nueva descripción");
      });

      const updatedDesc = handleChangeEstadoPreset.mock.calls[0][0];
      expect(updatedDesc[2]).toEqual({ preset3: "Nueva descripción" });
      expect(updatedDesc[0]).toEqual({ preset1: "a" });
      expect(updatedDesc[4]).toEqual({ preset5: "e" });
    });
  });

  // ── clear ─────────────────────────────────────────────────

  describe("clear", () => {
    it("borra el preset del server y de localStorage", async () => {
      localStorage.setItem("estadoApp_Preset1", JSON.stringify({ tvs: {} }));

      const { result } = renderHook(() => usePreset(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.clear();
      });

      expect(mockDeletePresetServer).toHaveBeenCalledWith(1);
      expect(localStorage.getItem("estadoApp_Preset1")).toBeNull();
    });
  });
});
