import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { joinMultipleTVs, sendSerialCommand, loadChannelPreset, sendIrCommand, sendChannelDigits } from "./arrangerApi";

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

    it("sends each digit with 500ms delays", async () => {
      const promise = sendChannelDigits("DTV1", "16");

      // Advance timers to trigger each delay
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(500);
      await promise;

      expect(global.fetch).toHaveBeenCalledTimes(2); // 2 digits
    });

    it("sends 4 digits for a 4-digit channel", async () => {
      const promise = sendChannelDigits("DTV1", "1603");

      // Advance timers for each digit delay (4 digits × 500ms)
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(500);
      await promise;

      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  it("throws for missing IR code", async () => {
    // X is not a valid key in IR_CODES — should throw before any delay
    await expect(sendChannelDigits("DTV1", "X")).rejects.toThrow("Código IR no encontrado para dígito: X");
  });
});

describe("joinMultipleTVs", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockArrangerOk()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing for empty mappings array (no-op)", async () => {
    await joinMultipleTVs([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends 3 sequential join av commands for 3 mappings", async () => {
    const mappings = [
      { source: "DTV1", dest: "TV01" },
      { source: "DTV2", dest: "TV02" },
      { source: "DTV3", dest: "TV03" },
    ];

    await joinMultipleTVs(mappings);

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[0][0]).toContain("join%20av%20DTV1%20TV01");
    expect(fetch.mock.calls[1][0]).toContain("join%20av%20DTV2%20TV02");
    expect(fetch.mock.calls[2][0]).toContain("join%20av%20DTV3%20TV03");
  });

  it("continues to next mapping when one fails and logs error per item", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(mockArrangerOk())
      .mockRejectedValueOnce(new Error("Network failure"))
      .mockResolvedValueOnce(mockArrangerOk());

    vi.stubGlobal("fetch", mockFetch);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mappings = [
      { source: "DTV1", dest: "TV01" },
      { source: "DTV2", dest: "TV02" },
      { source: "DTV3", dest: "TV03" },
    ];

    await joinMultipleTVs(mappings);

    // All 3 mappings should be attempted
    expect(mockFetch).toHaveBeenCalledTimes(3);
    // The failed one should log the error
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[ArrangerAPI] Error"),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
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
