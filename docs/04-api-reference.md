# API Reference

Base URL: `https://control.tudominio.com/api`

---

## Autenticación

Todos los endpoints marcados con 🔐 requieren la cabecera:
```
Authorization: Bearer <access_token>
```

Los endpoints marcados con 📱 requieren el token de dispositivo:
```
Authorization: Bearer <device_token>
```

El `device_token` se obtiene durante el emparejamiento y es permanente.

---

## Auth — `/auth`

### POST `/auth/login`
Inicia sesión del padre.

**Body:**
```json
{ "email": "tu@email.com", "password": "tu_password" }
```

**Respuesta:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": "uuid", "email": "tu@email.com", "name": "Tu Nombre" }
}
```

---

### POST `/auth/refresh`
Renueva el access token.

**Body:**
```json
{ "refreshToken": "eyJ..." }
```

**Respuesta:**
```json
{ "accessToken": "eyJ..." }
```

---

### POST `/auth/fcm-token` 🔐
Registra el token FCM del padre para notificaciones push.

**Body:**
```json
{ "fcmToken": "fXy..." }
```

**Respuesta:** `{ "ok": true }`

---

## Dispositivos — `/devices`

### GET `/devices` 🔐
Lista todos los dispositivos del padre.

**Respuesta:**
```json
{
  "devices": [
    {
      "id": "uuid",
      "name": "Samsung de Juan",
      "deviceModel": "Samsung Galaxy A54",
      "androidVersion": "13",
      "lastSeenAt": "2024-01-15T18:30:00Z",
      "batteryLevel": 72,
      "isActive": true
    }
  ]
}
```

---

### POST `/devices` 🔐
Registra un nuevo dispositivo hijo (alternativa a emparejamiento).

**Body:**
```json
{
  "name": "Samsung de Juan",
  "alias": "Juan",
  "deviceModel": "Samsung Galaxy A54",
  "androidVersion": "13",
  "appVersion": "1.0.0"
}
```

**Respuesta:**
```json
{
  "device": { "id": "uuid", "name": "Samsung de Juan" },
  "deviceAccessToken": "eyJ..."
}
```

---

### POST `/devices/:id/lock` 🔐
Bloquea inmediatamente la pantalla del dispositivo via WebSocket.

**Respuesta:**
```json
{ "sent": true }
```
> `sent: false` si el dispositivo no está conectado al WebSocket.

---

### POST `/devices/heartbeat` 📱
El dispositivo hijo envía su estado periódicamente (cada 5 minutos).

**Body:**
```json
{ "batteryLevel": 72, "fcmToken": "fXy..." }
```

**Respuesta:** `{ "ok": true }`

---

## Emparejamiento — `/pairing`

### POST `/pairing/create` 🔐
Genera un código de emparejamiento para instalar la app hijo.

**Body:**
```json
{ "deviceName": "Samsung de Juan" }
```

**Respuesta:**
```json
{ "code": "AB12CD34", "expiresIn": "24h" }
```

---

### POST `/pairing/pair`
La app hijo se registra usando el código generado. **Sin autenticación previa.**

**Body:**
```json
{
  "pairingCode": "AB12CD34",
  "deviceModel": "Samsung Galaxy A54",
  "androidVersion": "13",
  "appVersion": "1.0.0"
}
```

**Respuesta:**
```json
{ "deviceId": "uuid", "deviceToken": "eyJ..." }
```

---

## Ubicación — `/location`

### POST `/location` 📱
El dispositivo sube su posición actual.

**Body:**
```json
{
  "latitude": 40.416775,
  "longitude": -3.703790,
  "accuracy": 5.0,
  "altitude": 650.0,
  "address": "Calle Gran Vía 1, Madrid"
}
```

**Respuesta:** `{ "ok": true, "id": "uuid" }`

---

### GET `/location/history` 🔐
Devuelve el historial de ubicaciones de un día.

**Query params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `deviceId` | UUID | Sí | ID del dispositivo |
| `from` | ISO 8601 | Sí | Inicio del rango |
| `to` | ISO 8601 | Sí | Fin del rango |

**Respuesta:**
```json
{
  "points": [
    {
      "id": "uuid",
      "latitude": 40.416775,
      "longitude": -3.703790,
      "address": "Calle Gran Vía 1, Madrid",
      "createdAt": "2024-01-15T08:30:00Z"
    }
  ]
}
```

---

### GET `/location/latest/:deviceId` 🔐
Última posición conocida del dispositivo.

**Respuesta:**
```json
{
  "point": {
    "latitude": 40.416775,
    "longitude": -3.703790,
    "address": "Calle Gran Vía 1, Madrid",
    "createdAt": "2024-01-15T18:30:00Z"
  }
}
```

---

### POST `/location/request-now/:deviceId` 🔐
Solicita al dispositivo que reporte su posición inmediatamente (< 10 segundos).

**Respuesta:** `{ "sent": true }`

---

### POST `/location/live/start/:deviceId` 🔐
Activa el modo de seguimiento en tiempo real (cada 30 segundos).

**Respuesta:** `{ "sent": true }`

---

### POST `/location/live/stop/:deviceId` 🔐
Desactiva el modo de seguimiento en tiempo real.

**Respuesta:** `{ "sent": true }`

---

## Mensajes — `/messages`

### POST `/messages` 📱
El dispositivo sube mensajes capturados por el Accessibility Service.

**Body:**
```json
{
  "messages": [
    {
      "app": "whatsapp",
      "contactName": "Ana García",
      "contactIdentifier": "+34612345678",
      "direction": "incoming",
      "body": "Hola, ¿cómo estás?",
      "timestamp": "2024-01-15T18:30:00Z",
      "threadId": "thread_001"
    }
  ]
}
```

Valores válidos para `app`: `whatsapp` · `telegram` · `instagram` · `sms` · `teams`
Valores válidos para `direction`: `incoming` · `outgoing`

**Respuesta:** `{ "ok": true, "saved": 1 }`

---

### GET `/messages/conversations` 🔐
Lista las conversaciones agrupadas por contacto.

**Query params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `deviceId` | UUID | Sí | ID del dispositivo |
| `app` | string | No | Filtrar por app |
| `from` | ISO 8601 | No | Desde esta fecha |
| `to` | ISO 8601 | No | Hasta esta fecha |

**Respuesta:**
```json
{
  "conversations": [
    {
      "app": "whatsapp",
      "contactName": "Ana García",
      "contactIdentifier": "+34612345678",
      "lastMessage": "Hola, ¿cómo estás?",
      "lastMessageAt": "2024-01-15T18:30:00Z",
      "messageCount": 42
    }
  ]
}
```

---

### GET `/messages` 🔐
Mensajes de una conversación específica.

**Query params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `deviceId` | UUID | Sí | ID del dispositivo |
| `contactIdentifier` | string | Sí | Identificador del contacto |
| `app` | string | No | Filtrar por app |
| `from` | ISO 8601 | No | Desde esta fecha |
| `to` | ISO 8601 | No | Hasta esta fecha |
| `limit` | integer | No | Máx resultados (defecto 100) |

**Respuesta:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "app": "whatsapp",
      "contactName": "Ana García",
      "contactIdentifier": "+34612345678",
      "direction": "incoming",
      "content": "Hola, ¿cómo estás?",
      "createdAt": "2024-01-15T18:30:00Z"
    }
  ]
}
```

---

## Llamadas — `/calls`

### POST `/calls` 📱
El dispositivo sube el registro de llamadas.

**Body:**
```json
{
  "calls": [
    {
      "source": "native",
      "contactName": "Ana García",
      "phoneNumber": "+34612345678",
      "type": "incoming",
      "durationSeconds": 187,
      "timestamp": "2024-01-15T17:00:00Z"
    }
  ]
}
```

Valores válidos para `source`: `native` · `whatsapp` · `telegram`
Valores válidos para `type`: `incoming` · `outgoing` · `missed`

**Respuesta:** `{ "ok": true, "saved": 1 }`

---

### GET `/calls` 🔐
Lista el historial de llamadas.

**Query params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `deviceId` | UUID | Sí | ID del dispositivo |
| `source` | string | No | Filtrar por origen |
| `type` | string | No | Filtrar por tipo |
| `from` | ISO 8601 | No | Desde esta fecha |
| `to` | ISO 8601 | No | Hasta esta fecha |
| `limit` | integer | No | Máx resultados (defecto 100) |

---

### POST `/calls/contacts` 📱
El dispositivo sincroniza la lista de contactos.

**Body:**
```json
{
  "contacts": [
    {
      "name": "Ana García",
      "phoneNumbers": ["+34612345678"],
      "emails": ["ana@example.com"]
    }
  ]
}
```

**Respuesta:** `{ "ok": true, "synced": 1 }`

---

### GET `/calls/contacts` 🔐
Lista los contactos sincronizados del dispositivo.

**Query params:** `deviceId` (UUID, requerido)

**Respuesta:**
```json
{
  "contacts": [
    {
      "id": "uuid",
      "name": "Ana García",
      "phoneNumber": "+34612345678",
      "isNew": false,
      "firstSeenAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## Galería — `/media`

### POST `/media/thumbnail` 📱
El dispositivo sube la miniatura de una foto/vídeo inmediatamente.

**Multipart form-data:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `file` | binary | Imagen miniatura (~25 KB) |
| `fileType` | string | `photo` o `video` |
| `takenAt` | ISO 8601 | Fecha de captura (opcional) |

**Respuesta:** `{ "ok": true, "mediaId": "uuid" }`

---

### POST `/media/upload/:mediaId` 📱
El dispositivo sube la versión en calidad completa (solo con WiFi).

**Multipart form-data:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `file` | binary | Archivo a tamaño completo |

**Respuesta:** `{ "ok": true }`

---

### GET `/media` 🔐
Lista la galería paginada.

**Query params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `deviceId` | UUID | Sí | ID del dispositivo |
| `fileType` | string | No | `photo` o `video` |
| `from` | ISO 8601 | No | Desde esta fecha |
| `to` | ISO 8601 | No | Hasta esta fecha |
| `limit` | integer | No | Defecto 50 |
| `offset` | integer | No | Para paginación |

**Respuesta:**
```json
{
  "media": [
    {
      "id": "uuid",
      "fileType": "photo",
      "thumbnailPath": "/media/uuid/thumb.jpg",
      "filePath": "/media/uuid/full.jpg",
      "thumbnailUploaded": true,
      "fullUploaded": false,
      "takenAt": "2024-01-15T12:00:00Z",
      "createdAt": "2024-01-15T12:01:00Z"
    }
  ]
}
```

---

### GET `/media/file/*` 🔐
Sirve el archivo de imagen o vídeo directamente.

**Ejemplo:** `GET /media/file/uuid/thumb.jpg`

---

## Historial web — `/web`

### POST `/web` 📱
El dispositivo sube URLs capturadas por la VPN local.

**Body:**
```json
{
  "entries": [
    {
      "url": "https://www.youtube.com/watch?v=abc",
      "title": "Tutorial de programación",
      "app": "com.android.chrome",
      "timestamp": "2024-01-15T16:00:00Z"
    }
  ]
}
```

**Respuesta:** `{ "ok": true, "saved": 1 }`

---

### GET `/web` 🔐
Historial de URLs paginado.

**Query params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `deviceId` | UUID | Sí | ID del dispositivo |
| `domain` | string | No | Filtrar por dominio (p.ej. `youtube`) |
| `from` | ISO 8601 | No | Desde esta fecha |
| `to` | ISO 8601 | No | Hasta esta fecha |
| `limit` | integer | No | Defecto 50 |
| `offset` | integer | No | Para paginación |

---

### GET `/web/top-domains` 🔐
Ranking de dominios más visitados.

**Query params:** `deviceId` (requerido) · `limit` (opcional, defecto 20)

**Respuesta:**
```json
{
  "domains": [
    { "domain": "youtube.com", "visits": 142 },
    { "domain": "instagram.com", "visits": 87 }
  ]
}
```

---

## Uso de apps — `/apps`

### POST `/apps/usage` 📱
El dispositivo reporta el tiempo de uso diario de cada app.

**Body:**
```json
{
  "deviceId": "uuid",
  "date": "2024-01-15",
  "usages": [
    {
      "packageName": "com.zhiliaoapp.musically",
      "appLabel": "TikTok",
      "totalMinutes": 87,
      "openCount": 12,
      "lastUsed": "2024-01-15T22:00:00Z"
    }
  ]
}
```

**Respuesta:** `{ "ok": true }`

---

### GET `/apps/usage` 🔐
Historial de uso de apps.

**Query params:** `deviceId`, `from` (YYYY-MM-DD), `to` (YYYY-MM-DD)

**Respuesta:**
```json
{
  "usages": [
    {
      "packageName": "com.zhiliaoapp.musically",
      "appName": "TikTok",
      "usageDate": "2024-01-15",
      "usageSeconds": 5220
    }
  ]
}
```

---

### GET `/apps/usage/today` 📱
El dispositivo consulta los minutos usados hoy para una app (para aplicar límites).

**Query params:** `deviceId`, `packageName`

**Respuesta:** `{ "totalMinutes": 45 }`

---

### GET `/apps/rules`
Lista las reglas de bloqueo activas. Puede llamarlo la app hijo sin token para comprobar restricciones.

**Query params:** `deviceId`

**Respuesta:**
```json
{
  "rules": [
    {
      "id": "uuid",
      "packageName": "com.zhiliaoapp.musically",
      "appName": "TikTok",
      "isBlocked": true,
      "dailyLimitSeconds": null,
      "isActive": true
    }
  ]
}
```

---

### POST `/apps/rules` 🔐
Crea una regla de bloqueo o límite de tiempo.

**Body:**
```json
{
  "deviceId": "uuid",
  "packageName": "com.zhiliaoapp.musically",
  "appLabel": "TikTok",
  "ruleType": "time_limit",
  "dailyLimitMinutes": 30
}
```

`ruleType`: `block` · `time_limit`

**Respuesta:** `{ "rule": { ... } }`

---

### DELETE `/apps/rules/:id` 🔐
Elimina una regla.

**Respuesta:** `{ "ok": true }`

---

### PATCH `/apps/rules/:id/active` 🔐
Activa o desactiva una regla sin eliminarla.

**Body:** `{ "active": true }`

**Respuesta:** `{ "ok": true }`

---

## Alertas — `/alerts`

### GET `/alerts` 🔐
Lista las alertas del dispositivo.

**Query params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `deviceId` | UUID | Sí | ID del dispositivo |
| `unreadOnly` | boolean | No | Solo alertas sin leer |
| `limit` | integer | No | Defecto 50 |
| `offset` | integer | No | Para paginación |

**Respuesta:**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "type": "keyword_match",
      "severity": "warning",
      "title": "Palabra clave detectada",
      "body": "La palabra \"pelea\" apareció en WhatsApp",
      "metadata": { "keyword": "pelea", "app": "whatsapp" },
      "isRead": false,
      "createdAt": "2024-01-15T20:00:00Z"
    }
  ],
  "unreadCount": 3
}
```

Tipos de alerta: `keyword` · `geofence_exit` · `geofence_enter` · `photo_new` · `battery_low` · `sim_change` · `vpn_detected` · `new_contact` · `inactivity` · `app_installed`

---

### PATCH `/alerts/:id/read` 🔐
Marca una alerta como leída.

**Respuesta:** `{ "ok": true }`

---

### GET `/alerts/keywords` 🔐
Lista las palabras clave configuradas para un dispositivo.

**Query params:** `deviceId`

**Respuesta:** `{ "words": ["drogas", "pelea", "secreto"] }`

---

### PUT `/alerts/keywords` 🔐
Establece la lista completa de palabras clave (reemplaza la existente).

**Query params:** `deviceId`

**Body:** `{ "words": ["drogas", "pelea", "secreto"] }`

**Respuesta:** `{ "ok": true, "saved": 3 }`

---

### POST `/alerts/events` 📱
El dispositivo notifica un evento del sistema.

**Body:**
```json
{
  "event": "new_app_installed",
  "timestamp": "2024-01-15T19:00:00Z",
  "appName": "TikTok",
  "installedApps": ["com.zhiliaoapp.musically"]
}
```

Eventos válidos: `vpn_detected` · `sim_change` · `new_app_installed`

**Respuesta:** `{ "ok": true }`

---

## Geofences — `/geofences`

### GET `/geofences` 🔐
Lista las zonas geográficas del dispositivo.

**Query params:** `deviceId`

**Respuesta:**
```json
{
  "geofences": [
    {
      "id": "uuid",
      "name": "Casa",
      "latitude": 40.416775,
      "longitude": -3.703790,
      "radiusMeters": 200,
      "isActive": true,
      "alertOnExit": true,
      "alertOnEnter": false
    }
  ]
}
```

---

### POST `/geofences` 🔐
Crea una zona geográfica.

**Body:**
```json
{
  "deviceId": "uuid",
  "name": "Casa",
  "latitude": 40.416775,
  "longitude": -3.703790,
  "radiusMeters": 200
}
```

**Respuesta:** `{ "geofence": { ... } }`

---

### DELETE `/geofences/:id` 🔐
Elimina una zona geográfica.

**Respuesta:** `{ "ok": true }`

---

### PATCH `/geofences/:id/active` 🔐
Activa o desactiva una zona.

**Body:** `{ "active": true }`

**Respuesta:** `{ "ok": true }`

---

## Horarios — `/schedules`

### GET `/schedules`
Lista los horarios de bloqueo. Accesible también por la app hijo para comprobar bloqueos.

**Query params:** `deviceId`

**Respuesta:**
```json
{
  "schedules": [
    {
      "id": "uuid",
      "name": "Noche",
      "daysOfWeek": [1, 2, 3, 4, 5, 6, 7],
      "startTime": "22:00",
      "endTime": "07:00",
      "isActive": true
    }
  ]
}
```

`daysOfWeek`: array con valores 1 (lunes) a 7 (domingo).

---

### GET `/schedules/locked` 📱
La app hijo comprueba si debe estar bloqueada ahora mismo.

**Query params:** `deviceId`

**Respuesta:** `{ "locked": true }`

---

### POST `/schedules` 🔐
Crea un horario de bloqueo.

**Body:**
```json
{
  "deviceId": "uuid",
  "name": "Horario escolar",
  "activeDays": 62,
  "startTime": "08:00",
  "endTime": "14:00"
}
```

> `activeDays` es una bitmask: Dom=1, Lun=2, Mar=4, Mié=8, Jue=16, Vie=32, Sáb=64. Suma los días deseados.

**Respuesta:** `{ "schedule": { ... } }`

---

### DELETE `/schedules/:id` 🔐
Elimina un horario.

**Respuesta:** `{ "ok": true }`

---

### PATCH `/schedules/:id/active` 🔐
Activa o desactiva un horario.

**Body:** `{ "active": true }`

**Respuesta:** `{ "ok": true }`

---

## Capturas de pantalla — `/screenshots`

### POST `/screenshots/upload` 📱
El dispositivo sube una captura automática.

**Multipart form-data:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `file` | binary | Imagen PNG/JPEG (máx 5 MB) |
| `deviceId` | UUID | ID del dispositivo |

**Respuesta:** `{ "screenshot": { "id": "uuid", "filePath": "...", "createdAt": "..." } }`

---

### GET `/screenshots` 🔐
Lista las capturas de pantalla paginadas.

**Query params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `deviceId` | UUID | Sí | ID del dispositivo |
| `limit` | integer | No | Defecto 30 |
| `offset` | integer | No | Para paginación |

**Respuesta:**
```json
{
  "screenshots": [
    {
      "id": "uuid",
      "filePath": "/screenshots/uuid/1705341600000.jpg",
      "appInForeground": "com.zhiliaoapp.musically",
      "triggerType": "periodic",
      "createdAt": "2024-01-15T18:00:00Z"
    }
  ]
}
```

---

## Endpoint de salud

### GET `/health`
Comprueba que la API está en marcha. Sin autenticación.

**Respuesta:** `{ "status": "ok", "timestamp": "2024-01-15T18:00:00Z" }`

---

## Códigos de error

| Código | Significado |
|--------|-------------|
| `400` | Datos de entrada inválidos (ver campo `error`) |
| `401` | Token ausente o inválido |
| `403` | Sin permiso para ese recurso |
| `404` | Recurso no encontrado |
| `409` | Conflicto (p.ej. código de emparejamiento ya usado) |
| `500` | Error interno del servidor |

**Formato de error:**
```json
{ "error": "Descripción del error" }
```
