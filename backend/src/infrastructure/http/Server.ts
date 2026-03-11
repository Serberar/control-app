import express, { Express, Router } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer, Server as HttpServer } from 'http'
import { errorMiddleware } from './middleware/errorMiddleware'

interface AppRoutes {
  auth: Router
  devices: Router
  location: Router
  pairing: Router
  messages: Router
  calls: Router
  media: Router
  web: Router
  alerts: Router
  geofences: Router
  apps: Router
}

export class Server {
  private readonly app: Express
  readonly httpServer: HttpServer

  constructor() {
    this.app = express()
    this.httpServer = createServer(this.app)
    this.setupMiddleware()
  }

  private setupMiddleware(): void {
    this.app.use(helmet())
    this.app.use(cors({ origin: false }))
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true }))
  }

  // Separado del constructor para poder inyectar rutas después de crear el WebSocket
  setupRoutes(routes: AppRoutes): void {
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    this.app.use('/api/auth', routes.auth)
    this.app.use('/api/devices', routes.devices)
    this.app.use('/api/location', routes.location)
    this.app.use('/api/pairing', routes.pairing)
    this.app.use('/api/messages', routes.messages)
    this.app.use('/api/calls', routes.calls)
    this.app.use('/media', routes.media)
    this.app.use('/api/web', routes.web)
    this.app.use('/api/alerts', routes.alerts)
    this.app.use('/api/geofences', routes.geofences)
    this.app.use('/api/apps', routes.apps)

    this.app.use(errorMiddleware)
  }

  listen(port: number): void {
    this.httpServer.listen(port, () => {
      console.log(`[Server] Escuchando en puerto ${port}`)
    })
  }
}
