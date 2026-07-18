# SportBar Unified 🏆

Sistema unificado de control para SportBar - Gestión integral de matriz audiovisual, canales deportivos y control de audio por zonas.

> Convenciones del proyecto y arquitectura: [[AGENTS]] | [[index|Índice de la wiki]] | [[log|Log de cambios]]

## 📋 Descripción

SportBar Unified es una aplicación web React que permite controlar de manera centralizada todos los aspectos audiovisuales de un SportBar, incluyendo:

- **Control de Matriz de Video**: Gestión de 30 televisores distribuidos por zonas
- **Gestión de Canales**: Interface intuitiva para canales deportivos (ESPN, Fox Sports, DirecTV Sports, etc.)
- **Control de Audio**: Manejo independiente por zonas (Norte, Centro, Sur)
- **Sistema de Presets**: 5 configuraciones predefinidas guardables
- **Integración Arranger**: Control directo de matriz audiovisual via API HTTP

## 🚀 Características Principales

### Control de TVs
- 47 destinos de video: 26 TVs principales + 3 VWs + TVRACK + 7 grupos de zona + 10 Zonas Adicionales (IPEX5002)
- TVs por zonas: Barras, Escaleras, Rack, VIP, Planta -1, +15
- Asignación dinámica de decodificadores DirecTV (DTV1-DTV8)
- Labels legibles y colores por dispositivo en TVRACK

### Gestión de Canales
- Catálogo completo de canales deportivos
- Canales favoritos personalizables
- Interface visual con logos de canales
- Control directo de decodificadores

### Control de Audio
- 3 zonas independientes: Norte, Centro, Sur
- Control de volumen individual por zona
- Función mute por zona
- Selección de fuente de audio
- Procesador Tesira vía comandos seriales (gateway DTV1 RS232)

### Sistema de Presets
- 5 configuraciones completas guardables
- Descripción personalizable de cada preset
- Carga instantánea de configuraciones
- Persistencia dual: localStorage + lowdb (servidor)

### Seguridad
- Helmet: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- CORS restrictivo a orígenes conocidos
- Rate limiting en API de estado
- Token del Arranger en .env (no en código)

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18.3.1** - Framework principal
- **React Router DOM 6.30.3** - Navegación SPA
- **Styled Components 6.1.0** - Estilos CSS-in-JS
- **Formik 2.2.9** - Gestión de formularios
- **React Hook Form 7.53.0** - Formularios alternativos
- **React Select 5.8.0** - Componentes select avanzados
- **FontAwesome 6.1.2** - Iconografía

### Build & Development
- **Vite 5.4.21** - Build tool y dev server
- **@vitejs/plugin-react 4.3.1** - Plugin React para Vite

Configuración detallada del entorno: [[Docs/DEVELOPMENT_ENVIRONMENT]] | [[Docs/ENVIRONMENT_SUMMARY]]

### Backend
- **Express.js 4.19.2** - Servidor web para producción
- **CORS** configurado para integración Arranger

## 📁 Estructura del Proyecto

```
sportbar-unified/
├── src/                          # Código fuente React
│   ├── componentes/              # Componentes React
│   │   ├── Body.jsx             # Componente principal con routing
│   │   ├── Header.jsx           # Cabecera de la aplicación
│   │   ├── Nav.jsx              # Navegación principal
│   │   ├── Aside.jsx            # Panel lateral
│   │   ├── MatrizVideo.jsx      # Control de matriz de video
│   │   ├── Canales.jsx          # Gestión de canales
│   │   ├── Audio.jsx            # Control de audio
│   │   ├── Arranger.jsx         # Interface Arranger
│   │   └── Soporte.jsx          # Información de soporte
│   ├── contexto/                # Context API de React
│   │   └── Contexto.jsx         # Estado global de la aplicación
│   ├── elementos/               # Componentes reutilizables
│   ├── hooks/                   # Custom hooks
│   └── imagenes/                # Logos de canales deportivos
├── public/                       # Assets estáticos
│   └── logos/                   # Logos adicionales
├── server/                       # Servidor Express
│   ├── server.js                # Servidor de producción
│   └── package.json             # Dependencias del servidor
├── dist/                        # Build de producción (generado)
├── package.json                 # Configuración principal
├── vite.config.js              # Configuración Vite
└── README.md                   # Esta documentación
```

## ⚡ Instalación y Configuración

### Requisitos Previos
- Node.js 18.17.1
- NPM o Yarn

### Instalación Completa

Ver [[Docs/SETUP_INSTRUCTIONS]] para guía paso a paso.

```bash
# Clonar e instalar dependencias
cd sportbar-unified
pnpm run setup

# O manualmente:
pnpm install
pnpm run install:server
```

### Configuración de Red
El sistema se conecta a la matriz Arranger en:
```
IP: 192.168.2.254
Puerto: 80
API: /api/command/
```

Referencia de comandos: [[API commands/devices_all]] | [[API commands/get_status]]

## 🎮 Comandos Disponibles

### Desarrollo
```bash
pnpm run dev          # Servidor de desarrollo (puerto 5173)
pnpm run dev:full     # Desarrollo + servidor producción simultáneo
```

### Producción
```bash
pnpm run build        # Compilar para producción
pnpm run preview      # Vista previa del build
pnpm run serve        # Servidor de producción (puerto 3000)
pnpm run start        # Build + servidor completo
```

### Mantenimiento
```bash
pnpm run lint         # Linting (pendiente configurar)
pnpm run test         # Tests (pendiente configurar)
```

## 🌐 URLs de Acceso

- **Desarrollo**: http://localhost:5173
- **Producción**: http://localhost:3000

### Rutas de la Aplicación
- `/` - Portada principal
- `/matrizvideo` - Control de matriz de video
- `/canales` - Gestión de canales
- `/audio` - Control de audio
- `/arranger` - Interface Arranger
- `/soporte` - Información de soporte

## 📊 Estado de la Aplicación

Estado completo del proyecto: [[Docs/PROJECT_STATUS]]

### Estructura de Datos
El estado global incluye:

```javascript
{
  decos: [          // 8 decodificadores DirecTV
    {
      nombreDeco: "DTV1",
      canalDeco: "1603"
    }
    // ... DTV2-DTV8
  ],
  tvs: {           // Asignación TV -> Decodificador
    VWN: "DTV1",
    VWC: "DTV1",
    TV01: "DTV1"
    // ... todos los TVs
  },
  audio: [         // 3 zonas de audio
    {
      nombreZona: "Sur",
      fuenteAudio: "DTV1",
      volumen: "-21",
      mute: false
    }
    // ... Centro, Norte
  ],
  favoritos: [     // Canales favoritos
    1603, 1604, 1605, ...
  ]
}
```

### Persistencia
- **localStorage**: Estado principal de la aplicación
- **5 Presets**: `estadoApp_Preset1` a `estadoApp_Preset5`
- **Recuperación automática**: Al recargar la página

## 🔧 Integración Arranger

### Comandos de Matriz
```javascript
// Ejemplo de comando para unir fuente a destino
const url = `http://192.168.2.254/api/command/join%20av%20DTV1%20TVRACK/TOKEN_REMOVED`;
fetch(url, { method: "GET", mode: "no-cors" });
```

### API Calls
- **Protocolo**: HTTP GET
- **Modo**: no-cors
- **Formato**: `/api/command/join av [SOURCE] [DESTINATION]/[TOKEN]`

## 📺 Canales Deportivos Soportados

- ESPN (1603, 1604, 1605)
- ESPN Premium HD
- Fox Sports (1608, 1621, 1629)
- DirecTV Sports (1631, 1644)
- DeporTV, TyC Sports, TNT Sports
- NBA TV, Golf Channel
- Y más...

## 🎯 Casos de Uso Principales

### Configuración Rápida de Evento
1. Seleccionar canales en decodificadores
2. Asignar TVs por zonas
3. Configurar audio independiente
4. Guardar como preset para reutilizar

### Control Durante Eventos
1. Cambio rápido de canales
2. Ajuste de volumen por zonas
3. Silenciado selectivo
4. Monitoreo visual del estado

### Gestión de Múltiples Eventos
1. Cargar preset específico
2. Ajustes finos en tiempo real
3. Guardar nueva configuración
4. Documentar configuración

## 🚨 Troubleshooting

### Problemas Comunes
1. **Error de conexión Arranger**: Verificar IP 192.168.2.254
2. **Estado no persiste**: Revisar localStorage del navegador
3. **Canales no cambian**: Verificar conexión decodificadores
4. **Audio no responde**: Revisar matriz de audio

### Logs del Servidor
```bash
cd server
pnpm start
# Ver logs en consola
```

## 🔄 Migración desde Proyectos Anteriores

Este proyecto unifica:
- **React-Sportbar**: Código fuente principal
- **Ajuste de canales - sportbar**: Versión de producción
- **sportbar**: Otra versión de producción

Historial completo: [[Docs/MIGRATION_LOG]] | Análisis original: [[Docs/Análisis de Tres Proyectos Sportbar]]

### Beneficios de la Unificación
- ✅ Eliminación de duplicación
- ✅ Flujo desarrollo → producción unificado
- ✅ Mantenimiento simplificado
- ✅ Versionado coherente
- ✅ Deploy automatizado

## 🤝 Contribución

Convenciones de IA y arquitectura: [[AGENTS]]

### Estructura de Commits
```
feat: nueva funcionalidad
fix: corrección de bug
docs: documentación
style: formateo
refactor: refactorización
test: pruebas
```

### Workflow de Desarrollo
1. Desarrollo en `pnpm run dev`
2. Testing de funcionalidad
3. Build con `pnpm run build`
4. Testing en producción con `pnpm run serve`
5. Deploy

## 📄 Licencia

ISC License - SportBar Team

---

## 📞 Soporte

Para soporte técnico, consultar la sección `/soporte` en la aplicación o contactar al equipo de desarrollo.

**¡Sistema SportBar listo para controlar tu experiencia audiovisual! 🏆**