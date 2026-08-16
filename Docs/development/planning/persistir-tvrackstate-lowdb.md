# Plan: Persistir tvrackState con lowdb

**Fecha**: 25 jul 2026 | **Estado**: Planificación | **Prioridad**: Media

---

## Diagnóstico

El state store del TVRACK (`/api/tvrack/*`) es un objeto en memoria en `server/server.js`:

```js
const tvrackState = {
  video: "DTV1",
  audio: "DTV1",
  link: false,
  lastUpdated: null,
};
```

**Problema**: Si Express se reinicia (crash, deploy, apagón), el estado del TVRACK se pierde y vuelve a DTV1/DTV1/link=false. El operador tiene que reconfigurar manualmente.

**lowdb 7.0.1 ya está instalado** en `server/package.json` y funcionando para `/api/state`. Solo falta usarlo para tvrackState también.

---

## Solución

Migrar `tvrackState` de objeto en memoria a lowdb, igual que el estado general.

### Arquitectura actual vs propuesta

```
ACTUAL:
  tvrackState (memoria) ──→ GET/POST /api/tvrack/*
  stateDb (lowdb)       ──→ GET/POST /api/state

PROPUESTO:
  tvrackDb (lowdb)       ──→ GET/POST /api/tvrack/*
  stateDb (lowdb)        ──→ GET/POST /api/state
```

Ambos usan lowdb, pueden compartir o no el mismo archivo `state.json`.

### Opción A: Mismo archivo `state.json` (recomendado)

Agregar una key `tvrack` al schema existente de lowdb:

```js
stateDb = await JSONFilePreset(path.join(__dirname, "state.json"), {
  state: null,
  tvrack: { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
});
```

Ventajas:
- Un solo archivo de estado
- Misma inicialización de lowdb
- Sin código duplicado

### Opción B: Archivo separado `tvrack.json`

Crear una segunda instancia de lowdb. Más aislamiento pero más código.

---

## Plan de implementación

### Paso 1: Extender el schema de lowdb

En `server/server.js`, modificar la inicialización de lowdb (línea 68):

```js
stateDb = await JSONFilePreset(path.join(__dirname, "state.json"), {
  state: null,
  tvrack: { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
});
```

### Paso 2: Reemplazar el objeto tvrackState

Eliminar la línea 115-120:

```js
// ── TVRACK Shared State ──    ← ELIMINAR
const tvrackState = { ... };     ← ELIMINAR
```

### Paso 3: Actualizar los handlers

Cada handler ahora lee/escribe en `stateDb.data.tvrack`:

```js
// GET
app.get("/api/tvrack/state", (req, res) => {
  if (!stateDb) return res.json({ video: "DTV1", audio: "DTV1", link: false });
  res.json(stateDb.data.tvrack);
});

// POST video
app.post("/api/tvrack/video", async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });
  if (!stateDb) return res.status(503).json({ error: "Database not ready" });
  
  stateDb.data.tvrack.video = deviceId;
  if (stateDb.data.tvrack.link) stateDb.data.tvrack.audio = deviceId;
  stateDb.data.tvrack.lastUpdated = new Date().toISOString();
  await stateDb.write();
  res.json(stateDb.data.tvrack);
});

// POST audio — igual patrón
// POST link — igual patrón
```

### Paso 4: Agregar rate limiting

Aplicar el mismo `stateLimiter` a las rutas `/api/tvrack/*` (ya existe):

```js
app.post("/api/tvrack/video", stateLimiter, async (req, res) => { ... });
app.post("/api/tvrack/audio", stateLimiter, async (req, res) => { ... });
app.post("/api/tvrack/link", stateLimiter, async (req, res) => { ... });
```

### Paso 5: Actualizar tests

Los tests de MatrizVideo mockean `fetchTvrackState`, `setTvrackVideo`, etc. No necesitan cambios porque mockean el fetch al Express, no al lowdb.

---

## Archivos a modificar

| Archivo | Cambios | Líneas |
|---|---|---|
| `server/server.js` | Schema lowdb + handlers async con write() + rate limiter | ~25 |

**Total**: 1 archivo, ~25 líneas. Sin impacto en frontend ni tests.

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| `state.json` se corrompe | lowdb es atómico, escribe archivo temporal primero |
| Dos clientes escriben simultáneamente | lowdb es single-writer (Node single-threaded) |
| El archivo crece mucho | `state.json` tiene estructura fija, no crece |

---

## Validación

- [ ] Arrancar `pnpm run dev:full`, cambiar TVRACK a DTV3 video + DTV5 audio + link ON
- [ ] Verificar `server/state.json` contiene `tvrack: { video: "DTV3", audio: "DTV5", link: true }`
- [ ] Reiniciar Express (`Ctrl+C` + `pnpm run dev:full`)
- [ ] Refrescar navegador → TVRACK mantiene DTV3/DVT5/link ON
- [ ] `pnpm run test` → todos los tests pasan
