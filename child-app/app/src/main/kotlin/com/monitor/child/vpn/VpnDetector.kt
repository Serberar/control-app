package com.monitor.child.vpn

import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import com.monitor.child.data.PreferencesManager
import com.monitor.child.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Detecta si el dispositivo tiene una VPN externa activa o instalada.
 *
 * Estrategia:
 * 1. Detecta VPN activa vía ConnectivityManager (NetworkCapabilities.TRANSPORT_VPN)
 * 2. Busca apps VPN conocidas instaladas por package name
 * 3. Reporta al servidor si detecta actividad VPN ajena a la nuestra
 *
 * Si detecta una VPN externa activa, envía un evento al backend para que
 * el padre sea notificado.
 */
class VpnDetector(
    private val context: Context,
    private val apiClient: ApiClient,
    private val prefs: PreferencesManager,
    private val scope: CoroutineScope,
) {

    companion object {
        private const val TAG = "VpnDetector"
        private const val CHECK_INTERVAL_MS = 5 * 60 * 1000L  // cada 5 minutos

        // Apps VPN populares — ampliar según necesidad
        private val KNOWN_VPN_PACKAGES = setOf(
            "com.expressvpn.vpn",
            "com.nordvpn.android",
            "com.privateinternetaccess.android",
            "com.tunnelbear.android",
            "com.surfshark.vpnclient.android",
            "com.proton.vpn.android",
            "org.strongswan.android",
            "de.blinkt.openvpn",
            "com.wireguard.android",
            "com.windscribe.vpn",
            "com.cyberghostvpn.android",
            "com.hotspotshield.android.vpn",
            "uk.co.hidemyass.vpn",
            "com.ipvanish.android",
            "com.mullvad.vpn",
        )
    }

    private var wasVpnActive = false

    fun startMonitoring() {
        scope.launch {
            while (true) {
                check()
                delay(CHECK_INTERVAL_MS)
            }
        }
        Log.d(TAG, "Monitoreo de VPN externas iniciado")
    }

    private suspend fun check() {
        val vpnActive = isExternalVpnActive()
        val installedApps = getInstalledVpnApps()

        if (installedApps.isNotEmpty()) {
            Log.w(TAG, "Apps VPN instaladas: $installedApps")
        }

        if (vpnActive && !wasVpnActive) {
            Log.w(TAG, "VPN externa detectada — notificando al servidor")
            reportVpnDetected(installedApps)
        }
        wasVpnActive = vpnActive
    }

    /**
     * Retorna true si hay una VPN activa que NO es nuestra (LocalVpnService).
     * Usamos TRANSPORT_VPN en las capabilities de red activa.
     */
    private fun isExternalVpnActive(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)
    }

    private fun getInstalledVpnApps(): List<String> {
        val pm = context.packageManager
        return KNOWN_VPN_PACKAGES.filter { pkg ->
            try {
                pm.getPackageInfo(pkg, 0)
                true
            } catch (_: PackageManager.NameNotFoundException) {
                false
            }
        }
    }

    private suspend fun reportVpnDetected(installedApps: List<String>) {
        try {
            val body = mapOf(
                "event" to "vpn_detected",
                "installedApps" to installedApps,
                "timestamp" to System.currentTimeMillis(),
            )
            apiClient.post("/api/devices/events", body)
        } catch (e: Exception) {
            Log.e(TAG, "Error reportando VPN: ${e.message}")
        }
    }
}
