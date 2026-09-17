"use strict";

/**
 * Verify WS4a — modelo declarativo + groups derivado (reencuadre data-driven).
 *
 * Cubre:
 *   - A. matrixModel (MG-3): 3 zonas / 10 subgrupos con key, dir y screens;
 *     pantallas canónicas, sin solapamiento, cobertura de 29 pantallas
 *     (TV01..TV26 + VWN/VWC/VWS).
 *   - B. combosBySize: 5 patrones de 3 + 6 de 4, decodificación correcta.
 *   - C. optionsFor (MG-5): exactos para tamaño 3 y 4; tamaño 1 sin combos.
 *   - D. expandGroups: patrón / valor único, VWall INCLUIDO en matrixGroups,
 *     rechazo de combo de longitud incorrecta (MG-5), passthrough de destinos
 *     reales no-subgrupo, sin doble fuente de verdad.
 *   - E. collapseGroup: mixed → null (MG-6, nunca values[0]).
 *   - F. Round-trip expand ↔ collapse (incluye VWall de 1 pantalla).
 *   - G. Submit total: 10 subgrupos → 29 pantallas, matrixGroups con 10 claves.
 *
 *   node server/broker/verify/verify-groups.cjs
 */
const g = require("../groups.js");
const m = require("../matrixModel.js");
const d = require("../destinations.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

// ── A. matrixModel (MG-3): 3 zonas / 10 subgrupos ──
check("A1: 3 zonas definidas", m.MATRIX_MODEL.zones.length === 3);
check("A2: 10 subgrupos en total", m.subgroupKeys().length === 10);
check(
  "A3: claves exactas de los 10 subgrupos",
  JSON.stringify(m.subgroupKeys()) ===
    JSON.stringify([
      "VWN", "VWC", "VWS",
      "TvsEscaleraNorte", "TvsEscaleraCentro", "TvsEscaleraSur",
      "TvsBarraNorte", "TvsBarraLibertador", "TvsBarraSur", "TvsBarraPista",
    ]),
);
check("A4: VideoWall = 3 subgrupos de 1 pantalla (Norte/Centro/Sur)", JSON.stringify(m.screensOf("VWN")) === JSON.stringify(["VWN"]) && JSON.stringify(m.screensOf("VWC")) === JSON.stringify(["VWC"]) && JSON.stringify(m.screensOf("VWS")) === JSON.stringify(["VWS"]));
check("A5: Perímetro Norte = TV23..TV26", JSON.stringify(m.screensOf("TvsEscaleraNorte")) === JSON.stringify(["TV23", "TV24", "TV25", "TV26"]));
check("A6: Perímetro Centro = TV19..TV22", JSON.stringify(m.screensOf("TvsEscaleraCentro")) === JSON.stringify(["TV19", "TV20", "TV21", "TV22"]));
check("A7: Perímetro Sur = TV15..TV18", JSON.stringify(m.screensOf("TvsEscaleraSur")) === JSON.stringify(["TV15", "TV16", "TV17", "TV18"]));
check("A8: Barra Libertador = TV01..TV03 (label 'Libertador')", JSON.stringify(m.screensOf("TvsBarraLibertador")) === JSON.stringify(["TV01", "TV02", "TV03"]) && m.findSubgroup("TvsBarraLibertador").dir === "Libertador");
check("A9: Barra Sur = TV04..TV07", JSON.stringify(m.screensOf("TvsBarraSur")) === JSON.stringify(["TV04", "TV05", "TV06", "TV07"]));
check("A10: Barra Pista = TV08..TV10 (3 pantallas)", JSON.stringify(m.screensOf("TvsBarraPista")) === JSON.stringify(["TV08", "TV09", "TV10"]));
check("A11: Barra Norte = TV11..TV14", JSON.stringify(m.screensOf("TvsBarraNorte")) === JSON.stringify(["TV11", "TV12", "TV13", "TV14"]));

const modelTvs = m.subgroups().flatMap((sg) => sg.screens);
check("A12: todas las pantallas de subgrupo son destinos canónicos", modelTvs.every((tv) => d.isDestination(tv)));
check("A13: sin solapamiento entre subgrupos", new Set(modelTvs).size === modelTvs.length);
check("A14: cobertura exacta de 29 pantallas (TV01..TV26 + VWN/VWC/VWS)", modelTvs.length === 29 && d.TV_IDS.every((tv) => modelTvs.includes(tv)) && ["VWN", "VWC", "VWS"].every((vw) => modelTvs.includes(vw)));
check("A15: cada subgrupo tiene dir (etiqueta de display)", m.subgroups().every((sg) => typeof sg.dir === "string" && sg.dir.length > 0));

// ── B. combosBySize ──
const combos3 = m.MATRIX_MODEL.combosBySize[3];
const combos4 = m.MATRIX_MODEL.combosBySize[4];
check("B1: 5 combos de tamaño 3", combos3.length === 5);
check("B2: 6 combos de tamaño 4", combos4.length === 6);
check("B3: todos los combos decodifican a fuentes DTV válidas", [...combos3, ...combos4].every((c) => m.decodeCombo(c).every((s) => /^DTV[1-8]$/.test(s))));
check("B4: DTV123 decodifica posición por posición", JSON.stringify(m.decodeCombo("DTV123")) === JSON.stringify(["DTV1", "DTV2", "DTV3"]));
check("B5: combo malformado → null", m.decodeCombo("nope") === null && m.decodeCombo("DTV12x") === null && m.decodeCombo(123) === null);
check("B6: GROUP_PATTERNS derivado sin duplicar (11 patrones)", Object.keys(g.GROUP_PATTERNS).length === 11);

// ── C. optionsFor (MG-5) ──
check(
  "C1: optionsFor(3) exacto (DTV1..8 + 5 combos)",
  JSON.stringify(m.optionsFor(3)) ===
    JSON.stringify(["DTV1", "DTV2", "DTV3", "DTV4", "DTV5", "DTV6", "DTV7", "DTV8", "DTV123", "DTV121", "DTV542", "DTV143", "DTV153"]),
);
check(
  "C2: optionsFor(4) exacto (DTV1..8 + 6 combos)",
  JSON.stringify(m.optionsFor(4)) ===
    JSON.stringify(["DTV1", "DTV2", "DTV3", "DTV4", "DTV5", "DTV6", "DTV7", "DTV8", "DTV1234", "DTV1212", "DTV1231", "DTV5432", "DTV3254", "DTV1354"]),
);
check("C3: optionsFor(1) sin combos (solo DTV1..8)", JSON.stringify(m.optionsFor(1)) === JSON.stringify(["DTV1", "DTV2", "DTV3", "DTV4", "DTV5", "DTV6", "DTV7", "DTV8"]));
check("C4: optionsFor reexportado por groups.js", g.optionsFor === m.optionsFor);
check("C5: GROUP_DEFS derivado coincide con el modelo (10 claves)", Object.keys(g.GROUP_DEFS).length === 10 && JSON.stringify(g.GROUP_DEFS.TvsBarraLibertador) === JSON.stringify(m.screensOf("TvsBarraLibertador")));

// ── D. expandGroups ──
let r = g.expandGroups({ TvsBarraLibertador: "DTV123" });
check("D1: patrón 3-TV expande en orden físico", r.tvs.TV01 === "DTV1" && r.tvs.TV02 === "DTV2" && r.tvs.TV03 === "DTV3");
check("D2: solo las pantallas del subgrupo entran al patch", Object.keys(r.tvs).length === 3);
check("D3: matrixGroups registra el valor elegido", r.matrixGroups.TvsBarraLibertador === "DTV123");

r = g.expandGroups({ TvsEscaleraNorte: "DTV3254" });
check("D4: patrón 4-TV (DTV3254) expande escalera norte", r.tvs.TV23 === "DTV3" && r.tvs.TV24 === "DTV2" && r.tvs.TV25 === "DTV5" && r.tvs.TV26 === "DTV4");

r = g.expandGroups({ TvsBarraSur: "DTV1212" });
check("D5: patrón mixto DTV1212 expande barra sur", r.tvs.TV04 === "DTV1" && r.tvs.TV05 === "DTV2" && r.tvs.TV06 === "DTV1" && r.tvs.TV07 === "DTV2");

r = g.expandGroups({ TvsBarraPista: "DTV7" });
check("D6: valor único → todas las pantallas al mismo destino", r.tvs.TV08 === "DTV7" && r.tvs.TV09 === "DTV7" && r.tvs.TV10 === "DTV7");

r = g.expandGroups({ VWN: "DTV2", VWC: "DTV3", VWS: "DTV2" });
check("D7: VWall expande a su única pantalla", r.tvs.VWN === "DTV2" && r.tvs.VWC === "DTV3" && r.tvs.VWS === "DTV2");
check("D8: VWall SÍ aparece en matrixGroups (subgrupo de 1 pantalla)", r.matrixGroups.VWN === "DTV2" && r.matrixGroups.VWC === "DTV3" && r.matrixGroups.VWS === "DTV2");

r = g.expandGroups({ TvsBarraLibertador: "DTV1234" });
check("D9: combo de 4 en subgrupo de 3 se rechaza (MG-5)", Object.keys(r.tvs).length === 0 && Object.keys(r.matrixGroups).length === 0);

r = g.expandGroups({ VWN: "DTV123" });
check("D10: combo de 3 en subgrupo de 1 se rechaza (MG-5)", Object.keys(r.tvs).length === 0 && Object.keys(r.matrixGroups).length === 0);

r = g.expandGroups({ TvsBarraNorte: "DTV1234", TvsBarraLibertador: "DTV153", VWS: "DTV4" });
check(
  "D11: submit completo expande grupos + VWall juntos",
  r.tvs.TV11 === "DTV1" && r.tvs.TV14 === "DTV4" && r.tvs.TV01 === "DTV1" && r.tvs.TV02 === "DTV5" && r.tvs.TV03 === "DTV3" && r.tvs.VWS === "DTV4",
);
check("D12: las claves de subgrupo NO se cuelan en tvs (sin doble fuente)", !("TvsBarraNorte" in r.tvs) && !("TvsBarraLibertador" in r.tvs) && !("TvsEscaleraSur" in g.expandGroups({ TvsEscaleraSur: "DTV2" }).tvs));
check("D13: matrixGroups con los 3 valores elegidos", Object.keys(r.matrixGroups).length === 3 && r.matrixGroups.TvsBarraNorte === "DTV1234" && r.matrixGroups.TvsBarraLibertador === "DTV153" && r.matrixGroups.VWS === "DTV4");

const a = JSON.stringify(g.expandGroups({ TvsEscaleraCentro: "DTV5432" }));
const b = JSON.stringify(g.expandGroups({ TvsEscaleraCentro: "DTV5432" }));
check("D14: determinismo (misma entrada → mismo output)", a === b);

const skipped = g.expandGroups({ TvsBarraSur: null, TvsBarraPista: undefined });
check("D15: valor null/undefined se omite", Object.keys(skipped.tvs).length === 0 && Object.keys(skipped.matrixGroups).length === 0);
check("D16: entrada no-objeto → patch vacío", Object.keys(g.expandGroups(null).tvs).length === 0 && Object.keys(g.expandGroups("DTV1").tvs).length === 0);
check("D17: clave desconocida (destino real) pasa directa sin contaminar matrixGroups", g.expandGroups({ TVRACK: "DTV1" }).tvs.TVRACK === "DTV1" && Object.keys(g.expandGroups({ TVRACK: "DTV1" }).matrixGroups).length === 0);

// ── E. collapseGroup (MG-6) ──
const tvsOk = { TV01: "DTV1", TV02: "DTV2", TV03: "DTV3", TV04: "DTV5", TV05: "DTV4", TV06: "DTV3", TV07: "DTV2", TV08: "DTV1", TV09: "DTV2", TV10: "DTV3", TV11: "DTV1", TV12: "DTV2", TV13: "DTV3", TV14: "DTV4", TV15: "DTV2", TV16: "DTV2", TV17: "DTV2", TV18: "DTV2", TV19: "DTV6", TV20: "DTV6", TV21: "DTV6", TV22: "DTV6", TV23: "DTV1", TV24: "DTV2", TV25: "DTV3", TV26: "DTV4", VWN: "DTV2" };
check("E1: patrón DTV123 (3 TVs)", g.collapseGroup(tvsOk, g.GROUP_DEFS.TvsBarraLibertador) === "DTV123");
check("E2: patrón DTV5432 (4 TVs)", g.collapseGroup(tvsOk, g.GROUP_DEFS.TvsBarraSur) === "DTV5432");
check("E3: patrón DTV1234 (escalera norte)", g.collapseGroup(tvsOk, g.GROUP_DEFS.TvsEscaleraNorte) === "DTV1234");
check("E4: TVs faltantes → undefined", g.collapseGroup({}, g.GROUP_DEFS.TvsEscaleraCentro) === undefined);
check("E5: todos iguales → valor único", g.collapseGroup({ TV08: "DTV2", TV09: "DTV2", TV10: "DTV2" }, g.GROUP_DEFS.TvsBarraPista) === "DTV2");
check("E6: mixto no-predeterminado → null (NUNCA values[0], MG-6)", g.collapseGroup({ TV15: "DTV5", TV16: "DTV2", TV17: "DTV2", TV18: "DTV2" }, g.GROUP_DEFS.TvsEscaleraSur) === null);
check("E7: fuente única de 1 pantalla (VWall) → valor único", g.collapseGroup(tvsOk, g.GROUP_DEFS.VWN) === "DTV2");
check("E8: entrada inválida → undefined", g.collapseGroup(null, g.GROUP_DEFS.TvsBarraPista) === undefined && g.collapseGroup(tvsOk, []) === undefined);

// ── F. Round-trip expansión ↔ colapso ──
const trip = g.expandGroups({ TvsBarraLibertador: "DTV542", TvsBarraSur: "DTV1231", TvsBarraPista: "DTV6", TvsBarraNorte: "DTV1354" });
check("F1: round-trip patrón Libertador", g.collapseGroup(trip.tvs, g.GROUP_DEFS.TvsBarraLibertador) === "DTV542");
check("F2: round-trip patrón BarraSur", g.collapseGroup(trip.tvs, g.GROUP_DEFS.TvsBarraSur) === "DTV1231");
check("F3: round-trip valor único BarraPista", g.collapseGroup(trip.tvs, g.GROUP_DEFS.TvsBarraPista) === "DTV6");
check("F4: round-trip patrón BarraNorte", g.collapseGroup(trip.tvs, g.GROUP_DEFS.TvsBarraNorte) === "DTV1354");

const tripVw = g.expandGroups({ VWN: "DTV3", VWC: "DTV5", VWS: "DTV7" });
check("F5: round-trip VWall (1 pantalla)", g.collapseGroup(tripVw.tvs, g.GROUP_DEFS.VWN) === "DTV3" && g.collapseGroup(tripVw.tvs, g.GROUP_DEFS.VWC) === "DTV5" && g.collapseGroup(tripVw.tvs, g.GROUP_DEFS.VWS) === "DTV7");

// ── G. Cobertura total (MG-3/MG-4) ──
const allValues = Object.fromEntries(m.subgroups().map((sg) => [sg.key, sg.screens.length === 1 ? "DTV2" : sg.screens.length === 3 ? "DTV123" : "DTV1234"]));
const total = g.expandGroups(allValues);
check("G1: submit total cubre las 29 pantallas", d.TV_IDS.every((tv) => tv in total.tvs) && ["VWN", "VWC", "VWS"].every((vw) => vw in total.tvs));
check("G2: submit total produce solo destinos reales", Object.keys(total.tvs).every((k) => d.isDestination(k)));
check("G3: matrixGroups con los 10 subgrupos", Object.keys(total.matrixGroups).length === 10 && m.subgroupKeys().every((k) => k in total.matrixGroups));
check("G4: round-trip total sin valores null", m.subgroupKeys().every((k) => g.collapseGroup(total.tvs, g.GROUP_DEFS[k]) === allValues[k]));

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${failed === 0 ? "✓ verify-groups OK" : `✗ ${failed} check(s) fallaron`} (${checks.length} checks)`);
process.exit(failed === 0 ? 0 : 1);
