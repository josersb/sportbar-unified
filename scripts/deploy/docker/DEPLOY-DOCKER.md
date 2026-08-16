# SportBar v1.1.0 — Deploy Docker (Linux)

## Requisitos del servidor

| Requisito | Mínimo |
|-----------|--------|
| SO | Linux (Debian 11+, Ubuntu 20.04+, Alpine) |
| Docker | ≥ 24.0 |
| Docker Compose | ≥ 2.0 (plugin) |
| RAM libre | 512 MB |
| Disco libre | 2 GB |
| Red | Acceso a 192.168.2.254 (Arranger) |

---

## 1. Instalar Docker (si no está)

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar para que el grupo aplique
```

---

## 2. Copiar archivos al servidor

Desde la máquina de desarrollo:

```powershell
# Opción A — SCP directo
scp -r releases/sportbar/v1.1.0/* user@192.168.2.191:~/sportbar/

# Opción B — Desde el repo
scp -r dist/ server/server.js server/package.json scripts/deploy/docker/ user@192.168.2.191:~/sportbar/
```

---

## 3. Configurar variables de entorno

```bash
cd ~/sportbar

# Crear .env con el token del Arranger
echo "VITE_ARRANGER_TOKEN=<TOKEN-REAL>" > .env
```

---

## 4. Build + Iniciar

```bash
cd ~/sportbar
docker compose -f scripts/deploy/docker/docker-compose.yml up -d --build
```

Salida esperada:
```
[+] Building 45.2s
[+] Running 2/2
 ✔ Network sportbar-net  Created
 ✔ Container sportbar-v1.1.0  Started
```

---

## 5. Verificar

```bash
# Health check
curl http://localhost:3051              # → HTML SPA
curl http://localhost:3051/api/state     # → JSON {"state":null}

# Logs
docker logs sportbar-v1.1.0

# Estado
docker ps --filter name=sportbar
```

---

## 6. Firewall (iptables)

```bash
# Permitir solo desde la LAN 192.168.2.0/24
sudo iptables -A INPUT -s 192.168.2.0/24 -p tcp --dport 3051 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3051 -j DROP

# Persistir (Debian/Ubuntu)
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

---

## 7. Rollback

```bash
docker compose -f scripts/deploy/docker/docker-compose.yml down
# Restaurar versión anterior
docker compose -f scripts/deploy/docker/docker-compose.yml up -d
```

---

## Comandos útiles

| Acción | Comando |
|--------|---------|
| Ver logs | `docker logs -f sportbar-v1.1.0` |
| Reiniciar | `docker compose -f scripts/deploy/docker/docker-compose.yml restart` |
| Detener | `docker compose -f scripts/deploy/docker/docker-compose.yml down` |
| Actualizar | `docker compose -f scripts/deploy/docker/docker-compose.yml up -d --build` |
| Ver uso recursos | `docker stats sportbar-v1.1.0` |
| Entrar al contenedor | `docker exec -it sportbar-v1.1.0 sh` |
| Backup state | `docker cp sportbar-v1.1.0:/app/data/state.json ./backup-state.json` |

---

## Hardening aplicado automáticamente

| Capa | Cómo se aplica en Docker |
|------|--------------------------|
| 1. npm | `RUN npm install --omit=dev --ignore-scripts` en el Dockerfile |
| 2. Proceso | `USER sportbar` (no root) |
| 3. Filesystem | `read_only: true` + volume solo para `/app/data` |
| 4. Red | `iptables` en el host. Contenedor en red bridge aislada |
| 5. Runtime | `entrypoint.sh` detecta versión de Node y aplica flags |
| 6. Contenedor | `cap_drop: ALL`, `no-new-privileges:true`, healthcheck |

---

## Estructura final en el servidor

```
~/sportbar/
├── .env                          ← VITE_ARRANGER_TOKEN
├── dist/                         ← SPA React build
├── server/
│   ├── server.js                 ← Express 4
│   └── package.json              ← express 4.22.2 + deps
├── scripts/deploy/docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .dockerignore
│   ├── entrypoint.sh
│   └── DEPLOY-DOCKER.md
└── data/                         ← volume: state.json + logs/
    ├── state.json                ← lowdb (persiste entre reinicios)
    └── logs/                     ← logs rotados por fecha
```
