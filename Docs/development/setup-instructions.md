# 🏆 SportBar Unified - Instrucciones de Configuración

> Documentación principal: [[../README]] | Entorno de desarrollo: [[DEVELOPMENT_ENVIRONMENT]] | Estado del proyecto: [[PROJECT_STATUS]]

## ⚠️ Configuración Pendiente

El proyecto SportBar Unified ha sido **unificado exitosamente**, pero requiere completar la instalación de dependencias.

## 📋 Requisitos Previos

### 1. Instalar Node.js
Descargar e instalar Node.js 18.17.1 desde:
- **Sitio oficial**: https://nodejs.org/
- **Versión recomendada**: LTS (Long Term Support)

### 2. Verificar Instalación
Abrir terminal/consola y ejecutar:
```bash
node --version
npm --version
```

Debe mostrar las versiones instaladas (ej: v18.17.0)

## 🚀 Instalación del Proyecto

### Opción 1: Instalación Automática (Recomendada)
```bash
cd "Proyectos VS Code/sportbar-unified"
pnpm run setup:auto
```

### Opción 2: Instalación Manual
```bash
# 1. Navegar al directorio del proyecto
cd "Proyectos VS Code/sportbar-unified"

# 2. Instalar dependencias principales
pnpm install

# 3. Instalar dependencias del servidor
cd server
pnpm install
cd ..

# 4. Ejecutar build inicial
pnpm run build
```

## 🎮 Comandos de Ejecución

### Desarrollo
```bash
pnpm run dev          # Servidor desarrollo (puerto 5173)
```

### Producción
```bash
pnpm run start        # Build completo + servidor (puerto 3000)
pnpm run serve        # Solo servidor producción
```

### Desarrollo Completo (Recomendado)
```bash
pnpm run dev:full     # Desarrollo + servidor simultáneo
```

## 🌐 URLs de Acceso

Una vez iniciado el servidor:

- **Desarrollo**: http://localhost:5173
- **Producción**: http://localhost:3000

### Rutas de la Aplicación
- `/` - Portada principal
- `/matrizvideo` - Control de matriz de video
- `/canales` - Gestión de canales deportivos
- `/audio` - Control de audio por zonas
- `/arranger` - Interface matriz Arranger
- `/soporte` - Información de soporte

## ⚙️ Configuración de Red

### Matriz Arranger
El sistema se conecta a la matriz audiovisual en:
- **IP**: 192.168.2.254
- **Puerto**: 80
- **API**: /api/command/

### Verificar Conectividad
```bash
ping 192.168.2.254
```

## 📂 Estructura del Proyecto Unificado

```
sportbar-unified/
├── src/                     # Código fuente React
│   ├── componentes/         # Componentes React
│   ├── contexto/            # Estado global
│   ├── elementos/           # Componentes reutilizables
│   ├── hooks/               # Custom hooks
│   └── imagenes/            # Logos canales deportivos
├── server/                  # Servidor Express producción
├── public/                  # Assets estáticos
├── dist/                    # Build producción (generado)
├── .env                     # Variables de entorno
├── package.json             # Dependencias principales
├── vite.config.js           # Configuración Vite
└── README.md                # Documentación completa
```

## ✅ Funcionalidades Unificadas

### Control de Video
- **40+ TVs**: Control distribuido por zonas
- **8 Decodificadores**: DirecTV (DTV1-DTV8)
- **Matriz Audiovisual**: Integración API Arranger
- **Asignación Dinámica**: TV ↔ Decodificador

### Gestión de Canales
- **Canales Deportivos**: ESPN, Fox Sports, DirecTV Sports
- **Interface Visual**: Logos y números de canal
- **Favoritos**: Lista personalizable
- **Control Directo**: Cambio de canal en tiempo real

### Control de Audio
- **3 Zonas**: Norte, Centro, Sur
- **Control Individual**: Volumen y mute por zona
- **Fuentes**: Selección de decodificador
- **Sincronización**: Video + Audio coordinado

### Sistema de Presets
- **5 Configuraciones**: Guardado completo de estado
- **Descriptions**: Etiquetas personalizables
- **Carga Rápida**: Un clic para aplicar preset
- **Persistencia**: LocalStorage automático

## 🔧 Integración con Proyectos Anteriores

Este proyecto **UNIFICA** los 3 proyectos originales. Ver [[MIGRATION_LOG]] y [[Análisis de Tres Proyectos Sportbar]] para el historial completo.

### Proyectos Originales Integrados:
1. **React-Sportbar** → Código fuente principal
2. **Ajuste de canales - sportbar** → Versión producción
3. **sportbar** → Segunda versión producción

### Beneficios de la Unificación:
- ✅ **Eliminación duplicación** de código
- ✅ **Flujo unificado** desarrollo → producción
- ✅ **Mantenimiento simplificado**
- ✅ **Versionado coherente**
- ✅ **Scripts automatizados**

## 🚨 Troubleshooting

### Error: npm command not found
```bash
# Instalar Node.js desde https://nodejs.org/
# Reiniciar terminal después de instalación
```

### Error: Cannot find module
```bash
pnpm install  # Reinstalar dependencias
```

### Error: Permission denied
```bash
# Windows: Ejecutar como administrador
# Linux/Mac: sudo pnpm install
```

### Error: Port already in use
```bash
# Cambiar puerto en package.json o .env
# O terminar proceso: npx kill-port 3000
```

### Error conexión Arranger
```bash
# Verificar IP: ping 192.168.2.254
# Revisar configuración en .env
```

## 📞 Soporte

### Logs del Sistema
```bash
# Servidor desarrollo
pnpm run dev

# Servidor producción
pnpm run serve
# Ver logs en consola
```

### Archivos de Configuración
- **.env** - Variables de entorno locales
- **vite.config.js** - Configuración build
- **server/package.json** - Dependencias servidor

### Estado de la Aplicación
- **LocalStorage** navegador contiene configuración
- **5 Presets** guardados automáticamente
- **Recovery** automático al recargar página

## 🎯 Próximos Pasos

1. **Instalar Node.js** (si no está instalado)
2. **Ejecutar**: `pnpm run setup:auto`
3. **Iniciar desarrollo**: `pnpm run dev`
4. **Probar funcionalidades** en http://localhost:5173
5. **Configurar red** matriz Arranger
6. **Personalizar** configuración en .env

## 📖 Documentación Completa

Ver archivo **[[../README|README.md]]** para documentación técnica detallada.

---

**¡Sistema SportBar Unified listo para tu experiencia audiovisual! 🏆**

Una vez completada la instalación, tendrás acceso a:
- Control completo de matriz audiovisual
- Gestión intuitiva de canales deportivos  
- Sistema de presets para configuraciones rápidas
- Interface moderna y responsive
- Integración directa con hardware Arranger

**¡Disfruta tu SportBar completamente automatizado!** ⚽🏀🏈