# Prueba en el bar — join video / join audio contra Arranger físico

**Fecha**: 25 jul 2026 | **Rama**: `v2` | **Puerto**: 3101 (Express) + 5173 (Vite)

---

## Preparación previa

### 1. Verificar conectividad con el Arranger

```powershell
# En PowerShell — confirmar que la IP del Arranger responde
Test-Connection 192.168.2.254 -Count 2

# Verificar que la API responde (debería devolver página web o error)
curl http://192.168.2.254/api/command/get%20devices%20all/TOKEN_REMOVED
```

✅ Si ping responde → red OK  
✅ Si curl devuelve algo (aunque sea error) → API reachable

### 2. Arrancar la app

```powershell
# En el directorio del proyecto (ramal v2)
pnpm run sportbar:dev
```

Esto levanta:
- **Vite** en `http://localhost:5173`
- **Express** en `http://localhost:3101`

✅ Abrir `http://localhost:5173/matrizvideo` en el navegador

### 3. Configurar pantalla

Abrir **DOS ventanas** del navegador lado a lado:
- **Ventana 1**: `http://localhost:5173/matrizvideo` (nuestra app)
- **Ventana 2**: `http://192.168.2.254/#/status` (estado real del Arranger)

En la ventana 2, buscar la fila **TVRACK** para comparar antes/después.

---

## Bloque 1 — TVRACK Video (join video)

### 1.1 Botones individuales (link 🔗 DESACTIVADO)

| Paso | Acción | Verificación |
|------|--------|-------------|
| 1 | Asegurarse que el checkbox 🔗 `Vincular audio y video` esté **desmarcado** | |
| 2 | Click en **DTV1** (sección ▶ VIDEO) | ✅ Toast: "DTV1 → VIDEO TVRACK" |
| 3 | Verificar en Arranger (ventana 2) | ✅ TVRACK ahora muestra video de DTV1. El audio de TVRACK **no cambió** |
| 4 | Click en **DTV3** | ✅ Toast: "DTV3 → VIDEO TVRACK". Video cambia a DTV3 |
| 5 | Repetir con DTV5, DTV8 | ✅ Cada click cambia solo video |

### 1.2 Botón de video con error simulado

Desconectar momentáneamente el cable de red o apagar el Arranger, clickear DTV1:

| Paso | Acción | Verificación |
|------|--------|-------------|
| 6 | Desconectar red del Arranger | |
| 7 | Click en DTV1 (video) | ✅ Toast rojo: "Error al asignar video". La app no crashea |
| 8 | Reconectar red | |

---

## Bloque 2 — TVRACK Audio (join audio)

### 2.1 Botones individuales (link 🔗 DESACTIVADO)

| Paso | Acción | Verificación |
|------|--------|-------------|
| 9 | Link 🔗 **desmarcado** | |
| 10 | Click en **DTV2** (sección ♪ AUDIO) | ✅ Toast: "DTV2 → AUDIO TVRACK" |
| 11 | Verificar Arranger (ventana 2) | ✅ Audio de TVRACK cambió a DTV2. Video **no cambió** |
| 12 | Click en **DTV6** | ✅ Solo cambia audio |

---

## Bloque 3 — Link 🔗 Activado (join av)

**Este es el fix crítico que implementamos hoy.**

### 3.1 Video → dispara ambos

| Paso | Acción | Verificación |
|------|--------|-------------|
| 13 | **Activar** checkbox 🔗 `Vincular audio y video` | |
| 14 | Click en **DTV4** (sección ▶ VIDEO) | ✅ Toast: "DTV4 → VIDEO + AUDIO TVRACK" |
| 15 | Verificar Arranger (ventana 2) | ✅ **Ambos** video y audio de TVRACK cambiaron a DTV4 |

### 3.2 Audio → dispara ambos

| Paso | Acción | Verificación |
|------|--------|-------------|
| 16 | Link sigue activado | |
| 17 | Click en **DTV7** (sección ♪ AUDIO) | ✅ Toast: "DTV7 → VIDEO + AUDIO TVRACK" |
| 18 | Verificar Arranger (ventana 2) | ✅ **Ambos** video y audio de TVRACK cambiaron a DTV7 |

### 3.3 Desactivar link

| Paso | Acción | Verificación |
|------|--------|-------------|
| 19 | **Desmarcar** checkbox 🔗 | ✅ Checkbox se desmarca |
| 20 | Click en DTV1 (video) | ✅ Solo cambia video (link OFF) |

---

## Bloque 4 — State Store (persistencia entre refrescos)

| Paso | Acción | Verificación |
|------|--------|-------------|
| 21 | Seleccionar DTV2 en video, DTV5 en audio, link ON | |
| 22 | **Refrescar la página** (F5) | ✅ Al cargar, los botones de DTV2 y DTV5 muestran estado activo. Link vuelve a ON |
| 23 | Verificar que el estado se restauró correctamente | ✅ Los badges de "Activo" coinciden |

---

## Bloque 5 — Visual (dark mode + fondos)

| Paso | Acción | Verificación |
|------|--------|-------------|
| 24 | Asegurarse que está en **dark mode** (botón ☀️/🌙 en header) | |
| 25 | Scroll a "Zonas Fuera de Sportbar" | ✅ Labels en bold, más grandes, color claro |
| 26 | Verificar que NO hay líneas blancas entre header/nav/aside/main | ✅ Fondo oscuro sólido sin gaps |
| 27 | Verificar Aside (panel izquierdo) | ✅ Tiene fondo oscuro, no es transparente |

---

## Bloque 6 — Zonas Fuera de Sportbar

| Paso | Acción | Verificación |
|------|--------|-------------|
| 28 | Cambiar "VIP Barra Centro" a DTV3 | ✅ Select responde, label visible |
| 29 | Click en **Enviar** | ✅ Toast: "Matriz de video actualizada" |
| 30 | Verificar Arranger (ventana 2) | ✅ El decoder VIP Barra Centro ahora muestra DTV3 |

---

## Bloque 7 — Matriz completa (regresión)

| Paso | Acción | Verificación |
|------|--------|-------------|
| 31 | Cambiar "VWall Norte" a DTV5 | ✅ Select funciona |
| 32 | Click en **Enviar** | ✅ Se actualizan los 47 destinos |
| 33 | Verificar en Aside (panel izquierdo) | ✅ Los colores y labels de los TVs reflejan los cambios |

---

## Resumen de resultados

Anotar para cada bloque:

| Bloque | Resultado | Observaciones |
|--------|-----------|---------------|
| 1. Video individual | ✅ / ❌ | |
| 2. Audio individual | ✅ / ❌ | |
| 3. Link activado | ✅ / ❌ | (fix crítico) |
| 4. State store | ✅ / ❌ | |
| 5. Visual dark mode | ✅ / ❌ | |
| 6. Zonas fuera | ✅ / ❌ | |
| 7. Matriz completa | ✅ / ❌ | |

---

## Si algo falla

1. **Abrir DevTools** (F12) → pestaña **Console** → buscar errores en rojo
2. **Pestaña Network** → filtrar por `api/command` → ver qué URL se envió y qué respondió el Arranger
3. **Verificar token**: la URL debe incluir `/TOKEN_REMOVED` al final
4. **Capturar pantalla** del error de consola para traer a la sesión

---

Volvé con los resultados y ajustamos lo que haga falta.
