package com.monitor.child.appusage

import android.content.Context
import android.content.Intent
import android.util.Log
import com.monitor.child.data.PreferencesManager
import com.monitor.child.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray

/**
 * Gestor de bloqueo de apps.
 *
 * - Descarga las reglas activas del servidor cada 15 minutos
 * - Se invoca desde MessageCaptureService cuando una app gana el foco
 * - Si la app está bloqueada → lanza BlockedActivity en primer plano
 * - Si la app tiene límite de tiempo → consulta uso acumulado de hoy
 */
class AppBlocker(
    private val context: Context,
    private val apiClient: ApiClient,
    private val prefs: PreferencesManager,
    private val scope: CoroutineScope,
) {
    companion object {
        private const val TAG = "AppBlocker"
        private const val RULES_REFRESH_INTERVAL_MS = 15 * 60 * 1000L // 15 min
    }

    // Cache local de reglas para no ir al servidor en cada evento de accesibilidad
    @Volatile
    private var blockedPackages: Set<String> = emptySet()

    // package → minutos diarios límite
    @Volatile
    private var timeLimitRules: Map<String, Int> = emptyMap()

    fun startMonitoring() {
        scope.launch {
            while (true) {
                refreshRules()
                delay(RULES_REFRESH_INTERVAL_MS)
            }
        }
        Log.i(TAG, "AppBlocker iniciado")
    }

    /** Llamado desde AccessibilityService cuando una app gana el foco */
    fun onAppForeground(packageName: String) {
        // Bloqueo total
        if (packageName in blockedPackages) {
            Log.d(TAG, "App bloqueada detectada: $packageName")
            launchBlockedScreen(packageName, reason = "blocked")
            return
        }

        // Límite de tiempo
        val limitMinutes = timeLimitRules[packageName] ?: return
        scope.launch {
            val deviceId = prefs.getDeviceId() ?: return@launch
            val token = prefs.getDeviceToken() ?: return@launch
            try {
                val response = apiClient.getJson(
                    "/api/apps/usage/today?deviceId=$deviceId&packageName=$packageName",
                    token,
                )
                val todayMinutes = response.optInt("totalMinutes", 0)
                if (todayMinutes >= limitMinutes) {
                    Log.d(TAG, "Límite alcanzado para $packageName: ${todayMinutes}m / ${limitMinutes}m")
                    withContext(Dispatchers.Main) {
                        launchBlockedScreen(packageName, reason = "time_limit")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error consultando uso de $packageName: ${e.message}")
            }
        }
    }

    private fun launchBlockedScreen(packageName: String, reason: String) {
        val intent = Intent(context, BlockedActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(BlockedActivity.EXTRA_PACKAGE, packageName)
            putExtra(BlockedActivity.EXTRA_REASON, reason)
        }
        context.startActivity(intent)
    }

    private suspend fun refreshRules() {
        val deviceId = prefs.getDeviceId() ?: return
        val token = prefs.getDeviceToken() ?: return
        try {
            val response = apiClient.getJson("/api/apps/rules?deviceId=$deviceId", token)
            val rulesArray: JSONArray = response.optJSONArray("rules") ?: return

            val newBlocked = mutableSetOf<String>()
            val newLimits = mutableMapOf<String, Int>()

            for (i in 0 until rulesArray.length()) {
                val rule = rulesArray.getJSONObject(i)
                if (!rule.optBoolean("isActive", true)) continue
                val pkg = rule.getString("packageName")
                when (rule.getString("ruleType")) {
                    "block" -> newBlocked.add(pkg)
                    "time_limit" -> {
                        val limit = rule.optInt("dailyLimitMinutes", 0)
                        if (limit > 0) newLimits[pkg] = limit
                    }
                }
            }

            blockedPackages = newBlocked
            timeLimitRules = newLimits
            Log.d(TAG, "Reglas actualizadas: ${newBlocked.size} bloqueadas, ${newLimits.size} con límite")
        } catch (e: Exception) {
            Log.e(TAG, "Error actualizando reglas: ${e.message}")
        }
    }
}
