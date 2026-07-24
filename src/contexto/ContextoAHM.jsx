/**
 * ContextoAHM.jsx
 * React Context + Hooks for AHM-32 Audio Matrix state.
 *
 * Provides:
 *   - AhmProvider: wraps children, manages WebSocket lifecycle
 *   - useAhm(): full state access (zones + connected flag)
 *   - useAhmZone(zoneNumber): per-zone controls (1=Norte, 2=Centro, 3=Sur)
 *   - useAhmConnection(): connection status + reconnect action
 *
 * Zone mapping:
 *   User-facing zone 1 → WS/MIDI zone 0 → Norte
 *   User-facing zone 2 → WS/MIDI zone 1 → Centro
 *   User-facing zone 3 → WS/MIDI zone 2 → Sur
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as ahmApi from "../api/ahmApi";

// ── Context ────────────────────────────────────────────────────────────────────

const AhmContext = createContext(null);

// ── Zone Name Mapping ──────────────────────────────────────────────────────────

const ZONE_MAP = {
  1: { wsZone: 0, name: "norte", label: "Norte" },
  2: { wsZone: 1, name: "centro", label: "Centro" },
  3: { wsZone: 2, name: "sur", label: "Sur" },
};

/**
 * Convert user-facing zone number (1-3) to WebSocket zone number (0-2).
 * @param {number} zoneNumber — 1, 2, or 3
 * @returns {number} WS zone 0, 1, or 2
 */
function toWsZone(zoneNumber) {
  return zoneNumber - 1;
}

/**
 * Get zone key name for internal state.
 * @param {number} zoneNumber — 1, 2, or 3
 * @returns {string} zone key ("norte", "centro", "sur")
 */
function getZoneKey(zoneNumber) {
  const mapping = ZONE_MAP[zoneNumber];
  return mapping ? mapping.name : null;
}

// ── Initial State ──────────────────────────────────────────────────────────────

const INITIAL_ZONE = { level: -99, muted: false };

const INITIAL_STATE = {
  connected: false,
  zones: {
    norte: { ...INITIAL_ZONE },
    centro: { ...INITIAL_ZONE },
    sur: { ...INITIAL_ZONE },
  },
};

// ── Provider ───────────────────────────────────────────────────────────────────

/**
 * Provider component for AHM audio state.
 * Wraps children and manages WebSocket connection lifecycle.
 * Only connects if VITE_AHM_ENABLED === 'true'.
 */
function AhmProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);
  const unsubRef = useRef([]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (!ahmApi.isEnabled()) {
      console.log("[ContextoAHM] AHM feature disabled — provider inactive");
      return;
    }

    // Subscribe to state updates — only update zones that changed
    const unsubState = ahmApi.onState((zones) => {
      setState((prev) => {
        // zones from WS: { 0: {level, muted}, 1: {level, muted}, 2: {level, muted} }
        const newZones = { ...prev.zones };
        let changed = false;

        // Map WS zones (0=->norte, 1=->centro, 2=->sur)
        const mapping = [
          { wsKey: 0, localKey: "norte" },
          { wsKey: 1, localKey: "centro" },
          { wsKey: 2, localKey: "sur" },
        ];

        for (const { wsKey, localKey } of mapping) {
          const wsZone = zones[wsKey];
          if (!wsZone) continue;

          const current = newZones[localKey];
          if (
            wsZone.level !== undefined &&
            wsZone.level !== current.level
          ) {
            newZones[localKey] = { ...current, level: wsZone.level };
            changed = true;
          }
          if (
            wsZone.muted !== undefined &&
            wsZone.muted !== current.muted
          ) {
            newZones[localKey] = { ...current, muted: wsZone.muted };
            changed = true;
          }
        }

        return changed ? { ...prev, zones: newZones } : prev;
      });
    });

    // Subscribe to connection updates
    const unsubConn = ahmApi.onConnection((status) => {
      setState((prev) => ({
        ...prev,
        connected: status === "connected",
      }));
    });

    unsubRef.current = [unsubState, unsubConn];

    // Connect
    ahmApi.connect();

    // Cleanup on unmount
    return () => {
      unsubRef.current.forEach((fn) => fn());
      unsubRef.current = [];
      ahmApi.disconnect();
      setState(INITIAL_STATE);
    };
  }, []);

  // Stable action references
  const setLevel = useCallback((zoneNumber, db) => {
    const wsZone = toWsZone(zoneNumber);
    ahmApi.setZoneLevel(wsZone, db);
  }, []);

  const setMute = useCallback((zoneNumber, muted) => {
    const wsZone = toWsZone(zoneNumber);
    ahmApi.setZoneMute(wsZone, muted);
  }, []);

  const reconnect = useCallback(() => {
    ahmApi.disconnect();
    ahmApi.connect();
  }, []);

  // Memoized context value
  const contextValue = useMemo(
    () => ({
      state,
      setLevel,
      setMute,
      reconnect,
    }),
    [state, setLevel, setMute, reconnect],
  );

  return <AhmContext.Provider value={contextValue}>{children}</AhmContext.Provider>;
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

/**
 * Access the full AHM context.
 * Returns { state: { connected, zones: { norte, centro, sur } }, setLevel, setMute, reconnect }
 */
function useAhm() {
  const ctx = useContext(AhmContext);
  if (!ctx) {
    // Return defaults when no provider (safe fallback)
    return {
      state: INITIAL_STATE,
      setLevel: () => {},
      setMute: () => {},
      reconnect: () => {},
    };
  }
  return ctx;
}

/**
 * Access state and controls for a specific audio zone.
 * @param {number} zoneNumber — 1=Norte, 2=Centro, 3=Sur
 * @returns {{ level: number, muted: boolean, setLevel: function, setMute: function, connected: boolean }}
 */
function useAhmZone(zoneNumber) {
  const ctx = useContext(AhmContext);
  const zoneKey = getZoneKey(zoneNumber);

  if (!ctx || !zoneKey) {
    return {
      level: INITIAL_ZONE.level,
      muted: INITIAL_ZONE.muted,
      setLevel: () => {},
      setMute: () => {},
      connected: false,
    };
  }

  const zone = ctx.state.zones[zoneKey] || INITIAL_ZONE;

  return {
    level: zone.level,
    muted: zone.muted,
    setLevel: (db) => ctx.setLevel(zoneNumber, db),
    setMute: (muted) => ctx.setMute(zoneNumber, muted),
    connected: ctx.state.connected,
  };
}

/**
 * Access connection status and reconnect action.
 * @returns {{ connected: boolean, reconnect: function }}
 */
function useAhmConnection() {
  const ctx = useContext(AhmContext);

  if (!ctx) {
    return { connected: false, reconnect: () => {} };
  }

  return {
    connected: ctx.state.connected,
    reconnect: ctx.reconnect,
  };
}

// ── Exports ────────────────────────────────────────────────────────────────────

export { AhmProvider, useAhm, useAhmZone, useAhmConnection };
