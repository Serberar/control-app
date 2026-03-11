package com.monitor.child.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "monitor_prefs")

/**
 * Almacenamiento persistente de configuración del dispositivo.
 * Usando DataStore (sucesor moderno de SharedPreferences).
 */
class PreferencesManager(private val context: Context) {

    companion object {
        private val KEY_DEVICE_TOKEN = stringPreferencesKey("device_token")
        private val KEY_DEVICE_ID = stringPreferencesKey("device_id")
        private val KEY_SERVER_URL = stringPreferencesKey("server_url")
        private val KEY_SETUP_COMPLETE = booleanPreferencesKey("setup_complete")
        private val KEY_LIVE_LOCATION_ACTIVE = booleanPreferencesKey("live_location_active")
    }

    suspend fun getDeviceToken(): String? =
        context.dataStore.data.map { it[KEY_DEVICE_TOKEN] }.first()

    suspend fun getDeviceId(): String? =
        context.dataStore.data.map { it[KEY_DEVICE_ID] }.first()

    suspend fun getServerUrl(): String =
        context.dataStore.data.map { it[KEY_SERVER_URL] ?: com.monitor.child.BuildConfig.SERVER_URL }.first()

    suspend fun isSetupComplete(): Boolean =
        context.dataStore.data.map { it[KEY_SETUP_COMPLETE] ?: false }.first()

    suspend fun isLiveLocationActive(): Boolean =
        context.dataStore.data.map { it[KEY_LIVE_LOCATION_ACTIVE] ?: false }.first()

    suspend fun saveDeviceCredentials(deviceId: String, deviceToken: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_DEVICE_ID] = deviceId
            prefs[KEY_DEVICE_TOKEN] = deviceToken
        }
    }

    suspend fun setSetupComplete(complete: Boolean) {
        context.dataStore.edit { it[KEY_SETUP_COMPLETE] = complete }
    }

    suspend fun setLiveLocationActive(active: Boolean) {
        context.dataStore.edit { it[KEY_LIVE_LOCATION_ACTIVE] = active }
    }

    suspend fun setServerUrl(url: String) {
        context.dataStore.edit { it[KEY_SERVER_URL] = url }
    }

    // Genérico para claves arbitrarias (ej. IMSI, lastSmsId, etc.)
    suspend fun getString(key: String): String? {
        val prefKey = stringPreferencesKey(key)
        return context.dataStore.data.map { it[prefKey] }.first()
    }

    suspend fun setString(key: String, value: String) {
        val prefKey = stringPreferencesKey(key)
        context.dataStore.edit { it[prefKey] = value }
    }
}
