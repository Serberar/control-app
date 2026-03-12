package com.monitor.child.network

import android.util.Log
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.monitor.child.data.PreferencesManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.util.concurrent.TimeUnit

class ApiClient(private val prefs: PreferencesManager) {

    companion object {
        private const val TAG = "ApiClient"
        private val JSON = "application/json; charset=utf-8".toMediaType()
    }

    private val gson = Gson()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    // ─── Ubicación ────────────────────────────────────────────────────────

    suspend fun uploadLocation(
        latitude: Double,
        longitude: Double,
        accuracy: Float?,
        altitude: Double?,
        address: String?
    ): Boolean = withContext(Dispatchers.IO) {
        val body = mapOf(
            "latitude" to latitude,
            "longitude" to longitude,
            "accuracy" to accuracy,
            "altitude" to altitude,
            "address" to address
        )
        postInternal("/api/location", body)
    }

    // ─── Heartbeat ────────────────────────────────────────────────────────

    suspend fun sendHeartbeat(batteryLevel: Int?, fcmToken: String?): Boolean =
        withContext(Dispatchers.IO) {
            val body = mapOf("batteryLevel" to batteryLevel, "fcmToken" to fcmToken)
            postInternal("/api/devices/heartbeat", body)
        }

    // ─── Media ────────────────────────────────────────────────────────────

    suspend fun uploadThumbnail(thumbnail: File, mimeType: String): Boolean =
        withContext(Dispatchers.IO) {
            uploadFile("/api/media/thumbnail", thumbnail, mimeType)
        }

    suspend fun uploadMedia(file: File, mimeType: String): Boolean =
        withContext(Dispatchers.IO) {
            uploadFile("/api/media/upload", file, mimeType)
        }

    // ─── Mensajes, llamadas, contactos ────────────────────────────────────

    suspend fun post(path: String, body: Any): Boolean = withContext(Dispatchers.IO) {
        postInternal(path, body)
    }

    // ─── Interno ──────────────────────────────────────────────────────────

    private suspend fun postInternal(path: String, body: Any): Boolean {
        val token = prefs.getDeviceToken() ?: return false
        val serverUrl = prefs.getServerUrl()
        val json = gson.toJson(body)

        return try {
            val request = Request.Builder()
                .url("$serverUrl$path")
                .header("Authorization", "Bearer $token")
                .post(json.toRequestBody(JSON))
                .build()

            val response = httpClient.newCall(request).execute()
            val ok = response.isSuccessful
            if (!ok) Log.w(TAG, "POST $path → ${response.code}")
            response.close()
            ok
        } catch (e: Exception) {
            Log.e(TAG, "Error en POST $path: ${e.message}")
            false
        }
    }

    private suspend fun uploadFile(path: String, file: File, mimeType: String): Boolean {
        val token = prefs.getDeviceToken() ?: return false
        val serverUrl = prefs.getServerUrl()

        return try {
            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", file.name, file.asRequestBody(mimeType.toMediaType()))
                .build()

            val request = Request.Builder()
                .url("$serverUrl$path")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            val response = httpClient.newCall(request).execute()
            val ok = response.isSuccessful
            response.close()
            ok
        } catch (e: Exception) {
            Log.e(TAG, "Error subiendo archivo: ${e.message}")
            false
        }
    }

    // ─── JSON con respuesta ────────────────────────────────────────────────

    /** POST con JSON crudo (String) en lugar de objeto Kotlin */
    suspend fun postJson(path: String, json: String): Boolean = withContext(Dispatchers.IO) {
        val token = prefs.getDeviceToken() ?: return@withContext false
        val serverUrl = prefs.getServerUrl()
        try {
            val request = Request.Builder()
                .url("$serverUrl$path")
                .header("Authorization", "Bearer $token")
                .post(json.toRequestBody(JSON))
                .build()
            val response = httpClient.newCall(request).execute()
            val ok = response.isSuccessful
            if (!ok) Log.w(TAG, "POST $path → ${response.code}")
            response.close()
            ok
        } catch (e: Exception) {
            Log.e(TAG, "Error en postJson $path: ${e.message}")
            false
        }
    }

    /** GET que devuelve el cuerpo como JSONObject (vacío si error) */
    suspend fun getJson(path: String): org.json.JSONObject = withContext(Dispatchers.IO) {
        val token = prefs.getDeviceToken() ?: return@withContext org.json.JSONObject()
        val serverUrl = prefs.getServerUrl()
        try {
            val request = Request.Builder()
                .url("$serverUrl$path")
                .header("Authorization", "Bearer $token")
                .get()
                .build()
            val response = httpClient.newCall(request).execute()
            val bodyStr = response.body?.string() ?: "{}"
            response.close()
            org.json.JSONObject(bodyStr)
        } catch (e: Exception) {
            Log.e(TAG, "Error en getJson $path: ${e.message}")
            org.json.JSONObject()
        }
    }

    fun getHttpClient(): OkHttpClient = httpClient
}
