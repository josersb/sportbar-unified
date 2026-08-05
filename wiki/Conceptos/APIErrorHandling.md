# APIErrorHandling

Sistema de manejo de errores de la API HTTP del [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB|Arranger IPEXCB]] y su integración con el cliente `arrangerApi.js` de SportBar Unified.

## Formato de respuesta de error

El Arranger siempre responde HTTP 200. Los errores se indican en el **body de la respuesta** con el formato:

```
error [tipo]
```

Ejemplo: `error incomplete`, `error device 'Decoder99' not found`

> **IMPORTANTE**: No se puede confiar en códigos HTTP para detectar errores. El body DEBE parsearse siempre.

## Catálogo completo de errores documentados

### Errores generales

| Error | Significado | Comandos afectados |
|-------|-------------|-------------------|
| `error incomplete` | Faltan argumentos obligatorios en el comando | `join`, `leave`, `get`, `set`, `send` |
| `error invalid arguments` | Argumentos con formato o tipo incorrecto | `set`, `send`, `preset` |
| `error invalid license` | Comando requiere licencia no presente | `send gc`, `set listener`, `set ui_*`, `notify` |
| `error security key mismatch` | Token de seguridad incorrecto o ausente | Todos (si se requiere key) |

### Errores de routing (join / leave)

| Error | Significado |
|-------|-------------|
| `error invalid stream` | Tipo de stream no reconocido (`video`, `audio`, `serial`, `ir`, `usb`, `usb_ext`) |
| `error join not permitted` | Join rechazado por configuración o restricción |
| `error join failed` | Fallo genérico al establecer la conexión |
| `error device disconnected` | El dispositivo fuente o destino está fuera de línea |
| `error device not found` | Nombre de dispositivo no existe en el sistema |

### Errores de consulta (get)

| Error | Significado | Comandos |
|-------|-------------|----------|
| `error incomplete` | Falta el tipo de stream o nombre de dispositivo | `get status`, `get matrix` |
| `error invalid stream` | Stream no válido | `get matrix` |
| `error invalid subscription '<type>'` | Suscripción no reconocida | `get joins` |
| `error device '<name>' not found` | Dispositivo inexistente | `get joins`, `get status` |
| `error device '<name>' disconnected` | Dispositivo fuera de línea | `get joins`, `get status` |

### Errores de envío (send)

| Error | Significado | Comandos |
|-------|-------------|----------|
| `error invalid arguments` | Código IR inválido o comando serial mal formado | `send ir`, `send serial` |
| `error device disconnected` | Dispositivo destino no disponible | `send serial`, `send ir`, `send cec` |
| `error invalid license` | Comando requiere licencia (ej: `send gc`) | `send gc`, `send tcp` |

### Errores de configuración (set)

| Error | Significado |
|-------|-------------|
| `error invalid arguments` | Valor fuera de rango o formato incorrecto |
| `error device disconnected` | Dispositivo destino no disponible |
| `error device not found` | Dispositivo no existe |

### Errores de presets

| Error | Significado |
|-------|-------------|
| `error incomplete` | Falta el nombre del preset |
| `error preset not found` | Preset no existe en el sistema |
| `error invalid arguments` | Sintaxis del preset inválida |

## Manejo actual en SportBar

### `sendArrangerCommand()` — `src/api/arrangerApi.js:27`

```javascript
const lowerText = text.toLowerCase();
if (lowerText.includes("invalid") || lowerText.includes("error") || lowerText.includes("not found")) {
  throw new Error(`Arranger rechazó el comando: ${text.trim()}`);
}
```

**Análisis**:
- ✅ Detecta correctamente todos los errores por palabra clave en el body
- ✅ Funciona independientemente del código HTTP (siempre 200)
- ⚠️ No distingue entre tipos de error — todos se tratan con el mismo mensaje genérico
- ⚠️ No intenta recuperación automática (retry, fallback)
- ⚠️ Errores de timeout (`AbortError`) se detectan correctamente con el `AbortController`

### Funciones wrapper (`assignSourceToDestination`, `sendSerialCommand`, etc.)

- Delegan completamente en `sendArrangerCommand()`
- No agregan lógica de recuperación ni reintentos
- Si el comando falla, la excepción se propaga al caller

### `joinMultipleTVs()` — `src/api/arrangerApi.js:118`

```javascript
for (const { source, dest } of mappings) {
  try {
    await assignSourceToDestination(source, dest);
  } catch (error) {
    console.error(`[ArrangerAPI] Error enviando comando "join av ${source} ${dest}":`, error);
  }
}
```

- ✅ No detiene la ejecución si un comando individual falla
- ⚠️ No acumula ni reporta qué comandos fallaron al final del batch
- ⚠️ No ofrece reintento automático para comandos fallidos

## Limitaciones del modo `no-cors` (histórico)

En versiones anteriores del cliente, `mode: "no-cors"` implicaba:
- El navegador enviaba la request pero bloqueaba la lectura de la respuesta
- Imposibilidad de detectar errores del Arranger
- Dependencia de logs del servidor para diagnóstico

Con la migración al proxy Express (`/api/command/*` → ARRANGER_HOST), el cliente ahora puede leer respuestas completas, eliminando esta limitación.

## Recomendaciones de mejora

| Mejora | Prioridad | Descripción |
|--------|-----------|-------------|
| Tipificación de errores | Alta | Mapear mensajes de error a tipos `ErrorCode` para manejo específico |
| Retry en errores transitorios | Media | Reintentar `join failed` y `device disconnected` con backoff exponencial |
| Colección de fallos en batch | Media | `joinMultipleTVs` debería retornar `{ success: [...], failed: [...] }` |
| Validación pre-comando | Baja | Validar nombres de dispositivos contra `get devices all` antes de enviar |

## Relaciones

- [[../API/ArrangerApi]] — implementación del cliente que maneja estos errores
- [[../Componentes/MatrizVideo]] — principal consumidor de comandos join/leave, afectado por errores de routing
- [[../Componentes/MatrizPreset]] — carga de presets vía `join av`, afectado por errores en batch
- [[../Componentes/Audio]] — comandos `send serial`, afectado por errores de dispositivo desconectado
- [[../Componentes/Canales]] — comandos `preset load`, afectado por errores de preset no encontrado
- [[../API/GetMatrix]] — comando para validar estado post-error
- [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB]] — hardware que genera estos errores
