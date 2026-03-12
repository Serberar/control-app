package com.monitor.child.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.monitor.child.data.PreferencesManager
import com.monitor.child.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * Detecta cuando el usuario instala una nueva app.
 * Envía alerta al servidor con el nombre y paquete de la app instalada.
 */
class PackageInstallReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "PackageInstallReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_PACKAGE_ADDED) return

        // La URI contiene "package:<packageName>"
        val packageName = intent.data?.schemeSpecificPart ?: return

        // Ignorar la propia app
        if (packageName == context.packageName) return

        // Ignorar actualizaciones de apps ya instaladas (no nuevas)
        if (intent.getBooleanExtra(Intent.EXTRA_REPLACING, false)) return

        val prefs = PreferencesManager(context)
        if (prefs.getDeviceToken().isNullOrBlank()) return

        val appLabel = try {
            context.packageManager
                .getApplicationLabel(context.packageManager.getApplicationInfo(packageName, 0))
                .toString()
        } catch (e: Exception) {
            packageName
        }

        Log.i(TAG, "Nueva app instalada: $appLabel ($packageName)")

        val apiClient = ApiClient(prefs)
        CoroutineScope(Dispatchers.IO).launch {
            val body = JSONObject().apply {
                put("type", "new_app_installed")
                put("metadata", JSONObject().apply {
                    put("packageName", packageName)
                    put("appLabel", appLabel)
                })
            }.toString()
            apiClient.postJson("/api/alerts/events", body)
        }
    }
}
