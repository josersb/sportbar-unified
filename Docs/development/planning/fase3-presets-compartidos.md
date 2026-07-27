# Plan: Fase 3 — Presets Compartidos (Multi-Dispositivo)

**Fecha**: 25 jul 2026 | **Estado**: Planificación | **Prioridad**: Media

---

## Diagnóstico

### Situación actual

Los 5 presets (`estadoApp_Preset1` a `Preset5`) se guardan y cargan **exclusivamente desde localStorage** del browser:

```
Guardar: usePreset(n).save() → localStorage("estadoApp_PresetN") ← solo local
Cargar:  usePreset(n).load() → localStorage("estadoApp_PresetN") ← solo local
```

**Problema**: Si el operador en PC-1 configura y guarda un preset, PC-2 no lo ve. Si PC-1 se rompe o cambia de browser, los presets se pierden.

### lowdb ya está listo

El servidor Express ya tiene lowdb funcionando para `state` y `tvrack`. Solo falta agregar una key `presets` al schema.

---

## Solución

### Arquitectura propuesta

```
GUARDAR:
  usePreset(n).save()
    ├── localStorage("estadoApp_PresetN")  ← inmediato (respaldo local)
    └── POST /api/presets/:n              ← compartido (servidor)

CARGAR:
  usePreset(n).load()
    ├── GET /api/presets/:n               ← servidor primero
    └── localStorage("estadoApp_PresetN") ← fallback local
```

### Schema de lowdb

```json
{
  "state": { ... },
  "tvrack": { "video": "DTV1", "audio": "DTV1", "link": false },
  "presets": {
    "preset1": { "tvs": {...}, "audio": [...], ... },
    "preset2": null,
    "preset3": null,
    "preset4": null,
    "preset5": null
  }
}
```

---

## Plan de implementación

### Paso 1: Extender schema de lowdb

**Archivo**: `server/server.js` (línea 68)

Agregar `presets` al schema:
```js
stateDb = await JSONFilePreset(path.join(__dirname, "state.json"), {
  state: null,
  tvrack: { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
  presets: { preset1: null, preset2: null, preset3: null, preset4: null, preset5: null },
});
```

### Paso 2: Agregar endpoints REST

**Archivo**: `server/server.js` (después de los endpoints tvrack, ~línea 151)

```js
// ── Presets Compartidos ──

app.get("/api/presets/:n", (req, res) => {
  const n = parseInt(req.params.n, 10);
  if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
  if (!stateDb) return res.json({ preset: null });
  res.json({ preset: stateDb.data.presets[`preset${n}`] });
});

app.post("/api/presets/:n", stateLimiter, async (req, res) => {
  const n = parseInt(req.params.n, 10);
  if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
  if (!stateDb) return res.status(503).json({ error: "Database not ready" });
  stateDb.data.presets[`preset${n}`] = req.body;
  await stateDb.write();
  res.json({ ok: true });
});
```

### Paso 3: Actualizar `usePreset.save()`

**Archivo**: `src/hooks/usePreset.js`

Modificar la función `save` para que además de localStorage, persista al servidor:

```js
const save = useCallback(
  async (desc) => {
    const newDescripcion = estado.descripcionPreset.map((item, i) =>
      i === n - 1 ? { ...item, [`preset${n}`]: desc } : item
    );
    handleChangeEstadoPreset(newDescripcion);
    
    // 1. localStorage (respaldo local inmediato)
    localStorage.setItem(key, JSON.stringify(estado));
    
    // 2. Servidor (compartido entre PCs)
    try {
      await fetch(`/api/presets/${n}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estado),
      });
    } catch {
      // Servidor no disponible — el preset igual queda en localStorage
    }
  },
  [key, n, estado, handleChangeEstadoPreset]
);
```

### Paso 4: Actualizar `usePreset.load()`

**Archivo**: `src/hooks/usePreset.js`

Modificar `load` para intentar servidor primero, localStorage como fallback:

```js
const load = useCallback(async () => {
  let data = null;

  // 1. Intentar servidor (compartido entre PCs)
  try {
    const res = await fetch(`/api/presets/${n}`);
    if (res.ok) {
      const { preset } = await res.json();
      if (preset && preset.tvs) {
        data = preset;
      }
    }
  } catch {
    // Servidor no disponible
  }

  // 2. Fallback a localStorage
  if (!data) {
    const saved = localStorage.getItem(key);
    if (!saved) return;
    try {
      data = JSON.parse(saved);
    } catch {
      return;
    }
  }

  // Aplicar el preset
  handleChangeEstadoVideo(data.tvs);
  const mappings = buildMappings(data.tvs);
  try {
    await joinMultipleTVs(mappings);
  } catch {
    /* Error logged upstream */
  }
}, [key, n, handleChangeEstadoVideo, buildMappings]);
```

---

## Archivos a modificar

| Archivo | Cambios | Líneas |
|---|---|---|
| `server/server.js` | Schema + 2 endpoints | ~25 |
| `src/hooks/usePreset.js` | save() + load() actualizados | ~25 |

**Total**: 2 archivos, ~50 líneas. Sin impacto en tests existentes (usan mocks).

---

## Validación

- [ ] PC-1: guardar preset 1 con configuración personalizada
- [ ] PC-2 (u otra pestaña): cargar preset 1 → debe cargar la config de PC-1
- [ ] Verificar `server/state.json` contiene `presets.preset1` con los datos
- [ ] Desconectar servidor → save() sigue funcionando (localStorage fallback)
- [ ] Desconectar servidor → load() usa localStorage fallback
- [ ] `pnpm run test` → todos los tests pasan
