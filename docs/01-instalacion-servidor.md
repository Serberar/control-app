# Guía de instalación del servidor

## Requisitos previos

- Ubuntu Server 20.04+ con acceso root
- Docker y Docker Compose instalados (`docker --version` ≥ 24, `docker compose version` ≥ 2)
- Nginx ya instalado y funcionando
- Certbot con Let's Encrypt configurado
- Un dominio con DDNS apuntando al servidor (p.ej. `control.tudominio.com`)
- Puerto 80 y 443 abiertos en el firewall

---

## 1. Clonar / copiar el proyecto

```bash
# En el servidor, crea el directorio de la app
mkdir -p /opt/control-parental
cd /opt/control-parental

# Copia la carpeta backend desde tu máquina de desarrollo
# (o usa git si tienes repositorio)
scp -r ./backend usuario@tuservidor:/opt/control-parental/
```

---

## 2. Crear el archivo de variables de entorno

```bash
cd /opt/control-parental/backend
cp .env.example .env
nano .env
```

Rellena todos los valores:

```env
# Base de datos
DB_HOST=control-db
DB_PORT=5432
DB_NAME=control_parental
DB_USER=control_user
DB_PASSWORD=cambia_esta_contraseña_segura

# JWT — genera con: openssl rand -hex 64
JWT_SECRET=pon_aqui_un_secreto_aleatorio_largo
JWT_REFRESH_SECRET=otro_secreto_diferente_para_refresh

# Servidor
NODE_ENV=production
PORT=3000
SERVER_URL=https://control.tudominio.com

# Firebase (para notificaciones push)
FIREBASE_PROJECT_ID=tu-proyecto-firebase
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 3. Crear el volumen para archivos

```bash
# Carpetas para galería y capturas de pantalla
mkdir -p /opt/control-parental/volumes/media
mkdir -p /opt/control-parental/volumes/screenshots
chmod 755 /opt/control-parental/volumes
```

---

## 4. Levantar los contenedores

```bash
cd /opt/control-parental/backend
docker compose up -d

# Verificar que están arriba
docker compose ps
# Deberías ver:
#   control-api   running   0.0.0.0:3000->3000/tcp
#   control-db    running   5432/tcp
```

Si hay errores:
```bash
docker compose logs control-api
docker compose logs control-db
```

---

## 5. Crear el usuario padre

La primera vez, crea tu cuenta de administrador directamente en la base de datos:

```bash
# Conéctate al contenedor de BD
docker exec -it control-db psql -U control_user -d control_parental

# Dentro de psql — genera el hash de la contraseña antes con:
# node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('tupassword',12).then(h=>console.log(h))"
INSERT INTO users (id, email, password_hash, name, created_at)
VALUES (
  gen_random_uuid(),
  'tu@email.com',
  '$2a$12$HASH_GENERADO_AQUI',
  'Tu Nombre',
  NOW()
);
\q
```

---

## 6. Configurar Nginx

Crea el bloque de servidor para el subdominio:

```bash
nano /etc/nginx/sites-available/control-parental
```

```nginx
server {
    listen 80;
    server_name control.tudominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name control.tudominio.com;

    ssl_certificate     /etc/letsencrypt/live/control.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/control.tudominio.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Aumentar límite para subir fotos/vídeos
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400;  # 24h para WebSockets
    }
}
```

```bash
# Activar y recargar
ln -s /etc/nginx/sites-available/control-parental /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 7. SSL con Let's Encrypt

Si aún no tienes el certificado para este subdominio:

```bash
certbot --nginx -d control.tudominio.com
```

---

## 8. Verificar que todo funciona

```bash
# Probar la API
curl https://control.tudominio.com/api/health

# Debería responder:
# {"status":"ok","timestamp":"..."}
```

---

## 9. Auto-arranque tras reinicio

Docker Compose con `restart: unless-stopped` (ya incluido en el `docker-compose.yml`) se encarga de reiniciar los contenedores automáticamente.

Para verificar que el servicio Docker arranca al inicio del sistema:
```bash
systemctl enable docker
```

---

## 10. Actualizar la aplicación

```bash
cd /opt/control-parental/backend

# Parar los contenedores
docker compose down

# Copiar el nuevo código
# (reemplaza con tu método: scp, git pull, etc.)

# Reconstruir y levantar
docker compose up -d --build

# Verificar logs
docker compose logs -f control-api
```

---

## Estructura de directorios en el servidor

```
/opt/control-parental/
├── backend/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── .env                    ← NO subir a git
│   └── src/
└── volumes/
    ├── media/                  ← Fotos y vídeos de la galería
    │   └── {deviceId}/
    │       ├── thumbs/
    │       └── full/
    └── screenshots/            ← Capturas de pantalla automáticas
        └── {deviceId}/
```

---

## Solución de problemas comunes

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| `control-api` no arranca | `.env` mal configurado | Revisar `docker compose logs control-api` |
| WebSocket se desconecta en Nginx | Falta header `Upgrade` | Verificar config de Nginx |
| Error 413 al subir fotos | `client_max_body_size` demasiado bajo | Aumentar a 50M en Nginx |
| La BD no persiste tras reinicio | Volumen no montado | Verificar sección `volumes` en `docker-compose.yml` |
| App hijo no conecta | URL incorrecta en `.env` | Confirmar que `SERVER_URL` usa HTTPS y el dominio correcto |
