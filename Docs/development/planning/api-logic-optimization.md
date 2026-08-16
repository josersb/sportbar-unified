# Plan: Optimización de Lógica de Llamadas al Arranger

**Fecha**: 25 jul 2026 | **Estado**: Planificación | **Prioridad**: Media

---

## Diagnóstico actual

### Todas las llamadas pasan por `sendArrangerCommand()`

- `fetch` HTTP GET con `AbortController` (timeout 10s)
- El Arranger responde HTTP 200 incluso con errores → se parsea el body para detectar `invalid`/`error`/`not found`
- Sin rate limiting ni throttling del lado del cliente

### Rutas de código que llaman al Arranger

| Componente | Disparador | Llamadas | Patrón actual | ¿Óptimo? |
|---|---|---|---|---|
| MatrizVideo → Enviar | Formik onSubmit | 46 `join av` | 6 lotes × 8 en paralelo (`Promise.allSettled`) | ✅ |
| MatrizVideo → TVRACK | handleTvrackBtn | 1 `join video/audio/av` | Single, según link toggle | ✅ |
| Audio → Enviar | Formik onSubmit | 9 `send serial` | **Secuencial** (una por una) | ⚠️ |
| Canales → dígitos | sendChannelDigits | N dígitos | Secuencial con delay 300ms | ✅ (requerido por HW) |
| MatrizPreset → Cargar | handleCargaMatriz | 29 `join av` | Vía `joinMultipleTVs()` (lotes de 8) | ✅ |
| TVRACK state | fetchTvrackState | 1 `fetch` al Express | Single | ✅ |

### Problemas identificados

| # | Problema | Severidad |
|---|---|---|
| P1 | **Código duplicado**: `joinMultipleTVs()` y el inline batching del Formik hacen lo mismo | Baja |
| P2 | **Audio.js**: 9 llamadas `sendSerialCommand` secuenciales (~900ms) son independientes y podrían paralelizarse | Media |
| P3 | **Sin medición del Arranger**: desconocemos cuántas llamadas concurrentes soporta antes de degradarse | Alta |
| P4 | **Sin estrategia de reintento**: si un lote falla, no se re-intenta | Media |
| P5 | **Error handling genérico**: `sendArrangerCommand` detecta `invalid`/`error`/`not found` pero no distingue tipos de error | Baja |

---

## Plan de acción

### Fase 1 — Medición y prueba en el bar 🔴

**Objetivo**: Entender los límites reales del Arranger IPEXCB.

| Paso | Prueba | Métrica |
|---|---|---|
| 1.1 | Enviar 1 `join av` y medir latencia | ms por request |
| 1.2 | Enviar 8 `join av` en paralelo y medir | ms total, ¿algún fallo? |
| 1.3 | Enviar 16 en paralelo | ¿el Arranger rechaza conexiones? |
| 1.4 | Enviar 32 en paralelo | ¿timeouts? ¿errores? |
| 1.5 | Repetir 1.2-1.4 con `send serial` | Mismo análisis para comandos seriales |

**Script de prueba** (para ejecutar en la consola del navegador en el bar):
```js
// Ejecutar en http://localhost:5173/matrizvideo con DevTools abiertas
const { assignSourceToDestination } = await import('/src/api/arrangerApi.js');

async function benchmark(label, count, fn) {
  const start = performance.now();
  const promises = Array.from({length: count}, (_, i) => 
    fn(`DTV${(i % 8) + 1}`, `TV${String(i + 1).padStart(2, '0')}`)
      .catch(e => `ERROR: ${e.message}`)
  );
  const results = await Promise.allSettled(promises);
  const elapsed = (performance.now() - start).toFixed(0);
  const failed = results.filter(r => r.status === 'rejected' || String(r.value).startsWith('ERROR')).length;
  console.log(`${label}: ${count} calls, ${elapsed}ms, ${failed} failed`);
}

// Tests
await benchmark('BATCH-1', 1, assignSourceToDestination);
await benchmark('BATCH-8', 8, assignSourceToDestination);
await benchmark('BATCH-16', 16, assignSourceToDestination);
await benchmark('BATCH-24', 24, assignSourceToDestination);
```

---

### Fase 2 — Correcciones de código 🟡

**Depende de los resultados de Fase 1 para ajustar BATCH_SIZE.**

| Paso | Qué | Archivo |
|---|---|---|
| 2.1 | Unificar batching: eliminar `joinMultipleTVs()`, mover lógica a un helper `batchJoinTVs(mappings, batchSize)` compartido entre MatrizVideo y MatrizPreset | `arrangerApi.js` |
| 2.2 | Paralelizar Audio.js: usar `Promise.all` para las 9 llamadas `sendSerialCommand` (son independientes) | `Audio.jsx` |
| 2.3 | Ajustar `BATCH_SIZE` según resultados de Fase 1 (posiblemente 8→12 o 8→6) | `arrangerApi.js` |
| 2.4 | Agregar retry con backoff (1 reintento por lote fallido) | `arrangerApi.js` |

---

### Fase 3 — Monitoreo y observabilidad 🟢

| Paso | Qué |
|---|---|
| 3.1 | Agregar `performance.mark/measure` en `sendArrangerCommand` para medir latencia en producción |
| 3.2 | Logger estructurado: timestamp, comando, latencia, status |
| 3.3 | Dashboard simple en consola: `[ArrangerAPI] stats: 46 calls, 2.3s total, 0 errors` |

---

### Fase 4 — Estrategia avanzada (largo plazo) 🟢

| Paso | Qué |
|---|---|
| 4.1 | Evaluar TCP persistente (puerto 6980) en vez de HTTP para comandos múltiples |
| 4.2 | Cola de comandos con prioridad (TVRACK > Zonas > Matriz completa) |
| 4.3 | `get matrix` como source of truth al iniciar la app |

---

## Orden de ejecución recomendado

```
Fase 1 (medir en el bar) → Fase 2.3 (ajustar BATCH_SIZE) → Fase 2.1 + 2.2 (unificar + paralelizar Audio)
                                                                    ↓
                                                            Fase 3 (monitoreo)
                                                                    ↓
                                                            Fase 4 (TCP, cola, source of truth)
```

## Dependencias

- **Fase 1**: Requiere acceso al Arranger físico en el bar
- **Fase 2**: Puede hacerse en local (tests)
- **Fase 3**: Puede hacerse en local
- **Fase 4**: Requiere acceso al Arranger físico + documentación TCP
