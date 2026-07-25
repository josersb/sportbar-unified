# Canales

Componente de gestión de canales deportivos. Renderiza la ruta `/canales` y permite enviar un número de canal a cualquiera de los 8 decodificadores DirecTV mediante un formulario con select de deco + input numérico. También muestra una grilla de 20 canales favoritos con logos.

## Props / Estado

No recibe props. Consume el contexto global via [[../Componentes/Contexto|ContextoUser]]:

- `estado.decos` — array de 8 objetos `{ nombreDeco, canalDeco }`
- `estado.favoritos` — array de números de canal válidos (20 canales deportivos)
- `handleChangeEstadoDecos(decos)` — persiste el cambio de canal en el estado

Usa `useRef` para el `<select>` de deco y el `<input>` de número de canal.

## APIs y Endpoints

Llama directamente a la [[../API/ArrangerApi]] en `submitCanal()`:

- `preset load decoXcanal[NUMERO]` — comando que sintoniza un canal específico en un decodificador
- Un `switch` por cada DTV (DTV1–DTV8) construye la URL correcta
- Validación: el canal debe estar entre 100 y 2000 y existir en `estado.favoritos`

URL base: `http://ARRANGER_HOST/api/command/`  
Token: `TOKEN_REMOVED`

## Dispositivos con los que interactúa

- 8 [[../Dispositivos/Decodificadores]] (DTV1–DTV8) — cada uno recibe el comando de preset load con el número de canal

## Canales favoritos

Grilla de 20 botones con logos de canales deportivos y su número:
TNT Sports (1603), ESPN Premium HD (1604), Fox Sports HD (1605), Fox Sports 2 HD (1608), Fox Sports 3 HD (1609), DirecTV Sports HD (1610), DirecTV Sports 2 HD (1612), DirecTV Sports 3 HD (1613), DirecTV Sports 3 HD (1614), DTV Fight (1620), ESPN (1621), ESPN 2 (1622), ESPN 3 (1623), ESPN Extra (1625), Golf Channel (1628), TyC Sports (1629), DeporTV (1631), PX Sports (1639), Garage TV (1644), NBA TV (1677), y un botón 0000.

Al hacer clic en un favorito, se copia el número al input. Luego el usuario selecciona el deco destino y hace submit.

## Relaciones

- Usado por [[../Componentes/App]] a través del router
- [[../API/ArrangerApi]] — comandos `preset load`
- [[../Dispositivos/Decodificadores]] — hardware controlado
- [[../Conceptos/StateManagement]] — estado global
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
