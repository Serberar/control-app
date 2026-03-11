package com.monitor.child.appusage

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.TextView

/**
 * Pantalla que se muestra cuando el usuario intenta abrir una app bloqueada.
 *
 * Diseño minimalista: mensaje de bloqueo + botón para volver al inicio.
 * No tiene barra de navegación ni botón atrás funcional.
 */
class BlockedActivity : Activity() {

    companion object {
        const val EXTRA_PACKAGE = "extra_package"
        const val EXTRA_REASON = "extra_reason"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Layout inline — en un proyecto real usaría un fichero XML de resources
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setPadding(64, 64, 64, 64)
            setBackgroundColor(android.graphics.Color.parseColor("#1E3A5F"))
        }

        val icon = TextView(this).apply {
            text = "🔒"
            textSize = 64f
            gravity = android.view.Gravity.CENTER
        }

        val title = TextView(this).apply {
            val reason = intent.getStringExtra(EXTRA_REASON) ?: "blocked"
            text = if (reason == "time_limit") "Tiempo de uso agotado" else "App bloqueada"
            textSize = 22f
            setTextColor(android.graphics.Color.WHITE)
            gravity = android.view.Gravity.CENTER
            setPadding(0, 24, 0, 8)
        }

        val subtitle = TextView(this).apply {
            text = "Esta aplicación no está disponible ahora mismo.\nHabla con tus padres si necesitas acceso."
            textSize = 14f
            setTextColor(android.graphics.Color.parseColor("#B0BEC5"))
            gravity = android.view.Gravity.CENTER
            setPadding(0, 0, 0, 32)
        }

        val btn = Button(this).apply {
            text = "Volver al inicio"
            setOnClickListener {
                // Lanzar el launcher del sistema (pantalla de inicio)
                val homeIntent = android.content.Intent(android.content.Intent.ACTION_MAIN).apply {
                    addCategory(android.content.Intent.CATEGORY_HOME)
                    flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(homeIntent)
                finish()
            }
        }

        layout.addView(icon)
        layout.addView(title)
        layout.addView(subtitle)
        layout.addView(btn)
        setContentView(layout)
    }

    // Deshabilitar botón Atrás para que no escape a la app bloqueada
    override fun onBackPressed() {
        val homeIntent = android.content.Intent(android.content.Intent.ACTION_MAIN).apply {
            addCategory(android.content.Intent.CATEGORY_HOME)
            flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(homeIntent)
        finish()
    }
}
