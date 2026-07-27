# GetJoins

Comando `get joins` del [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB|Arranger IPEXCB]] para consultar qué encoder está conectado a una suscripción específica de un decoder (video, audio, serial, ir, usb, usb_ext).

## Sintaxis

```
get joins [key:<security_key>] <device_name> <subscription>
```

## Argumentos

| Argumento | Descripción |
|-----------|-------------|
| `device_name` | Nombre del decoder o cliente USB Extender |
| `subscription` | Tipo de suscripción: `video`, `audio`, `serial`, `ir`, `usb`, `usb_ext` |

## Valor de retorno

Retorna un JSON con el par `"<device_name>":"<encoder_name>"`. Si no hay join activo para esa suscripción, el valor del encoder es `"null"`.

### Formato de respuesta JSON

```json
{
  "Decoder1": "Encoder1"
}
```

Ejemplo sin join activo:

```json
{
  "Decoder5": "null"
}
```

### Tipos de suscripción documentados

| Suscripción | Descripción |
|-------------|-------------|
| `video` | Stream de video JPEG2000 |
| `audio` | Stream de audio embebido/independiente |
| `serial` | Passthrough de datos RS-232 |
| `ir` | Passthrough de señales infrarrojas |
| `usb` | Passthrough de dispositivos USB HID |
| `usb_ext` | USB Extender externo (solo clientes USB Extender dedicados) |

### Posibles errores

- `error incomplete` — comando incompleto, faltan argumentos
- `error invalid subscription '<subscription>'` — tipo de suscripción no reconocido
- `error device '<device_name>' not found` — dispositivo no encontrado en el sistema
- `error device '<device_name>' disconnected` — dispositivo fuera de línea

## Ejemplos

```
get joins Decoder1 video
get joins Decoder1 audio
get joins Decoder1 serial
get joins Decoder1 ir
get joins Decoder1 usb
get joins Decoder1 usb_ext
get joins key:abc123 Decoder1 video
```

### Ejemplo de respuesta real

```
get joins Decoder1 video
→ {"Decoder1":"Encoder2"}
```

## Notas

- La suscripción `usb_ext` aplica solo a clientes USB Extender externos.
- Sin join activo, el encoder se reporta como `"null"`.
- A diferencia de [[GetMatrix]] que retorna TODAS las conexiones de un tipo de stream, `get joins` consulta un dispositivo específico.

## Implementación en SportBar

- **Estado**: ✅ Implementado en `arrangerApi.js` como `getJoins(decoder)`
- **Línea**: `src/api/arrangerApi.js:103` — función `getJoins(decoder)` que construye el comando `get joins <decoder>` y lo envía mediante `sendArrangerCommand`
- Cuando `decoder` está vacío, el comando se emite sin nombre de dispositivo.
- Valor potencial: verificar la fuente de video/audio de una TV específica sin consultar la matriz completa, útil para debugging y verificación de presets individuales.

## Ver también

- [[ArrangerApi]] — cliente API central del sistema
- [[../Componentes/MatrizVideo]] — componente que controla el enrutamiento de video
- [[GetMatrix]] — consulta del estado completo de la matriz por stream
- [[GetStatus]] — consulta de estado individual de dispositivo
- [[../Conceptos/APIErrorHandling]] — manejo de errores de la API del Arranger
