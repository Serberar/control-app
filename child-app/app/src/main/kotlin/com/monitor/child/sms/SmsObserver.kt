package com.monitor.child.sms

import android.content.Context
import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.ContactsContract
import android.provider.Telephony
import android.util.Log
import com.monitor.child.network.MessageUploader
import com.monitor.child.network.SmsMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class SmsObserver(
    private val context: Context,
    private val uploader: MessageUploader,
    private val scope: CoroutineScope,
) : ContentObserver(Handler(Looper.getMainLooper())) {

    companion object {
        private const val TAG = "SmsObserver"
        private val SMS_URI: Uri = Uri.parse("content://sms")
    }

    // Último ID de SMS procesado (evita duplicados)
    private var lastSmsId: Long = getLastSmsId()

    fun register() {
        context.contentResolver.registerContentObserver(SMS_URI, true, this)
        Log.i(TAG, "SmsObserver registrado")
    }

    fun unregister() {
        context.contentResolver.unregisterContentObserver(this)
    }

    override fun onChange(selfChange: Boolean, uri: Uri?) {
        scope.launch {
            try {
                val newMessages = readNewMessages()
                if (newMessages.isNotEmpty()) {
                    uploader.uploadSmsMessages(newMessages)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error leyendo SMS: ${e.message}")
            }
        }
    }

    private fun readNewMessages(): List<SmsMessage> {
        val messages = mutableListOf<SmsMessage>()

        val cursor = context.contentResolver.query(
            SMS_URI,
            arrayOf("_id", "address", "body", "type", "date", "thread_id"),
            "_id > ?",
            arrayOf(lastSmsId.toString()),
            "_id DESC",
        ) ?: return messages

        cursor.use {
            val idxId = it.getColumnIndex("_id")
            val idxAddress = it.getColumnIndex("address")
            val idxBody = it.getColumnIndex("body")
            val idxType = it.getColumnIndex("type")
            val idxDate = it.getColumnIndex("date")
            val idxThread = it.getColumnIndex("thread_id")

            while (it.moveToNext()) {
                val id = it.getLong(idxId)
                val address = it.getString(idxAddress) ?: continue
                val body = it.getString(idxBody) ?: continue
                val type = it.getInt(idxType)
                val date = it.getLong(idxDate)
                val threadId = it.getLong(idxThread)

                if (id > lastSmsId) lastSmsId = id

                // type 1 = INBOX (incoming), type 2 = SENT (outgoing)
                val direction = if (type == Telephony.Sms.MESSAGE_TYPE_SENT) "outgoing" else "incoming"
                val contactName = resolveContactName(address)

                messages.add(
                    SmsMessage(
                        address = address,
                        contactName = contactName,
                        body = body,
                        direction = direction,
                        timestamp = date,
                        threadId = threadId,
                    )
                )
            }
        }

        return messages
    }

    private fun resolveContactName(address: String): String? {
        val uri = Uri.withAppendedPath(
            ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
            Uri.encode(address)
        )
        return context.contentResolver.query(
            uri,
            arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME),
            null, null, null,
        )?.use { cursor ->
            if (cursor.moveToFirst())
                cursor.getString(cursor.getColumnIndexOrThrow(ContactsContract.PhoneLookup.DISPLAY_NAME))
            else null
        }
    }

    private fun getLastSmsId(): Long {
        val cursor = context.contentResolver.query(
            SMS_URI, arrayOf("_id"), null, null, "_id DESC LIMIT 1"
        ) ?: return 0L
        return cursor.use {
            if (it.moveToFirst()) it.getLong(it.getColumnIndex("_id")) else 0L
        }
    }
}
