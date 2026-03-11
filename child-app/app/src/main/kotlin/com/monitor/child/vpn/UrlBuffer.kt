package com.monitor.child.vpn

import android.util.Log
import com.monitor.child.data.PreferencesManager
import com.monitor.child.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.ConcurrentLinkedQueue

data class CapturedUrl(
    val url: String,
    val app: String,
    val timestamp: Long = System.currentTimeMillis(),
)

/**
 * Buffer de URLs capturadas. Acumula y sube en lotes cada 60 segundos
 * o cuando el buffer llega a 100 entradas (lo que ocurra primero).
 */
class UrlBuffer(
    private val apiClient: ApiClient,
    private val scope: CoroutineScope,
) {
    companion object {
        private const val TAG = "UrlBuffer"
        private const val FLUSH_INTERVAL_MS = 60_000L
        private const val BATCH_SIZE = 100
    }

    private val queue = ConcurrentLinkedQueue<CapturedUrl>()

    init {
        startFlushWorker()
    }

    fun add(url: String, app: String = "browser") {
        queue.add(CapturedUrl(url = url, app = app))
        if (queue.size >= BATCH_SIZE) {
            scope.launch { flush() }
        }
    }

    private fun startFlushWorker() {
        scope.launch {
            while (true) {
                delay(FLUSH_INTERVAL_MS)
                flush()
            }
        }
    }

    private suspend fun flush() = withContext(Dispatchers.IO) {
        if (queue.isEmpty()) return@withContext

        val batch = mutableListOf<CapturedUrl>()
        while (batch.size < BATCH_SIZE) {
            val item = queue.poll() ?: break
            batch.add(item)
        }

        if (batch.isEmpty()) return@withContext

        val payload = mapOf(
            "entries" to batch.map { mapOf("url" to it.url, "app" to it.app, "timestamp" to it.timestamp) }
        )

        val ok = apiClient.post("/api/web", payload)
        if (!ok) {
            // Reinsertar en cola para reintentar
            batch.forEach { queue.add(it) }
            Log.w(TAG, "Error subiendo ${batch.size} URLs, reintentando en el siguiente ciclo")
        } else {
            Log.d(TAG, "Subidas ${batch.size} URLs al servidor")
        }
    }
}
