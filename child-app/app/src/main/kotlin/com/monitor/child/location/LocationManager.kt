package com.monitor.child.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.monitor.child.data.PreferencesManager
import com.monitor.child.network.ApiClient
import com.monitor.child.network.WebSocketManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Gestiona los tres modos de localización:
 *
 * 1. PASIVO: cada 10 minutos en background (bajo consumo)
 * 2. AHORA: el padre pulsa "¿Dónde está?" → respuesta en <10 segundos
 * 3. LIVE: cada 30 segundos mientras el padre tiene el mapa abierto
 */
class LocationManager(
    private val context: Context,
    private val prefs: PreferencesManager,
    private val apiClient: ApiClient,
    private val webSocketManager: WebSocketManager,
) {
    companion object {
        private const val TAG = "LocationManager"
        private const val PASSIVE_INTERVAL_MS = 10 * 60 * 1000L   // 10 minutos
        private const val LIVE_INTERVAL_MS = 30 * 1000L            // 30 segundos
    }

    private val scope = CoroutineScope(Dispatchers.IO)
    private val fusedClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    private var passiveCallback: LocationCallback? = null
    private var liveCallback: LocationCallback? = null
    private var liveJob: Job? = null

    fun startPassiveTracking() {
        if (!hasLocationPermission()) {
            Log.w(TAG, "Sin permiso de ubicación")
            return
        }

        // Registrar listeners del WebSocket
        webSocketManager.onRequestLocationNow = { getLocationNow() }
        webSocketManager.onStartLiveLocation = { startLiveTracking() }
        webSocketManager.onStopLiveLocation = { stopLiveTracking() }

        val request = LocationRequest.Builder(PASSIVE_INTERVAL_MS)
            .setPriority(Priority.PRIORITY_BALANCED_POWER_ACCURACY)
            .setMinUpdateIntervalMillis(5 * 60 * 1000L) // mínimo 5 min entre updates
            .build()

        passiveCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { uploadLocation(it) }
            }
        }

        try {
            fusedClient.requestLocationUpdates(request, passiveCallback!!, Looper.getMainLooper())
            Log.d(TAG, "Tracking pasivo iniciado")
        } catch (e: SecurityException) {
            Log.e(TAG, "Error de seguridad en tracking pasivo: ${e.message}")
        }
    }

    fun getLocationNow() {
        if (!hasLocationPermission()) return
        Log.d(TAG, "Solicitando ubicación inmediata")
        try {
            fusedClient.getCurrentLocation(
                Priority.PRIORITY_HIGH_ACCURACY,
                null
            ).addOnSuccessListener { location ->
                location?.let { uploadLocation(it) }
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Error obteniendo ubicación: ${e.message}")
        }
    }

    private fun startLiveTracking() {
        if (!hasLocationPermission()) return
        Log.d(TAG, "Iniciando tracking en vivo")

        val request = LocationRequest.Builder(LIVE_INTERVAL_MS)
            .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
            .build()

        liveCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { uploadLocation(it) }
            }
        }

        try {
            fusedClient.requestLocationUpdates(request, liveCallback!!, Looper.getMainLooper())
        } catch (e: SecurityException) {
            Log.e(TAG, "Error en tracking live: ${e.message}")
        }
    }

    private fun stopLiveTracking() {
        Log.d(TAG, "Parando tracking en vivo")
        liveCallback?.let {
            fusedClient.removeLocationUpdates(it)
            liveCallback = null
        }
        liveJob?.cancel()
        liveJob = null
    }

    fun stop() {
        passiveCallback?.let { fusedClient.removeLocationUpdates(it) }
        stopLiveTracking()
    }

    private fun uploadLocation(location: Location) {
        scope.launch {
            val ok = apiClient.uploadLocation(
                latitude = location.latitude,
                longitude = location.longitude,
                accuracy = if (location.hasAccuracy()) location.accuracy else null,
                altitude = if (location.hasAltitude()) location.altitude else null,
                address = null  // Geocodificación en el servidor si se necesita
            )
            if (ok) Log.d(TAG, "Ubicación subida: ${location.latitude}, ${location.longitude}")
        }
    }

    private fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED
}
