package com.monitor.child.calls

import android.content.Context
import android.provider.CallLog
import android.util.Log
import com.monitor.child.network.CallLogEntry
import com.monitor.child.network.MessageUploader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class CallLogSync(
    private val context: Context,
    private val uploader: MessageUploader,
) {
    companion object {
        private const val TAG = "CallLogSync"
    }

    // Último timestamp procesado para no subir duplicados
    private var lastSyncedTimestamp: Long = 0L

    suspend fun sync() = withContext(Dispatchers.IO) {
        try {
            val calls = readNewCalls()
            if (calls.isNotEmpty()) {
                uploader.uploadCallLogs(calls)
                Log.d(TAG, "Sincronizadas ${calls.size} llamadas")
            }
        } catch (e: SecurityException) {
            Log.w(TAG, "Sin permiso READ_CALL_LOG: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Error sincronizando llamadas: ${e.message}")
        }
    }

    private fun readNewCalls(): List<CallLogEntry> {
        val entries = mutableListOf<CallLogEntry>()

        val cursor = context.contentResolver.query(
            CallLog.Calls.CONTENT_URI,
            arrayOf(
                CallLog.Calls.NUMBER,
                CallLog.Calls.CACHED_NAME,
                CallLog.Calls.TYPE,
                CallLog.Calls.DURATION,
                CallLog.Calls.DATE,
            ),
            "${CallLog.Calls.DATE} > ?",
            arrayOf(lastSyncedTimestamp.toString()),
            "${CallLog.Calls.DATE} DESC",
        ) ?: return entries

        cursor.use {
            val idxNumber = it.getColumnIndex(CallLog.Calls.NUMBER)
            val idxName = it.getColumnIndex(CallLog.Calls.CACHED_NAME)
            val idxType = it.getColumnIndex(CallLog.Calls.TYPE)
            val idxDuration = it.getColumnIndex(CallLog.Calls.DURATION)
            val idxDate = it.getColumnIndex(CallLog.Calls.DATE)

            while (it.moveToNext()) {
                val number = it.getString(idxNumber) ?: continue
                val name = it.getString(idxName)
                val type = it.getInt(idxType)
                val duration = it.getInt(idxDuration)
                val date = it.getLong(idxDate)

                if (date > lastSyncedTimestamp) lastSyncedTimestamp = date

                val callType = when (type) {
                    CallLog.Calls.INCOMING_TYPE -> "incoming"
                    CallLog.Calls.OUTGOING_TYPE -> "outgoing"
                    CallLog.Calls.MISSED_TYPE -> "missed"
                    else -> "incoming"
                }

                entries.add(
                    CallLogEntry(
                        source = "native",
                        contactName = name?.takeIf { n -> n.isNotBlank() },
                        phoneNumber = number,
                        type = callType,
                        durationSeconds = duration,
                        timestamp = date,
                    )
                )
            }
        }

        return entries
    }
}
