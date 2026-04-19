import { IncomingMessage } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import type { Server as HttpServer } from 'node:http'
import type { Server as HttpsServer } from 'node:https'
import mongoose from 'mongoose'
import * as authHelper from '../utils/authHelper'
import * as helper from '../utils/helper'
import * as logger from '../utils/logger'
import Notification from '../models/Notification'
import User from '../models/User'

/**
 * Shape of a push payload sent to Flutter clients.
 */
export interface WsPushPayload {
  type: 'notification'
  id: string
  message: string
  isRead: boolean
  createdAt: string
  booking?: string
  car?: string
}

/**
 * Tracks an authenticated WebSocket connection.
 */
interface AuthenticatedClient {
  ws: WebSocket
  userId: string
}

const clients = new Map<string, AuthenticatedClient>()
let changeStream: mongoose.mongo.ChangeStream | null = null
let wss: WebSocketServer | null = null

/**
 * Extract JWT token from WebSocket upgrade request.
 * Accepts token via:
 *   - query param:  ?token=<jwt>
 *   - first-message auth flow (handled separately)
 */
function extractToken(req: IncomingMessage): string | null {
  try {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`)
    return url.searchParams.get('token')
  } catch {
    return null
  }
}

/**
 * Authenticate a WebSocket connection via JWT.
 * Returns the userId on success, null on failure.
 */
async function authenticateWs(req: IncomingMessage): Promise<string | null> {
  const token = extractToken(req)
  if (!token) return null

  try {
    const sessionData = await authHelper.decryptJWT(token)
    if (!sessionData?.id || !helper.isValidObjectId(sessionData.id)) return null

    const user = await User.findById(sessionData.id).lean()
    if (!user || (user as any).blacklisted) return null

    return sessionData.id
  } catch {
    return null
  }
}

/**
 * Send a JSON payload to a specific client if their socket is open.
 */
function sendToUser(userId: string, payload: WsPushPayload): void {
  const client = clients.get(userId)
  if (client && client.ws.readyState === WebSocket.OPEN) {
    try {
      client.ws.send(JSON.stringify(payload))
    } catch (err) {
      logger.error(`[WS] Failed to send to user ${userId}`, err)
    }
  }
}

/**
 * Start watching the Notification collection for new inserts
 * and push them to connected WebSocket clients in real-time.
 */
async function startChangeStream(): Promise<void> {
  // Only watch insert operations
  changeStream = Notification.watch(
    [{ $match: { operationType: 'insert' } }],
    { fullDocument: 'updateLookup' },
  )

  changeStream.on('change', (change: any) => {
    const doc = change.fullDocument
    if (!doc) return

    const userId = doc.user?.toString()
    if (!userId) return

    const payload: WsPushPayload = {
      type: 'notification',
      id: doc._id.toString(),
      message: doc.message ?? '',
      isRead: doc.isRead ?? false,
      createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
      booking: doc.booking?.toString(),
      car: doc.car?.toString(),
    }

    sendToUser(userId, payload)
  })

  changeStream.on('error', (err: unknown) => {
    logger.error('[WS] Change stream error', err)
    // Attempt to restart after delay
    setTimeout(() => startChangeStream(), 5000)
  })

  changeStream.on('close', () => {
    logger.info('[WS] Change stream closed')
  })

  logger.info('[WS] MongoDB change stream started on Notification collection')
}

/**
 * Initialise the WebSocket server, attach it to an existing HTTP/HTTPS server,
 * and start the MongoDB change stream.
 *
 * Connections are authenticated via JWT token passed as query param:
 *   ws://host/ws/notifications?token=<jwt>
 *
 * @param server - The existing HTTP or HTTPS server to attach to.
 */
export async function initWsNotificationService(server: HttpServer | HttpsServer): Promise<void> {
  wss = new WebSocketServer({ noServer: true })

  // Handle the HTTP upgrade request for the /ws/notifications path
  server.on('upgrade', async (req: IncomingMessage, socket: any, head: Buffer) => {
    const url = req.url ?? ''

    if (!url.startsWith('/ws/notifications')) {
      socket.destroy()
      return
    }

    const userId = await authenticateWs(req)
    if (!userId) {
      // Reject unauthorized connection
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    wss!.handleUpgrade(req, socket, head, (ws) => {
      wss!.emit('connection', ws, req, userId)
    })
  })

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage, userId: string) => {
    logger.info(`[WS] Client connected: ${userId}`)

    // Close any previous connection for this user
    const existing = clients.get(userId)
    if (existing && existing.ws.readyState === WebSocket.OPEN) {
      existing.ws.close(1000, 'Replaced by new connection')
    }

    clients.set(userId, { ws, userId })

    // Send a welcome/ping to confirm connection
    ws.send(JSON.stringify({ type: 'connected', userId }))

    ws.on('message', (data) => {
      // Support client ping to keep connection alive
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }))
        }
      } catch {
        // Ignore non-JSON messages
      }
    })

    ws.on('close', () => {
      const current = clients.get(userId)
      if (current && current.ws === ws) {
        clients.delete(userId)
      }
      logger.info(`[WS] Client disconnected: ${userId}`)
    })

    ws.on('error', (err) => {
      logger.error(`[WS] Socket error for user ${userId}`, err)
    })
  })

  // Start MongoDB change stream
  await startChangeStream()

  logger.info('[WS] WebSocket notification service initialised')
}

/**
 * Gracefully shut down the WebSocket server and change stream.
 */
export async function shutdownWsNotificationService(): Promise<void> {
  if (changeStream) {
    await changeStream.close()
    changeStream = null
  }

  if (wss) {
    await new Promise<void>((resolve) => wss!.close(() => resolve()))
    wss = null
  }

  clients.clear()
  logger.info('[WS] WebSocket notification service shut down')
}

/**
 * Broadcast a notification to a specific user by userId.
 * Can be called from controllers/services to push real-time alerts.
 */
export function pushNotificationToUser(userId: string, payload: WsPushPayload): void {
  sendToUser(userId, payload)
}

/**
 * Returns the number of currently connected WebSocket clients.
 */
export function getConnectedClientCount(): number {
  return clients.size
}
