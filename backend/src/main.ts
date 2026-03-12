// En Docker las variables vienen de docker-compose.
// En desarrollo local, crear un .env y añadir dotenv a las dependencias.

import { Server } from './infrastructure/http/Server'
import { WebSocketServer } from './infrastructure/websocket/WebSocketServer'
import { buildContainer } from './infrastructure/container'
import { runMigrations } from './infrastructure/database/migrate'

async function bootstrap(): Promise<void> {
  const port = parseInt(process.env.PORT ?? '3000', 10)

  // 1. Migraciones de base de datos
  console.log('[Bootstrap] Ejecutando migraciones...')
  await runMigrations()
  console.log('[Bootstrap] Migraciones completadas')

  // 2. Crear servidor HTTP (sin rutas aún)
  const server = new Server()

  // 3. Crear WebSocket sobre el servidor HTTP
  //    El WS necesita el httpServer, y el contenedor necesita el WS.
  //    Creamos primero el httpServer, luego el WS, luego el contenedor.
  const wsServer = new WebSocketServer(server.httpServer)

  // 4. Construir contenedor con el WS real e inyectar rutas
  const container = buildContainer(wsServer)
  server.setupRoutes(container)

  // 5. Arrancar jobs en background
  container.inactivityCheckJob.start()

  // 6. Arrancar servidor HTTP
  server.listen(port)
  console.log(`[Bootstrap] API lista   → http://localhost:${port}/api`)
  console.log(`[Bootstrap] WebSocket   → ws://localhost:${port}`)
  console.log(`[Bootstrap] Health      → http://localhost:${port}/health`)
}

bootstrap().catch((err: Error) => {
  console.error('[Bootstrap] Error fatal:', err.message)
  process.exit(1)
})
