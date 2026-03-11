package com.monitor.child.vpn

/**
 * Extrae el SNI (Server Name Indication) de un TLS ClientHello.
 * El SNI es el hostname enviado en claro en el inicio de las conexiones HTTPS,
 * lo que nos permite conocer el dominio aunque el tráfico esté cifrado.
 *
 * Formato TLS ClientHello (simplificado):
 *   1 byte  : content type (0x16 = handshake)
 *   2 bytes : TLS version
 *   2 bytes : record length
 *   1 byte  : handshake type (0x01 = ClientHello)
 *   3 bytes : handshake length
 *   2 bytes : client version
 *  32 bytes : random
 *   1 byte  : session ID length + session ID
 *   2 bytes : cipher suites length + cipher suites
 *   1 byte  : compression methods length + compression methods
 *   2 bytes : extensions length
 *   extensions...
 *     2 bytes : extension type (0x0000 = SNI)
 *     2 bytes : extension length
 *     2 bytes : server name list length
 *     1 byte  : name type (0x00 = host_name)
 *     2 bytes : name length
 *     N bytes : hostname
 */
object TlsSniExtractor {

    fun extract(data: ByteArray): String? {
        try {
            if (data.size < 5) return null
            // Content type = 0x16 (TLS handshake), Handshake type = 0x01 (ClientHello)
            if (data[0] != 0x16.toByte()) return null

            val recordLen = (data[3].toInt() and 0xFF shl 8) or (data[4].toInt() and 0xFF)
            if (data.size < 5 + recordLen) return null
            if (data[5] != 0x01.toByte()) return null  // Must be ClientHello

            var pos = 5 + 1 + 3 + 2 + 32  // Skip handshake header, version, random

            if (pos >= data.size) return null
            val sessionIdLen = data[pos].toInt() and 0xFF
            pos += 1 + sessionIdLen

            if (pos + 2 > data.size) return null
            val cipherSuitesLen = (data[pos].toInt() and 0xFF shl 8) or (data[pos + 1].toInt() and 0xFF)
            pos += 2 + cipherSuitesLen

            if (pos >= data.size) return null
            val compressionLen = data[pos].toInt() and 0xFF
            pos += 1 + compressionLen

            if (pos + 2 > data.size) return null
            val extensionsLen = (data[pos].toInt() and 0xFF shl 8) or (data[pos + 1].toInt() and 0xFF)
            pos += 2

            val extensionsEnd = pos + extensionsLen
            while (pos + 4 <= extensionsEnd && pos + 4 <= data.size) {
                val extType = (data[pos].toInt() and 0xFF shl 8) or (data[pos + 1].toInt() and 0xFF)
                val extLen = (data[pos + 2].toInt() and 0xFF shl 8) or (data[pos + 3].toInt() and 0xFF)
                pos += 4

                if (extType == 0x0000) {  // SNI extension
                    if (pos + 5 > data.size) return null
                    // Skip server name list length (2) + name type (1)
                    val nameLen = (data[pos + 3].toInt() and 0xFF shl 8) or (data[pos + 4].toInt() and 0xFF)
                    val nameStart = pos + 5
                    if (nameStart + nameLen > data.size) return null
                    return String(data, nameStart, nameLen, Charsets.US_ASCII)
                }

                pos += extLen
            }
        } catch (_: Exception) { }
        return null
    }
}
