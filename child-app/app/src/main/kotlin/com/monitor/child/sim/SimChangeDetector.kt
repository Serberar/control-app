package com.monitor.child.sim

import android.content.Context
import android.telephony.TelephonyManager
import android.util.Log
import com.monitor.child.data.PreferencesManager
import com.monitor.child.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Detecta cambios de SIM comparando el IMSI almacenado con el actual.
 * Si el IMSI cambia → alerta inmediata al servidor.
 *
 * Requiere READ_PHONE_STATE (ya declarado en AndroidManifest).
 */
class SimChangeDetector(
    private val context: Context,
    private val apiClient: ApiClient,
    private val prefs: PreferencesManager,
    private val scope: CoroutineScope,
) {
    companion object {
        private const val TAG = "SimChangeDetector"
        private const val PREF_IMSI = "last_known_imsi"
        private const val CHECK_INTERVAL_MS = 10 * 60 * 1000L  // cada 10 minutos
    }

    fun startMonitoring() {
        scope.launch {
            // Primer check inmediato para registrar el IMSI inicial
            val initial = getCurrentImsi()
            if (initial != null && prefs.getString(PREF_IMSI) == null) {
                prefs.setString(PREF_IMSI, initial)
                Log.d(TAG, "IMSI inicial registrado: ${initial.take(6)}…")
            }

            while (true) {
                delay(CHECK_INTERVAL_MS)
                checkForChange()
            }
        }
        Log.d(TAG, "Detector de cambio de SIM iniciado")
    }

    private suspend fun checkForChange() {
        val current = getCurrentImsi() ?: return
        val saved = prefs.getString(PREF_IMSI)

        if (saved != null && saved != current) {
            Log.w(TAG, "Cambio de SIM detectado — reportando")
            prefs.setString(PREF_IMSI, current)
            reportSimChange()
        } else if (saved == null) {
            prefs.setString(PREF_IMSI, current)
        }
    }

    private fun getCurrentImsi(): String? {
        return try {
            val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            tm.subscriberId  // IMSI — null si no hay SIM o sin permiso
        } catch (e: Exception) {
            Log.e(TAG, "Error leyendo IMSI: ${e.message}")
            null
        }
    }

    private suspend fun reportSimChange() {
        try {
            apiClient.post(
                "/api/alerts/events",
                mapOf(
                    "event" to "sim_change",
                    "timestamp" to System.currentTimeMillis(),
                )
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error reportando cambio de SIM: ${e.message}")
        }
    }
}
