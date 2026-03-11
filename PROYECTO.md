# Control Parental — Memoria del Proyecto

## Decisiones tomadas en el brainstorming inicial

### Contexto
App de control parental para monitorizar dispositivos Android de los hijos.
- **Hijos**: 2 dispositivos Android (uno prioritario, uno secundario)
- **Padre**: Android
- **Servidor**: Ubuntu Server propio en casa, con DDNS, Docker, Nginx y PostgreSQL ya operativos

### Principio fundamental
**El servidor es la única copia que importa.** Todo se captura y sube al servidor antes de que el hijo pueda borrarlo. Lo que haga en su móvil es irrelevante para los datos ya sincronizados.

---

## Stack Tecnológico

| Capa                    | Tecnología                    | Motivo                                  |
|-------------------------|-------------------------------|-----------------------------------------|
| App Hijo                | Kotlin + Android nativo       | Acceso profundo al sistema, obligatorio |
| App Padre               | React Native                  | Más ágil, cross-platform futuro         |
| Backend                 | Node.js + Express             | Ligero, rápido, fácil de dockerizar     |
| Base de datos           | PostgreSQL (nuevo contenedor) | Robusto para historiales                |
| Tiempo real             | WebSockets (Socket.io)        | Órdenes silenciosas hijo ↔ servidor     |
| Almacenamiento archivos | Docker Volume en servidor     | Fotos/vídeos solo en casa               |
| Proxy                   | Nginx existente               | Nuevo subdominio                        |
| SSL                     | Let's Encrypt existente       | Ya funciona                             |
| Contenedores            | Docker Compose independiente  | No toca lo que ya hay                   |
| Auth                    | JWT + refresh tokens          | Seguro y sin estado                     |

### Infraestructura en el servidor
- 2 nuevos contenedores: `control-api` + `control-db`
- Nuevo subdominio: `control.tudominio.com`
- Docker Compose independiente del resto de apps

---

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                   TU SERVIDOR                       │
│                                                     │
│  Nginx ──► control-api (Node.js) ──► control-db     │
│                    │                  (PostgreSQL)  │
│                    └──► /volumes/media              │
│                         (fotos/vídeos)              │
└─────────────────────────────────────────────────────┘
        ▲                          ▲
        │ HTTPS + WSS              │ HTTPS + WSS
        │                          │
┌──────────────┐          ┌──────────────────┐
│  APP HIJO    │          │   APP PADRE      │
│  (Kotlin)    │          │  (React Native)  │
│  Android     │          │  Tu móvil        │
└──────────────┘          └──────────────────┘
```

---

## Funcionalidades por módulo

### App Hijo — Stealth & Persistencia
- Icono oculto (no aparece en cajón de apps ni recientes)
- Device Admin activado → no se puede desinstalar sin saber dónde mirar
- Se reinicia solo al encender el móvil
- Si el sistema lo mata, se reactiva solo
- WebSocket permanente y silencioso con el servidor

### App Hijo — Localización (3 modos)
- **Pasivo**: GPS cada 10 minutos en background
- **Localizar ahora**: padre pulsa botón → respuesta en <10 segundos
- **Seguimiento en vivo**: cada 30 segundos mientras padre tiene el mapa abierto

### App Hijo — Mensajería (Accessibility Service)
- WhatsApp — mensajes enviados y recibidos
- Telegram
- Instagram Direct
- Teams
- SMS nativos
- Captura: contacto + mensaje + hora + app
- Se captura EN EL MOMENTO → aunque borre después no hay pérdida

### App Hijo — Galería (sistema dos capas)
- **Capa 1**: miniatura ~25KB subida INMEDIATA por datos móviles al detectar foto nueva
- **Capa 2**: archivo completo encolado para WiFi
- Cola persistente → si apaga el móvil, sube al volver
- Resultado: aunque borre la foto antes de WiFi, la miniatura ya está en el servidor

### App Hijo — Historial Web
- VPN local que registra todas las URLs visitadas
- Funciona en CUALQUIER navegador (Chrome, Firefox, etc.)
- Limpiar historial del navegador no afecta a nuestros registros
- Guarda: URL + título + timestamp + app

### App Hijo — Llamadas
- Sincronización del registro de llamadas cada 5 minutos
- Guarda: número + contacto + duración + entrada/salida

### App Hijo — Control de Apps (sustituto Family Link)
- Tiempo de uso por app — cuánto tiempo pasa en cada app (UsageStatsManager)
- Bloqueo de apps — el padre decide qué apps no puede abrir (Accessibility Service overlay)
- Límites de tiempo por app — "máximo 1h de TikTok al día", se bloquea al agotarse
- Horarios — bloqueo total del móvil en franjas horarias (horario escolar, hora de dormir)
- Bloqueo remoto — el padre bloquea la pantalla al instante desde su app
- Alerta de instalación nueva — aviso inmediato si instala cualquier app
- Historial YouTube/TikTok — qué vídeos ve y cuánto tiempo (Accessibility Service)

### App Hijo — Seguridad Avanzada
- Alertas de palabras clave en tiempo real — lista configurable de palabras, aviso instantáneo al padre cuando aparecen en cualquier mensaje
- Capturas de pantalla automáticas — periódicas (cada X min con pantalla encendida) y al abrir apps específicas
- Detección de cambio de SIM — aviso inmediato si mete otra tarjeta SIM
- Detección y bloqueo de VPNs — si instala una VPN para saltar nuestro registro web, la bloqueamos y avisamos
- Llamadas VoIP — registro de llamadas por WhatsApp y Telegram (quién, duración, hora)
- Nuevos contactos añadidos — aviso cuando guarda un número o contacto nuevo

### App Padre
- Lista de hijos con estado (último visto, batería)
- Mapa con historial de ubicación por día
- Botón "¿Dónde está ahora?"
- Modo seguimiento en vivo
- Visor de conversaciones por app y búsqueda por palabra clave
- Galería sincronizada (miniatura inmediata + calidad completa)
- Historial web con filtros
- Historial de llamadas (normales + VoIP WhatsApp/Telegram)
- Geofencing — definir zonas y alertas
- Alertas: palabras clave, salida de zona, foto nueva, batería baja, sin actividad, SIM cambiada, VPN detectada, contacto nuevo
- Panel de tiempo por app — gráficas de uso diario/semanal
- Historial YouTube/TikTok
- Visor de capturas de pantalla automáticas
- Gestión de bloqueos — activar/desactivar apps bloqueadas
- Gestión de límites de tiempo por app
- Gestión de horarios de bloqueo
- Botón de bloqueo remoto inmediato
- Gestión de palabras clave para alertas
- Lista de contactos del hijo

---

## Base de Datos — Tablas

```
devices          → hijos registrados
location_history → coordenadas + timestamp
messages         → conversaciones capturadas (WhatsApp, Telegram, Instagram, SMS)
voip_calls       → llamadas WhatsApp/Telegram (quién, duración, hora)
media            → fotos/vídeos (ruta en servidor)
screenshots      → capturas de pantalla automáticas
url_history      → historial web
call_logs        → registro de llamadas normales
alerts           → alertas generadas
geofences        → zonas definidas por el padre
app_usage        → tiempo de uso por app y día
app_rules        → apps bloqueadas y límites de tiempo
schedules        → horarios de bloqueo del dispositivo
keywords         → palabras clave configuradas para alertas
contacts         → contactos del hijo (sincronizados)
sim_events       → eventos de cambio de SIM
```

---

## Instalación en el móvil del hijo

Requiere acceso físico UNA SOLA VEZ:
1. Activar "Instalar apps de fuentes desconocidas"
2. Instalar el APK
3. Conceder permisos: ubicación, almacenamiento, accesibilidad, administrador de dispositivo
4. El icono desaparece automáticamente
5. Listo

---

## ROADMAP — Hitos

### FASE 1 — Fundación ✅
> Objetivo: comunicación funcional hijo ↔ servidor ↔ padre

#### Backend ✅
- [x] Docker Compose con `control-api` + `control-db`
- [x] Esquema completo de PostgreSQL (migraciones SQL)
- [x] API REST base con autenticación JWT (access + refresh tokens)
- [x] WebSocket server con Socket.io (roles device/parent)
- [x] Sistema de emparejamiento por código (pairing codes 24h)
- [x] Arquitectura hexagonal estricta
- [x] PostgreSQL con WAL activado y volúmenes externos

#### App Hijo — Base ✅
- [x] Proyecto Android base (Kotlin)
- [x] Registro del dispositivo contra el servidor (pairing code)
- [x] Modo stealth: ocultar icono del launcher
- [x] Device Admin: bloquear desinstalación
- [x] Foreground Service persistente con notificación camuflada
- [x] Auto-arranque al encender el móvil (BootReceiver)
- [x] Reconexión automática (AlarmManager watchdog + START_STICKY)
- [x] WebSocket permanente con el servidor (ping 25s, backoff exponencial)

#### Localización ✅
- [x] GPS pasivo cada 10 minutos en background (FusedLocationProvider)
- [x] Modo "localizar ahora" — respuesta en <10 segundos
- [x] Modo seguimiento en vivo — cada 30 segundos
- [x] Envío de coordenadas + timestamp + precisión + altitud

#### App Padre — Base ✅
- [x] Proyecto React Native base + React Navigation
- [x] Login con JWT + auto-refresh
- [x] Lista de hijos (dispositivos) con estado batería/online
- [x] Mapa con historial del día (selector de fecha)
- [x] Botón "¿Dónde está ahora?" (solicitud WebSocket, respuesta <10s)
- [x] Modo seguimiento en vivo en el mapa (WebSocket en tiempo real)

---

### FASE 2 — Mensajería y Llamadas ✅
> Objetivo: ver conversaciones aunque las borre

#### Backend ✅
- [x] Entidad `Message` + `IMessageRepository` + `PostgreSQLMessageRepository`
- [x] Entidad `CallLog` + `ICallLogRepository` + `PostgreSQLCallLogRepository`
- [x] Entidad `Contact` + `IContactRepository` + `PostgreSQLContactRepository`
- [x] Casos de uso: `SaveMessagesUseCase`, `GetMessagesUseCase`
- [x] Casos de uso: `SaveCallLogsUseCase`, `GetCallLogsUseCase`, `SyncContactsUseCase`
- [x] Rutas REST: `/api/messages`, `/api/messages/conversations`, `/api/calls`, `/api/calls/contacts`

#### App Hijo ✅
- [x] Accessibility Service base (`MessageCaptureService.kt`)
- [x] Config XML (`accessibility_service_config.xml`) — monitoriza WhatsApp, Telegram, Instagram
- [x] Captura WhatsApp (enviados y recibidos, debounce anti-duplicados)
- [x] Captura Telegram
- [x] Captura Instagram Direct
- [x] Captura SMS nativos (`SmsObserver.kt` — ContentObserver en tiempo real)
- [x] Captura registro de llamadas normales (`CallLogSync.kt` — cada 30 min)
- [x] Sincronización lista de contactos (`ContactsSync.kt` — solo si cambia el número)
- [x] `MessageUploader.kt` — sube mensajes, SMS, llamadas y contactos al backend
- [ ] Captura llamadas VoIP WhatsApp/Telegram (VoIP via Accessibility — pendiente sesión 8)

#### App Padre ✅
- [x] `ConversationsScreen` — lista de conversaciones por app (icono y color por app)
- [x] `ChatDetailScreen` — hilo de mensajes con burbujas entrada/salida
- [x] `CallsScreen` — registro de llamadas con tipo, origen y duración
- [x] Accesos rápidos en `DeviceListScreen`: "💬 Mensajes" y "📞 Llamadas" por dispositivo
- [ ] Filtro por hijo / app / fecha (pendiente sesión 10)
- [ ] Buscador de palabras clave (pendiente sesión 9)
- [ ] Lista de contactos del hijo con alerta de nuevos (pendiente sesión 9)

---

### FASE 3 — Galería e Internet
> Objetivo: fotos y navegación aunque borre todo

#### Galería ✅ (Sesión 7)

##### Backend ✅
- [x] Entidad `Media` + `IMediaRepository` + `PostgreSQLMediaRepository`
- [x] `UploadThumbnailUseCase` — guarda miniatura en disco + registro en BD
- [x] `UploadFullMediaUseCase` — guarda archivo completo, marca `full_uploaded`
- [x] `GetGalleryUseCase` — paginación por fecha, filtro foto/vídeo
- [x] Rutas: `POST /media/thumbnail`, `POST /media/upload/:id`, `GET /media`, `GET /media/file/*`
- [x] Sirve archivos estáticos con protección anti path-traversal

##### App Hijo ✅
- [x] `GalleryMonitor.kt` — ContentObserver en `MediaStore.Images` y `MediaStore.Video`
- [x] `ThumbnailGenerator.kt` — compresión inteligente hasta ~25 KB (ajusta calidad JPEG)
- [x] `MediaUploadQueue.kt` — capa 1: miniatura inmediata; capa 2: completo solo en WiFi
- [x] Worker WiFi revisa cola cada 60s y drena cuando hay WiFi disponible

##### App Padre ✅
- [x] `GalleryScreen` — cuadrícula 3 columnas con paginación infinita
- [x] Filtro Todo / 📷 Fotos / 🎥 Vídeos
- [x] Badge "min" en items sin calidad completa aún
- [x] Modal de detalle — carga completo si disponible, miniatura si no
- [x] Acceso rápido "📸 Galería" en `DeviceListScreen`

#### Historial Web ✅ (Sesión 8)

##### Backend ✅
- [x] Entidad `UrlHistory` + `IUrlHistoryRepository` + `PostgreSQLUrlHistoryRepository`
- [x] `SaveUrlsUseCase` — guarda lotes de URLs con deduplicación por `ON CONFLICT`
- [x] `GetUrlHistoryUseCase` — historial paginado + top dominios con recuento
- [x] Rutas: `POST /api/web`, `GET /api/web`, `GET /api/web/top-domains`
- [x] `findTopDomains()` extrae dominio con `regexp_replace`, agrupa por COUNT

##### App Hijo ✅
- [x] `DnsPacketParser.kt` — extrae QNAME de consultas DNS (UDP:53)
- [x] `TlsSniExtractor.kt` — extrae SNI de TLS ClientHello (TCP:443)
- [x] `UrlBuffer.kt` — cola con flush automático cada 60s o al llegar a 100 entradas
- [x] `LocalVpnService.kt` — VPN completa: captura DNS + HTTP Host + HTTPS SNI; debounce 1 min/dominio
- [x] `VpnDetector.kt` — detecta VPNs externas activas (`TRANSPORT_VPN`) e instaladas; reporta al servidor
- [x] `LocalVpnService` registrado en `AndroidManifest.xml`
- [x] `MonitorService` lanza VPN al inicio y `VpnDetector` en paralelo

##### App Padre ✅
- [x] `WebHistoryScreen` — historial paginado con búsqueda por dominio
- [x] Vista "Top dominios" con ranking de visitas
- [x] Badges de fuente (DNS / HTTP / HTTPS) con colores diferenciados
- [x] Acceso rápido "🌐 Web" en `DeviceListScreen`

---

### FASE 4 — Alertas y Multi-hijo
> Objetivo: que te avisen sin tener que mirar constantemente

#### Alertas + Palabras clave + SIM ✅ (Sesión 9)

##### Backend ✅
- [x] Entidad `Alert` — tipos: `keyword_match`, `vpn_detected`, `sim_change`, `new_app_installed`
- [x] Entidad `Keyword` + `IKeywordRepository` + `PostgreSQLKeywordRepository`
- [x] `IAlertRepository` + `PostgreSQLAlertRepository` — guarda alertas, marca leídas, cuenta no leídas
- [x] `TriggerAlertUseCase` — crea alerta + envía push FCM al padre
- [x] `GetAlertsUseCase` — listado paginado, filtro sin leer, conteo
- [x] `ManageKeywordsUseCase` — setKeywords / getKeywords / evaluate (motor de búsqueda)
- [x] Motor de palabras clave integrado en `SaveMessagesUseCase` — evalúa mensajes entrantes
- [x] `FCMNotificationService` — push via Firebase Admin SDK (HTTP v1)
- [x] `User.fcmToken` — almacena token FCM del padre; `IUserRepository.updateFcmToken()`
- [x] Rutas: `GET/POST /api/alerts`, `PATCH /api/alerts/:id/read`, `GET/PUT /api/alerts/keywords`
- [x] `POST /api/alerts/events` — dispositivo hijo reporta eventos (VPN, SIM, app instalada)
- [x] `POST /api/auth/fcm-token` — padre registra su token FCM

##### App Hijo ✅
- [x] `SimChangeDetector.kt` — compara IMSI actual con el guardado; alerta en cambio
- [x] `PreferencesManager.getString/setString` — método genérico para claves arbitrarias
- [x] `MonitorService` lanza `SimChangeDetector` y `VpnDetector` al inicio

##### App Padre ✅
- [x] `AlertsScreen` — lista paginada; badge sin leer; filtro "solo sin leer"; toque marca leída
- [x] `KeywordsScreen` — chips editables, guardado atómico, descripción contextual
- [x] `ApiService`: `getAlerts()`, `markAlertRead()`, `getKeywords()`, `setKeywords()`, `registerParentFcmToken()`
- [x] Accesos rápidos "🔔 Alertas" y "🔤 Palabras" en `DeviceListScreen`

#### Geofencing + Panel Resumen ✅ (Sesión 10)

##### Backend ✅
- [x] Entidad `Geofence` — Haversine `contains(lat, lng)`, factory `create()` activo por defecto
- [x] `IGeofenceRepository` + `PostgreSQLGeofenceRepository` — UPSERT, NUMERIC parsing
- [x] `GeofenceUseCase` — create, list, delete, setActive, `evaluatePosition()` con cache in-memory
- [x] `GetDeviceSummaryUseCase` — agrega: info dispositivo, última ubicación, alertas sin leer, msgs/fotos últimas 24h
- [x] `IMediaRepository.countSince()` + `IMessageRepository.countSince()` — métodos COUNT para el resumen
- [x] `RecordLocationUseCase` extendido — evalúa geofences tras guardar ubicación; dispara alerta `geofence_exit`
- [x] `Alert` — añadido tipo `geofence_exit`
- [x] Rutas geofences: `GET/POST /api/geofences`, `DELETE /api/geofences/:id`, `PATCH /api/geofences/:id/active`
- [x] `GET /api/geofences/summary?deviceId=` — resumen completo del dispositivo

##### App Padre ✅
- [x] `GeofenceScreen` — MapView con tap-para-crear; Circle + Marker por geofence; toggle activo/inactivo; modal nombre + chips de radio (100m/200m/500m/1km/2km)
- [x] `DeviceSummaryScreen` — tarjeta estado dispositivo; última ubicación; stats (alertas, mensajes, fotos); grid de accesos rápidos
- [x] `ApiService`: `getGeofences()`, `createGeofence()`, `deleteGeofence()`, `setGeofenceActive()`, `getDeviceSummary()`
- [x] `DeviceListScreen` — tap en tarjeta navega a `DeviceSummaryScreen`; acceso rápido "📍 Zonas"

#### Pendiente (sesiones futuras)
- [ ] Alertas de batería baja del hijo
- [ ] Configurar alerta: sin actividad X horas
- [ ] Configurar alerta: contacto nuevo añadido

---

### FASE 5 — Control de Apps y Seguridad Avanzada
> Objetivo: controlar apps, tiempo, horarios y detectar intentos de evasión

#### App Hijo
- [ ] UsageStatsManager — recoger tiempo de uso por app cada hora
- [ ] Envío de estadísticas de uso al servidor
- [ ] Accessibility Service: detectar apertura de app bloqueada
- [ ] Overlay de bloqueo — pantalla que impide usar la app bloqueada
- [ ] Control de límite diario por app — bloqueo automático al agotar el tiempo
- [ ] Scheduler de horarios — bloqueo total según franja horaria
- [ ] Bloqueo remoto de pantalla vía Device Admin
- [ ] Detección de instalación de app nueva (Accessibility en Play Store)
- [ ] Historial YouTube — qué vídeos ve (Accessibility Service en app YouTube)
- [ ] Historial TikTok — qué vídeos ve (Accessibility Service en app TikTok)
- [ ] Capturas de pantalla automáticas cada X minutos con pantalla encendida
- [ ] Capturas de pantalla al abrir apps específicas configurables

#### Backend
- [ ] Endpoints para reglas de bloqueo y horarios
- [ ] Almacenamiento de estadísticas de uso por app y día
- [ ] Almacenamiento de capturas de pantalla
- [ ] Orden de bloqueo remoto vía WebSocket

#### App Padre
- [ ] Panel de tiempo por app — gráficas diarias y semanales
- [ ] Historial de vídeos vistos en YouTube y TikTok
- [ ] Visor de capturas de pantalla automáticas por fecha
- [ ] Gestión de apps bloqueadas (activar/desactivar)
- [ ] Configurar límites de tiempo por app
- [ ] Configurar horarios de bloqueo (ej. L-V 9-15h, todos 22-8h)
- [ ] Botón de bloqueo remoto inmediato
- [ ] Alerta cuando instala una app nueva
- [ ] Configurar frecuencia e intervalo de capturas de pantalla

---

### FASE 6 — Documentación
- [ ] Guía de instalación del servidor
- [ ] Guía de instalación de la app hijo (con capturas)
- [ ] Guía de uso de la app padre
- [ ] API Reference
- [ ] Esquema de base de datos documentado

---

## Sesiones de desarrollo

| Sesión | Contenido                                                           | Estado        |
|--------|---------------------------------------------------------------------|---------------|
| 1      | Backend: Docker + BD + API base + Auth + arquitectura hexagonal     | ✅ Completada |
| 2      | App hijo: stealth + persistencia + Device Admin + pairing           | ✅ Completada |
| 3      | Localización completa (pasiva + live + ahora) + WebSocket           | ✅ Completada |
| 4      | App padre: mapa + historial + live tracking + navegación            | ✅ Completada |
| 5+6    | Mensajería + llamadas + contactos (backend + hijo + padre)          | ✅ Completada |
| 7      | Galería: miniatura inmediata + cola WiFi + GalleryScreen padre      | ✅ Completada |
| 8      | VPN local: historial web + detección/bloqueo VPNs externas          | ✅ Completada |
| 9      | Alertas + palabras clave en tiempo real + SIM + notificaciones push | ✅ Completada |
| 10     | Multi-hijo + panel resumen + geofencing                             | ✅ Completada |
| 11     | Tiempo por app + bloqueo + límites + YouTube/TikTok history         | ⏳ Pendiente  |
| 12     | Horarios + bloqueo remoto + capturas de pantalla automáticas        | ⏳ Pendiente  |
| 13     | Pulido final + optimización batería + pruebas                       | ⏳ Pendiente  |

---

## Notas importantes
- La app del hijo debe instalarse con acceso físico al dispositivo una sola vez
- Todo el tráfico va cifrado por HTTPS
- Las fotos y vídeos se almacenan únicamente en el servidor propio
- El servidor no depende de servicios externos salvo Let's Encrypt para SSL
- Esta app sustituye a Google Family Link — no es necesario tener ambas
- Family Link no puede igualar nuestro historial web (solo filtra, no registra)
- El bloqueo de apps usa Accessibility Service overlay, no Device Owner (más simple de instalar)
- El modo incógnito del navegador NO afecta a nuestro registro — la VPN captura a nivel de red
- Las palabras clave se evalúan en el servidor para no saturar el móvil del hijo
- Las capturas de pantalla solo se suben por WiFi (salvo configuración contraria) para no gastar datos
- Si instala una VPN externa, la detectamos y bloqueamos antes de que pueda usarla



Ultima parte hecha 
Update Todos

- hecho Backend: entidades AppUsage y AppRule

- hecho Backend: repositorios (ports + PostgreSQL)

- hecho Backend: casos de uso AppUsageUseCase y AppRulesUseCase

- hecho Backend: rutas appRoutes + container + Server

- hecho App hijo: AppUsageSync.kt (UsageStatsManager)

- hecho App hijo: AppBlocker + BlockedActivity + YouTube/TikTok + Manifest

App padre: tipos, ApiService, AppUsageScreen, AppRulesScreen

App padre: AppNavigator + DeviceSummaryScreen

Actualizar PROYECTO.md sesión 11