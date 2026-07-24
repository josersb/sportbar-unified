/**
 * ahm-bridge.js
 * TCP/TLS bridge from Express to AHM-32 Audio Matrix Processor.
 *
 * Architecture:
 *   EventEmitter singleton. Manages one persistent TLS socket to AHM-32.
 *   Translates between JSON commands (from WebSocket clients) and MIDI byte
 *   streams (to/from AHM-32). Maintains authoritative zone state cache.
 *
 * Events emitted:
 *   'connected'    — TLS+Auth handshake complete
 *   'disconnected' — Socket closed
 *   'state'        — Zone state changed ({zones: {0: {level, muted}, ...}})
 *   'error'        — Error occurred (Error object)
 */

const EventEmitter = require("events");
const tls = require("tls");
const midi = require("./midi-commands");

// ── Constants ──────────────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 30000;
const HEARTBEAT_TIMEOUT_MS = 5000;
const AUTH_TIMEOUT_MS = 10000;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const VERIFY_DELAY_MS = 150; // delay before sending getLevel/getMute after set

// ── Zone defaults ──────────────────────────────────────────────────────────────

const DEFAULT_ZONE_STATE = Object.freeze({
  level: -99,
  muted: false,
});

function createInitialZones() {
  return {
    0: { ...DEFAULT_ZONE_STATE },
    1: { ...DEFAULT_ZONE_STATE },
    2: { ...DEFAULT_ZONE_STATE },
  };
}

// ── AhmBridge Class ────────────────────────────────────────────────────────────

class AhmBridge extends EventEmitter {
  /**
   * @param {object} [config] — Override env-based config
   * @param {string} [config.host] — AHM_HOST
   * @param {number} [config.port] — AHM_PORT
   * @param {string} [config.profile] — AHM_PROFILE
   * @param {string} [config.password] — AHM_PASSWORD
   */
  constructor(config = {}) {
    super();
    this.setMaxListeners(20);

    this.config = {
      host: config.host || process.env.AHM_HOST || "192.168.2.254",
      port: config.port || parseInt(process.env.AHM_PORT, 10) || 51327,
      profile: config.profile || process.env.AHM_PROFILE || "00",
      password: config.password || process.env.AHM_PASSWORD || "",
    };

    /** @type {tls.TLSSocket|null} */
    this.socket = null;

    /** Whether TLS+Auth handshake completed */
    this.connected = false;

    /** Cached authoritative zone state */
    this.lastState = { zones: createInitialZones() };

    /**
     * Command queue (deduplicated by zone+type).
     * Map key: `${zone}:${type}` → { zone, type, value, timestamp }
     */
    this.commandQueue = new Map();

    /** Accumulator for incoming binary chunks */
    this._buffer = Buffer.alloc(0);

    /** Reconnection backoff delay (resets on success) */
    this._backoffDelay = INITIAL_BACKOFF_MS;

    /** Heartbeat interval handle */
    this._heartbeatTimer = null;

    /** Reconnect timeout handle */
    this._reconnectTimer = null;

    /** Pending verify-after-set timer */
    this._verifyTimer = null;

    /** Auth timeout handle */
    this._authTimer = null;

    /** Whether a heartbeat response is pending */
    this._heartbeatPending = false;

    /** Destroy guard — stops all timers and prevents reconnect */
    this._destroyed = false;

    /** Last MIDI running status byte (for running status parsing) */
    this._runningStatus = null;

    /** Track whether we've ever successfully connected */
    this._hasConnectedOnce = false;
  }

  // ── Connection Lifecycle ─────────────────────────────────────────────────────

  /**
   * Open TLS connection to AHM-32.
   * Sends authentication profile,password on connect.
   * Waits for "AuthOK" before emitting 'connected'.
   */
  connect() {
    if (this.socket) {
      this.disconnect();
    }

    this._destroyed = false;

    try {
      this.socket = tls.connect({
        host: this.config.host,
        port: this.config.port,
        rejectUnauthorized: false, // Self-signed cert on LAN
      });

      this.socket.on("connect", () => {
        console.log(
          `[AhmBridge] TCP connected to ${this.config.host}:${this.config.port}`,
        );
        this._authenticate();
      });

      this.socket.on("data", (data) => {
        this._processData(data);
      });

      this.socket.on("close", (hadError) => {
        console.log(
          `[AhmBridge] Connection closed (hadError: ${hadError})`,
        );
        this._handleDisconnect();
      });

      this.socket.on("error", (err) => {
        console.error(`[AhmBridge] Socket error:`, err.message);
        // 'error' is followed by 'close', so _handleDisconnect runs from there
        this.emit("error", err);
      });
    } catch (err) {
      console.error(`[AhmBridge] Connection failed:`, err.message);
      this.emit("error", err);
      this._scheduleReconnect();
    }
  }

  /**
   * Disconnect the TLS socket and clean up timers.
   */
  disconnect() {
    this._destroyed = true;
    this.connected = false;
    this._clearTimers();
    this._buffer = Buffer.alloc(0);
    this._runningStatus = null;

    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {
        // already destroyed
      }
      this.socket = null;
    }

    this.emit("disconnected");
  }

  /**
   * Force reconnection now (reset backoff delay).
   */
  reconnect() {
    this._backoffDelay = INITIAL_BACKOFF_MS;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this.disconnect();
    this._destroyed = false;
    this.connect();
  }

  // ── Commands ─────────────────────────────────────────────────────────────────

  /**
   * Set zone level (dB).
   * Sends NRPN command, then schedules a getLevel verification.
   *
   * @param {number} zone — 0=Norte, 1=Centro, 2=Sur
   * @param {number} db — dB value (-100 to +10, clamped by midi-commands)
   */
  setLevel(zone, db) {
    if (!this.connected) {
      this._queueCommand({ zone, type: "setLevel", value: db });
      return;
    }

    const clampedDb = Math.max(-100, Math.min(10, db));
    const msg = midi.setZoneLevel(zone, clampedDb);
    this.send(msg);

    // Schedule verification
    this._scheduleVerify(zone, "level");
  }

  /**
   * Set zone mute state.
   * Sends Note On message, then schedules a getMute verification.
   *
   * @param {number} zone — 0=Norte, 1=Centro, 2=Sur
   * @param {boolean} muted
   */
  setMute(zone, muted) {
    if (!this.connected) {
      this._queueCommand({ zone, type: "setMute", value: muted });
      return;
    }

    const msg = midi.setZoneMute(zone, muted);
    this.send(msg);

    // Schedule verification
    this._scheduleVerify(zone, "mute");
  }

  /**
   * Write raw bytes to the TLS socket.
   * @param {Buffer} buffer
   */
  send(buffer) {
    if (this.socket && this.connected) {
      try {
        this.socket.write(buffer);
      } catch (err) {
        console.error(`[AhmBridge] Send error:`, err.message);
      }
    }
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────────

  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      if (!this.connected || this._heartbeatPending) return;

      this._heartbeatPending = true;
      const msg = midi.getZoneMute(0); // Query zone 0 (Norte) as keepalive
      this.send(msg);

      // Force reconnect if no response within timeout
      setTimeout(() => {
        if (this._heartbeatPending) {
          console.error(
            `[AhmBridge] Heartbeat timeout — forcing reconnect`,
          );
          this.emit("error", new Error("Heartbeat timeout"));
          this._heartbeatPending = false;
          this.disconnect();
          this._destroyed = false;
          this._scheduleReconnect();
        }
      }, HEARTBEAT_TIMEOUT_MS);
    }, HEARTBEAT_INTERVAL_MS);
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    this._heartbeatPending = false;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────────

  _authenticate() {
    const authString = `${this.config.profile},${this.config.password}\n`;
    try {
      this.socket.write(authString);
    } catch (err) {
      console.error(`[AhmBridge] Auth send failed:`, err.message);
      return;
    }
    console.log(`[AhmBridge] Auth sent for profile ${this.config.profile}`);

    // Auth timeout
    this._authTimer = setTimeout(() => {
      if (!this.connected) {
        console.error(`[AhmBridge] Auth timeout — no AuthOK received`);
        this.emit("error", new Error("AHM auth timeout"));
        try {
          this.socket.destroy();
        } catch {
          // already destroyed
        }
      }
    }, AUTH_TIMEOUT_MS);
  }

  // ── Data Processing ───────────────────────────────────────────────────────────

  _processData(data) {
    this._buffer = Buffer.concat([this._buffer, data]);

    // Before auth, check for "AuthOK" as ASCII text
    if (!this.connected) {
      if (this._checkAuthResponse()) {
        return; // Auth completed, MIDI parsing starts on next data
      }
    }

    // After auth (or auth already done), parse MIDI
    this._parseMidiBuffer();
  }

  /**
   * Check the buffer for the "AuthOK" auth response string.
   * If found, emit 'connected' and clear the buffer for MIDI parsing.
   * @returns {boolean} true if auth succeeded
   */
  _checkAuthResponse() {
    const text = this._buffer.toString("ascii");

    if (text.includes("AuthOK")) {
      this.connected = true;
      this._hasConnectedOnce = true;
      this._backoffDelay = INITIAL_BACKOFF_MS;

      clearTimeout(this._authTimer);
      this._authTimer = null;

      console.log(`[AhmBridge] Authenticated successfully`);

      // Clear buffer after auth — any bytes before AuthOK are auth protocol, not MIDI
      this._buffer = Buffer.alloc(0);
      this._runningStatus = null;

      this._startHeartbeat();
      this._flushCommandQueue();

      // Query initial state for all zones
      this._queryInitialState();

      this.emit("connected");
      return true;
    }

    // If we see enough bytes but no AuthOK, auth likely failed
    if (this._buffer.length > 50 && !text.includes("AuthOK")) {
      console.error(
        `[AhmBridge] Auth rejected — unexpected response:`,
        text.trim(),
      );
      this.emit("error", new Error("AHM auth rejected"));
      try {
        this.socket.destroy();
      } catch {
        // already destroyed
      }
    }

    return false;
  }

  /**
   * Parse MIDI messages from the accumulation buffer.
   * Handles: SysEx (F0…F7), Note On/Off, Control Change, running status.
   */
  _parseMidiBuffer() {
    let offset = 0;

    while (offset < this._buffer.length) {
      const byte = this._buffer[offset];

      // --- SysEx (F0 … F7) ---
      if (byte === 0xF0) {
        const endIdx = this._buffer.indexOf(0xF7, offset);
        if (endIdx === -1) break; // Incomplete SysEx — wait for more data
        const sysExMsg = this._buffer.slice(offset, endIdx + 1);
        this._handleSysEx(sysExMsg);
        offset = endIdx + 1;
        this._runningStatus = null;
        continue;
      }

      // --- Real-time messages (F8-FF) — skip ---
      if (byte >= 0xF8) {
        offset++;
        continue;
      }

      // --- Status byte ---
      if (byte & 0x80) {
        this._runningStatus = byte;
        offset++;
        continue;
      }

      // --- Data byte with running status ---
      if (this._runningStatus !== null) {
        const statusHigh = this._runningStatus & 0xF0;
        const dataByte1 = byte;

        // Messages with 2 data bytes: Note On/Off (0x90), Control Change (0xB0), Pitch Bend (0xE0)
        if (
          statusHigh === 0x90 ||
          statusHigh === 0xB0 ||
          statusHigh === 0xE0
        ) {
          if (offset + 1 >= this._buffer.length) break; // Wait for more data
          const dataByte2 = this._buffer[offset + 1];
          if (dataByte2 & 0x80) {
            // Next byte is a status, not data — skip this data byte as malformed
            offset++;
            continue;
          }
          this._handleChannelMessage(
            this._runningStatus,
            dataByte1,
            dataByte2,
          );
          offset += 2;
          if (this._heartbeatPending && dataByte1 === 0x09 && dataByte2 === 0x00) {
            // This might be a heartbeat response — mark received
            // (Heuristic: check after parsing)
          }
          continue;
        }

        // Messages with 1 data byte: Program Change (0xC0), Channel Pressure (0xD0)
        if (statusHigh === 0xC0 || statusHigh === 0xD0) {
          this._handleChannelMessage(this._runningStatus, dataByte1, 0);
          offset += 1;
          continue;
        }

        // Unknown status — skip the data byte
        offset++;
        continue;
      }

      // Can't parse — skip
      offset++;
    }

    // Keep unparsed bytes in the buffer for the next data event
    if (offset > 0) {
      this._buffer = this._buffer.slice(offset);
    }
  }

  /**
   * Handle a complete channel voice message.
   * @param {number} status — Status byte (0x80-0xEF)
   * @param {number} data1 — First data byte
   * @param {number} data2 — Second data byte (0 for 1-byte messages)
   */
  _handleChannelMessage(status, data1, data2) {
    const statusHigh = status & 0xF0;
    const channel = status & 0x0f;

    // Note On — used for mute state
    if (statusHigh === 0x90) {
      // Note On with velocity 0 = Note Off
      const isNoteOff = data2 === 0;
      const zone = data1; // data1 = note number = zone channel

      if (zone >= 0 && zone <= 2) {
        if (!isNoteOff) {
          // First message of a mute pair: velocity > 0x40 = muted
          const muted = data2 > 0x40;
          this._updateZoneState(zone, { muted });
        }
        // Note Off (velocity=0) is the second half of the pair — ignore for state
      }
      return;
    }

    // Control Change — might carry level data via NRPN
    if (statusHigh === 0xB0) {
      // NRPN data entry MSB (controller 6) — this completes an NRPN sequence
      if (data1 === 0x06 && data2 >= 0x00 && data2 <= 0x7F) {
        // We need to track which zone this NRPN belongs to
        // For now, we rely on SysEx responses for level updates since NRPN
        // responses don't carry explicit zone information in standard MIDI
      }
      return;
    }

    // Log unexpected messages in debug
    if (process.env.NODE_ENV === "development" || process.env.DEBUG) {
      console.log(
        `[AhmBridge] Unhandled MIDI: status=0x${status.toString(16)} ch=${channel} d1=0x${data1.toString(16)} d2=0x${data2.toString(16)}`,
      );
    }
  }

  /**
   * Handle a complete SysEx message (F0…F7).
   * Parses known AHM response formats and updates zone state.
   *
   * Expected response formats:
   *   Level query response: F0 00 00 1A 50 12 01 00 01 01 0B 17 ch LV F7
   *   Mute query response:  F0 00 00 1A 50 12 01 00 01 01 09 ch M F7
   *     where LV = level MIDI value (0x00..0x7F)
   *     and M = 0x7F (muted) or 0x3F (unmuted)
   *
   * @param {Buffer} msg — Complete SysEx message (including F0 and F7)
   */
  _handleSysEx(msg) {
    const len = msg.length;

    // Minimum valid SysEx: header (8) + 01 01 + cmd + ... + F7 = 12+ bytes
    if (len < 12) return;

    // Verify manufacturer header matches
    const header = msg.slice(0, 8);
    if (!header.equals(midi.SYSEX_HEADER)) return;

    const cmdByte1 = msg[8]; // Should be 0x01
    const cmdByte2 = msg[9]; // Should be 0x01
    if (cmdByte1 !== 0x01 || cmdByte2 !== 0x01) return;

    const queryType = msg[10];

    // Level query response: ... 01 01 0B 17 ch LV F7  (length = 14)
    if (queryType === 0x0B && len >= 14) {
      const nrpnParam = msg[11];
      if (nrpnParam !== midi.NRPN_LEVEL) return;
      const zone = msg[12];
      const midiValue = msg[13];
      const db = midi.midiValueToDb(midiValue);

      if (zone >= 0 && zone <= 2) {
        this._updateZoneState(zone, { level: db });
      }
      return;
    }

    // Mute query response: ... 01 01 09 ch M F7  (length = 12)
    if (queryType === 0x09 && len >= 12) {
      const zone = msg[11];
      const muteValue = msg[12];
      const muted = muteValue > 0x40;

      if (zone >= 0 && zone <= 2) {
        this._updateZoneState(zone, { muted });
      }
      return;
    }

    // Unknown SysEx — log in debug
    if (process.env.DEBUG) {
      console.log(
        `[AhmBridge] Unknown SysEx (len=${len}): ${msg.toString("hex")}`,
      );
    }
  }

  // ── Zone State ────────────────────────────────────────────────────────────────

  /**
   * Update zone state and emit 'state' if anything changed.
   * @param {number} zone — 0, 1, or 2
   * @param {object} partial — Partial state { level?, muted? }
   */
  _updateZoneState(zone, partial) {
    const current = this.lastState.zones[zone];
    if (!current) return;

    let changed = false;
    if (partial.level !== undefined && partial.level !== current.level) {
      current.level = partial.level;
      changed = true;
    }
    if (partial.muted !== undefined && partial.muted !== current.muted) {
      current.muted = partial.muted;
      changed = true;
    }

    if (changed) {
      // Mark heartbeat as received (any state change means AHM is alive)
      this._heartbeatPending = false;
      this.emit("state", { zones: { ...this.lastState.zones } });
    }
  }

  /**
   * Query initial state for all zones after connecting.
   * Sends getMute for all 3 zones and getLevel for all 3 zones.
   */
  _queryInitialState() {
    for (let zone = 0; zone <= 2; zone++) {
      this.send(midi.getZoneMute(zone));
      this.send(midi.getZoneLevel(zone));
    }
  }

  // ── Verification After Set ────────────────────────────────────────────────────

  /**
   * Schedule a verification query after setting a value.
   * Uses a short delay to let the AHM process the command.
   * @param {number} zone
   * @param {'level'|'mute'} type
   */
  _scheduleVerify(zone, type) {
    // Clear any existing verify timer (debounce rapid changes)
    if (this._verifyTimer) {
      clearTimeout(this._verifyTimer);
    }

    this._verifyTimer = setTimeout(() => {
      if (!this.connected) return;

      if (type === "level") {
        this.send(midi.getZoneLevel(zone));
      } else {
        this.send(midi.getZoneMute(zone));
      }
      this._verifyTimer = null;
    }, VERIFY_DELAY_MS);
  }

  // ── Command Queue ─────────────────────────────────────────────────────────────

  /**
   * Queue a command to send when reconnected.
   * Deduplicates by zone+type (only the latest value is kept).
   * @param {{ zone: number, type: string, value: any }} cmd
   */
  _queueCommand(cmd) {
    const key = `${cmd.zone}:${cmd.type}`;
    this.commandQueue.set(key, { ...cmd, timestamp: Date.now() });
    console.log(`[AhmBridge] Queued ${cmd.type} for zone ${cmd.zone}`);
  }

  /**
   * Flush the command queue — send all queued commands.
   * Called after reconnect+auth.
   */
  _flushCommandQueue() {
    if (this.commandQueue.size === 0) return;

    console.log(
      `[AhmBridge] Flushing ${this.commandQueue.size} queued command(s)`,
    );

    for (const [, cmd] of this.commandQueue) {
      if (cmd.type === "setLevel") {
        this.setLevel(cmd.zone, cmd.value);
      } else if (cmd.type === "setMute") {
        this.setMute(cmd.zone, cmd.value);
      }
    }

    this.commandQueue.clear();
  }

  // ── Reconnection ──────────────────────────────────────────────────────────────

  _handleDisconnect() {
    this.connected = false;
    this._stopHeartbeat();
    this._buffer = Buffer.alloc(0);
    this._runningStatus = null;

    if (this._verifyTimer) {
      clearTimeout(this._verifyTimer);
      this._verifyTimer = null;
    }

    this.emit("disconnected");

    if (!this._destroyed) {
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this._destroyed) return;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
    }

    const delay = this._backoffDelay;
    console.log(`[AhmBridge] Reconnecting in ${delay}ms...`);

    this._reconnectTimer = setTimeout(() => {
      if (this._destroyed) return;
      this._reconnectTimer = null;
      this.connect();
    }, delay);

    // Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (max)
    this._backoffDelay = Math.min(
      this._backoffDelay * 2,
      MAX_BACKOFF_MS,
    );
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  _clearTimers() {
    this._stopHeartbeat();

    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    if (this._verifyTimer) {
      clearTimeout(this._verifyTimer);
      this._verifyTimer = null;
    }

    if (this._authTimer) {
      clearTimeout(this._authTimer);
      this._authTimer = null;
    }
  }
}

// ── Singleton Accessor ─────────────────────────────────────────────────────────

let instance = null;

/**
 * Get the singleton AhmBridge instance.
 * Creates it on first call with the provided or env-based config.
 * @param {object} [config] — Optional config override for first creation
 * @returns {AhmBridge}
 */
function getAhmBridge(config) {
  if (!instance) {
    instance = new AhmBridge(config);
  }
  return instance;
}

// ── Exports ─────────────────────────────────────────────────────────────────────

module.exports = { AhmBridge, getAhmBridge };
