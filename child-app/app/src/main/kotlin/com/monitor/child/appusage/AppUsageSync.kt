package com.monitor.child.appusage

import android.app.usage.UsageStatsManager
import android.content.Context
import android.util.Log
import com.monitor.child.data.PreferencesManager
import com.monitor.child.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * Sincroniza el tiempo de uso de apps con el servidor cada hora.
 *
 * Usa UsageStatsManager para leer estadísticas de uso diario.
 * Requiere permiso PACKAGE_USAGE_STATS (se pide al instalar vía SetupActivity).
 */
class AppUsageSync(
    private val context: Context,
    private val apiClient: ApiClient,
    private val prefs: PreferencesManager,
    private val scope: CoroutineScope,
) {
    companion object {
        private const val TAG = "AppUsageSync"
        private const val SYNC_INTERVAL_MS = 60 * 60 * 1000L   // 1 hora
        private const val MIN_USAGE_SECONDS = 30L              // ignora apps con <30s de uso
    }

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val usageManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

    fun startSync() {
        scope.launch {
            while (true) {
                syncToday()
                delay(SYNC_INTERVAL_MS)
            }
        }
        Log.i(TAG, "Sincronización de uso de apps iniciada (cada 1h)")
    }

    private suspend fun syncToday() {
        val deviceId = prefs.getDeviceId() ?: return
        val token = prefs.getDeviceToken() ?: return

        val today = dateFormat.format(Date())

        // Rango: medianoche de hoy hasta ahora
        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        val startOfDay = cal.timeInMillis
        val now = System.currentTimeMillis()

        val stats = usageManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startOfDay,
            now,
        )

        if (stats.isNullOrEmpty()) {
            Log.d(TAG, "No hay estadísticas de uso disponibles (¿permiso concedido?)")
            return
        }

        // Agrupar por package (puede haber duplicados del sistema)
        val merged = mutableMapOf<String, MutableMap<String, Any>>()
        for (stat in stats) {
            if (stat.totalTimeInForeground < MIN_USAGE_SECONDS * 1000) continue
            val pkg = stat.packageName
            val existing = merged[pkg]
            if (existing == null) {
                merged[pkg] = mutableMapOf(
                    "pkg" to pkg,
                    "totalMs" to stat.totalTimeInForeground,
                    "lastUsed" to stat.lastTimeUsed,
                )
            } else {
                val prev = existing["totalMs"] as Long
                existing["totalMs"] = prev + stat.totalTimeInForeground
                if (stat.lastTimeUsed > existing["lastUsed"] as Long) {
                    existing["lastUsed"] = stat.lastTimeUsed
                }
            }
        }

        if (merged.isEmpty()) return

        // Construir JSON para el servidor
        val pm = context.packageManager
        val usagesArray = JSONArray()
        for ((pkg, data) in merged) {
            val totalMs = data["totalMs"] as Long
            val lastUsedMs = data["lastUsed"] as Long
            val totalMinutes = (totalMs / 1000 / 60).toInt().coerceAtLeast(1)
            val label = try {
                pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
            } catch (e: Exception) {
                pkg
            }
            val item = JSONObject().apply {
                put("packageName", pkg)
                put("appLabel", label)
                put("totalMinutes", totalMinutes)
                put("openCount", 1) // UsageStats no expone el número de aperturas directamente
                put("lastUsed", Date(lastUsedMs).toISOString())
            }
            usagesArray.put(item)
        }

        val body = JSONObject().apply {
            put("deviceId", deviceId)
            put("date", today)
            put("usages", usagesArray)
        }

        try {
            apiClient.postJson("/api/apps/usage", body.toString(), token)
            Log.d(TAG, "Uso de ${merged.size} apps sincronizado para $today")
        } catch (e: Exception) {
            Log.e(TAG, "Error sincronizando uso de apps: ${e.message}")
        }
    }

    private fun Date.toISOString(): String {
        val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        iso.timeZone = java.util.TimeZone.getTimeZone("UTC")
        return iso.format(this)
    }
}
