# Aside

Panel lateral (sidebar) que muestra el estado en tiempo real de decodificadores, audio y video. Se renderiza de forma persistente en todas las rutas y actualiza visualmente los colores de cada TV según el decodificador asignado mediante CSS custom properties.

## Props / Estado

No recibe props. Consume el contexto global via [[../Componentes/Contexto|ContextoUser]]:

- `estado.decos` — array de 8 objetos con nombre y canal actual
- `estado.audio` — array de 3 objetos con zona, fuente, volumen y mute
- `estado.tvs` — objeto con la asignación deco → TV

## Mecanismo de colores CSS

La función `refreshEstadoAudioVideo()` itera sobre el objeto `tvs` y las zonas de audio para setear CSS custom properties en `:root`. Cada deco tiene un color asignado (definido en `--DTV1`, `--DTV2`, etc.), y cada TV recibe ese color via `--TV01`, `--TV02`, etc. Las zonas de audio reciben `--ANorte`, `--ACentro`, `--ASur`.

Esto permite que el mapa visual de TVs en el Aside refleje instantáneamente qué deco está asignado a cada pantalla.

## Secciones del panel

### Estado de canales
Lista de 8 decos (`DTV1`–`DTV8`) con color de fondo distintivo y el número de canal sintonizado. Incluye un botón "Recargar" con la lógica comentada que enviaría comandos `preset load` a todos los decos para refrescar canales.

### Estado del audio
Tabla con las 3 zonas (Sur, Centro, Norte) mostrando deco fuente, nivel de volumen y estado de mute (ON/OFF).

### Estado del video
Mapa visual en miniatura de todas las TVs agrupadas por ubicación física:
- **Video Walls**: VW Norte, VW Centro, VW Sur
- **Escalera Sur**: TV15–TV18
- **Escalera Centro**: TV19–TV22
- **Escalera Norte**: TV23–TV26
- **Barra**: TV01–TV14 + TVRACK

## Relaciones

- Depende de [[../Conceptos/StateManagement]] para leer el estado global
- Refleja datos de [[../Componentes/MatrizVideo]], [[../Componentes/Audio]] y [[../Componentes/Canales]]
- Muestra estado de [[../Dispositivos/DirecTV/Decodificadores/Decodificadores]] y [[../Conceptos/ZonasAudio]]
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
