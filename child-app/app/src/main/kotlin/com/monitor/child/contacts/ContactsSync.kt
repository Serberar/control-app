package com.monitor.child.contacts

import android.content.Context
import android.provider.ContactsContract
import android.util.Log
import com.monitor.child.network.ContactEntry
import com.monitor.child.network.MessageUploader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class ContactsSync(
    private val context: Context,
    private val uploader: MessageUploader,
) {
    companion object {
        private const val TAG = "ContactsSync"
    }

    // Solo sincronizar una vez por sesión (o cuando cambia el número)
    private var lastContactCount: Int = -1

    suspend fun syncIfChanged() = withContext(Dispatchers.IO) {
        try {
            val contacts = readContacts()
            if (contacts.size == lastContactCount) return@withContext
            lastContactCount = contacts.size

            uploader.uploadContacts(contacts)
            Log.d(TAG, "Contactos sincronizados: ${contacts.size}")
        } catch (e: SecurityException) {
            Log.w(TAG, "Sin permiso READ_CONTACTS: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Error sincronizando contactos: ${e.message}")
        }
    }

    private fun readContacts(): List<ContactEntry> {
        val contactsMap = mutableMapOf<String, MutableContactData>()

        // Leer todos los números de teléfono
        val phoneCursor = context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(
                ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER,
            ),
            null, null, null,
        ) ?: return emptyList()

        phoneCursor.use {
            val idxId = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.CONTACT_ID)
            val idxName = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val idxNumber = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)

            while (it.moveToNext()) {
                val id = it.getString(idxId) ?: continue
                val name = it.getString(idxName) ?: continue
                val number = it.getString(idxNumber) ?: continue

                contactsMap.getOrPut(id) { MutableContactData(name) }.phones.add(number)
            }
        }

        // Leer emails
        val emailCursor = context.contentResolver.query(
            ContactsContract.CommonDataKinds.Email.CONTENT_URI,
            arrayOf(
                ContactsContract.CommonDataKinds.Email.CONTACT_ID,
                ContactsContract.CommonDataKinds.Email.ADDRESS,
            ),
            null, null, null,
        )

        emailCursor?.use {
            val idxId = it.getColumnIndex(ContactsContract.CommonDataKinds.Email.CONTACT_ID)
            val idxEmail = it.getColumnIndex(ContactsContract.CommonDataKinds.Email.ADDRESS)

            while (it.moveToNext()) {
                val id = it.getString(idxId) ?: continue
                val email = it.getString(idxEmail) ?: continue
                contactsMap[id]?.emails?.add(email)
            }
        }

        return contactsMap.values.map { data ->
            ContactEntry(
                name = data.name,
                phoneNumbers = data.phones.distinct(),
                emails = data.emails.distinct(),
            )
        }
    }

    private data class MutableContactData(
        val name: String,
        val phones: MutableList<String> = mutableListOf(),
        val emails: MutableList<String> = mutableListOf(),
    )
}
