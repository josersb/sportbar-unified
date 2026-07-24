/**
 * midi-commands.js
 * Pure Buffer factories for AHM-32 MIDI commands.
 * Each function returns a Buffer ready to write to the TLS socket.
 *
 * MIDI protocol reference:
 * - Zones: channel offset N=1 (so status base = 0x90|0xB0|0xB1), CH byte = 0x00..0x3F
 * - Zone CH mapping: zone CH = zoneNumber (0=Norte, 1=Centro, 2=Sur)
 * - NRPN param 0x17 (decimal 23) = level
 * - dB ranges from -inf (0x00) to +10dB (0x7F)
 */

// ── Constants ──────────────────────────────────────────────────────────────────

/** SysEx manufacturer header (includes leading 0xF0) */
const SYSEX_HEADER = Buffer.from([0xF0, 0x00, 0x00, 0x1A, 0x50, 0x12, 0x01, 0x00]);

/** MIDI channel offset for zone control (N=1 → actual channel 2) */
const CH_TYPE_ZONE = 1;

/** NRPN parameter number for level control (hex 0x17 = decimal 23) */
const NRPN_LEVEL = 0x17;

// ── dB ↔ MIDI Conversion ───────────────────────────────────────────────────────

/**
 * Key interpolation points from the AHM spec.
 * Each point: { db, midi } where midi is a 0x00..0x7F value.
 */
const DB_TO_MIDI_TABLE = [
  { db: -100, midi: 0x00 },   // -inf → 0x00
  { db: -30,  midi: 0x1E },   // -30dB → 0x1E (30)
  { db: -20,  midi: 0x28 },   // -20dB → 0x28 (40)
  { db: -10,  midi: 0x32 },   // -10dB → 0x32 (50)
  { db: -5,   midi: 0x37 },   // -5dB  → 0x37 (55)
  { db: 0,    midi: 0x3C },   // 0dB   → 0x3C (60)
  { db: 5,    midi: 0x41 },   // +5dB  → 0x41 (65)
  { db: 10,   midi: 0x46 },   // +10dB → 0x46 (70)
];

/**
 * Convert a dB value to a MIDI value (0x00..0x7F).
 * Interpolates linearly between key points.
 * @param {number} db — dB value (clamped to -100..+10)
 * @returns {number} MIDI value 0x00..0x7F
 */
function dbToMidiValue(db) {
  // Clamp to valid range
  if (db <= -100) return 0x00;
  if (db >= 10) return 0x7F;

  for (let i = 0; i < DB_TO_MIDI_TABLE.length - 1; i++) {
    const low = DB_TO_MIDI_TABLE[i];
    const high = DB_TO_MIDI_TABLE[i + 1];
    if (db >= low.db && db <= high.db) {
      const ratio = (db - low.db) / (high.db - low.db);
      return Math.round(low.midi + ratio * (high.midi - low.midi));
    }
  }

  return 0x3C; // 0 dB default fallback
}

/**
 * Convert a MIDI value (0x00..0x7F) back to dB.
 * Reverse mapping of dbToMidiValue.
 * @param {number} midi — MIDI value 0x00..0x7F
 * @returns {number} dB value (rounded to 1 decimal place)
 */
function midiValueToDb(midi) {
  if (midi <= 0) return -100;
  if (midi >= 0x46) {
    // Extrapolate beyond +10dB at ~0.3dB per MIDI step
    return Math.round((10 + (midi - 0x46) * 0.3) * 10) / 10;
  }

  for (let i = 0; i < DB_TO_MIDI_TABLE.length - 1; i++) {
    const low = DB_TO_MIDI_TABLE[i];
    const high = DB_TO_MIDI_TABLE[i + 1];
    if (midi >= low.midi && midi <= high.midi) {
      const ratio = (midi - low.midi) / (high.midi - low.midi);
      return Math.round((low.db + ratio * (high.db - low.db)) * 10) / 10;
    }
  }

  return 0;
}

// ── SysEx Helper ───────────────────────────────────────────────────────────────

/**
 * Build a complete SysEx message wrapped in 0xF0 … 0xF7.
 * @param {...number} bytes — payload bytes (F0 and F7 are added automatically)
 * @returns {Buffer}
 */
function createSysEx(...bytes) {
  return Buffer.concat([Buffer.from([0xF0]), Buffer.from(bytes), Buffer.from([0xF7])]);
}

// ── Zone Mute Commands ─────────────────────────────────────────────────────────

/**
 * Create a Note On message pair for zone mute control.
 *
 * AHM convention uses two Note On messages back-to-back:
 *   1st: status=0x91, note=ch, velocity=(0x7F=mute | 0x3F=unmute)
 *   2nd: status=0x91, note=ch, velocity=0x00
 *
 * Velocity > 0x40 = mute ON, velocity <= 0x3F = mute OFF.
 *
 * @param {number} ch — zone channel (0=Norte, 1=Centro, 2=Sur)
 * @param {boolean} muted — true to mute, false to unmute
 * @returns {Buffer} 6-byte buffer
 */
function setZoneMute(ch, muted) {
  const status = 0x90 | CH_TYPE_ZONE; // 0x91 (Note On, channel 2)
  const velocity = muted ? 0x7F : 0x3F;
  return Buffer.from([status, ch, velocity, status, ch, 0x00]);
}

// ── Zone Level Commands ────────────────────────────────────────────────────────

/**
 * Create an NRPN message to set zone level.
 *
 * NRPN structure (param 0x17 / decimal 23 = level):
 *   0xB1, 0x63, ch   — NRPN MSB = zone channel
 *   0xB1, 0x62, 0x17 — NRPN LSB = param number
 *   0xB1, 0x06, LV   — Data Entry = level value (0x00..0x7F)
 *
 * @param {number} ch — zone channel (0=Norte, 1=Centro, 2=Sur)
 * @param {number} db — dB value (-100 to +10, clamped)
 * @returns {Buffer} 9-byte buffer
 */
function setZoneLevel(ch, db) {
  const status = 0xB0 | CH_TYPE_ZONE; // 0xB1 (Control Change, channel 2)
  const levelValue = dbToMidiValue(db);
  return Buffer.from([status, 0x63, ch, status, 0x62, NRPN_LEVEL, status, 0x06, levelValue]);
}

// ── SysEx Query Commands ───────────────────────────────────────────────────────

/**
 * Create a SysEx query to get zone level.
 *
 * Query format:
 *   F0 [header] 01 01 0B 17 ch F7
 *
 * @param {number} ch — zone channel (0=Norte, 1=Centro, 2=Sur)
 * @returns {Buffer}
 */
function getZoneLevel(ch) {
  return Buffer.concat([
    SYSEX_HEADER,
    Buffer.from([0x01, 0x01, 0x0B, NRPN_LEVEL, ch, 0xF7]),
  ]);
}

/**
 * Create a SysEx query to get zone mute state.
 *
 * Query format:
 *   F0 [header] 01 01 09 ch F7
 *
 * @param {number} ch — zone channel (0=Norte, 1=Centro, 2=Sur)
 * @returns {Buffer}
 */
function getZoneMute(ch) {
  return Buffer.concat([
    SYSEX_HEADER,
    Buffer.from([0x01, 0x01, 0x09, ch, 0xF7]),
  ]);
}

// ── Exports ─────────────────────────────────────────────────────────────────────

module.exports = {
  SYSEX_HEADER,
  CH_TYPE_ZONE,
  NRPN_LEVEL,
  dbToMidiValue,
  midiValueToDb,
  createSysEx,
  setZoneMute,
  setZoneLevel,
  getZoneLevel,
  getZoneMute,
};
