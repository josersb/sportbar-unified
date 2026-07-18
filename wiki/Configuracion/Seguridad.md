# Seguridad

Configuración de seguridad del servidor Express y buenas prácticas aplicadas al proyecto.

## Server (Express)

### Helmet
Middleware de seguridad que agrega headers HTTP: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, X-DNS-Prefetch-Control.

**CSP configurado**:
- `scriptSrc`: `'self'` + `'unsafe-inline'` (necesario para React)
- `styleSrc`: `'self'` + `'unsafe-inline'`
- `connectSrc`: `'self'` + `localhost:5173` + `192.168.2.254`
- `frameSrc`: `'self'` + `192.168.2.254` (iframe del Arranger)

### CORS restrictivo
Orígenes permitidos: `localhost:5173`, `localhost:3000`, `127.0.0.1:*`, `192.168.2.x:*`. Reemplaza el `*` anterior.

### Rate Limiting
`/api/state`: 100 requests por ventana de 15 minutos.

### Body Parser
Límite de 1MB en `express.json()`.

## Código fuente

### Token
El token del Arranger (`VITE_ARRANGER_TOKEN`) fue removido del código fuente y del historial git (filter-branch). Se lee exclusivamente de `.env`.

### .env.example
Template sin token real para nuevos desarrolladores.

### Tabnabbing
Todos los `target="_blank"` en [[../Componentes/Arranger]] incluyen `rel="noopener noreferrer"`.

## Pendiente (CVEs)

| Paquete | Versión actual | CVE | Severidad |
|---------|---------------|-----|-----------|
| vitest | 2.1.9 | GHSA-5xrq-8626-4rwp | CRITICAL |
| shell-quote | 1.8.3 | GHSA-w7jw-789q-3m8p | CRITICAL |
| vite | 5.4.21 | GHSA-fx2h-pf6j-xcff | HIGH |
| react-router | 6.30.3 | GHSA-2j2x-hqr9-3h42 | MODERATE |

## Relaciones

- [[../README]] — documentación general
- [[../Configuracion/PnpmSetup]] — gestor de paquetes
- [[../Configuracion/ViteProxy]] — proxy de desarrollo
