"use strict";

/**
 * Verify 5.2 — mockArranger: streams independientes, modos normal/blip/offline.
 */
const { createMockArranger } = require("../mockArranger.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

(async () => {
  // normal: join + get encoder deterministas
  const m = createMockArranger({ mode: "normal" });
  const join1 = await m.joinAv("DTV3", "TV01");
  const join2 = await m.joinAv("DTV3", "TV01");
  check("join av ok", join1.ok === true);
  check("join av determinista", join1.text === join2.text);
  check("get encoder refleja join (video)", (await m.getEncoder("TV01", "video")) === "DTV3");
  check("get encoder refleja join (audio)", (await m.getEncoder("TV01", "audio")) === "DTV3");
  await m.joinVideo("DTV4", "TV01");
  check("join video aísla audio", (await m.getEncoder("TV01", "video")) === "DTV4" && (await m.getEncoder("TV01", "audio")) === "DTV3");
  await m.joinAudio("DTV5", "TV01");
  check("join audio aísla video", (await m.getEncoder("TV01", "video")) === "DTV4" && (await m.getEncoder("TV01", "audio")) === "DTV5");
  check("command log distingue joins", JSON.stringify(m.getCommandLog().slice(-2)) === JSON.stringify(["join video DTV4 TV01", "join audio DTV5 TV01"]));
  check("get encoder default DTV1", (await m.getEncoder("VW-Norte", "video")) === "DTV1");

  // offline: get encoder null, join lanza
  const off = createMockArranger({ mode: "offline" });
  check("offline get encoder → null", (await off.getEncoder("TV01", "video")) === null);
  let threw = false;
  try { await off.joinAv("DTV1", "TV01"); } catch { threw = true; }
  check("offline join lanza", threw === true);

  // blip: determinista — falla cada blipEvery llamadas
  const blip = createMockArranger({ mode: "blip", blipEvery: 3 });
  const seq = [];
  for (let i = 0; i < 6; i++) seq.push(await blip.getEncoder("TV01", "video"));
  check("blip secuencia determinista [v,v,null,v,v,null]", JSON.stringify(seq) === JSON.stringify(["DTV1", "DTV1", null, "DTV1", "DTV1", null]));

  // setMode en caliente
  const hot = createMockArranger({ mode: "normal" });
  hot.setMode("offline");
  check("setMode caliente offline", (await hot.getEncoder("TV01", "video")) === null);
  let threwMode = false;
  try { hot.setMode("explota"); } catch { threwMode = true; }
  check("setMode inválido lanza", threwMode === true);

  // getMatrixState no muta el interno
  const state = m.getMatrixState();
  state.TV01.video = "MUTADO";
  check("getMatrixState es copia", (await m.getEncoder("TV01", "video")) === "DTV4");

  const failed = checks.filter((c) => !c.ok).length;
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error("FALLO:", e); process.exit(1); });
