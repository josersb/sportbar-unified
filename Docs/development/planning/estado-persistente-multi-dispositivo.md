# Plan: Estado Persistente Multi-Dispositivo

**Fecha**: 25 jul 2026 | **Estado**: Planificación | **Prioridad**: Alta

---

## Diagnóstico

### Situación actual

| Aspecto | Estado | Problema |
|---|---|---|
| Carga inicial | GET /api/state → localStorage fallback → default | ✅ Funciona |
| Guardado | localStorage + POST /api/state (fire-and-forget) | ✅ Funciona |
| Sincro multi-PC | **No existe** | PC-2 no ve cambios de PC-1 sin refrescar |
| TVRACK | GET/POST /api/tvrack/* independiente | ⚠️ Conflicto con `estado.tvs.TVRACK` |
| Presets | Solo localStorage | ❌ No compartidos entre PCs |
| Tema | Solo localStorage | ❌ No compartido |

### Escenario real del bar

```
PC-1 (barra principal)      PC-2 (oficina/rack)
     │                            │
     ├── misma red 192.168.2.x ──┤
     │                            │
     ▼                            ▼
  Express :3101 ◄────────────── Express :3101
     │
     ▼
  state.json (lowdb)
```

**Problema**: Si el operador en PC-1 cambia la matriz y guarda, PC-2 sigue viendo el estado viejo hasta que refresque manualmente.

---

## Solución propuesta: Polling + unificación TVRACK

### Fase 1 — Unificar TVRACK en el estado global 🔴

**Objetivo**: Eliminar el conflicto `estado.tvs.TVRACK` vs `/api/tvrack/state`.

**Qué cambia**:
- `estado.tvs.TVRACK` deja de existir como valor estático. Se reemplaza por una referencia al estado real del TVRACK.
- `GET /api/tvrack/state` se sigue usando, pero el resultado se integra directamente en el contexto global.
- `setTvrackVideo()` y `setTvrackAudio()` actualizan el estado global además del state store.

**Archivos**: `App.jsx` (nuevo handler), `MatrizVideo.jsx` (simplificar), `server/server.js` (sin cambios).

### Fase 2 — Agregar polling para sincronización multi-PC 🔴

**Objetivo**: PC-2 ve los cambios de PC-1 sin refrescar.

**Qué cambia**:
- `App.jsx` agrega un `setInterval` que hace `GET /api/state` cada N segundos.
- Si el estado del servidor cambió (comparar `lastUpdated` o hash), actualizar el contexto.
- Solo durante idle (no mientras el usuario está editando activamente).

**Intervalo propuesto**: 5 segundos (configurable). Es solo un GET al Express local, no al Arranger — latencia mínima.

**Archivos**: `App.jsx` (~20 líneas).

### Fase 3 — Presets al servidor 🟡

**Objetivo**: Presets compartidos entre PCs.

**Qué cambia**:
- Agregar endpoints `GET /api/presets` y `POST /api/presets/:n` en Express.
- Extender schema de lowdb: `presets: { preset1: {...}, ...preset5: {...} }`.
- `usePreset(n).save()` → `POST /api/presets/:n`.
- `usePreset(n).load()` → intentar servidor primero, localStorage fallback.

**Archivos**: `server/server.js`, `src/hooks/usePreset.js`, `src/App.jsx`.

### Fase 4 — Tema al servidor (opcional) 🟢

**Objetivo**: Tema dark/light consistente entre PCs.

**Qué cambia**:
- `ThemeProvider` guarda en servidor además de localStorage.
- Al cargar, intenta servidor primero.

**Archivos**: `ThemeProvider.jsx`, `server/server.js`.

---

## Plan de implementación detallado

### Fase 1: Unificar TVRACK

**Archivo**: `src/App.jsx`

Agregar un nuevo handler que actualice el TVRACK en el estado global:

```jsx
const handleChangeTvrack = (tvrackState) => {
  setEstado((prev) => ({
    ...prev,
    tvs: { ...prev.tvs, TVRACK: tvrackState.video },
    _tvrack: tvrackState,  // metadata del TVRACK (video, audio, link)
  }));
};
```

Pasar `handleChangeTvrack` al contexto para que `MatrizVideo` lo use en lugar de `useState` local.

**Archivo**: `src/componentes/MatrizVideo.jsx`

En `handleTvrackBtn`, después de `setTvrackVideo/setTvrackAudio`, llamar a `handleChangeTvrack(newState)` para sincronizar el contexto global. Eliminar los `useState` locales de tvrackVideo/tvrackAudio y usar el contexto.

### Fase 2: Polling multi-PC

**Archivo**: `src/App.jsx`

```jsx
const POLL_INTERVAL_MS = 5000;

useEffect(() => {
  const interval = setInterval(async () => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) return;
      const { state } = await res.json();
      if (!state) return;
      
      // Solo actualizar si cambió (evitar re-renders innecesarios)
      setEstado((prev) => {
        const prevJson = JSON.stringify(prev.tvs);
        const newJson = JSON.stringify(state.tvs);
        if (prevJson === newJson) return prev; // sin cambios
        return state;
      });
    } catch {
      // Server not available — ignore
    }
  }, POLL_INTERVAL_MS);

  return () => clearInterval(interval);
}, []);
```

También hacer polling de `/api/tvrack/state`:

```jsx
useEffect(() => {
  const interval = setInterval(async () => {
    try {
      const res = await fetch("/api/tvrack/state");
      if (!res.ok) return;
      const tvrack = await res.json();
      handleChangeTvrack(tvrack);
    } catch {}
  }, POLL_INTERVAL_MS);
  return () => clearInterval(interval);
}, []);
```

### Fase 3: Presets compartidos

**Archivo**: `server/server.js`

Extender schema:
```js
stateDb = await JSONFilePreset(path.join(__dirname, "state.json"), {
  state: null,
  tvrack: { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
  presets: { preset1: null, preset2: null, preset3: null, preset4: null, preset5: null },
});
```

Nuevos endpoints:
```js
app.get("/api/presets/:n", (req, res) => {
  const n = parseInt(req.params.n);
  if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
  if (!stateDb) return res.json({ preset: null });
  res.json({ preset: stateDb.data.presets[`preset${n}`] });
});

app.post("/api/presets/:n", stateLimiter, async (req, res) => {
  const n = parseInt(req.params.n);
  if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
  if (!stateDb) return res.status(503).json({ error: "Database not ready" });
  stateDb.data.presets[`preset${n}`] = req.body;
  await stateDb.write();
  res.json({ ok: true });
});
```

**Archivo**: `src/hooks/usePreset.js`

```js
const save = useCallback(async (desc) => {
  // ... existing localStorage + descripcion logic ...
  
  // Also persist to server
  fetch(`/api/presets/${n}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(estado),
  }).catch(() => {});
}, [...]);

const load = useCallback(async () => {
  // Try server first
  try {
    const res = await fetch(`/api/presets/${n}`);
    if (res.ok) {
      const { preset } = await res.json();
      if (preset) {
        handleChangeEstadoVideo(preset.tvs);
        const mappings = buildMappings(preset.tvs);
        await joinMultipleTVs(mappings);
        return;
      }
    }
  } catch {}
  
  // Fallback to localStorage
  const saved = localStorage.getItem(key);
  if (!saved) return;
  // ... existing localStorage logic ...
}, [...]);
```

---

## Resumen de fases

| Fase | Qué | Archivos | Líneas | Complejidad |
|---|---|---|---|---|
| 1 | Unificar TVRACK en estado global | `App.jsx`, `MatrizVideo.jsx` | ~30 | Media |
| 2 | Polling multi-PC (5s) | `App.jsx` | ~25 | Baja |
| 3 | Presets compartidos | `server.js`, `usePreset.js` | ~50 | Media |
| 4 | Tema compartido (opcional) | `ThemeProvider.jsx`, `server.js` | ~15 | Baja |

**Total**: ~120 líneas en 4-5 archivos.

### Orden recomendado

```
Fase 1 (unificar TVRACK) → Fase 2 (polling) → Fase 3 (presets) → Fase 4 (tema, opcional)
```

Las fases 1 y 2 se pueden hacer juntas porque tocan los mismos archivos. Fase 3 es independiente.

---

## Validación

- [ ] Abrir 2 pestañas del navegador (simulan 2 PCs)
- [ ] En pestaña 1: cambiar matriz y hacer "Enviar"
- [ ] En pestaña 2: verificar que en ≤5s se actualiza el Aside automáticamente
- [ ] En pestaña 1: cambiar TVRACK (video + audio + link)
- [ ] En pestaña 2: verificar que TVRACK se actualiza automáticamente
- [ ] Guardar preset en pestaña 1, cargar en pestaña 2
- [ ] `pnpm run test` → todos los tests pasan
