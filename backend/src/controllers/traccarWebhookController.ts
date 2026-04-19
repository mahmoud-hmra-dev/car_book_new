import { Request, Response } from 'express'
import i18n from '../lang/i18n'
import * as logger from '../utils/logger'
import * as smsService from '../utils/smsService'
import AlertRule, { AlertRuleType } from '../models/AlertRule'

/**
 * Shape of a Traccar event webhook payload.
 * Traccar doesn't strongly type the payload, so we model the fields we actually
 * look at and keep the rest loose.
 */
interface TraccarDevice {
  id?: number
  name?: string
  uniqueId?: string
  [key: string]: unknown
}

interface TraccarPosition {
  latitude?: number
  longitude?: number
  speed?: number // in knots per Traccar convention
  address?: string
  fixTime?: string
  [key: string]: unknown
}

interface TraccarEvent {
  type?: string
  deviceId?: number
  geofenceId?: number
  eventTime?: string
  attributes?: Record<string, unknown>
}

interface TraccarWebhookBody {
  event?: TraccarEvent
  device?: TraccarDevice
  position?: TraccarPosition
  geofence?: { id?: number, name?: string }
}

/**
 * Format a timestamp for display inside an SMS body.
 */
const formatTime = (iso?: string): string => {
  if (!iso) {
    return new Date().toISOString()
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return d.toISOString()
}

/**
 * Resolve a human-friendly vehicle identifier from the payload.
 */
const vehicleLabel = (device?: TraccarDevice, deviceId?: number): string => {
  if (device?.name) {
    return device.name
  }
  if (device?.uniqueId) {
    return String(device.uniqueId)
  }
  if (deviceId !== undefined) {
    return `#${deviceId}`
  }
  return 'unknown'
}

/**
 * Format coordinates for an SMS: "lat,lng" with 5 decimals, or "n/a".
 */
const formatLocation = (pos?: TraccarPosition): string => {
  if (pos && typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
    return `${pos.latitude.toFixed(5)},${pos.longitude.toFixed(5)}`
  }
  return 'n/a'
}

/**
 * Convert a Traccar speed (knots) into km/h, rounded.
 * Traccar positions report speed in knots by default.
 */
const knotsToKmh = (speed?: number): number | undefined => {
  if (typeof speed !== 'number' || Number.isNaN(speed)) {
    return undefined
  }
  return Math.round(speed * 1.852)
}

/**
 * Look up enabled AlertRules for a given vehicle and alert type, then
 * fire off SMS messages in parallel. Errors from individual sends are
 * swallowed by the smsService, so one failure won't stop the others.
 *
 * @param {string} vehicleId - The Traccar device identifier (as a string).
 * @param {AlertRuleType} type - Alert rule category.
 * @param {(threshold?: number) => boolean} shouldSend - Optional predicate
 *   to filter rules (e.g., only send speed alerts when actual speed exceeds
 *   the rule's threshold).
 * @param {string} message - SMS body to deliver.
 */
const dispatchAlerts = async (
  vehicleId: string,
  type: AlertRuleType,
  shouldSend: (threshold?: number) => boolean,
  message: string,
): Promise<number> => {
  const rules = await AlertRule.find({ vehicleId, type, enabled: true })
  if (rules.length === 0) {
    return 0
  }

  const targets = rules.filter((rule) => shouldSend(rule.threshold))
  if (targets.length === 0) {
    return 0
  }

  const results = await Promise.all(targets.map((rule) => smsService.sendSms(rule.phoneNumber, message)))
  return results.filter(Boolean).length
}

/**
 * Traccar event webhook handler.
 *
 * Traccar posts event payloads to this endpoint. We match the event type
 * to configured AlertRules and dispatch SMS notifications for the
 * corresponding users.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 */
export const handleTraccarEvent = async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as TraccarWebhookBody
  const { event, device, position } = body

  try {
    if (!event || !event.type) {
      res.status(400).json({ error: 'Invalid Traccar event payload' })
      return
    }

    const deviceId = event.deviceId ?? device?.id
    if (deviceId === undefined || deviceId === null) {
      res.status(400).json({ error: 'Missing deviceId' })
      return
    }

    const vehicleId = String(deviceId)
    const name = vehicleLabel(device, deviceId)
    const when = formatTime(event.eventTime ?? (position?.fixTime as string | undefined))
    const where = formatLocation(position)

    let dispatched = 0

    if (event.type === 'alarm') {
      const alarm = String(event.attributes?.alarm ?? '').toLowerCase()

      if (alarm === 'overspeed') {
        const speedKmh = knotsToKmh(position?.speed) ?? 0
        const message = `🚨 Speed Alert: Vehicle ${name} was traveling at ${speedKmh}km/h at ${when}. Location: ${where}`
        dispatched = await dispatchAlerts(
          vehicleId,
          'speed',
          (threshold) => (typeof threshold === 'number' ? speedKmh >= threshold : true),
          message,
        )
      } else if (alarm === 'sos') {
        const message = `🚨 Panic Alert: Vehicle ${name} triggered SOS at ${when}. Location: ${where}`
        dispatched = await dispatchAlerts(vehicleId, 'panic', () => true, message)
      } else {
        logger.info(`[traccarWebhook] Unhandled alarm type "${alarm}" for device ${vehicleId}`)
      }
    } else if (event.type === 'geofenceEnter' || event.type === 'geofenceExit') {
      const action = event.type === 'geofenceEnter' ? 'entered' : 'exited'
      const geofenceName = body.geofence?.name ? ` "${body.geofence.name}"` : ''
      const message = `🚨 Geofence Alert: Vehicle ${name} ${action} geofence${geofenceName} at ${when}. Location: ${where}`
      dispatched = await dispatchAlerts(vehicleId, 'geofence', () => true, message)
    } else {
      logger.info(`[traccarWebhook] Ignored event type "${event.type}" for device ${vehicleId}`)
    }

    res.status(200).json({ ok: true, dispatched })
  } catch (err) {
    logger.error(`[traccarWebhook.handleTraccarEvent] ${i18n.t('ERROR')}`, err)
    // Return 200 so Traccar doesn't retry a poisoned payload forever.
    res.status(200).json({ ok: false })
  }
}
