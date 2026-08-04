# MatrizVideo

Componente principal de control de la matriz de video. Renderiza la ruta `/matrizvideo` y permite asignar decodificadores DirecTV (DTV1 a DTV8) a cada uno de los **47 destinos de video** del SportBar (37 originales + 10 Zonas Adicionales), organizados por zonas: Video Walls, TVs de escalera, TVs de barra, TVRACK de monitoreo y Zonas Adicionales.

## Props / Estado

No recibe props. Consume el contexto global via [[../Componentes/Contexto|ContextoUser]]:

- `estado.tvs` — objeto con 30+ keys (VWN, VWC, VWS, TV01–TV26, TVRACK, y agrupaciones como `TvsBarraLivertador`, `TvsBarraSur`, etc.)
- `handleChangeEstadoVideo(tvs)` — handler que persiste la asignación de decos a TVs

Estado local (TVRACK):
- `tvrackVideo` — deco activo para video del TVRACK
- `tvrackAudio` — deco activo para audio del TVRACK
- `linkAudioVideo` — toggle para vincular selección de video y audio
- Persiste vía [[../API/ArrangerApi#fetchTvrackState|fetchTvrackState()]], [[../API/ArrangerApi#setTvrackVideo|setTvrackVideo()]], [[../API/ArrangerApi#setTvrackAudio|setTvrackAudio()]] y [[../API/ArrangerApi#setTvrackLink|setTvrackLink()]] al **state store del Express** (`/api/tvrack/*`)

## APIs y Endpoints

### Arranger

- `[[../API/JoinVideo|join video]] DTVx TVRACK` — asigna solo video al TVRACK (sección ▶ Video)
- `[[../API/JoinAudio|join audio]] DTVx TVRACK` — asigna solo audio al TVRACK (sección ♪ Audio)
- `join av [SOURCE] [DEST]` — para cada TV individual al submit del formulario

### State Store (Express)

- `GET /api/tvrack/state` — carga estado actual (video, audio, link)
- `POST /api/tvrack/video` — persiste selección de video
- `POST /api/tvrack/audio` — persiste selección de audio
- `POST /api/tvrack/link` — persiste estado del toggle

URL base Arranger: `http://ARRANGER_HOST/api/command/`  
Token: `TOKEN_REMOVED`

## Componentes UI usados

- **[[../Componentes/ui/BrawlStarsButton]]** — botón estilo Brawl Stars (Lilita One, capibara SVG, glow neón verde) para los 8 decos en cada sub-sección de TVRACK. Estados: default, hover, selected. Tamaño: 130×38px (50% del original). Grilla 4×2 auto-adaptable.
- `Formik` + `Select` — formulario de zonas con selects predefinidos

## Dispositivos con los que interactúa

- 8 [[../Dispositivos/DirecTV/Decodificadores/Decodificadores]] (DTV1–DTV8)
- 3 Video Walls (VWN, VWC, VWS)
- 26 TVs principales (TV01–TV26)
- 1 TV de rack ([[../Dispositivos/DirecTV/Decodificadores/Decodificadores#TVRACK|TVRACK]])

## Lógica de agrupación por zona

El componente usa `Formik` para gestionar un formulario con selects por zona. Cada zona tiene configuraciones predefinidas (ej: `DTV1234`, `DTV1212`, `DTV5432`) que expanden a asignaciones individuales por TV mediante un `switch`. Las zonas son:

- **Video Walls** (Norte, Centro, Sur): asignación directa 1 deco → 1 VW
- **Perímetro de TVs**: Escalera Norte (TV23–TV26), Escalera Centro (TV19–TV22), Escalera Sur (TV15–TV18)
- **Barras**: Barra Norte (TV11–TV14), Barra Livertador (TV01–TV03), Barra Sur (TV04–TV07), Barra Pista (TV08–TV10)
- **ZONAS FUERA DE SPORTBAR** (10 destinos): VIP Barra Centro, VIP Lobby Batacazo, VIP Bar Bóveda, Rack VIP Bataca, +15 Barra, Escenario -1, Escenario -1 (2), QMR75 -1 TV1, QMR75 -1 TV2, QMC65 -1 TV2

## Sección TVRACK — Video/Audio independientes

La sección "TV Monitoreo Multimedia — TVRACK" se dividió en dos sub-secciones con control independiente:

| Sub-sección | Comando | Color UI |
|-------------|---------|----------|
| ▶ Video | `join video` | Azul `#58a6ff` |
| ♪ Audio | `join audio` | Verde `#3fb950` |

Cada sub-sección tiene su propia grilla de 8 botones BrawlStars con estado seleccionado independiente. Un toggle 🔗 "Vincular Audio y Video" sincroniza ambas selecciones cuando está activo.

## Mejoras de UI (jul 2026)

- **TVRACK video/audio split**: control independiente con botones [[BrawlStarsButton]]
- **BrawlStarsButton**: diseño cartoon 3D con capibara SVG animado y glow verde neón pulsante
- **Toggle link**: sincronización opcional entre video y audio del TVRACK
- **Grid layout Aside**: TVs del "Estado del video" forman rectángulo con TVRACK centrado (grid-template-areas 5×6)
- **Labels humanos**: Zonas Adicionales con nombres legibles y orden específico
- **Layout fluido**: contenedores `width: 100%`, `flex-wrap`, y `grid` con columnas adaptables
- **Puerto 3101**: nuevo entorno de desarrollo aislado del legacy en :3000

## Relaciones

- Renderiza [[MatrizPreset]] como componente hijo en el panel lateral derecho
- Usa [[../API/ArrangerApi]] para comandos al Arranger
- Usa state store de Express (`/api/tvrack/*`) para persistencia entre clientes
- Usado por [[../Componentes/App]] a través del router en [[../Conceptos/StateManagement]]
- [[../README]] — documentación general del proyecto
- [[../AGENTS]] — schema de la wiki y arquitectura
