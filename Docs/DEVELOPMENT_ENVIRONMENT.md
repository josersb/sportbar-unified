# 🛠️ SportBar Unified - Guía del Entorno de Desarrollo

> Proyecto principal: [[../README]] | Convenciones: [[../AGENTS]] | Resumen: [[ENVIRONMENT_SUMMARY]] | Setup: [[SETUP_INSTRUCTIONS]]

## 🎯 Configuración para Versiones Exactas

Este proyecto está configurado para mantener **versiones exactas** de todas las dependencias, evitando problemas de compatibilidad y garantizando reproducibilidad entre diferentes entornos.

## 📋 Configuración Automática

### ✅ Ya Configurado en el Proyecto:

1. **`.npmrc` Principal**: Configurado con `save-exact=true`
2. **`.npmrc` Servidor**: Configurado para el entorno Express
3. **`package.json`**: Todas las versiones sin rangos (^, ~)
4. **Scripts automatizados**: Para gestión de versiones

## 🚀 Comandos de Gestión de Versiones

### Verificación
```bash
# Verificar si hay versiones con rangos
pnpm run check-versions

# Auditoría completa del proyecto
pnpm run audit-versions

# Listar todas las dependencias
pnpm run list-versions
```

### Corrección
```bash
# Corregir versiones a exactas automáticamente
pnpm run fix-versions

# Instalar con versiones exactas
pnpm run install-exact
```

### Instalación de Nuevas Dependencias
```bash
# SIEMPRE se instalarán con versión exacta debido a .npmrc
pnpm install package-name
pnpm install --save-dev dev-package

# Verificar que se instaló con versión exacta
pnpm run check-versions
```

## 🔧 Archivos de Configuración

### `.npmrc` (Raíz del Proyecto)
```ini
# Versiones exactas por defecto
save-exact=true
package-lock=true
audit-level=moderate
fund=false
prefer-offline=true
loglevel=notice
registry=https://registry.npmjs.org/
engine-strict=true
progress=true
omit=optional
fetch-timeout=30000
```

### `.npmrc` (Servidor)
```ini
# Configuración para servidor Express
save-exact=true
package-lock=true
production=false
audit-level=moderate
fund=false
loglevel=error
engine-strict=true
dev=false
fetch-timeout=20000
omit=optional
```

## 📊 Version Manager Script

### Comandos Disponibles:
```bash
# Verificar configuración
node scripts/version-manager.cjs check

# Corregir versiones automáticamente
node scripts/version-manager.cjs fix

# Instalar con versiones exactas
node scripts/version-manager.cjs install

# Listar dependencias con estado
node scripts/version-manager.cjs list

# Auditoría completa
node scripts/version-manager.cjs audit

# Ayuda
node scripts/version-manager.cjs help
```

## 🎮 Flujo de Desarrollo Recomendado

### 1. Instalación Inicial
```bash
# Setup completo con versiones exactas
pnpm run setup:auto

# Verificar configuración
pnpm run audit-versions
```

### 2. Agregar Nueva Dependencia
```bash
# Instalar nueva dependencia (será exacta automáticamente)
pnpm install nueva-dependencia

# Verificar que se instaló correctamente
pnpm run check-versions

# Si hay algún problema, corregir
pnpm run fix-versions
```

### 3. Desarrollo Diario
```bash
# Iniciar desarrollo
pnpm run dev

# O desarrollo completo (frontend + backend)
pnpm run dev:full
```

### 4. Antes de Commit
```bash
# Verificar estado de versiones
pnpm run audit-versions

# Si hay problemas, corregir
pnpm run fix-versions

# Build para verificar compatibilidad
pnpm run build
```

## 🔒 Beneficios de Versiones Exactas

### ✅ Ventajas:
- **Reproducibilidad**: Mismo comportamiento en todos los entornos
- **Estabilidad**: Sin sorpresas por actualizaciones automáticas
- **Debugging**: Easier troubleshooting con versiones conocidas
- **Despliegue**: Builds consistentes en producción

### ⚠️ Consideraciones:
- **Actualizaciones manuales**: Hay que actualizar dependencias conscientemente
- **Seguridad**: Revisar regularmente vulnerabilidades
- **Compatibilidad**: Testing necesario antes de actualizar

## 🔄 Gestión de Actualizaciones

### Verificar Dependencias Desactualizadas:
```bash
# Ver paquetes desactualizados
npm outdated

# Ver vulnerabilidades
npm audit
```

### Actualizar Dependencias:
```bash
# Actualizar una dependencia específica
pnpm install package-name@1.2.3

# Actualizar todas (CUIDADO: testing requerido)
npm update

# Verificar que siguen siendo exactas
pnpm run check-versions
```

## 🚨 Troubleshooting

### Problema: Dependencia se instaló con rango (^, ~)
```bash
# Solución automática
pnpm run fix-versions

# Solución manual: editar package.json y remover ^ o ~
# Luego reinstalar
pnpm install
```

### Problema: .npmrc no funciona
```bash
# Verificar contenido
cat .npmrc

# Recrear .npmrc
echo "save-exact=true" > .npmrc
echo "package-lock=true" >> .npmrc
```

### Problema: Diferencias entre entornos
```bash
# Limpiar completamente
pnpm run clean

# Reinstalar todo
pnpm run setup:auto

# Verificar
pnpm run audit-versions
```

## 📁 Estructura de Archivos de Configuración

```
sportbar-unified/
├── .npmrc                          # Config NPM principal
├── package.json                    # Deps exactas principales
├── pnpm-lock.yaml               # Lock file principal
├── server/
│   ├── .npmrc                      # Config NPM servidor
│   ├── package.json                # Deps exactas servidor
│   └── pnpm-lock.yaml           # Lock file servidor
└── scripts/
    └── version-manager.cjs          # Gestor de versiones
```

## 🎯 Mejores Prácticas

### DO ✅
- Usar `pnpm run setup:auto` para nuevos desarrolladores
- Ejecutar `pnpm run audit-versions` regularmente
- Commit de `pnpm-lock.yaml` siempre
- Revisar dependencias antes de actualizar
- Usar scripts automatizados del proyecto

### DON'T ❌
- No editar versiones manualmente sin verificar
- No ignorar `pnpm-lock.yaml`
- No usar `npm update` sin testing
- No instalar dependencias globales innecesarias
- No omitir verificaciones antes de commits

## 🔍 Monitoreo Continuo

### Scripts de Verificación:
```bash
# En tu workflow diario
pnpm run audit-versions    # Estado general
pnpm run check-versions    # Verificación rápida
pnpm run list-versions     # Vista detallada
```

### Integración CI/CD:
```bash
# Agregar a pipeline de CI
pnpm run audit-versions
pnpm run build
pnpm run test
```

## 📞 Soporte

Si encuentras problemas con la gestión de versiones:

1. **Verificar**: `pnpm run audit-versions`
2. **Corregir**: `pnpm run fix-versions`
3. **Limpiar**: `pnpm run clean`
4. **Reinstalar**: `pnpm run setup:auto`

### Logs Útiles:
```bash
# Ver versiones instaladas
npm list --depth=0

# Ver configuración NPM actual
npm config list

# Ver ubicación de .npmrc
npm config get userconfig
```

---

**🏆 Con esta configuración, todas las nuevas dependencias se instalarán automáticamente con versiones exactas, manteniendo la estabilidad y reproducibilidad del proyecto SportBar.**

**¡Tu entorno de desarrollo está optimizado para máxima consistencia! ⚽🏀🏈**