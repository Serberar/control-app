package com.monitor.child.gallery

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import com.monitor.child.data.PreferencesManager
import com.monitor.child.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * Cola de subida de media en dos capas:
 *
 * CAPA 1 (inmediata): al detectar media nueva, genera miniatura (~25 KB) y la sube
 *   INMEDIATAMENTE por cualquier conexión (datos móviles o WiFi).
 *   Devuelve un mediaId del servidor.
 *
 * CAPA 2 (WiFi): el archivo completo se encola y solo se sube cuando hay WiFi.
 *   Si el móvil se apaga antes de subir, el ítem permanece en la cola en memoria.
 *   (En una versión futura se persistiría en Room/DataStore para sobrevivir reinicios)
 */
class MediaUploadQueue(
    private val context: Context,
    private val apiClient: ApiClient,
    private val prefs: PreferencesManager,
    private val scope: CoroutineScope,
) {
    companion object {
        private const val TAG = "MediaUploadQueue"
        private const val WIFI_CHECK_INTERVAL_MS = 60_000L // 1 minuto
    }

    // Cola de items pendientes de subir en calidad completa
    private val fullUploadQueue = ConcurrentLinkedQueue<PendingFullUpload>()

    init {
        startWifiWorker()
    }

    /**
     * Encola un item nuevo:
     * 1. Genera miniatura y la sube inmediatamente (cualquier red)
     * 2. Si hay WiFi, sube también el completo ahora
     * 3. Si no hay WiFi, deja el completo en cola
     */
    fun enqueue(item: MediaItem) {
        scope.launch {
            try {
                // CAPA 1: miniatura inmediata
                val thumbBytes = withContext(Dispatchers.Default) {
                    if (item.fileType == "video")
                        ThumbnailGenerator.generateFromVideo(item.localPath)
                    else
                        ThumbnailGenerator.generateFromPhoto(item.localPath)
                }

                if (thumbBytes == null) {
                    Log.w(TAG, "No se pudo generar miniatura: ${item.localPath}")
                    return@launch
                }

                val mediaId = uploadThumbnail(item, thumbBytes) ?: return@launch
                Log.d(TAG, "Miniatura subida para mediaId=$mediaId")

                // CAPA 2: archivo completo — solo si hay WiFi
                val pending = PendingFullUpload(mediaId = mediaId, item = item)
                if (isOnWifi()) {
                    uploadFull(pending)
                } else {
                    fullUploadQueue.add(pending)
                    Log.d(TAG, "Completo encolado para WiFi: ${item.localPath}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error procesando ${item.localPath}: ${e.message}")
            }
        }
    }

    // ─── Worker WiFi ──────────────────────────────────────────────────────

    private fun startWifiWorker() {
        scope.launch {
            while (true) {
                delay(WIFI_CHECK_INTERVAL_MS)
                if (isOnWifi() && fullUploadQueue.isNotEmpty()) {
                    drainQueueOnWifi()
                }
            }
        }
    }

    private suspend fun drainQueueOnWifi() {
        Log.d(TAG, "WiFi disponible — subiendo ${fullUploadQueue.size} archivos completos")
        val iterator = fullUploadQueue.iterator()
        while (iterator.hasNext()) {
            val pending = iterator.next()
            val ok = uploadFull(pending)
            if (ok) iterator.remove()
            if (!isOnWifi()) break // Perdimos WiFi — parar y continuar luego
        }
    }

    // ─── Subidas ──────────────────────────────────────────────────────────

    private suspend fun uploadThumbnail(item: MediaItem, thumbBytes: ByteArray): String? {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getDeviceToken() ?: return@withContext null
                val serverUrl = prefs.getServerUrl()
                val filename = File(item.localPath).name
                val mimeType = if (item.fileType == "video") "image/jpeg" else "image/jpeg"

                val requestBody = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("file", "${filename}_thumb.jpg",
                        thumbBytes.toRequestBody(mimeType.toMediaType()))
                    .addFormDataPart("fileType", item.fileType)
                    .addFormDataPart("takenAt", item.takenAt.toString())
                    .build()

                val request = okhttp3.Request.Builder()
                    .url("$serverUrl/media/thumbnail")
                    .header("Authorization", "Bearer $token")
                    .post(requestBody)
                    .build()

                val response = apiClient.getHttpClient().newCall(request).execute()
                if (!response.isSuccessful) {
                    Log.w(TAG, "Error subiendo miniatura: ${response.code}")
                    response.close()
                    return@withContext null
                }

                val body = response.body?.string() ?: return@withContext null
                response.close()

                // Parsear mediaId de la respuesta JSON
                val regex = Regex("\"mediaId\"\\s*:\\s*\"([^\"]+)\"")
                regex.find(body)?.groupValues?.get(1)
            } catch (e: Exception) {
                Log.e(TAG, "Excepción subiendo miniatura: ${e.message}")
                null
            }
        }
    }

    private suspend fun uploadFull(pending: PendingFullUpload): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val file = File(pending.item.localPath)
                if (!file.exists()) {
                    Log.w(TAG, "Archivo ya no existe: ${pending.item.localPath}")
                    return@withContext true // Eliminar de la cola igualmente
                }

                val token = prefs.getDeviceToken() ?: return@withContext false
                val serverUrl = prefs.getServerUrl()
                val mimeType = if (pending.item.fileType == "video") "video/mp4" else "image/jpeg"

                val requestBody = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("file", file.name,
                        okhttp3.RequestBody.create(mimeType.toMediaType(), file))
                    .build()

                val request = okhttp3.Request.Builder()
                    .url("$serverUrl/media/upload/${pending.mediaId}")
                    .header("Authorization", "Bearer $token")
                    .post(requestBody)
                    .build()

                val response = apiClient.getHttpClient().newCall(request).execute()
                val ok = response.isSuccessful
                if (!ok) Log.w(TAG, "Error subiendo completo ${pending.mediaId}: ${response.code}")
                response.close()
                ok
            } catch (e: Exception) {
                Log.e(TAG, "Excepción subiendo completo ${pending.mediaId}: ${e.message}")
                false
            }
        }
    }

    // ─── Red ──────────────────────────────────────────────────────────────

    private fun isOnWifi(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
    }

    private data class PendingFullUpload(
        val mediaId: String,
        val item: MediaItem,
    )
}
