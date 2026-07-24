/**
 * ahmApi.js
 * Native WebSocket client for AHM-32 Audio Matrix Processor.
 *
 * Provides a stable API for browser ↔ Express WebSocket communication.
 * Auto-reconnects on connection loss (2s delay, linear).
 * Feature-flag guarded: only connects if VITE_AHM_ENABLED === 'true'.
 *
 * Usage:
 *   import * as ahmApi from "../api/ahmApi";
 *   ahmApi.connect();
 *   ahmApi.onState((zones) => { ... });
 *   ahmApi.setZoneLevel(0, -5);   // Norte = zone 0
 *   ahmApi.setZoneMute(1, true);  // Centro = mute on
 */

// ── Constants ──────────────────────────────────────────────────────────────────

const WS_RECONNECT_DELAY_MS = 2000;

// ── State ──────────────────────────────────────────────────────────────────────

/** @type {WebSocket|null} */
let ws = null;

/** @type {boolean} */
let enabled = false;

/** @type {number|null} */
let reconnectTimer = null;

/** @type {boolean} */
let intentionalClose = false;

/** @type {Array<function>} */
const stateListeners = [];

/** @type {Array<function>} */
const connectionListeners = [];

// ── Feature Flag ───────────────────────────────────────────────────────────────

/**
 * Check whether AHM integration is enabled via environment variable.
 * @returns {boolean}
 */
function isEnabled() {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.VITE_AHM_ENABLED === "true";
  }
  return false;
}

// ── Connection Lifecycle ───────────────────────────────────────────────────────

/**
 * Connect to the AHM WebSocket bridge.
 * No-op if VITE_AHM_ENABLED is not 'true' or already connected/connecting.
 */
function connect() {
  if (!isEnabled()) {
    enabled = false;
    return;
  }

  enabled = true;

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return; // Already connected or connecting
  }

  intentionalClose = false;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${protocol}//${window.location.host}/ws/ahm`;

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("[ahmApi] WebSocket connected");
      notifyConnectionListeners("connected");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch (err) {
        console.warn("[ahmApi] Failed to parse message:", err);
      }
    };

    ws.onclose = (event) => {
      console.log(`[ahmApi] WebSocket closed (code: ${event.code})`);
      ws = null;

      if (!intentionalClose) {
        notifyConnectionListeners("disconnected");
        scheduleReconnect();
      } else {
        notifyConnectionListeners("disconnected");
      }
    };

    ws.onerror = (err) => {
      console.error("[ahmApi] WebSocket error:", err);
      // 'onclose' will fire after this
    };
  } catch (err) {
    console.error("[ahmApi] Failed to create WebSocket:", err);
    scheduleReconnect();
  }
}

/**
 * Disconnect the WebSocket.
 * Does NOT reconnect until connect() is called again.
 */
function disconnect() {
  intentionalClose = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (ws) {
    try {
      ws.close();
    } catch {
      // already closed
    }
    ws = null;
  }

  notifyConnectionListeners("disconnected");
}

/**
 * Schedule automatic reconnection.
 */
function scheduleReconnect() {
  if (reconnectTimer) return; // Already scheduled

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    if (!intentionalClose && enabled) {
      console.log("[ahmApi] Reconnecting...");
      notifyConnectionListeners("reconnecting");
      connect();
    }
  }, WS_RECONNECT_DELAY_MS);
}

// ── Message Handling ───────────────────────────────────────────────────────────

/**
 * Handle an incoming parsed message from the WebSocket.
 * @param {object} msg — Parsed JSON message
 */
function handleMessage(msg) {
  switch (msg.type) {
    case "state":
      notifyStateListeners(msg.zones);
      break;

    case "connection":
      notifyConnectionListeners(msg.status);
      break;

    case "error":
      console.warn("[ahmApi] Server error:", msg.message);
      break;

    default:
      console.warn("[ahmApi] Unknown message type:", msg.type);
  }
}

// ── Commands ───────────────────────────────────────────────────────────────────

/**
 * Send a command to the AHM WebSocket bridge.
 * @param {object} msg — JSON-serializable command object
 */
function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  } else {
    console.warn("[ahmApi] Cannot send — WebSocket not connected");
  }
}

/**
 * Set zone level via AHM-32.
 * @param {number} zone — 0=Norte, 1=Centro, 2=Sur
 * @param {number} db — dB value (-100 to +10)
 */
function setZoneLevel(zone, db) {
  send({ type: "setLevel", zone, value: db });
}

/**
 * Set zone mute state via AHM-32.
 * @param {number} zone — 0=Norte, 1=Centro, 2=Sur
 * @param {boolean} muted
 */
function setZoneMute(zone, muted) {
  send({ type: "setMute", zone, value: muted });
}

// ── Listeners ──────────────────────────────────────────────────────────────────

/**
 * Register a callback for zone state updates.
 * @param {function} cb — Called with zones object: { 0: {level, muted}, ... }
 * @returns {function} Unsubscribe function
 */
function onState(cb) {
  stateListeners.push(cb);
  return () => {
    const idx = stateListeners.indexOf(cb);
    if (idx >= 0) stateListeners.splice(idx, 1);
  };
}

/**
 * Register a callback for connection status changes.
 * @param {function} cb — Called with status string: "connected" | "disconnected" | "reconnecting"
 * @returns {function} Unsubscribe function
 */
function onConnection(cb) {
  connectionListeners.push(cb);
  return () => {
    const idx = connectionListeners.indexOf(cb);
    if (idx >= 0) connectionListeners.splice(idx, 1);
  };
}

// ── Internal Notification ──────────────────────────────────────────────────────

function notifyStateListeners(zones) {
  stateListeners.forEach((cb) => {
    try {
      cb(zones);
    } catch (err) {
      console.warn("[ahmApi] State listener error:", err);
    }
  });
}

function notifyConnectionListeners(status) {
  connectionListeners.forEach((cb) => {
    try {
      cb(status);
    } catch (err) {
      console.warn("[ahmApi] Connection listener error:", err);
    }
  });
}

// ── Exports ────────────────────────────────────────────────────────────────────

export {
  connect,
  disconnect,
  setZoneLevel,
  setZoneMute,
  onState,
  onConnection,
  isEnabled,
};
