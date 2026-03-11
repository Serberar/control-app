package com.monitor.child

import android.app.Application
import android.util.Log
import com.monitor.child.service.MonitorService
import com.monitor.child.data.PreferencesManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Clase Application — punto de entrada global.
 *
 * Si la configuración ya está completa, arranca el servicio
 * en cuanto se crea la aplicación (incluso antes de cualquier Activity).
 */
class ChildApp : Application() {

    companion object {
        private const val TAG = "ChildApp"
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Aplicación iniciada")

        CoroutineScope(Dispatchers.IO).launch {
            val prefs = PreferencesManager(this@ChildApp)
            if (prefs.isSetupComplete()) {
                Log.d(TAG, "Setup completo — arrancando servicio")
                MonitorService.startForeground(this@ChildApp)
            }
        }
    }
}
