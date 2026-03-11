package com.monitor.child.gallery

import android.content.Context
import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Observa la galería del dispositivo para detectar fotos y vídeos nuevos.
 * Al detectar uno, lo pasa al MediaUploadQueue que gestiona la subida en dos capas:
 *   - Miniatura inmediata (~25 KB) por datos móviles
 *   - Archivo completo encolado para WiFi
 */
class GalleryMonitor(
    private val context: Context,
    private val uploadQueue: MediaUploadQueue,
    private val scope: CoroutineScope,
) : ContentObserver(Handler(Looper.getMainLooper())) {

    companion object {
        private const val TAG = "GalleryMonitor"
        private val IMAGES_URI: Uri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        private val VIDEO_URI: Uri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI
    }

    private var lastImageId: Long = getLastMediaId(IMAGES_URI)
    private var lastVideoId: Long = getLastMediaId(VIDEO_URI)

    fun register() {
        context.contentResolver.registerContentObserver(IMAGES_URI, true, this)
        context.contentResolver.registerContentObserver(VIDEO_URI, true, this)
        Log.i(TAG, "GalleryMonitor registrado")
    }

    fun unregister() {
        context.contentResolver.unregisterContentObserver(this)
    }

    override fun onChange(selfChange: Boolean, uri: Uri?) {
        scope.launch {
            try {
                checkNewImages()
                checkNewVideos()
            } catch (e: Exception) {
                Log.e(TAG, "Error detectando media nueva: ${e.message}")
            }
        }
    }

    private fun checkNewImages() {
        val cursor = context.contentResolver.query(
            IMAGES_URI,
            arrayOf(
                MediaStore.Images.Media._ID,
                MediaStore.Images.Media.DATA,
                MediaStore.Images.Media.DATE_TAKEN,
                MediaStore.Images.Media.SIZE,
            ),
            "${MediaStore.Images.Media._ID} > ?",
            arrayOf(lastImageId.toString()),
            "${MediaStore.Images.Media._ID} DESC",
        ) ?: return

        cursor.use {
            val idxId = it.getColumnIndex(MediaStore.Images.Media._ID)
            val idxPath = it.getColumnIndex(MediaStore.Images.Media.DATA)
            val idxDate = it.getColumnIndex(MediaStore.Images.Media.DATE_TAKEN)
            val idxSize = it.getColumnIndex(MediaStore.Images.Media.SIZE)

            while (it.moveToNext()) {
                val id = it.getLong(idxId)
                val path = it.getString(idxPath) ?: continue
                val dateTaken = it.getLong(idxDate)
                val size = it.getLong(idxSize)

                if (id > lastImageId) lastImageId = id

                Log.d(TAG, "Nueva foto detectada: $path")
                uploadQueue.enqueue(
                    MediaItem(
                        localPath = path,
                        fileType = "photo",
                        takenAt = dateTaken,
                        fileSizeBytes = size,
                    )
                )
            }
        }
    }

    private fun checkNewVideos() {
        val cursor = context.contentResolver.query(
            VIDEO_URI,
            arrayOf(
                MediaStore.Video.Media._ID,
                MediaStore.Video.Media.DATA,
                MediaStore.Video.Media.DATE_TAKEN,
                MediaStore.Video.Media.SIZE,
            ),
            "${MediaStore.Video.Media._ID} > ?",
            arrayOf(lastVideoId.toString()),
            "${MediaStore.Video.Media._ID} DESC",
        ) ?: return

        cursor.use {
            val idxId = it.getColumnIndex(MediaStore.Video.Media._ID)
            val idxPath = it.getColumnIndex(MediaStore.Video.Media.DATA)
            val idxDate = it.getColumnIndex(MediaStore.Video.Media.DATE_TAKEN)
            val idxSize = it.getColumnIndex(MediaStore.Video.Media.SIZE)

            while (it.moveToNext()) {
                val id = it.getLong(idxId)
                val path = it.getString(idxPath) ?: continue
                val dateTaken = it.getLong(idxDate)
                val size = it.getLong(idxSize)

                if (id > lastVideoId) lastVideoId = id

                Log.d(TAG, "Nuevo vídeo detectado: $path")
                uploadQueue.enqueue(
                    MediaItem(
                        localPath = path,
                        fileType = "video",
                        takenAt = dateTaken,
                        fileSizeBytes = size,
                    )
                )
            }
        }
    }

    private fun getLastMediaId(uri: Uri): Long {
        val cursor = context.contentResolver.query(
            uri, arrayOf("_id"), null, null, "_id DESC LIMIT 1"
        ) ?: return 0L
        return cursor.use {
            if (it.moveToFirst()) it.getLong(it.getColumnIndex("_id")) else 0L
        }
    }
}

data class MediaItem(
    val localPath: String,
    val fileType: String,  // "photo" | "video"
    val takenAt: Long,
    val fileSizeBytes: Long,
)
