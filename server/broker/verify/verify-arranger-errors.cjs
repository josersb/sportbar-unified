"use strict";

/**
 * Verify QW-1 — clasificación de errores del Arranger.
 *
 * Dos capas:
 *   a) Helper puro `classifyArrangerError` contra el catálogo V210826
 *      (transient | permanent | unknown) + `isArrangerErrorResponse`.
 *   b) Integración: un body `error [...]` con HTTP 200 hace fallar el join y
 *      el resultado expone `errorKind` (sin retry automático).
 *
 * Uso: node server/broker/verify/verify-arranger-errors.cjs
 */

const {
  ARRANGER_ERROR_KINDS,
  classifyArrangerError,
  isArrangerErrorResponse,
} = require("../arrangerErrors.js");
const { createArrangerClient } = require("../arrangerClient.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

const { TRANSIENT, PERMANENT, UNKNOWN } = ARRANGER_ERROR_KINDS;

/** Instala un fetch fake; `reject` simula caída de red. */
function installFetch({ status = 200, body = "join av success DTV1 TV01", reject = null } = {}) {
  const real = globalThis.fetch;
  globalThis.fetch = async () => {
    if (reject) throw reject;
    return { ok: status >= 200 && status < 300, status, text: async () => body };
  };
  return () => { globalThis.fetch = real; };
}

(async () => {
  // ── a) Catálogo V210826 → transient ─────────────────────────────────────
  check("transient: error device 'DTV1' disconnected", classifyArrangerError("error device 'DTV1' disconnected").kind === TRANSIENT);
  check("transient: error device disconnected (sin nombre)", classifyArrangerError("error device disconnected").kind === TRANSIENT);
  check("transient: error [device 'DTV2' disconnected] (corchetes)", classifyArrangerError("error [device 'DTV2' disconnected]").kind === TRANSIENT);
  check("transient: error invalid license", classifyArrangerError("error invalid license").kind === TRANSIENT);
  check("transient: error [invalid license]", classifyArrangerError("error [invalid license]").kind === TRANSIENT);
  check("transient: Error fetch failed", classifyArrangerError(new Error("fetch failed")).kind === TRANSIENT);
  check("transient: Error Timeout/Abort", classifyArrangerError(new Error("Timeout: el comando \"join\" excedió 10 segundos")).kind === TRANSIENT);
  check("transient: ECONNREFUSED", classifyArrangerError(new Error("connect ECONNREFUSED 192.168.2.254:80")).kind === TRANSIENT);

  // ── a) Catálogo V210826 → permanent ─────────────────────────────────────
  const permanentCases = [
    "error incomplete",
    "error [incomplete]",
    "error invalid arguments",
    "error [invalid arguments]",
    "error invalid stream 'usb_ext'",
    "error [invalid stream '<stream>']",
    "error device 'Decoder99' not found",
    "error [device 'X' not found]",
    "error device not found",
    "error invalid mode",
    "error [invalid mode]",
    "error security key mismatch",
    "error [security key mismatch]",
  ];
  for (const raw of permanentCases) {
    check(`permanent: ${raw}`, classifyArrangerError(raw).kind === PERMANENT);
  }

  // ── a) unknown: fuera de las listas del quick win / éxito inesperado ────
  const unknownCases = [
    "error [preset 'P1' not found]", // no figura en la lista QW-1 → unknown
    "error [invalid subscription 'joins']",
    "error [join not permitted]",
    "error [join failed]",
    "join av success DTV1 TV01",
    "get encoder success TV01 DTV3",
    "OK",
    "",
    null,
    undefined,
    { unexpected: 42 },
  ];
  for (const raw of unknownCases) {
    check(`unknown: ${JSON.stringify(raw)}`, classifyArrangerError(raw).kind === UNKNOWN);
  }

  // ── a) normalización de entrada + matched ───────────────────────────────
  check("normaliza { text }", classifyArrangerError({ text: "error invalid arguments" }).kind === PERMANENT);
  check("normaliza { error: Error }", classifyArrangerError({ error: new Error("fetch failed") }).kind === TRANSIENT);
  check("matched reporta la regla", classifyArrangerError("error invalid mode").matched === "invalid mode");
  check("matched null en unknown", classifyArrangerError("OK").matched === null);

  // ── a) isArrangerErrorResponse ───────────────────────────────────────────
  check("isArrangerError: 'error [invalid arguments]' true", isArrangerErrorResponse("error [invalid arguments]") === true);
  check("isArrangerError: 'error incomplete' true", isArrangerErrorResponse("error incomplete") === true);
  check("isArrangerError: con espacios previos true", isArrangerErrorResponse("  error [x]") === true);
  check("isArrangerError: éxito false", isArrangerErrorResponse("join av success DTV1 TV01") === false);
  check("isArrangerError: 'no error here' false", isArrangerErrorResponse("no error here") === false);
  check("isArrangerError: null false", isArrangerErrorResponse(null) === false);

  // ── b) Integración: body de error con HTTP 200 ⇒ fallo clasificado ─────
  {
    const restore = installFetch({ body: "error [invalid arguments]" });
    const client = createArrangerClient({ mock: false, baseUrl: "http://fake-arranger", token: "t", retries: 1 });
    const r = await client.joinAv("DTV1", "TV01", "w-perm");
    restore();
    check("join HTTP200 error body → ok:false", r.ok === false);
    check("join HTTP200 error body → errorKind permanent", r.errorKind === PERMANENT);
    check("join error preserva el body crudo", r.error === "error [invalid arguments]");
  }
  {
    const restore = installFetch({ body: "error [device 'DTV1' disconnected]" });
    const client = createArrangerClient({ mock: false, baseUrl: "http://fake-arranger", token: "t", retries: 1 });
    const r = await client.joinAudio("DTV1", "TV01", "w-trans");
    restore();
    check("joinAudio disconnected → ok:false transient", r.ok === false && r.errorKind === TRANSIENT);
  }
  {
    const restore = installFetch({ body: "join video success DTV1 TV01" });
    const client = createArrangerClient({ mock: false, baseUrl: "http://fake-arranger", token: "t", retries: 1 });
    const r = await client.joinVideo("DTV1", "TV01", "w-ok");
    restore();
    check("join éxito → ok:true + errorKind unknown", r.ok === true && r.errorKind === UNKNOWN && r.error === undefined);
  }
  {
    const restore = installFetch({ reject: new Error("fetch failed") });
    const client = createArrangerClient({ mock: false, baseUrl: "http://fake-arranger", token: "t", retries: 1 });
    const r = await client.joinAv("DTV1", "TV01", "w-net");
    restore();
    check("join red caída → ok:false transient", r.ok === false && r.errorKind === TRANSIENT);
  }

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${failed === 0 ? "✓ verify-arranger-errors OK" : `✗ ${failed} check(s) fallaron`}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error("FALLO:", e); process.exit(1); });
