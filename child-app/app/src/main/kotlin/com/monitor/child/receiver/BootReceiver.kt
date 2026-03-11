package com.monitor.child.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.monitor.child.service.MonitorService

/**
 * Se activa en cada arranque del dispositivo.
 * Reinicia el MonitorService automáticamente.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_LOCKED_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED
        ) {
            Log.d(TAG, "Sistema arrancado (action=$action) — iniciando servicio")
            MonitorService.startForeground(context)
        }
    }
}
