import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  joinMultipleTVs,
  sendSerialCommand,
  loadChannelPreset,
} from "./arrangerApi";

describe("joinMultipleTVs", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));
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
      .mockResolvedValueOnce({ status: 200 })
      .mockRejectedValueOnce(new Error("Network failure"))
      .mockResolvedValueOnce({ status: 200 });

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
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});

describe("sendSerialCommand", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));
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
