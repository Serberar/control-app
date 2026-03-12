# Guía de uso — App del padre

---

## Pantalla de inicio — Lista de dispositivos

Al abrir la app ves todos los dispositivos emparejados.

Cada tarjeta muestra:
- **Nombre** del dispositivo
- **Estado**: punto verde (conectado ahora) o gris (último visto hace X tiempo)
- **Batería**: porcentaje actual
- Accesos rápidos: 💬 Mensajes · 📞 Llamadas · 📍 Mapa

**Tocar la tarjeta** → abre el Panel resumen completo del dispositivo.

### Añadir un dispositivo nuevo
Pulsa **"Añadir dispositivo"** (icono +):
1. Escribe un nombre para identificarlo (p.ej. "iPhone de Ana")
2. Se genera un código de 8 caracteres válido 24 horas
3. Introduce ese código en la app hijo durante la instalación

---

## Panel resumen del dispositivo

Acceso: toca la tarjeta del dispositivo en la lista.

Muestra de un vistazo:
- Estado de conexión y batería
- Última ubicación conocida (toca para ir al mapa)
- Contadores de las últimas 24h: alertas sin leer, mensajes, fotos

### Botón "🔒 Bloquear pantalla ahora"
Bloquea inmediatamente la pantalla del dispositivo hijo via WebSocket.
- Requiere que el dispositivo esté **conectado** al servidor
- Requiere que la app hijo tenga el permiso de **Administrador de dispositivo**
- Aparece un diálogo de confirmación antes de ejecutarse

### Accesos rápidos
Todos los módulos accesibles desde un grid de botones:

| Botón | Lo que hace |
|-------|-------------|
| 💬 Mensajes | Conversaciones de todas las apps |
| 📞 Llamadas | Registro de llamadas |
| 📸 Galería | Fotos y vídeos sincronizados |
| 🌐 Web | Historial de navegación |
| 🔔 Alertas | Alertas generadas |
| 🔤 Palabras clave | Gestionar palabras vigiladas |
| 📍 Geofencing | Zonas geográficas y alertas |
| 📊 Tiempo apps | Cuánto tiempo pasa en cada app |
| 🚫 Reglas apps | Apps bloqueadas y límites de tiempo |
| ⏰ Horarios | Franjas de bloqueo del móvil |
| 📱 Capturas | Capturas de pantalla automáticas |
| 👤 Contactos | Lista de contactos del hijo |

---

## Mapa y localización

### Modo historial (por defecto)
- Muestra la **ruta del día** como línea azul
- Cada punto tiene la hora al tocarle
- **Selector de día**: flechas ← → para navegar entre fechas

### "¿Dónde estaba a las HH:MM?"
1. Escribe la hora en el campo (p.ej. `19:00`)
2. Pulsa **"¿Dónde estaba?"**
3. El mapa salta al punto más cercano en la ruta y aparece un marcador **amarillo** con la hora exacta y la dirección

### "📍 ¿Dónde está?" (localización instantánea)
Envía una orden por WebSocket al dispositivo para que reporte su posición en menos de 10 segundos.
- El dispositivo debe estar conectado
- Después de pulsar, espera ~8 segundos y el mapa se actualiza

### "🔴 Ver en vivo"
Activa el modo de seguimiento en tiempo real (actualización cada 30 segundos).
- El mapa se centra automáticamente en cada nueva posición
- Pulsa **"⏹ Parar"** para desactivarlo

---

## Mensajes y conversaciones

### Lista de conversaciones
Muestra todas las conversaciones capturadas de todas las apps.

**Filtrar por app** (barra superior):
- Todas · 💬 WA · ✈️ TG · 📷 IG · 📱 SMS · 🟦 Teams

**Filtrar por fecha** (segunda barra):
- Hoy · Ayer · 7 días · Todo

### Hilo de mensajes
Toca cualquier conversación para ver el hilo completo:
- Burbujas azules = mensajes enviados por el hijo
- Burbujas grises = mensajes recibidos
- Muestra hora y fecha de cada mensaje

> **Nota**: Los mensajes se capturan en el momento en que aparecen en pantalla. Si el hijo borra el mensaje después, ya está guardado en el servidor.

---

## Galería

Muestra todas las fotos y vídeos detectados en el dispositivo.

### Filtros
- **Todo** / **📷 Fotos** / **🎥 Vídeos**

### Calidad de las imágenes
- **"min"** (badge amarillo): solo disponible en calidad miniatura (~25KB). La foto completa llegará cuando el dispositivo tenga WiFi.
- Sin badge: calidad completa disponible.

### Ver en detalle
Toca cualquier imagen para verla a pantalla completa.

---

## Historial web

Muestra todas las URLs visitadas capturadas por la VPN local.

### Búsqueda por dominio
Escribe en la barra de búsqueda para filtrar (p.ej. `youtube`, `instagram`).

### Vista "Top dominios"
Muestra un ranking de los sitios más visitados con número de visitas.

### Badges de fuente
- **DNS** (gris) — capturado por consulta DNS
- **HTTP** (naranja) — capturado por cabecera Host
- **HTTPS** (verde) — capturado por SNI del certificado

> El modo incógnito del navegador **no evita** este registro, ya que la captura es a nivel de red.

---

## Llamadas

Lista cronológica de todas las llamadas del dispositivo.

Iconos de tipo:
- 📞 Entrante (verde)
- 📤 Saliente (azul)
- ❌ Perdida (rojo)

Muestra: nombre del contacto (si existe), número, duración y hora.

---

## Alertas

### Tipos de alertas
| Icono | Tipo | Descripción |
|-------|------|-------------|
| 🔤 | `keyword_match` | Una palabra vigilada apareció en un mensaje |
| 📍 | `geofence_exit` | El dispositivo salió de una zona geofence |
| 📱 | `new_app_installed` | Se instaló una nueva app |
| 🔄 | `sim_change` | Se cambió la tarjeta SIM |
| 🛡️ | `vpn_detected` | Se detectó o instaló una VPN externa |

### Marcar como leída
Toca cualquier alerta para marcarla como leída. El badge del contador disminuye.

### Filtrar sin leer
Activa el toggle **"Solo sin leer"** para ver únicamente las alertas pendientes.

---

## Palabras clave

Lista de palabras o frases que, si aparecen en cualquier mensaje capturado, generan una alerta inmediata con notificación push.

**Gestión**:
- Los chips muestran las palabras activas
- Pulsa **"✕"** en un chip para eliminarla
- Escribe en el campo inferior y pulsa **"+"** para añadir
- Pulsa **"Guardar"** para aplicar los cambios

**Ejemplos de palabras útiles**: `drogas`, `alcohol`, `pelea`, `ayuda`, `secreto`

---

## Geofencing

Define zonas geográficas y recibe alertas cuando el dispositivo sale de ellas.

### Crear una zona
1. Mantén pulsado en el mapa donde quieras el centro
2. Introduce un nombre (p.ej. "Casa", "Colegio")
3. Selecciona el radio: 100m / 200m / 500m / 1km / 2km
4. Pulsa **"Crear"**

La zona aparece como un círculo en el mapa. El punto del centro es ajustable.

### Activar / desactivar
Cada zona tiene un toggle on/off. Las zonas desactivadas no generan alertas.

---

## Tiempo en apps

Muestra cuánto tiempo diario pasa el hijo en cada aplicación.

### Seleccionar período
- **1d** — Ayer (el día más reciente completo)
- **7d** — Última semana
- **30d** — Último mes

Cuando el período es >1d, los minutos se suman para todos los días.

La tarjeta superior muestra el **total de pantalla** en el período.

---

## Reglas de apps

Permite bloquear apps o poner límites diarios de tiempo.

### Añadir una regla
Pulsa **"+"** y rellena:
- **Package name**: el identificador de la app (p.ej. `com.zhiliaoapp.musically` para TikTok)
- **Nombre visible**: para reconocerla fácilmente
- **Tipo**:
  - 🚫 **Bloqueo total** — la app no se puede abrir
  - ⏱ **Límite de tiempo** — se bloquea al superar X minutos al día
- Si es límite, selecciona: 15min / 30min / 1h / 2h / 3h

### Activar / desactivar
Cada regla tiene un toggle. Las reglas inactivas no se aplican pero se conservan.

---

## Horarios de bloqueo

Define franjas horarias en las que el dispositivo se bloqueará automáticamente.

### Ejemplos de uso
- **Horario escolar**: Lun–Vie de 08:00 a 14:00
- **Hora de dormir**: todos los días de 22:00 a 07:00 (cruza medianoche)

### Crear un horario
1. Pulsa **"+"**
2. Escribe un nombre (p.ej. "Noche")
3. Selecciona los días activos (chips Dom–Sáb)
4. Introduce hora de inicio y fin en formato `HH:MM`
5. Pulsa **"Crear"**

> Si la hora de fin es **menor** que la de inicio, el horario cruza medianoche automáticamente (p.ej. 22:00–07:00).

---

## Capturas de pantalla

Muestra las capturas automáticas tomadas cada 5 minutos mientras el dispositivo está en uso.

- Cuadrícula de 3 columnas
- Toca cualquier captura para verla a pantalla completa
- Desplázate hacia abajo para cargar más (paginación infinita)
- Cada miniatura muestra el tiempo transcurrido desde que se tomó

> Solo disponible en dispositivos con **Android 11 o superior**.

---

## Contactos

Lista completa de los contactos del dispositivo hijo, sincronizada automáticamente.

- Ordenados alfabéticamente
- Búsqueda en tiempo real por nombre o número de teléfono
- Avatar con iniciales en color único por contacto
