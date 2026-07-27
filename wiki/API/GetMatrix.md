# GetMatrix

Comando `get matrix` del [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB|Arranger IPEXCB]] para obtener el estado completo del enrutamiento de la matriz por tipo de stream. Retorna un JSON con todas las conexiones encoder-decoder activas.

## Sintaxis

```
get matrix [key:<security_key>] <stream>
```

## Argumentos

| Argumento | Descripción |
|-----------|-------------|
| `stream` | Tipo de stream a consultar: `audio`, `video`, `serial`, `ir`, `usb`, `usb_ext` |

## Valor de retorno

Retorna un JSON con pares `"<decoder_device_name>":"<encoder_device_name>"` para todos los dispositivos que tienen una conexión activa del stream especificado. Dispositivos sin join activo retornan `"null"` como encoder.

### Formato de respuesta JSON

```json
{
  "Decoder1": "Encoder1",
  "Decoder2": "null",
  "Decoder3": "Encoder2",
  "Decoder4": "Encoder1"
}
```

Cada propiedad es un nombre de decoder y su valor es el nombre del encoder conectado, o `"null"` si no hay join activo para ese stream.

### Tipos de stream documentados

| Stream | Descripción |
|--------|-------------|
| `video` | Conexiones de stream de video |
| `audio` | Conexiones de stream de audio |
| `serial` | Conexiones de passthrough RS-232 |
| `ir` | Conexiones de passthrough infrarrojo |
| `usb` | Conexiones de passthrough USB HID |
| `usb_ext` | Conexiones de USB Extender externo |

### Posibles errores

- `error incomplete` — comando incompleto, falta el tipo de stream
- `error invalid stream` — tipo de stream no reconocido
- `error invalid license` — licencia no válida para este comando

## Ejemplos

```
get matrix audio
get matrix video
get matrix serial
get matrix ir
get matrix usb
get matrix usb_ext
```

### Ejemplo de respuesta real

```
get matrix video
→ {"Decoder1":"Encoder1","Decoder2":"null","Decoder3":"Encoder2","Decoder4":"Encoder1"}
```

## Notas

- Si un decoder no tiene join activo para el stream consultado, el valor será `"null"`.
- Para USB Extenders externos, las claves son `rex_device_name` y los valores `lex_device_name`.
- Este comando es la forma más eficiente de validar el estado completo de la matriz sin consultar dispositivo por dispositivo.

## Implementación en SportBar

- **Estado**: ✅ Implementado en `arrangerApi.js` como `getMatrix(stream)`
- **Línea**: `src/api/arrangerApi.js:99` — función `getMatrix(stream)` que construye el comando `get matrix <stream>` y lo envía mediante `sendArrangerCommand`
- **Alto valor**: Permitiría validar el estado real de la matriz contra el estado local de la app, detectar desincronizaciones y reconstruir el estado desde cero.
- Caso de uso principal: `get matrix video` para verificar que las 40+ TVs tienen la fuente correcta según los presets cargados.

## Ver también

- [[ArrangerApi]] — cliente API central del sistema
- [[../Componentes/MatrizVideo]] — componente que controla el enrutamiento de video
- [[GetJoins]] — consulta de joins por dispositivo individual
- [[GetStatus]] — consulta de estado individual de dispositivo
- [[../Conceptos/ArrangerPresetLogic]] — lógica de presets del Arranger que puede validar estado con `get matrix`
