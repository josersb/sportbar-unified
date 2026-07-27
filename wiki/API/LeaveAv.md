# LeaveAv

Comando `leave av` del [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB|Arranger IPEXCB]] para desconectar un decoder de ambos streams de audio y video simultáneamente.

## Sintaxis

```
leave av [key:<security_key>] <decoder_device_name> / <group_name> / all
```

## Argumentos

| Argumento | Descripción |
|-----------|-------------|
| `decoder_device_name` | Nombre del decoder a desconectar |
| `group_name` | Nombre de un grupo de decoders (alternativa) |
| `all` | Desconecta todos los decoders |

## Valor de retorno

```
leave av success
leave av error [mensaje]
```

### Posibles errores

- `incomplete` — comando incompleto
- `invalid response` — respuesta inválida
- `decoder '<decoder_device_name>' not found` — decoder no encontrado
- `device '<decoder_device_name>' disconnected` — dispositivo desconectado
- `group devices not found` — no se encontraron dispositivos en el grupo

## Ejemplos

```
leave av Decoder1
leave av all
leave av MyGroup
leave av key:abc123 Decoder1
```

## Notas

- A diferencia de `unjoin`, `leave av` desconecta tanto audio como video en un solo comando.
- El comando `unjoin` mencionado en [[ArrangerApi]] no existe en la API documentada; el comando correcto es `leave av`.
- Usar `all` desconecta TODOS los decoders — usar con precaución en producción.

## Implementación en SportBar

- **Estado**: 🔲 No implementado en `arrangerApi.js`
- Valor potencial: apagar TVs individuales o grupos completos, útil para cierre del local o reseteo de configuración antes de cargar un preset.
- Sería el complemento natural de `join av` para operaciones de limpieza de matriz.

## Ver también

- [[ArrangerApi]] — cliente API central del sistema
- [[../Componentes/MatrizVideo]] — componente que controla el enrutamiento de video
- [[JoinAv]] — comando inverso (conectar audio + video)
- [[GetMatrix]] — verificar estado de conexiones después del leave
