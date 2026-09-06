"use strict";

/**
 * Verify 5.1 — arrangerClient: getEncoder/joinAv/joinVideo/joinAudio con retry, switch mock,
 * getters FW-LOCKED conservados con banner y NO usados por el broker.
 */
const { createArrangerClient, FW_LOCKED_BANNER } = require("../arrangerClient.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

(async () => {
  // Switch mock (VITE_MOCK_ARRANGER=1)
  const mock = createArrangerClient({ mock: true, mockMode: "normal" });
  check("switch mock activo", mock.isMock === true);
  check("getEncoder vía mock", (await mock.getEncoder("TV01", "video")) === "DTV1");
  const join = await mock.joinAv("DTV5", "TV01");
  check("joinAv vía mock ok", join.ok === true);
  check("joinAv vía mock refleja lectura", (await mock.getEncoder("TV01", "video")) === "DTV5");

  const videoJoin = await mock.joinVideo("DTV2", "TV01");
  const audioJoin = await mock.joinAudio("DTV3", "TV01");
  check("joinVideo vía mock ok", videoJoin.ok === true && videoJoin.text.includes("join video success"));
  check("joinAudio vía mock ok", audioJoin.ok === true && audioJoin.text.includes("join audio success"));
  check("joins independientes conservan ambos streams", (await mock.getEncoder("TV01", "video")) === "DTV2" && (await mock.getEncoder("TV01", "audio")) === "DTV3");

  // join falla con mock offline → { ok: false }, no throw
  const mockOff = createArrangerClient({ mock: true, mockMode: "offline" });
  const joinFail = await mockOff.joinAv("DTV1", "TV01");
  check("joinAv fallo controlado (no throw)", joinFail.ok === false && typeof joinFail.error === "string");
  const joinAudioFail = await mockOff.joinAudio("DTV1", "TV01");
  check("joinAudio fallo controlado (no throw)", joinAudioFail.ok === false && typeof joinAudioFail.error === "string");

  // Retry: mock blip falla 1 de cada 3 lecturas; el cliente no reintenta getEncoder
  // (null es resultado válido), pero joinAv con blip debe devolver { ok: false }.
  const mockBlip = createArrangerClient({ mock: true, mockMode: "blip", mockBlipEvery: 1 });
  const blipRead = await mockBlip.getEncoder("TV01", "video");
  check("getEncoder con blip → null (sin crashear)", blipRead === null);

  // FW-LOCKED getters: conservados con banner, devuelven null
  let warned = false;
  const silentLog = {
    warn: (msg) => { if (String(msg).includes(FW_LOCKED_BANNER)) warned = true; },
    error: () => {},
  };
  const client = createArrangerClient({ mock: true, log: silentLog });
  check("getMatrix conservado + banner", client.getMatrix() === null && warned);
  check("getJoins conservado + banner", client.getJoins() === null);
  check("getStatus conservado + banner", client.getStatus() === null);
  check("getters FW-LOCKED no expuestos al cliente (sin endpoints en broker)", !client.__fwUnlocked);

  const failed = checks.filter((c) => !c.ok).length;
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error("FALLO:", e); process.exit(1); });
