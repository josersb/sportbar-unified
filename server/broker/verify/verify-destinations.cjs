"use strict";

/**
 * Verify 1.1 — destinations: 40 destinos canónicos, sin duplicados, mapa VW.
 */
const d = require("../destinations.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

check("40 destinos", d.MATRIX_DESTINATIONS.length === 40);
check("sin duplicados", new Set(d.MATRIX_DESTINATIONS).size === d.MATRIX_DESTINATIONS.length);
check("26 TVs presentes", d.TV_IDS.length === 26);
check("3 VW Arranger", JSON.stringify(d.VW_ARRANGER) === JSON.stringify(["VW-Norte", "VW-Centro", "VW-Sur"]));
check("3 VW app", JSON.stringify(d.VW_APP) === JSON.stringify(["VWN", "VWC", "VWS"]));
check("TVRACK presente", d.MATRIX_DESTINATIONS.includes("TVRACK"));
check("10 zonas fuera", d.ZONA_FUERA_IDS.length === 10);
check("toArranger VWN→VW-Norte", d.toArranger("VWN") === "VW-Norte");
check("toApp VW-Norte→VWN", d.toApp("VW-Norte") === "VWN");
check("toArranger idempotente (TV01)", d.toArranger("TV01") === "TV01");
check("isDestination acepta app y Arranger", d.isDestination("VWC") && d.isDestination("VW-Centro"));
check("isDestination rechaza inválidos", !d.isDestination("FOO") && !d.isDestination(null) && !d.isDestination(123));

const failed = checks.filter((c) => !c.ok).length;
process.exit(failed === 0 ? 0 : 1);
