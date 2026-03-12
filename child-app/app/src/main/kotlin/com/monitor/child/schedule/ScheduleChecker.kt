package com.monitor.child.schedule

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.util.Log
import com.monitor.child.admin.DeviceAdminReceiver
import com.monitor.child.data.PreferencesManager
import com.monitor.child.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Calendar

/**
 * Comprueba cada minuto si el dispositivo debe estar bloqueado según los horarios
 * configurados por el padre.
 *
 * Si la hora actual cae dentro de un horario activo → bloquea pantalla via Device Admin.
 * El servidor decide si el dispositivo debe estar bloqueado (endpoint /api/schedules/locked).
 * También mantiene una caché local de horarios para funcionar sin conexión.
 */
class ScheduleChecker(
    private val context: Context,
    private val apiClient: ApiClient,
    private val prefs: PreferencesManager,
    private val scope: CoroutineScope,
) {
    companion object {
        private const val TAG = "ScheduleChecker"
        private const val CHECK_INTERVAL_MS = 60_000L  // 1 minuto
        private const val REFRESH_INTERVAL_MS = 15 * 60_000L  // 15 minutos
    }

    // Caché de horarios: lista de (activeDays, startMinutes, endMinutes)
    @Volatile
    private var scheduleCache: List<ScheduleEntry> = emptyList()

    private val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val adminComponent = ComponentName(context, DeviceAdminReceiver::class.java)

    fun startChecking() {
        // Refrescar horarios periódicamente
        scope.launch {
            while (true) {
                refreshSchedules()
                delay(REFRESH_INTERVAL_MS)
            }
        }

        // Comprobar cada minuto
        scope.launch {
            while (true) {
                checkAndEnforce()
                delay(CHECK_INTERVAL_MS)
            }
        }
        Log.i(TAG, "ScheduleChecker iniciado")
    }

    private suspend fun refreshSchedules() {
        val deviceId = prefs.getDeviceId() ?: return
        try {
            val response = apiClient.getJson("/api/schedules?deviceId=$deviceId")
            val schedulesArray = response.optJSONArray("schedules") ?: return

            val entries = mutableListOf<ScheduleEntry>()
            for (i in 0 until schedulesArray.length()) {
                val s = schedulesArray.getJSONObject(i)
                if (!s.optBoolean("isActive", true)) continue

                val activeDays = s.optInt("activeDays", 0)
                val startTime = s.optString("startTime", "00:00")
                val endTime = s.optString("endTime", "00:00")
                val (sh, sm) = startTime.split(":").map { it.toInt() }
                val (eh, em) = endTime.split(":").map { it.toInt() }
                entries.add(ScheduleEntry(activeDays, sh * 60 + sm, eh * 60 + em))
            }

            scheduleCache = entries
            Log.d(TAG, "Horarios actualizados: ${entries.size}")
        } catch (e: Exception) {
            Log.e(TAG, "Error actualizando horarios: ${e.message}")
        }
    }

    private fun checkAndEnforce() {
        val cal = Calendar.getInstance()
        // Calendar.DAY_OF_WEEK: 1=Dom, 2=Lun, ..., 7=Sáb → bit 0=Dom, 1=Lun, ..., 6=Sáb
        val dayBit = cal.get(Calendar.DAY_OF_WEEK) - 1
        val currentMinutes = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)

        val shouldLock = scheduleCache.any { entry ->
            if ((entry.activeDays and (1 shl dayBit)) == 0) return@any false
            val s = entry.startMinutes
            val e = entry.endMinutes
            if (s <= e) {
                currentMinutes >= s && currentMinutes < e
            } else {
                // Cruza medianoche
                currentMinutes >= s || currentMinutes < e
            }
        }

        if (shouldLock) {
            Log.d(TAG, "Horario activo — bloqueando pantalla")
            lockScreen()
        }
    }

    private fun lockScreen() {
        try {
            if (dpm.isAdminActive(adminComponent)) {
                dpm.lockNow()
            } else {
                Log.w(TAG, "Device Admin no activo — no se puede bloquear pantalla")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error bloqueando pantalla: ${e.message}")
        }
    }
}

private data class ScheduleEntry(
    val activeDays: Int,      // bitmask
    val startMinutes: Int,    // minutos desde medianoche
    val endMinutes: Int,
)
