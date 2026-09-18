"use strict";

/**
 * Verify QW-4 — presets programáticos del Arranger.
 *
 * Dos capas:
 *   A. Módulo `arrangerPresets.js` con un ejecutor mock determinista:
 *      validación de naming (≤19, sin espacios, reservados, prefijo `sb_`),
 *      borrar-antes (R3) + N `preset add`, pasos `preset delay <ms>`, delete
 *      idempotente (`not found`), `loadPreset` con delay en MINUTOS, y
 *      propagación de errores tipificados (permanent/transient).
 *   B. Rutas `server.js` en puerto efímero con un cliente fake inyectado:
 *      400 de validación, 200 de ensure/delete/load, DELETE idempotente,
 *      mapeo de errorKind a status y CORS con DELETE.
 *
 * Uso: node server/broker/verify/verify-arranger-presets.cjs
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.BROKER_FILE_LOG = "0";
process.env.BROKER_LOG = "0";

const {
  createArrangerPresets,
  validatePresetName,
  validateCommands,
} = require("../arrangerPresets.js");
const { createServer } = require("../../server.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

const silentLog = { info() {}, warn() {}, error() {} };

function throwsValidation(label, fn) {
  try {
    fn();
    check(label, false);
  } catch (error) {
    check(label, !!(error && error.isValidation));
  }
}

async function rejectsValidation(label, promise) {
  try {
    await promise;
    check(label, false);
  } catch (error) {
    check(label, !!(error && error.isValidation));
  }
}

/**
 * Ejecutor mock del Arranger. Responde como el hardware V210826:
 *   - `preset delete` → success | not found
 *   - `preset add` → success
 *   - `preset delay` → sin respuesta (N/A en el manual)
 *   - `get presets` → lista de nombres (❓)
 * Permite inyectar respuestas por tipo para simular errores.
 */
function makeExecutor({ existing = [], addResponse, deleteResponse, getPresetsResponse } = {}) {
  const calls = [];
  const names = new Set(existing);
  async function runCommand(command) {
    calls.push(command);
    if (/^preset delete\b/.test(command)) {
      const name = command.split(/\s+/)[2];
      if (typeof deleteResponse === "function") return deleteResponse(command, names);
      if (deleteResponse) return deleteResponse;
      if (!names.has(name)) {
        return { ok: true, status: 200, text: `preset delete error [preset '${name}' not found]` };
      }
      names.delete(name);
      return { ok: true, status: 200, text: `preset delete ${name} success` };
    }
    if (/^preset add\b/.test(command)) {
      const name = command.split(/\s+/)[2];
      if (typeof addResponse === "function") return addResponse(command, names);
      if (addResponse) return addResponse;
      names.add(name);
      return { ok: true, status: 200, text: `preset add ${name} success` };
    }
    if (/^preset delay\b/.test(command)) return { ok: true, status: 200, text: "" };
    if (/^preset load\b/.test(command)) return { ok: true, status: 200, text: "preset load success" };
    if (command === "get presets") {
      if (typeof getPresetsResponse === "function") return getPresetsResponse(names);
      if (getPresetsResponse) return getPresetsResponse;
      return { ok: true, status: 200, text: [...names].join(",") };
    }
    return { ok: false, status: 400, text: "error [invalid arguments]" };
  }
  return { runCommand, calls, names };
}

/** A) validación pura de naming (V210826). */
function scenarioValidation() {
  console.log("\n── A1: validación de naming ──");
  throwsValidation("name > 19 chars rechazado", () => validatePresetName("sb_" + "x".repeat(20)));
  throwsValidation("name con espacios rechazado", () => validatePresetName("sb_foo bar"));
  throwsValidation("name reservado 'all' rechazado", () => validatePresetName("all"));
  throwsValidation("name reservado 'all_devices' rechazado", () => validatePresetName("all_devices"));
  throwsValidation("name sin prefijo sb_ rechazado", () => validatePresetName("matriz"));
  throwsValidation("name vacío rechazado", () => validatePresetName(""));
  throwsValidation("name no-string rechazado", () => validatePresetName(42));
  throwsValidation('name "sb_" sin slug rechazado', () => validatePresetName("sb_"));
  throwsValidation("charset inválido rechazado", () => validatePresetName("sb_foo.bar"));
  check("name válido 'sb_escena' aceptado", validatePresetName("sb_escena") === "sb_escena");
  check("name válido de 19 chars aceptado", validatePresetName("sb_" + "x".repeat(16)).length === 19);

  console.log("\n── A2: validación de comandos/pasos ──");
  throwsValidation("commands vacío rechazado", () => validateCommands([]));
  throwsValidation("commands no-array rechazado", () => validateCommands("join av DTV1 TV01"));
  throwsValidation("comando vacío rechazado", () => validateCommands(["  "]));
  throwsValidation("anidamiento 'preset load' rechazado", () => validateCommands(["preset load otro"]));
  throwsValidation("anidamiento 'preset add' rechazado", () => validateCommands(["preset add x yy"]));
  throwsValidation("anidamiento 'preset delete' rechazado", () => validateCommands(["preset delete otro"]));
  throwsValidation("delay > 9999 ms rechazado", () => validateCommands(["preset delay 12000"]));
  throwsValidation("delay no numérico rechazado", () => validateCommands(["preset delay abc"]));
  throwsValidation("delay fraccionario rechazado", () => validateCommands(["preset delay 1.5"]));
  throwsValidation("delay negativo rechazado", () => validateCommands(["preset delay -5"]));
  const delayStep = validateCommands(["preset delay 500"]);
  check("delay 500 ms aceptado como paso", delayStep[0].isDelay === true);
  const delayMax = validateCommands(["preset delay 9999"]);
  check("delay 9999 ms aceptado (tope)", delayMax[0].isDelay === true);
  const normalStep = validateCommands(["join av DTV1 TV01"]);
  check("comando normal no es delay", normalStep[0].isDelay === false);
}

/** A3: ensurePreset — borrar-antes + append + verificación best-effort. */
async function scenarioEnsure() {
  console.log("\n── A3: ensurePreset (borrar-antes + N preset add) ──");
  {
    const exec = makeExecutor({ existing: ["sb_escena"] });
    const mod = createArrangerPresets({ runCommand: exec.runCommand, log: silentLog });
    const r = await mod.ensurePreset("sb_escena", ["join av DTV1 TV01", "join av DTV2 TV02"], "w-1");
    check("ensure existente → ok", r.ok === true);
    check("ensure existente → replaced (no created)", r.replaced === true && r.created === false);
    check("ensure multi-comando → appended 2", r.appended === 2);
    check("ensure verificado por get presets", r.verified === true);
    check("ensure emite preset delete PRIMERO (R3)", exec.calls[0] === "preset delete sb_escena");
    check("ensure emite N preset add en orden", exec.calls[1] === "preset add sb_escena join av DTV1 TV01" && exec.calls[2] === "preset add sb_escena join av DTV2 TV02");
    check("ensure consulta get presets al final", exec.calls[3] === "get presets");
  }
  {
    const exec = makeExecutor({ existing: [] });
    const mod = createArrangerPresets({ runCommand: exec.runCommand, log: silentLog });
    const r = await mod.ensurePreset("sb_nueva", ["join av DTV3 TV03"]);
    check("ensure nuevo → created + not found ignorado", r.ok === true && r.created === true && r.replaced === false);
    check("ensure nuevo → appended 1", r.appended === 1);
    check("ensure nuevo → delete not found no aborta", exec.calls[0] === "preset delete sb_nueva");
  }
  {
    console.log("\n── A4: paso preset delay (ms) ──");
    const exec = makeExecutor({});
    const mod = createArrangerPresets({ runCommand: exec.runCommand, log: silentLog });
    const r = await mod.ensurePreset("sb_delay", ["join av DTV1 TV01", "preset delay 500", "join audio DTV2 TV02"]);
    check("delay step → appended 3", r.ok === true && r.appended === 3);
    check("delay step → comando crudo 'preset delay 500'", exec.calls.includes("preset delay 500"));
    check("delay step → NO se envuelve en preset add", !exec.calls.some((c) => c.startsWith("preset add sb_delay preset delay")));
  }
  {
    console.log("\n── A5: verificación best-effort (❓) ──");
    const failExec = makeExecutor({ getPresetsResponse: { ok: false, status: 200, text: "error [invalid command]" } });
    const rFail = await createArrangerPresets({ runCommand: failExec.runCommand, log: silentLog }).ensurePreset("sb_v", ["join av DTV1 TV01"]);
    check("get presets falla → ensure NO falla", rFail.ok === true);
    check("get presets falla → verified false + verificationError", rFail.verified === false && typeof rFail.verificationError === "string");
    const missExec = makeExecutor({ getPresetsResponse: { ok: true, status: 200, text: "otro_preset" } });
    const rMiss = await createArrangerPresets({ runCommand: missExec.runCommand, log: silentLog }).ensurePreset("sb_v", ["join av DTV1 TV01"]);
    check("get presets no lista el preset → verified false, no fatal", rMiss.ok === true && rMiss.verified === false);
  }
}

/** A6: delete idempotente y errores. */
async function scenarioDelete() {
  console.log("\n── A6: deletePreset idempotente ──");
  const exec = makeExecutor({ existing: ["sb_x"] });
  const mod = createArrangerPresets({ runCommand: exec.runCommand, log: silentLog });
  const r1 = await mod.deletePreset("sb_x");
  check("delete existente → deleted", r1.ok === true && r1.deleted === true && r1.existed === true);
  const r2 = await mod.deletePreset("sb_x");
  check("delete repetido → idempotente (not found = éxito)", r2.ok === true && r2.deleted === false && r2.existed === false);

  console.log("\n── A7: delete con error real propaga tipificado ──");
  const badExec = makeExecutor({ deleteResponse: { ok: true, status: 200, text: "preset error [invalid mode]" } });
  const bad = createArrangerPresets({ runCommand: badExec.runCommand, log: silentLog });
  const rBad = await bad.deletePreset("sb_d");
  check("delete invalid mode → ok:false permanent", rBad.ok === false && rBad.errorKind === "permanent");
  const rAbort = await bad.ensurePreset("sb_d", ["join av DTV1 TV01"]);
  check("ensure aborta si el delete no es not-found", rAbort.ok === false && rAbort.appended === 0);
  check("ensure abortado NO emite preset add", !badExec.calls.some((c) => c.startsWith("preset add")));
}

/** A8: loadPreset con delay en minutos. */
async function scenarioLoad() {
  console.log("\n── A8: loadPreset (delay en MINUTOS) ──");
  const exec = makeExecutor({});
  const mod = createArrangerPresets({ runCommand: exec.runCommand, log: silentLog });
  const r1 = await mod.loadPreset("sb_escena", { delayMinutes: 30 });
  check("load con delay 30 → ok + delayMinutes 30", r1.ok === true && r1.delayMinutes === 30);
  check("load con delay → comando 'preset load sb_escena 30'", exec.calls.includes("preset load sb_escena 30"));
  const r2 = await mod.loadPreset("sb_escena");
  check("load sin delay → comando sin sufijo", exec.calls.includes("preset load sb_escena") && r2.delayMinutes === null);
  const r3 = await mod.loadPreset("sb_escena", { delayMinutes: -1 });
  check("load delay -1 (cancelar) aceptado", r3.ok === true && exec.calls.includes("preset load sb_escena -1"));
  await rejectsValidation("load delay 1.5 rechazado", mod.loadPreset("sb_escena", { delayMinutes: 1.5 }));
  await rejectsValidation('load delay "30" (string) rechazado', mod.loadPreset("sb_escena", { delayMinutes: "30" }));
  await rejectsValidation("load delay -2 rechazado", mod.loadPreset("sb_escena", { delayMinutes: -2 }));
}

/** A9: propagación de errores tipificados (QW-1). */
async function scenarioErrors() {
  console.log("\n── A9: error tipificado propagado ──");
  {
    const exec = makeExecutor({ addResponse: { ok: true, status: 200, text: "preset error [invalid mode]" } });
    const r = await createArrangerPresets({ runCommand: exec.runCommand, log: silentLog }).ensurePreset("sb_e", ["join av DTV1 TV01"]);
    check("add invalid mode → permanent", r.ok === false && r.errorKind === "permanent");
  }
  {
    const exec = makeExecutor({ addResponse: { ok: true, status: 200, text: "preset add error [device 'DTV1' disconnected]" } });
    const r = await createArrangerPresets({ runCommand: exec.runCommand, log: silentLog }).ensurePreset("sb_e", ["join av DTV1 TV01"]);
    check("add device disconnected → transient", r.ok === false && r.errorKind === "transient");
  }
  {
    const exec = makeExecutor({ addResponse: { ok: true, status: 200, text: "preset error [invalid license]" } });
    const r = await createArrangerPresets({ runCommand: exec.runCommand, log: silentLog }).ensurePreset("sb_e", ["join av DTV1 TV01"]);
    check("add invalid license → transient", r.ok === false && r.errorKind === "transient");
  }
  {
    const mod = createArrangerPresets({ runCommand: async () => { throw new Error("fetch failed"); }, log: silentLog });
    const r = await mod.ensurePreset("sb_e", ["join av DTV1 TV01"]);
    check("red caída (throw) → transient", r.ok === false && r.errorKind === "transient");
  }
  {
    const exec = makeExecutor({
      addResponse: (command) => (command.includes("DTV2 TV02")
        ? { ok: true, status: 200, text: "preset error [invalid mode]" }
        : { ok: true, status: 200, text: "preset add success" }),
    });
    const r = await createArrangerPresets({ runCommand: exec.runCommand, log: silentLog }).ensurePreset("sb_p", ["join av DTV1 TV01", "join av DTV2 TV02"]);
    check("add falla a mitad → appended 1 + failedCommand", r.ok === false && r.appended === 1 && r.failedCommand === "preset add sb_p join av DTV2 TV02");
  }
}

/** B) rutas server.js con cliente fake (sin hardware). */
async function scenarioRoutes(tmpDir) {
  console.log("\n── B: rutas /api/arranger-presets (cliente fake) ──");
  const routePresets = new Set();
  let routeMode = "ok";
  const routeLog = [];
  const fakeClient = {
    isMock: false,
    getEncoder: async () => null,
    joinAv: async () => ({ ok: true, text: "join av success" }),
    joinVideo: async () => ({ ok: true, text: "join video success" }),
    joinAudio: async () => ({ ok: true, text: "join audio success" }),
    sendRaw: async (command) => {
      routeLog.push(command);
      if (/^preset delete\b/.test(command)) {
        const name = command.split(/\s+/)[2];
        if (!routePresets.has(name)) return { ok: true, status: 200, text: `preset delete error [preset '${name}' not found]` };
        routePresets.delete(name);
        return { ok: true, status: 200, text: `preset delete ${name} success` };
      }
      if (/^preset add\b/.test(command)) {
        if (routeMode === "permanent") return { ok: true, status: 200, text: "preset error [invalid mode]" };
        if (routeMode === "transient") return { ok: true, status: 200, text: "preset add error [device 'DTV1' disconnected]" };
        const name = command.split(/\s+/)[2];
        routePresets.add(name);
        return { ok: true, status: 200, text: `preset add ${name} success` };
      }
      if (/^preset delay\b/.test(command)) return { ok: true, status: 200, text: "" };
      if (/^preset load\b/.test(command)) return { ok: true, status: 200, text: "preset load success" };
      if (command === "get presets") return { ok: true, status: 200, text: [...routePresets].join(",") };
      return { ok: false, status: 400, text: "error [invalid arguments]" };
    },
  };

  const dbPath = path.join(tmpDir, "state-routes.json");
  const { app } = await createServer({
    dbPath,
    silent: true,
    token: "verify-token",
    client: fakeClient,
    reconcilerIntervalMs: 3_600_000,
  });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const postJson = (url, body) =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  try {
    // CORS: DELETE habilitado para el preflight del navegador.
    const preflight = await fetch(`${base}/api/arranger-presets`, { method: "OPTIONS" });
    check("CORS preflight incluye DELETE", (preflight.headers.get("access-control-allow-methods") || "").includes("DELETE"));

    // Validación → 400.
    let res = await postJson(`${base}/api/arranger-presets`, { name: "mal nombre", commands: ["join av DTV1 TV01"] });
    let body = await res.json();
    check("POST name inválido → 400 validation", res.status === 400 && body.errorKind === "validation");
    res = await postJson(`${base}/api/arranger-presets`, { name: "sinprefijo", commands: ["join av DTV1 TV01"] });
    check("POST name sin prefijo → 400", res.status === 400);
    res = await postJson(`${base}/api/arranger-presets`, { name: "sb_ok", commands: ["preset load x"] });
    check("POST comando anidado → 400", res.status === 400);

    // Ensure válido → 200.
    res = await postJson(`${base}/api/arranger-presets`, { name: "sb_ruta", commands: ["join av DTV1 TV01", "join av DTV2 TV02"] });
    body = await res.json();
    check("POST válido → 200 ok", res.status === 200 && body.ok === true);
    check("POST válido → appended 2 + verified", body.appended === 2 && body.verified === true);
    check("POST válido emite delete + adds", routeLog.includes("preset delete sb_ruta") && routeLog.includes("preset add sb_ruta join av DTV1 TV01"));

    // Delete → 200; repetido → idempotente.
    res = await fetch(`${base}/api/arranger-presets/sb_ruta`, { method: "DELETE" });
    body = await res.json();
    check("DELETE existente → 200 deleted", res.status === 200 && body.ok === true && body.deleted === true);
    res = await fetch(`${base}/api/arranger-presets/sb_ruta`, { method: "DELETE" });
    body = await res.json();
    check("DELETE repetido → 200 idempotente", res.status === 200 && body.ok === true && body.deleted === false && body.existed === false);

    // Load con y sin delay.
    res = await postJson(`${base}/api/arranger-presets/sb_ruta/load`, { delayMinutes: 30 });
    body = await res.json();
    check("POST load delay 30 → 200 + delayUnit minutes", res.status === 200 && body.ok === true && body.delayMinutes === 30 && body.delayUnit === "minutes");
    check("POST load emite 'preset load sb_ruta 30'", routeLog.includes("preset load sb_ruta 30"));
    res = await postJson(`${base}/api/arranger-presets/sb_ruta/load`, {});
    body = await res.json();
    check("POST load sin delay → 200 null", res.status === 200 && body.ok === true && body.delayMinutes === null);
    check("POST load sin delay emite comando sin sufijo", routeLog.includes("preset load sb_ruta"));
    res = await postJson(`${base}/api/arranger-presets/sb_ruta/load`, { delayMinutes: 1.5 });
    check("POST load delay inválido → 400", res.status === 400);

    // Propagación tipificada → status.
    routeMode = "permanent";
    res = await postJson(`${base}/api/arranger-presets`, { name: "sb_err", commands: ["join av DTV1 TV01"] });
    body = await res.json();
    check("POST error permanent → 400 + errorKind", res.status === 400 && body.ok === false && body.errorKind === "permanent");
    routeMode = "transient";
    res = await postJson(`${base}/api/arranger-presets`, { name: "sb_err", commands: ["join av DTV1 TV01"] });
    body = await res.json();
    check("POST error transient → 502 + errorKind", res.status === 502 && body.ok === false && body.errorKind === "transient");
    routeMode = "ok";

    // No se expone listado (get presets es ❓): el GET cae en el fallback SPA
    // (HTML), nunca en un endpoint JSON que liste presets.
    res = await fetch(`${base}/api/arranger-presets`);
    const listContentType = res.headers.get("content-type") || "";
    const listText = await res.text();
    check(
      "GET /api/arranger-presets NO expone listado JSON de presets",
      !listContentType.includes("application/json") && !listText.includes("sb_ruta"),
    );
  } finally {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    server.close();
  }
}

(async () => {
  scenarioValidation();
  await scenarioEnsure();
  await scenarioDelete();
  await scenarioLoad();
  await scenarioErrors();

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sbr-presets-"));
  try {
    await scenarioRoutes(tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${failed === 0 ? "✓ VERIFY ARRANGER-PRESETS OK" : `✗ ${failed} chequeo(s) fallaron`}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALLO:", e);
  process.exit(1);
});
