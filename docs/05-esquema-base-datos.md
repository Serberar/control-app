# Esquema de base de datos

PostgreSQL — extensión `pgcrypto` requerida para `gen_random_uuid()`.

Migraciones: `backend/src/infrastructure/database/migrations/`

---

## Diagrama de relaciones

```
users
  └── devices (user_id)
        ├── location_history (device_id)
        ├── messages (device_id)
        ├── call_logs (device_id)
        ├── contacts (device_id)
        ├── media (device_id)
        ├── screenshots (device_id)
        ├── url_history (device_id)
        ├── app_usage (device_id)
        ├── app_rules (device_id)
        ├── schedules (device_id)
        ├── geofences (device_id)
        ├── sim_events (device_id)
        └── alerts (device_id)
  ├── geofences (user_id)
  ├── keywords (user_id)
  ├── alerts (user_id)
  └── pairing_codes (user_id)
```

---

## Tablas

### `users`
Cuentas de los padres.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `email` | VARCHAR(255) UNIQUE | Email de acceso |
| `password_hash` | VARCHAR(255) | Hash bcrypt de la contraseña |
| `name` | VARCHAR(255) | Nombre visible |
| `created_at` | TIMESTAMPTZ | Fecha de registro |
| `updated_at` | TIMESTAMPTZ | Última modificación |

---

### `devices`
Dispositivos hijo registrados.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `user_id` | UUID FK → users | Padre propietario |
| `name` | VARCHAR(255) | Nombre del dispositivo |
| `alias` | VARCHAR(255) | Alias opcional |
| `device_model` | VARCHAR(255) | Modelo del teléfono |
| `android_version` | VARCHAR(50) | Versión de Android |
| `app_version` | VARCHAR(50) | Versión de la app hijo |
| `device_token` | VARCHAR(255) UNIQUE | Token de autenticación permanente |
| `fcm_token` | TEXT | Token Firebase para push |
| `last_seen_at` | TIMESTAMPTZ | Último heartbeat recibido |
| `battery_level` | SMALLINT (0–100) | Nivel de batería |
| `is_active` | BOOLEAN | Dispositivo activo |
| `created_at` | TIMESTAMPTZ | Fecha de registro |
| `updated_at` | TIMESTAMPTZ | Última modificación |

---

### `pairing_codes`
Códigos temporales para emparejar la app hijo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `user_id` | UUID FK → users | Padre que generó el código |
| `device_name` | VARCHAR(255) | Nombre para el dispositivo |
| `code` | VARCHAR(8) UNIQUE | Código de 8 caracteres |
| `used` | BOOLEAN | Si ya fue utilizado |
| `expires_at` | TIMESTAMPTZ | Expira 24h tras creación |
| `created_at` | TIMESTAMPTZ | Fecha de generación |

**Índice:** `idx_pairing_code ON (code) WHERE NOT used`

---

### `location_history`
Historial de posiciones GPS del dispositivo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `device_id` | UUID FK → devices | Dispositivo origen |
| `latitude` | DECIMAL(10,8) | Latitud (±90) |
| `longitude` | DECIMAL(11,8) | Longitud (±180) |
| `accuracy` | DECIMAL(8,2) | Precisión en metros |
| `altitude` | DECIMAL(8,2) | Altitud en metros |
| `address` | TEXT | Dirección legible (geocoding) |
| `created_at` | TIMESTAMPTZ | Timestamp de la posición |

**Índice:** `idx_location_device_time ON (device_id, created_at DESC)`

---

### `messages`
Mensajes capturados por el Accessibility Service.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `device_id` | UUID FK → devices | Dispositivo origen |
| `app` | VARCHAR(50) | `whatsapp` · `telegram` · `instagram` · `sms` · `teams` · `other` |
| `contact_name` | VARCHAR(255) | Nombre del contacto (si disponible) |
| `contact_identifier` | VARCHAR(255) | Número, usuario o ID único del contacto |
| `direction` | VARCHAR(10) | `incoming` · `outgoing` |
| `content` | TEXT | Texto del mensaje |
| `created_at` | TIMESTAMPTZ | Timestamp del mensaje |

**Índices:**
- `idx_messages_device_time ON (device_id, created_at DESC)`
- `idx_messages_content` GIN sobre `to_tsvector('spanish', content)` (búsqueda full-text)

---

### `call_logs`
Registro de llamadas nativas del teléfono.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `device_id` | UUID FK → devices | Dispositivo origen |
| `contact_name` | VARCHAR(255) | Nombre del contacto |
| `phone_number` | VARCHAR(50) | Número de teléfono |
| `direction` | VARCHAR(10) | `incoming` · `outgoing` · `missed` |
| `duration_seconds` | INTEGER | Duración en segundos |
| `created_at` | TIMESTAMPTZ | Fecha y hora de la llamada |

**Índice:** `idx_call_logs_device_time ON (device_id, created_at DESC)`

---

### `voip_calls`
Registro de llamadas VoIP (WhatsApp, Telegram).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `device_id` | UUID FK → devices | Dispositivo origen |
| `app` | VARCHAR(50) | App VoIP (whatsapp, telegram…) |
| `contact_name` | VARCHAR(255) | Nombre del contacto |
| `contact_identifier` | VARCHAR(255) | Identificador del contacto |
| `direction` | VARCHAR(10) | `incoming` · `outgoing` · `missed` |
| `duration_seconds` | INTEGER | Duración en segundos |
| `call_type` | VARCHAR(10) | `voice` · `video` |
| `created_at` | TIMESTAMPTZ | Fecha y hora de la llamada |

**Índice:** `idx_voip_device_time ON (device_id, created_at DESC)`

---

### `contacts`
Contactos del dispositivo hijo sincronizados.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `device_id` | UUID FK → devices | Dispositivo origen |
| `name` | VARCHAR(255) | Nombre del contacto |
| `phone_number` | VARCHAR(50) | Número de teléfono |
| `is_new` | BOOLEAN | Marcado como nuevo (no visto antes) |
| `first_seen_at` | TIMESTAMPTZ | Primera sincronización |
| `updated_at` | TIMESTAMPTZ | Última actualización |

**Restricción UNIQUE:** `(device_id, phone_number)`

---

### `media`
Fotos y vídeos detectados en el dispositivo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `device_id` | UUID FK → devices | Dispositivo origen |
| `file_path` | TEXT | Ruta al archivo de calidad completa |
| `thumbnail_path` | TEXT | Ruta a la miniatura |
| `file_type` | VARCHAR(10) | `photo` · `video` |
| `file_size_bytes` | BIGINT | Tamaño del archivo completo |
| `thumbnail_uploaded` | BOOLEAN | Si la miniatura ya está disponible |
| `full_uploaded` | BOOLEAN | Si la calidad completa ya está disponible |
| `taken_at` | TIMESTAMPTZ | Fecha de captura original |
| `created_at` | TIMESTAMPTZ | Fecha de subida |

**Índice:** `idx_media_device_time ON (device_id, created_at DESC)`

Los archivos físicos se almacenan en:
```
/opt/control-parental/volumes/media/{deviceId}/thumbs/
/opt/control-parental/volumes/media/{deviceId}/full/
```

---

### `screenshots`
Capturas de pantalla automáticas (cada 5 minutos, Android 11+).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `device_id` | UUID FK → devices | Dispositivo origen |
| `file_path` | TEXT | Ruta al archivo |
| `app_in_foreground` | VARCHAR(255) | Package de la app visible |
| `trigger_type` | VARCHAR(20) | `periodic` · `app_open` |
| `created_at` | TIMESTAMPTZ | Fecha de la captura |

**Índice:** `idx_screenshots_device_time ON (device_id, created_at DESC)`

Archivos en: `/opt/control-parental/volumes/screenshots/{deviceId}/`

---

### `url_history`
URLs capturadas por la VPN local del dispositivo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `device_id` | UUID FK → devices | Dispositivo origen |
| `url` | TEXT | URL completa |
| `title` | TEXT | Título de la página (si disponible) |
| `app` | VARCHAR(255) | Package del navegador que hizo la petición |
| `created_at` | TIMESTAMPTZ | Timestamp de la visita |

**Índice:** `idx_url_device_time ON (device_id, created_at DESC)`

---

### `app_usage`
Tiempo de uso diario por aplicación.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `device_id` | UUID FK → devices | Dispositivo origen |
| `package_name` | VARCHAR(255) | Identificador de la app |
| `app_name` | VARCHAR(255) | Nombre legible |
| `usage_date` | DATE | Fecha (YYYY-MM-DD) |
| `usage_seconds` | INTEGER | Segundos de uso total en esa fecha |
| `created_at` | TIMESTAMPTZ | Fecha de registro |

**Restricción UNIQUE:** `(device_id, package_name, usage_date)`
**Índice:** `idx_app_usage_device_date ON (device_id, usage_date DESC)`

---

### `app_rules`
Reglas de bloqueo o límite de tiempo de apps.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `device_id` | UUID FK → devices | Dispositivo al que aplica |
| `package_name` | VARCHAR(255) | Identificador de la app |
| `app_name` | VARCHAR(255) | Nombre legible |
| `is_blocked` | BOOLEAN | Si está completamente bloqueada |
| `daily_limit_seconds` | INTEGER | Límite diario en segundos (nullable) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última modificación |

**Restricción UNIQUE:** `(device_id, package_name)`

> Si `is_blocked = true`, la app no se puede abrir. Si `daily_limit_seconds` tiene valor, se bloquea al superarlo.

---

### `schedules`
Franjas horarias de bloqueo del dispositivo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `device_id` | UUID FK → devices | Dispositivo al que aplica |
| `name` | VARCHAR(255) | Nombre del horario |
| `days_of_week` | SMALLINT[] | Días activos: 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb, 7=Dom |
| `start_time` | TIME | Hora de inicio (HH:MM) |
| `end_time` | TIME | Hora de fin (HH:MM) |
| `is_active` | BOOLEAN | Si el horario está activo |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

> Si `end_time < start_time`, el horario cruza medianoche automáticamente.

---

### `geofences`
Zonas geográficas con alertas de entrada/salida.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `user_id` | UUID FK → users | Padre propietario |
| `device_id` | UUID FK → devices | Dispositivo vigilado |
| `name` | VARCHAR(255) | Nombre de la zona (p.ej. "Casa") |
| `latitude` | DECIMAL(10,8) | Latitud del centro |
| `longitude` | DECIMAL(11,8) | Longitud del centro |
| `radius_meters` | INTEGER | Radio en metros (> 0) |
| `is_active` | BOOLEAN | Si genera alertas |
| `alert_on_exit` | BOOLEAN | Alertar al salir (defecto: true) |
| `alert_on_enter` | BOOLEAN | Alertar al entrar (defecto: false) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

---

### `keywords`
Palabras vigiladas para detección en mensajes.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `user_id` | UUID FK → users | Padre propietario |
| `device_id` | UUID FK → devices | Dispositivo vigilado |
| `word` | VARCHAR(255) | Palabra o frase vigilada |
| `is_active` | BOOLEAN | Si está activa |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

**Restricción UNIQUE:** `(user_id, device_id, word)`

---

### `alerts`
Alertas generadas automáticamente por el sistema.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `user_id` | UUID FK → users | Padre destinatario |
| `device_id` | UUID FK → devices | Dispositivo origen |
| `type` | VARCHAR(50) | Tipo de alerta (ver valores abajo) |
| `severity` | VARCHAR(10) | `info` · `warning` · `critical` |
| `title` | VARCHAR(255) | Título de la notificación |
| `body` | TEXT | Descripción detallada |
| `metadata` | JSONB | Datos adicionales según el tipo |
| `is_read` | BOOLEAN | Si ha sido leída |
| `created_at` | TIMESTAMPTZ | Fecha de la alerta |

**Tipos de alerta:**
| Valor | Cuándo se genera |
|-------|-----------------|
| `keyword` | Una palabra vigilada apareció en un mensaje |
| `geofence_exit` | El dispositivo salió de una zona geofence |
| `geofence_enter` | El dispositivo entró en una zona geofence |
| `photo_new` | Se detectó una foto nueva |
| `battery_low` | Batería por debajo del umbral |
| `sim_change` | Se cambió la tarjeta SIM |
| `vpn_detected` | Se detectó o instaló una VPN externa |
| `new_contact` | Se añadió un contacto nuevo |
| `inactivity` | El dispositivo lleva mucho tiempo sin conectar |
| `app_installed` | Se instaló una nueva aplicación |

**Índice:** `idx_alerts_user_unread ON (user_id, is_read, created_at DESC)`

---

### `sim_events`
Registro de cambios de SIM.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `device_id` | UUID FK → devices | Dispositivo origen |
| `event_type` | VARCHAR(20) | `changed` · `removed` · `inserted` |
| `phone_number` | VARCHAR(50) | Número de la nueva SIM |
| `carrier` | VARCHAR(100) | Operador de la nueva SIM |
| `created_at` | TIMESTAMPTZ | Fecha del evento |

---

## Convenciones

- Todos los `id` son UUID v4 generados con `gen_random_uuid()`.
- Todos los timestamps usan `TIMESTAMPTZ` (con zona horaria, almacenados en UTC).
- Los `DELETE CASCADE` aseguran que al eliminar un dispositivo se borran todos sus datos.
- Las claves foráneas que pueden ser `NULL` (como `device_id` en `geofences` y `keywords`) permiten reglas/zonas globales a nivel de usuario.
