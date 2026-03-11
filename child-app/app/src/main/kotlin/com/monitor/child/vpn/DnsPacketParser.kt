package com.monitor.child.vpn

/**
 * Parser mínimo de paquetes DNS (UDP).
 * Solo nos interesa extraer el QNAME (nombre consultado) de las queries.
 *
 * Formato DNS query (sin cabecera IP/UDP):
 *   2 bytes : Transaction ID
 *   2 bytes : Flags
 *   2 bytes : Questions count
 *   2 bytes : Answer RRs
 *   2 bytes : Authority RRs
 *   2 bytes : Additional RRs
 *   QNAME   : secuencia de labels con longitud prefijada, terminado en 0x00
 *   2 bytes : QTYPE
 *   2 bytes : QCLASS
 */
object DnsPacketParser {

    fun extractQName(dnsPayload: ByteArray): String? {
        try {
            if (dnsPayload.size < 12) return null

            // Verificar que es una query (QR bit = 0)
            val flags = (dnsPayload[2].toInt() and 0xFF shl 8) or (dnsPayload[3].toInt() and 0xFF)
            val isQuery = (flags and 0x8000) == 0
            if (!isQuery) return null

            val questionCount = (dnsPayload[4].toInt() and 0xFF shl 8) or (dnsPayload[5].toInt() and 0xFF)
            if (questionCount == 0) return null

            // Parsear primer QNAME
            var pos = 12
            val labels = mutableListOf<String>()

            while (pos < dnsPayload.size) {
                val labelLen = dnsPayload[pos].toInt() and 0xFF
                if (labelLen == 0) break
                pos++
                if (pos + labelLen > dnsPayload.size) return null
                labels.add(String(dnsPayload, pos, labelLen, Charsets.US_ASCII))
                pos += labelLen
            }

            return if (labels.isNotEmpty()) labels.joinToString(".") else null
        } catch (_: Exception) {
            return null
        }
    }
}
