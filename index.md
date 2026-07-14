# Index

Last updated: 2026-07-14

## Proyecto

- [[README]] — Documentación principal del sistema SportBar Unified: arquitectura, tecnologías, instalación, rutas, integración Arranger y estructura del proyecto.
- [[AGENTS]] — Schema de la wiki y convenciones del proyecto: arquitectura React/Vite, gestor de paquetes pnpm, versionado exacto, seguridad, configuración de Node y Vite.

## Entorno y Configuración

- [[Docs/DEVELOPMENT_ENVIRONMENT]] — Guía detallada del entorno de desarrollo: configuración de versiones exactas, scripts de gestión, flujo de trabajo recomendado y troubleshooting.
- [[Docs/ENVIRONMENT_SUMMARY]] — Resumen ejecutivo de la configuración del entorno: qué se configuró, cómo funciona ahora, comandos clave y verificación rápida.
- [[Docs/SETUP_INSTRUCTIONS]] — Instrucciones paso a paso para instalar y ejecutar el proyecto: requisitos, instalación automática/manual, URLs de acceso y configuración de red.

## Historial y Estado

- [[Docs/MIGRATION_LOG]] — Log completo del proceso de unificación de los 3 proyectos originales (React-Sportbar, Ajuste de canales, sportbar) en sportbar-unified.
- [[Docs/PROJECT_STATUS]] — Estado actual del proyecto unificado: funcionalidades verificadas, tecnologías integradas, scripts configurados y próximos pasos.

## Análisis

- [[Docs/Análisis de Tres Proyectos Sportbar]] — Transcripción del análisis original que dio origen a la unificación: exploración de los 3 proyectos, relación entre ellos y propuesta de integración.

## Referencias de API

- [[API commands/devices_all]] — Listado actualizado (14-02-2026) de todos los dispositivos conectados a la matriz Arranger: TVs, decodificadores DTV, encoders y dispositivos de audio.
- [[API commands/get_status]] — Documentación del comando `get status` de la API Arranger: estructura, argumentos, ejemplos y respuestas posibles.

## Wiki de Entidades

Ver [[wiki/index|catálogo completo de la wiki]].

### Componentes React
- [[wiki/Componentes/MatrizVideo]] — Control de matriz de video (828 líneas, 30+ comandos Arranger)
- [[wiki/Componentes/MatrizPreset]] — Sistema de 5 presets (cargar/grabar)
- [[wiki/Componentes/Canales]] — Gestión de canales por decodificador + grilla de favoritos
- [[wiki/Componentes/Audio]] — Control de audio en 3 zonas con comandos Tesira
- [[wiki/Componentes/Aside]] — Panel lateral con estado en tiempo real
- [[wiki/Componentes/Arranger]] — Links a interfaz web del Arranger
- [[wiki/Componentes/Contexto]] — Context API + estado inicial + inicialización de presets
- [[wiki/Componentes/App]] — Componente raíz: estado global + Context Provider

### APIs y Endpoints
- [[wiki/API/ArrangerApi]] — Cliente HTTP para Arranger IPEX5000 (join av, preset load, send serial)

### Dispositivos Hardware
- [[wiki/Dispositivos/Decodificadores]] — DTV1-DTV8, asignación de canales, comandos preset
- [[wiki/Dispositivos/ZonasAudio]] — Norte, Centro, Sur: fuentes, volumen, mute, comandos Tesira

### Conceptos
- [[wiki/Conceptos/StateManagement]] — Context API, localStorage, handlers globales
- [[wiki/Conceptos/SistemaPresets]] — 5 configuraciones guardables, cargar/grabar, localStorage keys

### Configuración
- [[wiki/Configuracion/ViteProxy]] — Proxy Vite `/api` → Arranger, chunks, dev server
- [[wiki/Configuracion/PnpmSetup]] — pnpm exclusivo, .npmrc, .nvmrc, overrides de seguridad

## Sources

<!-- Documentos ingeridos desde fuentes externas -->

## Decisions

<!-- Decisiones de diseño con justificación y tradeoffs -->

## Queries

<!-- Preguntas que produjeron respuestas valiosas -->
