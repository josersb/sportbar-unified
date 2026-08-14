import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { addPreset, deletePreset, getPresets, sendSerialCommand, loadChannelPreset, sendIrCommand, sendChannelDigits, getDevices, joinIr, joinSerial, setZonasFueraVideo, setZonasFueraAudio, setZonasFueraLink, setTvSource, fetchBrokerState, setAppState, savePreset, fetchPreset, loadPreset, deletePresetServer } from "./arrangerApi";

// Mock IR_CODES so the dynamic import inside sendChannelDigits resolves synchronously
// and doesn't interfere with vi.useFakeTimers
vi.mock("../data/irCodes.js", () => ({
  IR_CODES: {
    '0': '0000006c000a000a00e5002d002d002d00160016001600160016002d001600160016002d0016002d002d0016001604770072002d002d002d00160016001600160016002d001600160016002d0016002d002d001600160477',
    '1': '0000006c000a000a00e5002e002e002e001600160016001600160016001600160016002e001600160016002e001604770072002e002e002e001600160016001600160016001600160016002e001600160016002e00160477',
    '2': '0000006c000a000a00e5002d002d002d001600160016001600160016001600160016002d001600160016002d00160016048c0072002d002d002d001600160016001600160016001600160016002d001600160016002d00160016048c',
    '3': '0000006c000a000a00e5002d002d002d00160016001600160016001600160016002d002d00160016002d002d001604770072002d002d002d00160016001600160016001600160016002d002d00160016002d002d00160477',
    '4': '0000006c000a000a00e5002d002d002d00160016001600160016001600160016002d0016001600160016002d002d001604770072002d002d002d00160016001600160016001600160016002d0016001600160016002d002d00160477',
    '5': '0000006c000a000a00e5002e002e002e0016001600160016001600160016002e0016002e0016002e00160016001604770072002e002e002e0016001600160016001600160016002e0016002e0016002e0016001600160477',
    '6': '0000006c000a000a00e5002d002d002d0016001600160016001600160016002d002d00160016002d0016002d001604770072002d002d002d0016001600160016001600160016002d002d00160016002d0016002d00160477',
    '7': '0000006c000a000a00e5002d002d002d0016001600160016001600160016002d002d002d0016002d002d0016001604770072002d002d002d0016001600160016001600160016002d002d002d0016002d002d001600160477',
    '8': '0000006c000a000a00e5002d002d002d001600160016001600160016002d0016001600160016002d002d0016001604770072002d002d002d001600160016001600160016002d0016001600160016002d002d001600160477',
    '9': '0000006c000a000a00e5002d002d002d0016001600160016001600160016002d00160016002d0016002d002d002d001604770072002d002d002d0016001600160016001600160016002d00160016002d0016002d002d002d00160477',
  },
  IR_CODES_LIRC: {
    '0': '0000006c002a0030002c00190015001900150019002c001900150019002c0017002c003000150019',
    '1': '0000006c002a0030002c001900150019001500190015001900150019002c001700150019002c0019',
    '2': '0000006c002c0030002c001900150019001300190015001900150030001500190015003000150019',
    '3': '0000006c002c0030002c001900150019001500190013001900150030002c001900150030002c0019',
    '4': '0000006c002c0030002c0019001500190015001900150019002a00190015001900150030002c0019',
    '5': '0000006c002c0030002c0019001500190013001900150019002c0019002c0019002c001900150019',
    '6': '0000006c002c0030002a001b001300190015001900150019002c003000150019002c0019002c0017',
    '7': '0000006c002c0030002c0019001500190015001900150017002c0030002c0019002c003000150019',
    '8': '0000006c002c0030002c001900150019001500190015002e0015001900150019002c003000150019',
    '9': '0000006c002a0032002a001900150019001500190015003000150019002c0017002e002e002c0019',
  },
}));

// Helper: mock de respuesta exitosa del Arranger (body "OK", sin errores)
const mockArrangerOk = () => ({ status: 200, text: () => Promise.resolve("OK") });

describe("sendIrCommand", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockArrangerOk()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends send ir command with device and hex code", async () => {
    await sendIrCommand("DTV1", "0000006c000a000a00e5");

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("send%20ir%20DTV1%200000006c000a000a00e5");
  });

  it("sends correct URL for different device and hex", async () => {
    await sendIrCommand("DTV3", "abcdef123456");

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("send%20ir%20DTV3%20abcdef123456");
  });
});

describe("sendChannelDigits", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockArrangerOk()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("with fake timers", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("sends each digit with 300ms delays", async () => {
      const promise = sendChannelDigits("DTV1", "16");

      // Advance timers to trigger each delay
      await vi.advanceTimersByTimeAsync(300);
      await vi.advanceTimersByTimeAsync(300);
      await promise;

      expect(global.fetch).toHaveBeenCalledTimes(2); // 2 digits
    });

    it("sends 4 digits for a 4-digit channel", async () => {
      const promise = sendChannelDigits("DTV1", "1603");

      // Advance timers for each digit delay (4 digits × 300ms)
      await vi.advanceTimersByTimeAsync(300);
      await vi.advanceTimersByTimeAsync(300);
      await vi.advanceTimersByTimeAsync(300);
      await vi.advanceTimersByTimeAsync(300);
      await promise;

      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  it("throws for missing IR code", async () => {
    // X is not a valid key in IR_CODES — should throw before any delay
    await expect(sendChannelDigits("DTV1", "X")).rejects.toThrow("Código IR no encontrado para dígito: X");
  });
});

describe("sendSerialCommand", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockArrangerOk()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("encodes \\x0A terminator as %5Cx0A in the URL", async () => {
    await sendSerialCommand("DTV1", "Mute1 set mute 1 true");

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("%5Cx0A");
    expect(calledUrl).toContain("send%20serial");
    expect(calledUrl).toContain("DTV1");
  });

  it("encodes different device and command correctly", async () => {
    await sendSerialCommand("DTV3", "Source1 set Input 2");

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("%5Cx0A");
    expect(calledUrl).toContain("DTV3");
    expect(calledUrl).toContain("Source1%20set%20Input%202");
  });
});

describe("loadChannelPreset", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockArrangerOk()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends preset load command with deco number and channel", async () => {
    await loadChannelPreset(5, 1603);

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("preset%20load%20deco5canal1603");
  });

  it("sends correct command for different deco and channel", async () => {
    await loadChannelPreset(1, 77);

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("preset%20load%20deco1canal77");
  });
});

describe("getDevices", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockArrangerOk()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends get devices all by default", async () => {
    await getDevices();
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("get%20devices%20all");
  });

  it("sends get devices with specific target", async () => {
    await getDevices("Encoders");
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("get%20devices%20Encoders");
  });
});

describe("addPreset", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockArrangerOk()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends preset add command with encoded name and command", async () => {
    await addPreset("test", "join av DTV1 TV01");

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("preset%20add%20test%20join%20av%20DTV1%20TV01");
  });

  it("throws when Arranger rejects with error message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200,
      text: () => Promise.resolve("Error: preset already exists"),
    }));

    await expect(addPreset("test", "futbol")).rejects.toThrow("Arranger rechazó el comando");
  });
});

describe("deletePreset", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockArrangerOk()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends preset delete command with encoded name", async () => {
    await deletePreset("futbol-domingo");

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("preset%20delete%20futbol-domingo");
  });

  it("throws when preset is not found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200,
      text: () => Promise.resolve("not found"),
    }));

    await expect(deletePreset("inexistente")).rejects.toThrow("Arranger rechazó el comando");
  });
});

describe("getPresets", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockArrangerOk()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends get presets command", async () => {
    await getPresets();

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("get%20presets");
  });

  it("throws on timeout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("The operation was aborted", "AbortError")));

    await expect(getPresets()).rejects.toThrow("Timeout");
  });

  it("returns the presets text body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      text: () => Promise.resolve("preset1, preset2, preset3"),
    }));

    const response = await getPresets();
    const text = await response.text();

    expect(text).toBe("preset1, preset2, preset3");
  });
});

describe("joinIr", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockArrangerOk()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends join ir with encoder and decoder", async () => {
    await joinIr("DTV1", "TVRACK");
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("join%20ir%20DTV1%20TVRACK");
  });
});

describe("joinSerial", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockArrangerOk()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends join serial with encoder and decoder", async () => {
    await joinSerial("DTV1", "TVRACK");
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("join%20serial%20DTV1%20TVRACK");
  });
});

describe("Broker Client (PR 3)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("setTvSource", () => {
    it("POSTs to /api/tvs/:id/source with source and returns confirmed response", async () => {
      const confirmed = {
        ok: true, id: "TV01", source: "DTV3", dest: "TV01",
        reported: "DTV3", version: 12, lastUpdated: "2026-08-14T00:00:00Z",
        sync: { status: "synced", lastSync: "2026-08-14T00:00:00Z" },
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(confirmed),
      }));

      const result = await setTvSource("TV01", "DTV3");

      expect(fetch).toHaveBeenCalledWith(
        "/api/tvs/TV01/source",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "DTV3" }),
        }),
      );
      expect(result.reported).toBe("DTV3");
      expect(result.sync.status).toBe("synced");
    });

    it("throws with server error message when response is not ok", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Destino inválido: BOGUS" }),
      }));

      await expect(setTvSource("BOGUS", "DTV1")).rejects.toThrow("Destino inválido: BOGUS");
    });
  });

  describe("fetchBrokerState", () => {
    it("GETs /api/broker/state without since by default", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ domains: {}, versions: {}, sync: { status: "stale" } }),
      }));

      await fetchBrokerState();

      expect(fetch).toHaveBeenCalledWith("/api/broker/state");
    });

    it("passes since query encoded", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ domains: {}, versions: {}, sync: { status: "stale" } }),
      }));

      await fetchBrokerState("tvs:12,zonasFuera:3");

      expect(fetch).toHaveBeenCalledWith("/api/broker/state?since=tvs%3A12%2CzonasFuera%3A3");
    });

    it("throws when response is not ok", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

      await expect(fetchBrokerState()).rejects.toThrow("Failed to fetch broker state: 503");
    });
  });

  describe("setAppState", () => {
    it("POSTs partial merge to /api/app-state", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true, appState: { audio: [] } }),
      }));

      await setAppState({ audio: [] });

      expect(fetch).toHaveBeenCalledWith(
        "/api/app-state",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: [] }),
        }),
      );
    });
  });

  describe("savePreset / fetchPreset / loadPreset / deletePresetServer", () => {
    it("savePreset POSTs snapshot completo a /api/presets/:n", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }));
      const snapshot = { tvs: { TV01: "DTV1" }, zonasFuera: {}, tvrack: { video: "DTV1", audio: "DTV1" }, _version: 3 };

      await savePreset(1, snapshot);

      expect(fetch).toHaveBeenCalledWith(
        "/api/presets/1",
        expect.objectContaining({ method: "POST", body: JSON.stringify(snapshot) }),
      );
    });

    it("fetchPreset returns preset or null", async () => {
      const preset = { tvs: { TV01: "DTV1" }, zonasFuera: {}, tvrack: {}, _version: 3 };
      vi.stubGlobal("fetch", vi.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ preset }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ preset: null }) }));

      expect(await fetchPreset(1)).toEqual(preset);
      expect(await fetchPreset(2)).toBeNull();
    });

    it("loadPreset POSTs /api/presets/:n/load (server-side restore)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true, applied: 30, failed: 0 }),
      }));

      const result = await loadPreset(1);

      expect(fetch).toHaveBeenCalledWith("/api/presets/1/load", { method: "POST" });
      expect(result.failed).toBe(0);
    });

    it("loadPreset throws with server error on 404 empty preset", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Preset 3 vacío" }),
      }));

      await expect(loadPreset(3)).rejects.toThrow("Preset 3 vacío");
    });

    it("deletePresetServer DELETEs /api/presets/:n", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }));

      await deletePresetServer(5);

      expect(fetch).toHaveBeenCalledWith("/api/presets/5", { method: "DELETE" });
    });
  });

  describe("Zonas Fuera State (write-through broker)", () => {
    it("setZonasFueraVideo POSTs to /api/zonas-fuera/:id/video", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ zoneId: "aVip-Barra-Centro", video: "DTV3", audio: "DTV3", link: true, lastUpdated: "2026-01-01T00:00:00.000Z" }),
      }));

      const result = await setZonasFueraVideo("aVip-Barra-Centro", "DTV3");

      expect(fetch).toHaveBeenCalledWith(
        "/api/zonas-fuera/aVip-Barra-Centro/video",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: "DTV3" }),
        }),
      );
      expect(result.video).toBe("DTV3");
    });

    it("setZonasFueraAudio POSTs to /api/zonas-fuera/:id/audio", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ zoneId: "aVip-Bar-Boveda", video: "DTV5", audio: "DTV5", link: true, lastUpdated: "2026-01-01T00:00:00.000Z" }),
      }));

      const result = await setZonasFueraAudio("aVip-Bar-Boveda", "DTV5");

      expect(fetch).toHaveBeenCalledWith(
        "/api/zonas-fuera/aVip-Bar-Boveda/audio",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: "DTV5" }),
        }),
      );
      expect(result.audio).toBe("DTV5");
    });

    it("setZonasFueraLink POSTs to /api/zonas-fuera/:id/link", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ zoneId: "aVip-Barra-Centro", video: "DTV1", audio: "DTV1", link: false, lastUpdated: "2026-01-01T00:00:00.000Z" }),
      }));

      const result = await setZonasFueraLink("aVip-Barra-Centro", false);

      expect(fetch).toHaveBeenCalledWith(
        "/api/zonas-fuera/aVip-Barra-Centro/link",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linked: false }),
        }),
      );
      expect(result.link).toBe(false);
    });
  });
});
