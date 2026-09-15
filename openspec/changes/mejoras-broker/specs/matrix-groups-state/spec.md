# matrix-groups-state Specification

## Purpose

Estado server-authoritative de los grupos de la matriz bajo un modelo declarativo data-driven único (`zones → subgroups { key, dir, screens }` + `combosBySize {3,4}`). El servidor deriva opciones, expande y resuelve presets; el cliente renderiza read-only y representa honestamente el estado por pantalla.

## Requirements

### Requirement: MG-1 — Grupos server-authoritative

`matrixGroups` MUST vivir solo en el servidor, persistirse en lowdb y difundirse vía SSE. Los clientes MUST NOT persistirlo ni decidir su valor; solo lo consumen read-only.

#### Scenario: Cliente read-only
- GIVEN un cliente operativo
- WHEN inspecciona o intenta persistir `matrixGroups`
- THEN no escribe ni decide el valor; solo refleja el del servidor

### Requirement: MG-2 — Resolución de preset server-side

La carga de un preset MUST resolver los valores de grupo exclusivamente en el servidor, derivando `matrixGroups` de las TVs individuales del preset. El cliente MUST NOT calcular el valor de la lista de grupos.

#### Scenario: Preset resuelve grupos en el servidor
- GIVEN un preset guardado con grupos configurados
- WHEN se carga el preset
- THEN el servidor deriva y difunde `matrixGroups` sin intervención del cliente

### Requirement: MG-3 — Cobertura de zonas y subgrupos

El modelo declarativo MUST cubrir 3 zonas (VideoWall, Perímetro, Barra) y 10 subgrupos, cada uno con `key`, `dir` y lista de pantallas `screens`.

| Zona | Subgrupos (key) | dir | screens |
|---|---|---|---|
| VideoWall | VWN · VWC · VWS | Norte/Centro/Sur | 1 c/u |
| Perímetro | TvsEscaleraNorte · TvsEscaleraCentro · TvsEscaleraSur | Norte/Centro/Sur | 4 c/u |
| Barra | TvsBarraNorte · TvsBarraLibertador · TvsBarraSur · TvsBarraPista | Norte/Libertador/Sur/Pista | 4/3/4/3 |

#### Scenario: Los 10 subgrupos presentes
- GIVEN el snapshot del servidor
- WHEN se inspecciona el modelo de zonas
- THEN están los 10 subgrupos con su dirección y lista de pantallas

### Requirement: MG-4 — Modelo declarativo único

El modelo (`zones → subgroups` + `combosBySize`) MUST ser la única fuente de las opciones y de la expansión de grupos; no se admite hardcodeo por subgrupo.

#### Scenario: Expansión derivada del modelo
- GIVEN un subgrupo de 4 pantallas
- WHEN se expande el valor `DTV1234`
- THEN las 4 pantallas reciben DTV1..DTV4 en orden, sin switch hardcodeado por subgrupo

### Requirement: MG-5 — Opciones derivadas del tamaño

Las opciones de un subgrupo MUST ser DTV1..DTV8 más `combosBySize[screens.length]`; una opción cuya longitud no coincide con el nº de pantallas MUST ser rechazada.

#### Scenario: Combo de tamaño incorrecto rechazado
- GIVEN el subgrupo TvsBarraLibertador (3 pantallas)
- WHEN se valida la opción `DTV1234` (combo de 4)
- THEN se rechaza; solo DTV1..DTV8 y los combos de tamaño 3 aplican

### Requirement: MG-6 — Representación honesta del estado

Cuando las pantallas de un subgrupo no coinciden con una opción conocida (ni patrón de `combosBySize` ni fuente única), el valor derivado MUST ser "Mixto / Personalizado", nunca `values[0]`.

#### Scenario: Mixto no-predeterminado
- GIVEN un subgrupo de 3 pantallas con fuentes DTV1/DTV4/DTV5 (sin patrón ni valor único)
- WHEN se deriva el valor del subgrupo
- THEN el indicador es "Mixto / Personalizado"

#### Scenario: Fuente única
- GIVEN un subgrupo cuyas pantallas comparten la misma fuente DTV2
- WHEN se deriva el valor del subgrupo
- THEN el indicador es DTV2

### Requirement: MG-7 — Naming del subgrupo Libertador

El subgrupo de 3 pantallas de la Barra MUST mostrarse como "Libertador" (nunca "Livertador").

#### Scenario: Etiqueta correcta
- GIVEN la UI de MatrizVideo
- WHEN se renderiza el subgrupo de la barra central
- THEN la etiqueta dice "Libertador"
