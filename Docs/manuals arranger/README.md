# Manuales y Documentación Técnica — Arranger, IPEX y Liberty AV

Documentación oficial de **Liberty AV Solutions** (antes DigitaLinx IP) — fabricante principal de los equipos Arranger IPEXCB, encoders IPEX5001, decoders IPEX5002 y periféricos del sistema SportBar.

> **Sitio oficial**: [secure.libertycable.com](https://secure.libertycable.com/)

---

## Estructura del directorio

| Directorio | Contenido | Archivos |
|---|---|---|
| `pdf/` | Manuales originales en PDF | 11 |
| `zip/` | Drivers, plugins, CAD, Revit | 4 |
| `txt/` | Notas, presets, tutoriales | 2 |
| `markdown/` | Extracciones LLM-ready con pdf-inspector | 6 |

---

## Catálogo de PDFs

### API y Comandos (fuentes primarias para `arrangerApi.js`)

| Archivo | Descripción | Versión | Prioridad |
|---|---|---|---|
| `Arranger_DigiIP_5000_API.pdf` | API Guide completa — 67 comandos (join, leave, send, get, set, preset, notify) con sintaxis, argumentos, return values y ejemplos | **V1.4.0.0** (Rev 240207) | 🔴 Principal |
| `210826 Arranger DigiIP 5000 API Guide.pdf` | API Guide anterior — incluye `notify message/multicast/UDP` y `get encoder` ya removidos en V1.4 | Rev 210826 | ⚪ Histórico |
| `Arranger_DigiIP_5000_User_Manual_PRESET-LOGIC.pdf` | Lógica de presets: operadores, variables, comandos condicionales, patrones `send tcp reply` | — | 🔴 Presets |

### Manuales de Usuario

| Archivo | Descripción | Estado |
|---|---|---|
| `Arranger_DigiIP_5000_User_Manual.pdf` | Manual completo (~11 MB) — UI, configuración, Command Assistant | ✅ Convertido a MD |
| `arranger-ip5000-user-manual.pdf` | Manual del controlador IPEXCB Arranger IP5000 | ❌ PDF escaneado — no convertible |
| `Páginas desdeArranger_DigiIP_5000_User_Manual_1689paginas.pdf` | Extracto de 1689 páginas — **95% duplicado del User Manual completo** | ⚪ Descartable |

### Instalación y Especificaciones

| Archivo | Descripción | Relevancia |
|---|---|---|
| `IPEX5000_Specification_Sheet.pdf` | Especificaciones técnicas: resoluciones, latencia, PoE, RS232 baud rates | 🟡 Para `send serial` |
| `ipex5001-installation-manual.pdf` | Instalación física del encoder IPEX5001 | ⚪ |
| `Digi_IP_5000_and_Arranger_Installation.pdf` | Guía de instalación conjunta | ⚪ |
| `Getting_Started_DigiIP_5000_5100_Series_Arranger.pdf` | Guía de inicio rápido | ⚪ |
| `5000_Series_Firmware_Update_Guide_v2.1.5.pdf` | Actualización de firmware | ⚪ |

---

## Archivos ZIP

| Archivo | Contenido |
|---|---|
| `IPEX5001 - 3D Revit Files.zip` | Modelos 3D Revit para IPEX5001 |
| `IPEX5001 - CAD Files.zip` | Archivos CAD para IPEX5001 |
| `IPEX5100 Crestron Driver.zip` | Driver de integración Crestron para IPEX5100 |
| `QSC Plugin 5100 Series.zip` | Plugin QSC para serie 5100 |

---

## Archivos de texto

| Archivo | Contenido |
|---|---|
| `NEW PRESET ARRENGER.txt` | Configuración de presets actuales del Arranger en el bar |
| `Tutorial como cargar nuevo canal.txt` | Procedimiento para agregar canales IR a los decos DirecTV |

---

## Extracciones Markdown

Generados el **25 jul 2026** con [pdf-inspector](https://github.com/firecrawl/pdf-inspector) v0.2.5 — motor Rust con bindings Python que clasifica PDFs (text_based/scanned), extrae texto con posición, y convierte a Markdown estructurado (headings, tablas, listas, TOC) en ~700ms por PDF. Instalación: `pip install pdf-inspector`.

| Archivo MD | Fuente PDF | Chars | Utilidad |
|---|---|---|---|
| `Arranger_DigiIP_5000_API.md` | `pdf/Arranger_DigiIP_5000_API.pdf` | 178,415 | 🔴 API V1.4.0.0 — fuente principal para `arrangerApi.js` |
| `210826 Arranger DigiIP 5000 API Guide.md` | `pdf/210826 Arranger DigiIP 5000 API Guide.pdf` | 86,317 | ⚪ API antigua — solo si V1.4 falla |
| `Arranger_DigiIP_5000_User_Manual.md` | `pdf/Arranger_DigiIP_5000_User_Manual.pdf` | 125,783 | 🟡 Contexto, Command Assistant, UI |
| `Arranger_DigiIP_5000_User_Manual_PRESET-LOGIC.md` | `pdf/Arranger_DigiIP_5000_User_Manual_PRESET-LOGIC.pdf` | 30,203 | 🔴 Lógica de presets (básica) |
| `Páginas desdeArranger_DigiIP_5000_User_Manual_1689paginas.md` | `pdf/Páginas desde...1689paginas.pdf` | 94,055 | ⚪ 95% duplicado del User Manual |
| `IPEX5000_Specification_Sheet.md` | `pdf/IPEX5000_Specification_Sheet.pdf` | 17,923 | 🟡 Especificaciones técnicas |

### Comparativa entre versiones de API

| | V210826 (OLD) | V1.4.0.0 (NEW) |
|---|---|---|
| Comandos documentados | 53 | 67 |
| Estructura | Plana, syntax inline | Numerada (4.1, 4.2...), organizada por categorías |
| Formato por comando | Syntax + ejemplos sueltos | usage → description → arguments → notes → return value → examples |
| Exclusivos OLD | `get encoder`, `notify message/multicast/UDP`, `notify beacons` | — |
| Exclusivos NEW | — | `join usb_ext`, `get joins`, `get matrix`, `send cec_on/off`, `get/set events`, `ui_indicator/slider`, `set ui_redirect/revert` |

**Conclusión**: V1.4.0.0 cubre ~95% del contenido de V210826. Los 5 comandos exclusivos de OLD son marginales para SportBar.

---

## Hallazgos documentados en la wiki (sesión 25 jul 2026)

### Páginas nuevas (12)

| Página | Tipo | Contenido |
|---|---|---|
| [[../wiki/API/GetStatus]] | API | Comando `get status` — estado de dispositivo/stream |
| [[../wiki/API/GetDevices]] | API | Comando `get devices` — listar dispositivos conectados |
| [[../wiki/API/GetMatrix]] | API | Comando `get matrix` — estado JSON de la matriz por stream |
| [[../wiki/API/GetJoins]] | API | Comando `get joins` — encoder suscrito a cada decoder |
| [[../wiki/API/LeaveAv]] | API | Comando `leave av` — desconectar video+audio |
| [[../wiki/API/SendIr]] | API | Comando `send ir` — códigos infrarrojos Pronto HEX |
| [[../wiki/API/SendSerial]] | API | Comando `send serial` — datos RS-232 con terminador |
| [[../wiki/API/JoinAv]] | API | Comando `join av` — enrutamiento combinado video+audio |
| [[../wiki/API/ArrangerHttpExamples]] | API | Ejemplos HTTP GET/POST, seguridad key, AJAX/fetch |
| [[../wiki/Conceptos/ArrangerPresetLogic]] | Concepto | Operadores, variables, comandos condicionales, patrones serial |
| [[../wiki/Conceptos/APIErrorHandling]] | Concepto | Catálogo de 20+ errores, análisis del manejo actual |
| [[../wiki/Conceptos/ArrangerEventFlow]] | Concepto | Notificaciones push TCP (notify serial/network/display/source) |

### Páginas actualizadas (4)

| Página | Cambios |
|---|---|
| [[../wiki/API/ArrangerApi]] | Catálogo completo de 67 comandos, conteo de implementados (10/67) |
| [[../wiki/Dispositivos/Arranger-IPEXCB]] | Referencia al fabricante Liberty AV |
| [[../wiki/Dispositivos/IPEX5002-Decoder]] | RS232 specs, resoluciones, latencia, PoE, DIP switch |
| [[../wiki/index]] | 12 nuevas entradas, link Liberty AV |

---

## Comandos implementados en `arrangerApi.js`

| # | Comando API | Función | Estado |
|---|---|---|---|
| 1 | `join av` | `assignSourceToDestination()` | ✅ |
| 2 | `join video` | `assignVideoSource()` | ✅ |
| 3 | `join audio` | `assignAudioSource()` | ✅ |
| 4 | `send ir` | `sendIrCommand()` | ✅ |
| 5 | `send serial` | `sendSerialCommand()` | ⚠️ Bug documentado (`\\x0A` literal) |
| 6 | `preset load` (canal) | `loadChannelPreset()` | ✅ |
| 7 | `preset load` (matriz) | `loadMatrixPreset()` | ✅ (nuevo 25 jul) |
| 8 | `get devices` | `getDevices()` | ✅ (nuevo 25 jul) |
| 9 | `get status` | `getStatus()` | ✅ (nuevo 25 jul) |
| 10 | `get matrix` | `getMatrix()` | ✅ (nuevo 25 jul) |
| 11 | `get joins` | `getJoins()` | ✅ (nuevo 25 jul) |
| 12 | `leave av` | `leaveAv()` | ✅ (nuevo 25 jul) |

**Cobertura**: 12/67 comandos (18%). El wrapper genérico `sendArrangerCommand()` permite enviar cualquier comando — la brecha es de API surface, no de capacidad técnica.

---

## Documentación relacionada

| Documento | Ubicación |
|---|---|
| Plan de optimización de lógica API | [[../development/planning/api-logic-optimization]] |
| Roadmap del proyecto | [[../development/roadmap]] |
| Guía de pruebas en el bar | [[../development/testing/prueba-bar-2026-07-25]] |

---

## Referencias externas

- **Liberty AV Solutions**: [secure.libertycable.com](https://secure.libertycable.com/)
- **pdf-inspector**: [github.com/firecrawl/pdf-inspector](https://github.com/firecrawl/pdf-inspector)
- **Wiki API Arranger**: [[../wiki/API/ArrangerApi]]
- **Dispositivo Arranger**: [[../wiki/Dispositivos/Arranger-IPEXCB]]
