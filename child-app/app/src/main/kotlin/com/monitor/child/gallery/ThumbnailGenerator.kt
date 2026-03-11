package com.monitor.child.gallery

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.ThumbnailUtils
import android.os.Build
import android.provider.MediaStore
import android.util.Log
import java.io.ByteArrayOutputStream
import java.io.File

/**
 * Genera miniaturas comprimidas (~25 KB) de fotos y vídeos.
 * Las miniaturas se suben INMEDIATAMENTE por datos móviles, antes de que
 * el hijo pueda borrar el archivo original.
 */
object ThumbnailGenerator {

    private const val TAG = "ThumbnailGenerator"
    private const val TARGET_SIZE_PX = 320       // px máximo lado largo
    private const val TARGET_BYTES = 25 * 1024   // 25 KB objetivo

    fun generateFromPhoto(path: String): ByteArray? {
        return try {
            val file = File(path)
            if (!file.exists()) return null

            // Primero decodificar solo las dimensiones para calcular inSampleSize
            val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(path, opts)

            val sampleSize = calculateSampleSize(opts.outWidth, opts.outHeight)
            val decodeOpts = BitmapFactory.Options().apply { inSampleSize = sampleSize }
            val bitmap = BitmapFactory.decodeFile(path, decodeOpts) ?: return null

            val scaled = scaleBitmap(bitmap)
            bitmap.recycle()
            compressToTarget(scaled)
        } catch (e: Exception) {
            Log.e(TAG, "Error generando miniatura de foto: ${e.message}")
            null
        }
    }

    fun generateFromVideo(path: String): ByteArray? {
        return try {
            val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ThumbnailUtils.createVideoThumbnail(
                    File(path),
                    android.util.Size(TARGET_SIZE_PX, TARGET_SIZE_PX),
                    null,
                )
            } else {
                @Suppress("DEPRECATION")
                ThumbnailUtils.createVideoThumbnail(path, MediaStore.Images.Thumbnails.MINI_KIND)
            } ?: return null

            val scaled = scaleBitmap(bitmap)
            bitmap.recycle()
            compressToTarget(scaled)
        } catch (e: Exception) {
            Log.e(TAG, "Error generando miniatura de vídeo: ${e.message}")
            null
        }
    }

    private fun calculateSampleSize(width: Int, height: Int): Int {
        val maxDim = maxOf(width, height)
        var sampleSize = 1
        while (maxDim / sampleSize > TARGET_SIZE_PX * 4) {
            sampleSize *= 2
        }
        return sampleSize
    }

    private fun scaleBitmap(bitmap: Bitmap): Bitmap {
        val maxDim = maxOf(bitmap.width, bitmap.height)
        if (maxDim <= TARGET_SIZE_PX) return bitmap

        val scale = TARGET_SIZE_PX.toFloat() / maxDim
        val newWidth = (bitmap.width * scale).toInt()
        val newHeight = (bitmap.height * scale).toInt()
        return Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
    }

    private fun compressToTarget(bitmap: Bitmap): ByteArray {
        val stream = ByteArrayOutputStream()
        var quality = 85

        // Reducir calidad hasta estar por debajo del objetivo
        do {
            stream.reset()
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, stream)
            quality -= 10
        } while (stream.size() > TARGET_BYTES && quality > 10)

        bitmap.recycle()
        return stream.toByteArray()
    }
}
