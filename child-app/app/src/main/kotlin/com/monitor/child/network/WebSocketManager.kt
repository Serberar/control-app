package com.monitor.child.network

import android.util.Log
import com.google.gson.Gson
import com.monitor.child.data.PreferencesManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Gestiona la conexión WebSocket permanente con el servidor.
 *
 * El servidor usa esta conexión para enviar órdenes al dispositivo:
 * - location:request_now  → responder con ubicación inmediata
 * - location:start_live   → empezar a enviar ubicación cada 30s
 * - location:stop_live    → parar el envío periódico
 * - device:lock           → bloquear pantalla
 * - device:unlock         → desbloquear
 *
 * Reconexión automática con backoff exponencial.
 */
class WebSocketManager(
    private val prefs: PreferencesManager,
    private val apiClient: ApiClient,
) {
    companion object {
        private const val TAG = "WebSocketManager"
        private const val RECONNECT_DELAY_MS = 5_000L
        private const val MAX_RECONNECT_DELAY_MS = 60_000L
    }

    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO)
    private val isConnected = AtomicBoolean(false)
    private val shouldReconnect = AtomicBoolean(false)
    private var webSocket: WebSocket? = null
    private var reconnectDelay = RECONNECT_DELAY_MS

    // Listeners que se asignan desde fuera (LocationManager, etc.)
    var onRequestLocationNow: (() -> Unit)? = null
    var onStartLiveLocation: (() -> Unit)? = null
    var onStopLiveLocation: (() -> Unit)? = null
    var onLockDevice: (() -> Unit)? = null

    fun connect() {
        shouldReconnect.set(true)
        scope.launch { connectInternal() }
    }

    fun disconnect() {
        shouldReconnect.set(false)
        webSocket?.close(1000, "Servicio detenido")
        webSocket = null
        isConnected.set(false)
    }

    fun isConnected(): Boolean = isConnected.get()

    private suspend fun connectInternal() {
        val token = prefs.getDeviceToken() ?: run {
            Log.w(TAG, "Sin token — no se puede conectar al WebSocket")
            return
        }
        val serverUrl = prefs.getServerUrl()
            .replace("https://", "wss://")
            .replace("http://", "ws://")

        val request = Request.Builder()
            .url("$serverUrl/socket.io/?transport=websocket")
            .header("Authorization", "Bearer $token")
            .build()

        Log.d(TAG, "Conectando a $serverUrl")

        val wsClient = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.MILLISECONDS)  // Sin timeout en lectura (conexión larga)
            .pingInterval(25, TimeUnit.SECONDS)      // Keep-alive
            .build()

        webSocket = wsClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket conectado")
                isConnected.set(true)
                reconnectDelay = RECONNECT_DELAY_MS
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleMessage(text)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.w(TAG, "WebSocket error: ${t.message}")
                isConnected.set(false)
                scheduleReconnect()
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket cerrado: $code $reason")
                isConnected.set(false)
                if (shouldReconnect.get()) scheduleReconnect()
            }
        })
    }

    private fun handleMessage(text: String) {
        try {
            val msg = gson.fromJson(text, Map::class.java)
            when (msg["event"] as? String) {
                "location:request_now" -> {
                    Log.d(TAG, "Orden recibida: localizar ahora")
                    onRequestLocationNow?.invoke()
                }
                "location:start_live" -> {
                    Log.d(TAG, "Orden recibida: iniciar live")
                    onStartLiveLocation?.invoke()
                }
                "location:stop_live" -> {
                    Log.d(TAG, "Orden recibida: parar live")
                    onStopLiveLocation?.invoke()
                }
                "device:lock" -> {
                    Log.d(TAG, "Orden recibida: bloquear pantalla")
                    onLockDevice?.invoke()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error procesando mensaje WS: ${e.message}")
        }
    }

    private fun scheduleReconnect() {
        if (!shouldReconnect.get()) return
        scope.launch {
            Log.d(TAG, "Reconectando en ${reconnectDelay}ms")
            delay(reconnectDelay)
            reconnectDelay = minOf(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS)
            connectInternal()
        }
    }
}
