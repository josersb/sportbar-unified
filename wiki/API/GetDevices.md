# GetDevices

Comando `get devices` del [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB|Arranger IPEXCB]] para obtener el nombre y dirección MAC de todos los dispositivos disponibles en el sistema.

## Sintaxis

```
get devices [key:<security_key>] <target>
```

## Argumentos

| Argumento | Descripción |
|-----------|-------------|
| `target` | Filtro de dispositivos: `all`, `all_tx`, `all_rx`, `all_rex`, `all_lex` |

### Targets disponibles

| Target | Dispositivos que retorna |
|--------|--------------------------|
| `all` | Todos los dispositivos (encoders + decoders) |
| `all_tx` | Solo encoders (transmisores) |
| `all_rx` | Solo decoders (receptores) |
| `all_rex` | Solo clientes USB Extender |
| `all_lex` | Solo hosts USB Extender |

## Valor de retorno

Retorna un JSON con pares `"<device_name>":"<MAC_address>"`. Si no hay dispositivos, retorna `{}`.

### Posibles errores

- `incomplete` — comando incompleto
- `invalid target` — target inválido

## Ejemplos

```
get devices all
get devices all_tx
get devices all_rx
get devices key:abc123 all
```

## Notas

- `<device_id>` es la dirección MAC del dispositivo.
- `all_rex` y `all_lex` corresponden a dispositivos USB Extender externos, no usados actualmente en SportBar.
- El resultado se retorna como string JSON formateado.

## Implementación en SportBar

- **Estado**: 🔲 No implementado en `arrangerApi.js`
- Valor potencial: descubrimiento automático de dispositivos, verificación de la topología completa de la matriz, detección de dispositivos desconectados.

## Ver también

- [[ArrangerApi]] — cliente API central del sistema
- [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB]] — controlador físico
- [[../Dispositivos/DirecTV/Decodificadores/Decodificadores]] — catálogo de decodificadores del sistema
