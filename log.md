# Log

Append-only chronological record of all wiki operations.

---

## [2026-07-14] wiki-init | Fase 1 — Creación de la LLM Wiki

- **Pages created**: [[index]], [[log]]
- **Pages updated**: [[README]], [[Docs/SETUP_INSTRUCTIONS]], [[Docs/DEVELOPMENT_ENVIRONMENT]], [[Docs/ENVIRONMENT_SUMMARY]], [[Docs/MIGRATION_LOG]], [[Docs/PROJECT_STATUS]], [[Docs/Análisis de Tres Proyectos Sportbar]]
- **Key links**:
  - [[README]] ↔ [[Docs/SETUP_INSTRUCTIONS]], [[Docs/DEVELOPMENT_ENVIRONMENT]], [[Docs/ENVIRONMENT_SUMMARY]], [[Docs/MIGRATION_LOG]], [[Docs/PROJECT_STATUS]], [[Docs/Análisis de Tres Proyectos Sportbar]], [[API commands/devices_all]], [[API commands/get_status]], [[AGENTS]]
  - [[Docs/DEVELOPMENT_ENVIRONMENT]] ↔ [[../README]], [[../AGENTS]], [[ENVIRONMENT_SUMMARY]], [[SETUP_INSTRUCTIONS]]
  - [[Docs/ENVIRONMENT_SUMMARY]] ↔ [[DEVELOPMENT_ENVIRONMENT]], [[SETUP_INSTRUCTIONS]], [[../README]], [[PROJECT_STATUS]]
  - [[Docs/MIGRATION_LOG]] ↔ [[../README]], [[PROJECT_STATUS]], [[Análisis de Tres Proyectos Sportbar]], [[DEVELOPMENT_ENVIRONMENT]], [[SETUP_INSTRUCTIONS]]
  - [[Docs/PROJECT_STATUS]] ↔ [[../README]], [[MIGRATION_LOG]], [[DEVELOPMENT_ENVIRONMENT]], [[SETUP_INSTRUCTIONS]]
  - [[Docs/SETUP_INSTRUCTIONS]] ↔ [[../README]], [[DEVELOPMENT_ENVIRONMENT]], [[PROJECT_STATUS]], [[MIGRATION_LOG]], [[Análisis de Tres Proyectos Sportbar]]
  - [[Docs/Análisis de Tres Proyectos Sportbar]] ↔ [[../README]], [[MIGRATION_LOG]]
- **Links totales creados**: 46
- **Contradictions**: None
- **Nota**: `AGENTS.md` y `API commands/*.txt` no fueron modificados (schema y fuentes raw, respectivamente). `AGENTS.md` recibe inbound links desde `README.md` y `Docs/DEVELOPMENT_ENVIRONMENT.md`.

---

## [2026-07-14] wiki-schema | Fase 2 — Schema de la LLM Wiki para SportBar Unified

- **Operation**: schema creation
- **Pages created**: none (schema agregado a AGENTS.md existente)
- **Pages updated**: [[AGENTS]] (nueva sección `## LLM Wiki Schema`), [[index]] (nuevas categorías: Componentes, APIs, Dispositivos, Conceptos, Configuración, Presets, Sources, Decisions, Queries), [[log]] (esta entrada)
- **Entity types definidos**: 9 (Componente React, API/Endpoint, Dispositivo Hardware, Concepto, Configuración, Preset, Source, Decision, Query)
- **Entidades catalogadas**:
  - 16 Componentes React (MatrizVideo, MatrizPreset, Canales, Audio, Arranger, Aside, Portada, Nav, Soporte, Header, Body, Select, Radio, CheckBox, TextInput, CanalFavorito)
  - 6 APIs y Endpoints (ArrangerApi, join av, preset load, send serial, get status, devices all)
  - 5 grupos de Dispositivos Hardware (Decodificadores DTV1-DTV8, TVs Principales TV01-TV26, TVs Especiales VWN/VWC/VWS, TVRACK, Zonas de Audio Norte/Centro/Sur)
  - 3 Conceptos (State Management, Presets localStorage, Proxy Vite)
  - 4 elementos de Configuración (Vite, Express Server, pnpm, .npmrc)
  - 5 Presets (Preset1-Preset5)
- **Secciones del schema**: Naming Conventions, Link Conventions, Ingest Triggers, Categories for index.md
- **Nota**: No se crearon páginas de entidad (eso corresponde a la Fase 4). Las categorías en `index.md` quedan como placeholders con comentarios HTML hasta que se creen las páginas.

---

## [2026-07-14] ingest | Fase 4 — Entidades iniciales

- **Pages created**: 15 ([[wiki/Componentes/MatrizVideo]], [[wiki/Componentes/MatrizPreset]], [[wiki/Componentes/Canales]], [[wiki/Componentes/Audio]], [[wiki/Componentes/Aside]], [[wiki/Componentes/Arranger]], [[wiki/Componentes/Contexto]], [[wiki/Componentes/App]], [[wiki/API/ArrangerApi]], [[wiki/Dispositivos/Decodificadores]], [[wiki/Dispositivos/ZonasAudio]], [[wiki/Conceptos/StateManagement]], [[wiki/Conceptos/SistemaPresets]], [[wiki/Configuracion/ViteProxy]], [[wiki/Configuracion/PnpmSetup]])
- **Pages updated**: [[index]] (placeholders reemplazados con links reales), [[log]] (esta entrada)
- **Key links**: 177 wikilinks totales entre las 15 páginas de entidad
- **Top hubs**: Decodificadores (17 out), App (17 out), ArrangerApi (13 out), SistemaPresets (14 out)
- **Contradictions**: None
- **Orphans**: 0 — todas las páginas tienen al menos inbound desde index.md
