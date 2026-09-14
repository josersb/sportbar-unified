"use strict";

/**
 * Verify 1.4 — store lowdb v3:
 *   - migración v2→v3 genera state.backup.json (fixture v2 en disco)
 *   - reapertura v3 no re-migra
 *   - fresh-start con state.json envenenado: matriz reconstruida desde
 *     Arranger (mock), presets migrados, app-only conservado.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createStore, normalizeV3 } = require("../store.js");
const { createMockArranger } = require("../mockArranger.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

/** Fixture v2 realista (schema del server v2 actual). */
function fixtureV2() {
  return {
    state: {
      tvs: {
        TV01: "DTV3", TV02: "DTV1", TV26: "DTV8",
        VWN: "DTV2", VWC: "DTV1", VWS: "DTV4",
        TVRACK: "DTV5",
        TvsBarraLegacy: "DTV9", // key legacy → descartada
        "aVip-Barra-Centro": "DTV6", // zona fuera en state.tvs → extraída
      },
      _version: 2,
    },
    tvrack: { video: "DTV5", audio: "DTV5", link: true, lastUpdated: "2026-01-01T00:00:00Z" },
    presets: {
      preset1: { tvs: { TV01: "DTV3" }, zonasFueraState: { "aVip-Barra-Centro": { video: "DTV6", audio: "DTV6", link: true } }, _version: 2 },
      preset2: { tvs: { TV02: "DTV8" } }, // v1: solo tvs
      preset3: null, preset4: null, preset5: null,
    },
    zonasFuera: { "aVip-Barra-Centro": { video: "DTV6", audio: "DTV6", link: true, lastUpdated: "2026-01-01T00:00:00Z" } },
  };
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sb-verify-store-"));

  try {
    // ── T1: migración v2→v3 con backup ──
    const dbPath1 = path.join(tmp, "state.json");
    const backup1 = path.join(tmp, "state.backup.json");
    fs.writeFileSync(dbPath1, JSON.stringify(fixtureV2()));
    const store = await createStore({ dbPath: dbPath1, backupPath: backup1, log: { info: () => {}, warn: () => {} } });

    check("T1: schemaVersion 3", store.data.schemaVersion === 3);
    check("T1: backup generado", fs.existsSync(backup1));
    check("T1: backup conserva v2 original", fs.readFileSync(backup1, "utf-8").includes("TvsBarraLegacy"));
    check("T1: desired.TV01 migrado", store.data.domains.tvs.desired.TV01 === "DTV3");
    check("T1: key legacy descartada", !("TvsBarraLegacy" in store.data.domains.tvs.desired));
    check("T1: TVRACK fuera de tvs", !("TVRACK" in store.data.domains.tvs.desired));
    check("T1: TVRACK en dominio propio", store.data.domains.tvrack.desired.video === "DTV5");
    check("T1: link tvrack → appOnly", store.data.appOnly.tvrack.link === true);
    check("T1: zona fuera extraída a dominio", store.data.domains.zonasFuera.desired["aVip-Barra-Centro"].video === "DTV6");
    check("T1: reported vacío (scan lo reconstruye)", Object.keys(store.data.domains.tvs.reported).length === 0);
    check("T1: sync stale inicial", store.data.sync.status === "stale");
    check("T1: preset1 migrado a snapshot completo", store.data.domains.presets.desired.preset1.zonasFuera["aVip-Barra-Centro"].video === "DTV6");
    check("T1: preset2 (v1) rellenado con defaults", store.data.domains.presets.desired.preset2.zonasFuera["aVip-Lobby-Batacazo"].video === "DTV1");
    check("T1: preset2 tvrack defaults", store.data.domains.presets.desired.preset2.tvrack.video === "DTV1");

    // Reapertura: ya v3, no debe re-migrar ni re-backupear
    const backupMtime = fs.statSync(backup1).mtimeMs;
    await new Promise((r) => setTimeout(r, 20));
    const store2 = await createStore({ dbPath: dbPath1, backupPath: backup1, log: { info: () => {}, warn: () => {} } });
    check("T1: reapertura no re-migra", store2.data.schemaVersion === 3 && fs.statSync(backup1).mtimeMs === backupMtime);

    // ── T2: fresh-start con state.json envenenado (JSON inválido) ──
    const dbPath2 = path.join(tmp, "state2.json");
    const backup2 = path.join(tmp, "state2.backup.json");
    fs.writeFileSync(dbPath2, "{invalid json!!!");
    const mock = createMockArranger({ mode: "normal" });
    await mock.joinAv("DTV7", "TV10");
    await mock.joinAv("DTV6", "VW-Norte");
    const fresh = await createStore({ dbPath: dbPath2,
      backupPath: backup2,
      readEncoder: (d, s) => mock.getEncoder(d, s),
      log: { info: () => {}, warn: () => {} },
    });

    check("T2: fresh-start schemaVersion 3", fresh.data.schemaVersion === 3);
    check("T2: backup del envenenado", fs.existsSync(backup2));
    check("T2: TV10 reconstruido desde Arranger (DTV7)", fresh.data.domains.tvs.desired.TV10 === "DTV7");
    check("T2: TV10 reported confirmado", fresh.data.domains.tvs.reported.TV10 === "DTV7");
    check("T2: VWN = VW-Norte reconstruido (DTV6)", fresh.data.domains.tvs.desired.VWN === "DTV6");
    check("T2: TV01 default (Arranger nunca lo tocó)", fresh.data.domains.tvs.desired.TV01 === "DTV1");

    // ── T3: fresh-start con schema desconocido pero parseable ──
    const dbPath3 = path.join(tmp, "state3.json");
    const backup3 = path.join(tmp, "state3.backup.json");
    fs.writeFileSync(dbPath3, JSON.stringify({ random: true, presets: { preset1: { tvs: { TV05: "DTV2" } } } }));
    const fresh3 = await createStore({ dbPath: dbPath3,
      backupPath: backup3,
      readEncoder: (d, s) => mock.getEncoder(d, s),
      log: { info: () => {}, warn: () => {} },
    });
    check("T3: schema desconocido → fresh-start", fresh3.data.schemaVersion === 3);
    check("T3: preset conservado si parseable", fresh3.data.domains.presets.desired.preset1.tvs.TV05 === "DTV2");
    check("T3: app-only default conservado", fresh3.data.appOnly.tvrack.link === false);

    // ── T4: escrituras versionadas por dominio ──
    const v1 = store.data.domains.tvs.version;
    store.setDesired("tvs", "TV01", "DTV4");
    await store.write();
    const v2 = store.data.domains.tvs.version;
    check("T4: setDesired bumpa versión", v2 === v1 + 1);
    check("T4: desired actualizado", store.data.domains.tvs.desired.TV01 === "DTV4");
    store.setReported("tvs", "TV01", "DTV4");
    check("T4: reported actualizado", store.data.domains.tvs.reported.TV01 === "DTV4");
    const v3 = store.data.domains.tvs.version;
    check("T4: setReported bumpa versión", v3 === v2 + 1);
    const before = store.data.domains.tvs.version;
    store.setReported("tvs", "TV01", null); // null nunca pisa reported
    check("T4: reported null no pisa", store.data.domains.tvs.reported.TV01 === "DTV4");
    check("T4: reported null no bumpa", store.data.domains.tvs.version === before);
    check("T4: setReportedAll con lecturas válidas", (() => { store.setReportedAll("tvs", { TV01: "DTV4", TV02: null }); return store.data.domains.tvs.reported.TV02 === undefined; })());

    // ── T5 (WS3, T-3.1/3.2): dominio channelIntent + backfill idempotente ──
    check("T5: migración v2→v3 incluye channelIntent", !!store.data.domains.channelIntent);
    check("T5: channelIntent reported null", store.data.domains.channelIntent.reported === null);
    check("T5: normalizeV3 agrega dominio faltante (idempotente)", (() => {
      const seed = { schemaVersion: 3, domains: { tvs: { desired: {}, reported: {}, version: 5, lastUpdated: "x" } }, appOnly: {} };
      const out = normalizeV3(seed);
      return !!(out.domains.channelIntent && out.domains.tvs.version === 5);
    })());
    check("T5: normalizeV3 no toca dominio existente", (() => {
      const intent = { desired: { DTV1: { canalActual: "1624", lastSentAt: "y", ack: "accepted" } }, reported: null, version: 7, lastUpdated: "z" };
      const out = normalizeV3({ schemaVersion: 3, domains: { channelIntent: intent }, appOnly: {} });
      return out.domains.channelIntent.version === 7;
    })());
    check("T5: normalizeV3 ignora seeds no-v3", normalizeV3({ schemaVersion: 2 })?.schemaVersion === 2);

    // v3 anterior a WS3 en disco (sin channelIntent) → backfill al abrir, sin backup
    const dbPath4 = path.join(tmp, "state4.json");
    const backup4 = path.join(tmp, "state4.backup.json");
    fs.writeFileSync(dbPath4, JSON.stringify({
      schemaVersion: 3,
      domains: { tvs: { desired: { TV01: "DTV3" }, reported: {}, version: 2, lastUpdated: "x" } },
      appOnly: { tvrack: { link: false } },
      sync: { status: "synced", lastSync: "y" },
    }));
    const st4 = await createStore({ dbPath: dbPath4, backupPath: backup4, log: { info: () => {}, warn: () => {} } });
    check("T5: v3 viejo carga con backfill channelIntent", !!st4.data.domains.channelIntent && st4.data.domains.channelIntent.desired !== null);
    check("T5: v3 viejo sin backup (sin rescan)", !fs.existsSync(backup4));
    check("T5: v3 viejo conserva tvs intacto", st4.data.domains.tvs.desired.TV01 === "DTV3" && st4.data.domains.tvs.version === 2);

    // T5b: setter app-domain (patrón presets): entrada mergeada + version bump
    const vCi0 = st4.data.domains.channelIntent.version;
    st4.setChannelIntentEntry("DTV1", { canalActual: "1624", lastSentAt: "2026-09-14T00:00:00.000Z", ack: "pending" });
    const entry1 = st4.data.domains.channelIntent.desired.DTV1;
    check("T5b: setChannelIntentEntry persiste intención", entry1.canalActual === "1624" && entry1.ack === "pending");
    check("T5b: setChannelIntentEntry bumpa versión", st4.data.domains.channelIntent.version === vCi0 + 1);
    st4.setChannelIntentEntry("DTV1", { ack: "accepted" });
    const entry2 = st4.data.domains.channelIntent.desired.DTV1;
    check("T5b: ACK mergea sin pisar canalActual/lastSentAt", entry2.ack === "accepted" && entry2.canalActual === "1624" && entry2.lastSentAt === "2026-09-14T00:00:00.000Z");
    check("T5b: reported sigue null tras writes", st4.data.domains.channelIntent.reported === null);
    check("T5b: getChannelIntent expone el dominio", st4.getChannelIntent().desired.DTV1.canalActual === "1624");

    const failed = checks.filter((c) => !c.ok).length;
    console.log(`\n${failed === 0 ? "✓ STORE OK" : `✗ ${failed} chequeos fallaron`}`);
    process.exit(failed === 0 ? 0 : 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => { console.error("FALLO:", e); process.exit(1); });
