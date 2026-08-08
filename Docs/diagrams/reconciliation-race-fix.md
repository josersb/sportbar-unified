# Condición de Carrera: Reconciliación vs Polling — Fix

```mermaid
flowchart TD
    T1["🏷️ Condición de Carrera: Reconciliación vs Polling — Fix"]
    T2["SportBar Unified — ¿Por qué el estado reconciliado se perdía a los pocos segundos?"]

    ARRANGER["📡 Arranger IPEX5000<br/>Firmware v1.3.4<br/>192.168.2.254<br/>(get encoder ×40)"]
    EXPRESS["🖥️ Express Server<br/>/api/matrix/state<br/>Devuelve video + audio<br/>(40 destinos c/u)"]
    HOOK["🪝 useArrangerReconciliation<br/>fetchMatrixState() ×2<br/>buildDiffs()<br/>Compara 5 dominios"]

    BATCH["⚡ Batch Apply Effect<br/>useEffect(status === 'done')<br/>setEstado(tvs)<br/>setZonasFueraState()<br/>setTvrackState()"]
    CONTEXTO["📦 ContextoUser Provider<br/>estado.tvs<br/>zonasFueraState<br/>tvrackState<br/>→ re-render de consumidores"]

    FIX1["🔧 FIX 1: Persistir al server<br/><br/>fire-and-forget POST:<br/>✅ /api/zonas-fuera/:id/video<br/>✅ /api/zonas-fuera/:id/audio<br/>✅ /api/tvrack/video + audio"]
    SERVER["💾 Express lowdb — state.json<br/><br/>Ahora tiene los datos<br/>reconciliados ✅<br/>(antes tenía datos viejos ❌)"]
    POLLING["🔄 Polling — cada 5 segundos<br/>fetchZonasFueraState()<br/>fetch /api/state<br/>fetch /api/tvrack/state<br/>(para multi-PC sync)"]

    FIX2["🔧 FIX 2: reconciledRef<br/>useRef(false)<br/>bloquea el polling<br/>por 2 segundos<br/>(ventana de carrera)"]
    ASIDE["🖼️ Aside + Botones<br/>ZonasFueraStatus<br/>VideoMatrix<br/>Botones de zonas fuera"]

    RACE["❌ ANTES DEL FIX: el polling obtenía datos VIEJOS del server<br/>y pisaba el estado que la reconciliación acababa de corregir"]

    ARRANGER -->|"get encoder ×40<br/>(~12s video + ~12s audio)"| EXPRESS
    EXPRESS -->|"{ state: { TV01: 'DTV1', ... } }"| HOOK
    HOOK -->|"diffs[] — 5 dominios"| BATCH
    BATCH -->|"setEstado + setZonasFuera<br/>+ setTvrackState"| CONTEXTO
    CONTEXTO -->|"React re-render<br/>→ UI actualizada"| ASIDE

    BATCH -.->|"dispara persistencia<br/>fire-and-forget"| FIX1
    FIX1 -->|"POST /api/zonas-fuera/*<br/>POST /api/tvrack/*"| SERVER
    FIX1 -->|"reconciledRef = true"| FIX2
    SERVER -->|"GET → datos<br/>actualizados ✅"| POLLING
    POLLING -.->|"JSON compare:<br/>sin cambios<br/>→ no pisa el estado"| CONTEXTO
    FIX2 -.->|"reconciledRef<br/>bloquea el polling<br/>por 2 segundos"| POLLING

    style ARRANGER fill:#d0bfff,stroke:#7950f2
    style EXPRESS fill:#a5d8ff,stroke:#339af0
    style HOOK fill:#a5d8ff,stroke:#339af0
    style BATCH fill:#b2f2bb,stroke:#2f9e44
    style CONTEXTO fill:#b2f2bb,stroke:#2f9e44
    style FIX1 fill:#b2f2bb,stroke:#2f9e44,stroke-width:3px
    style SERVER fill:#99e9f2,stroke:#1098ad
    style POLLING fill:#ffec99,stroke:#f59f00
    style FIX2 fill:#b2f2bb,stroke:#2f9e44,stroke-width:3px
    style ASIDE fill:#e9ecef,stroke:#868e96
    style RACE fill:#fff5f5,stroke:#e03131,stroke-width:2px,color:#c92a2a
```

---

## Explicación

### ❌ El problema (antes del fix)

1. La reconciliación consulta al Arranger y encuentra diferencias con el estado de la app
2. El **Batch Apply Effect** actualiza `zonasFueraState` y `tvrackState` en memoria React
3. **Pero nunca persiste esos cambios al servidor Express**
4. El **Polling** (cada 5 segundos) consulta `fetchZonasFueraState()` al servidor
5. El servidor todavía tiene los **datos viejos** (nadie le avisó del cambio)
6. El polling aplica los datos viejos → **PISA el estado reconciliado** ❌

**Resultado**: el Aside y los botones mostraban el estado correcto por ~5 segundos, luego volvían al estado viejo.

### ✅ La solución (2 fixes)

**FIX 1 — Persistir al server**: después de actualizar el estado en memoria, el batch apply hace POSTs fire-and-forget a:
- `/api/zonas-fuera/:id/video` y `/api/zonas-fuera/:id/audio` (por cada zona cambiada)
- `/api/tvrack/video` y `/api/tvrack/audio`

**FIX 2 — Flag de protección**: `reconciledRef` (useRef) bloquea los 3 efectos de polling durante 2 segundos. Esto previene la carrera entre el POST (todavía en vuelo) y el siguiente GET del polling.

### Secuencia corregida

1. Batch apply → `setZonasFueraState(nuevo)` ✅
2. Batch apply → POST al server (persiste) 🔧
3. `reconciledRef = true` → polling bloqueado 2s 🔧
4. 2s después → `reconciledRef = false`
5. Polling → GET → datos actualizados ✅ → `JSON.compare` coincide → **no pisa**
