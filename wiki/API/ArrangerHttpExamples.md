# ArrangerHttpExamples

Referencia de formatos HTTP soportados por la API del [[../Dispositivos/Arranger-IPEXCB|Arranger IPEXCB]] para el envío de comandos.

## Métodos soportados

| Método | Formato | Uso en SportBar |
|--------|---------|-----------------|
| HTTP GET | Comando en URL path | Principal — usado por todo `arrangerApi.js` |
| HTTP POST | Comando en body JSON | Alternativo, no usado actualmente |

## HTTP GET

### Formato base

```
http://<controller_ip>/api/command/<command>/<security_key>
```

### Ejemplos

#### Comando simple (join av)

```
GET http://ARRANGER_HOST/api/command/join%20av%20DTV1%20TV01/TOKEN_REMOVED
```

Equivalente sin URL-encoding:

```
GET http://ARRANGER_HOST/api/command/join av DTV1 TV01/TOKEN_REMOVED
```

#### Comando con argumentos (get matrix)

```
GET http://ARRANGER_HOST/api/command/get%20matrix%20video/TOKEN_REMOVED
```

#### Comando serial (con comillas en payload)

```
GET http://ARRANGER_HOST/api/command/send%20serial%20DTV1%20%22Mute1%20set%20mute%201%20true%5Cx0A%22/TOKEN_REMOVED
```

#### Comando de preset

```
GET http://ARRANGER_HOST/api/command/preset%20load%20deco1canal1603/TOKEN_REMOVED
```

#### Comando con key inline (alternativa al token en path)

```
GET http://ARRANGER_HOST/api/command/get%20status%20DTV1/key:TOKEN_REMOVED
```

## HTTP POST

### Formato base

```
POST http://<controller_ip>/api/command/
Content-Type: application/json

{
  "command": "<command>",
  "key": "<security_key>"
}
```

### Ejemplo

```json
POST http://ARRANGER_HOST/api/command/

{
  "command": "join av DTV1 TV01",
  "key": "TOKEN_REMOVED"
}
```

### Ventajas del POST

- No requiere URL-encoding de espacios ni caracteres especiales
- El payload puede ser arbitrariamente largo sin límites de URL
- Más limpio para comandos con muchos argumentos o strings complejos
- Ideal para comandos seriales con payloads largos

### Desventajas del POST

- No usado actualmente en SportBar (toda la app usa GET)
- Requiere cambiar `sendArrangerCommand()` para soportar ambos métodos
- El proxy Express actual asume GET para todas las rutas `/api/command/*`

## Seguridad key

La security key puede enviarse de dos formas:

| Ubicación | Formato | Ejemplo |
|-----------|---------|---------|
| **Path** (último segmento) | `/<command>/<key>` | `/join av DTV1 TV01/abc123` |
| **Inline** (primer argumento) | `<command> key:<key> <args>` | `get status key:abc123 DTV1` |

En SportBar, la key se envía como último segmento del path (configuración por defecto en `sendArrangerCommand()`).

### Variable de entorno

```javascript
// src/api/arrangerApi.js
const ARRANGER_TOKEN = import.meta.env.VITE_ARRANGER_TOKEN;
```

La key se inyecta en build time desde `.env` y NO debe comitearse.

## AJAX / XHR

### Ejemplo del manual (jQuery)

```javascript
$.ajax({
  url: "http://ARRANGER_HOST/api/command/join%20av%20DTV1%20TV01/abc123",
  type: "GET",
  success: function(data) {
    console.log("Comando exitoso:", data);
  },
  error: function(xhr, status, error) {
    console.error("Error:", error);
  }
});
```

### Ejemplo con fetch (vanilla JS)

```javascript
fetch("http://ARRANGER_HOST/api/command/join%20av%20DTV1%20TV01/abc123")
  .then(response => response.text())
  .then(body => {
    if (body.includes("error")) {
      console.error("Arranger error:", body);
    } else {
      console.log("OK:", body);
    }
  })
  .catch(err => console.error("Network error:", err));
```

## Proxy Express en SportBar

En producción, las llamadas no van directo al Arranger sino a través del proxy Express:

```
Cliente React ──► Express :3101/api/command/* ──► Arranger ARRANGER_HOST:80/api/command/*
```

Esto permite:
- Evitar problemas de CORS (mismo origen)
- Leer respuestas (sin restricción `no-cors`)
- Detectar errores del Arranger en el body
- Agregar logging, rate limiting y circuit breaker del lado del servidor

## Relaciones

- [[ArrangerApi]] — implementación del cliente que usa estos formatos HTTP
- [[../Dispositivos/Arranger-IPEXCB]] — hardware que recibe estas llamadas
- [[../Configuracion/ViteProxy]] — proxy Express que intermedia las llamadas HTTP
- [[../Conceptos/APIErrorHandling]] — manejo de respuestas de error del Arranger
- [[../AGENTS]] — convenciones del proyecto
