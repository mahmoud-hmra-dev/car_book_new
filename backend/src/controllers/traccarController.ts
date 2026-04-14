import crypto from 'node:crypto'
import { Request, Response } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import i18n from '../lang/i18n'
import * as logger from '../utils/logger'
import * as env from '../config/env.config'
import Car from '../models/Car'
import LocationShare from '../models/LocationShare'
import GeofenceAutoCommand from '../models/GeofenceAutoCommand'
import * as traccarService from '../services/traccarService'
import * as telegramService from '../services/telegramService'

const parseDate = (value: string | undefined, fallback: Date) => {
  if (!value) {
    return fallback
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return date
}

const getCarWithTracking = async (id: string) => {
  const car = await Car.findById(id)
  if (!car) {
    throw new Error('Car not found')
  }

  if (!car.tracking?.deviceId) {
    throw new Error('Traccar device not linked')
  }

  return car
}

const parseId = (value: string, label: string) => {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}`)
  }

  return parsed
}

const sanitizeGeofencePayload = (payload: Partial<bookcarsTypes.UpsertTraccarGeofencePayload>) => {
  const name = payload.name?.trim()
  const area = payload.area?.trim()

  if (!name) {
    throw new Error('Geofence name is required')
  }

  if (!area) {
    throw new Error('Geofence area is required')
  }

  return {
    name,
    description: payload.description?.trim(),
    area,
    calendarId: payload.calendarId,
    attributes: payload.attributes || {},
  }
}

const sanitizeCommandPayload = (payload: Partial<bookcarsTypes.TraccarCommand>, deviceId: number): bookcarsTypes.TraccarCommand => {
  const type = payload.type?.trim()
  if (!type) {
    throw new Error('Command type is required')
  }

  return {
    deviceId,
    type,
    textChannel: !!payload.textChannel,
    attributes: payload.attributes || {},
  }
}

const getPositionDate = (position?: bookcarsTypes.TraccarPosition | null) => {
  if (!position) {
    return 0
  }

  const value = position.fixTime || position.deviceTime || position.serverTime
  const date = value ? new Date(value).getTime() : 0
  return Number.isFinite(date) ? date : 0
}

const getPositionTimestamp = (position?: bookcarsTypes.TraccarPosition | null) => (
  position?.deviceTime || position?.fixTime || position?.serverTime
)

const FLEET_STALE_AFTER_MINUTES = 15
const MOVING_SPEED_KMH = 8
const STOPPED_SPEED_KMH = 1
const DEFAULT_EVENT_LIMIT = 80

const getTrackedCars = () => Car.find({
  'tracking.enabled': true,
  'tracking.deviceId': { $exists: true, $ne: null },
}).populate('supplier', 'fullName')

const getDateValue = (value?: Date | string | number | null) => {
  if (!value) {
    return 0
  }

  const date = new Date(value).getTime()
  return Number.isFinite(date) ? date : 0
}

const getPositionAttributes = (position?: bookcarsTypes.TraccarPosition | null) => position?.attributes || {}

const getBooleanAttribute = (source: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'boolean') {
      return value
    }
    if (typeof value === 'number') {
      return value > 0
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', 'yes', 'on', '1'].includes(normalized)) {
        return true
      }
      if (['false', 'no', 'off', '0'].includes(normalized)) {
        return false
      }
    }
  }

  return undefined
}

const getNumberAttribute = (source: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return undefined
}

const resolveFleetStatus = ({
  isLinked,
  deviceStatus,
  position,
  stale,
  speedKmh,
  ignition,
  motion,
}: {
  isLinked: boolean
  deviceStatus?: string
  position: bookcarsTypes.TraccarPosition | null
  stale: boolean
  speedKmh: number
  ignition?: boolean
  motion?: boolean
}): bookcarsTypes.TraccarFleetStatus => {
  if (!isLinked) {
    return 'unlinked'
  }

  const normalizedDeviceStatus = deviceStatus?.trim().toLowerCase()
  if (normalizedDeviceStatus === 'offline') {
    return 'offline'
  }

  if (!position) {
    return normalizedDeviceStatus === 'online' ? 'noGps' : 'offline'
  }

  if (stale) {
    return 'stale'
  }

  if (speedKmh >= MOVING_SPEED_KMH || motion === true) {
    return 'moving'
  }

  if (speedKmh > STOPPED_SPEED_KMH || ignition === true) {
    return 'idle'
  }

  return 'stopped'
}

const buildFleetHealth = (items: bookcarsTypes.TraccarFleetItem[]): bookcarsTypes.TraccarFleetHealth => ({
  totalCars: items.length,
  linkedCars: items.filter((item) => typeof item.deviceId === 'number').length,
  liveCars: items.filter((item) => !!item.position).length,
  onlineCars: items.filter((item) => item.deviceStatus?.trim().toLowerCase() === 'online').length,
  movingCars: items.filter((item) => item.movementStatus === 'moving').length,
  idleCars: items.filter((item) => item.movementStatus === 'idle').length,
  stoppedCars: items.filter((item) => item.movementStatus === 'stopped').length,
  offlineCars: items.filter((item) => item.movementStatus === 'offline').length,
  staleCars: items.filter((item) => item.movementStatus === 'stale').length,
  noGpsCars: items.filter((item) => item.movementStatus === 'noGps').length,
  unlinkedCars: items.filter((item) => item.movementStatus === 'unlinked').length,
  lastRefreshAt: new Date(),
})

const parseEventTypes = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => `${entry}`.split(',')).map((entry) => entry.trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value.split(',').map((entry) => entry.trim()).filter(Boolean)
  }

  return []
}

const getSupplierName = (car: any) => {
  const supplier = car?.supplier
  if (supplier && typeof supplier === 'object' && typeof supplier.fullName === 'string') {
    return supplier.fullName
  }

  return undefined
}

export const getDevices = async (_req: Request, res: Response) => {
  try {
    const devices = await traccarService.getDevices()
    res.json(devices)
  } catch (err) {
    logger.error('[traccar.getDevices] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getAllGeofences = async (_req: Request, res: Response) => {
  try {
    const geofences = await traccarService.getGeofences()
    res.json(geofences)
  } catch (err) {
    logger.error('[traccar.getAllGeofences] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getFleetOverview = async (_req: Request, res: Response) => {
  try {
    const cars = await getTrackedCars()

    if (!cars.length) {
      res.json({
        items: [],
        health: buildFleetHealth([]),
      })
      return
    }

    const [positions, devices] = await Promise.all([
      traccarService.getPositions(),
      traccarService.getDevices(),
    ])

    const latestPositionByDeviceId = new Map<number, bookcarsTypes.TraccarPosition>()
    for (const position of positions) {
      const positionWithDevice = position as bookcarsTypes.TraccarPosition & { deviceId?: number }
      const deviceId = positionWithDevice.deviceId
      if (typeof deviceId !== 'number') {
        continue
      }

      const current = latestPositionByDeviceId.get(deviceId)
      if (!current || getPositionDate(position) >= getPositionDate(current)) {
        latestPositionByDeviceId.set(deviceId, position)
      }
    }

    const deviceById = new Map<number, bookcarsTypes.TraccarDevice>()
    for (const device of devices) {
      if (typeof device.id === 'number') {
        deviceById.set(device.id, device)
      }
    }

    const now = Date.now()
    const items = cars.map((car) => {
      const linkedDeviceId = car.tracking?.deviceId as number
      const device = deviceById.get(linkedDeviceId)
      const position = latestPositionByDeviceId.get(linkedDeviceId) || null
      const positionAttributes = getPositionAttributes(position)
      const speedKmh = typeof position?.speed === 'number' && Number.isFinite(position.speed)
        ? Math.round(position.speed * 1.852 * 100) / 100
        : 0
      const ignition = getBooleanAttribute(positionAttributes, ['ignition', 'ignitionOn', 'io239'])
      const motion = getBooleanAttribute(positionAttributes, ['motion', 'moving'])
      const batteryLevel = getNumberAttribute(positionAttributes, ['batteryLevel', 'battery', 'charge'])
      const odometer = getNumberAttribute(positionAttributes, ['odometer', 'totalDistance'])
      const lastPositionAt = getPositionTimestamp(position)
      const lastDeviceUpdate = device?.lastUpdate
      const lastSeenAt = Math.max(getDateValue(lastPositionAt), getDateValue(lastDeviceUpdate), getDateValue(car.tracking?.lastSyncedAt))
      const staleMinutes = lastSeenAt > 0 ? Math.max(0, Math.round((now - lastSeenAt) / 60000)) : undefined
      const stale = typeof staleMinutes === 'number' ? staleMinutes >= FLEET_STALE_AFTER_MINUTES : false
      const movementStatus = resolveFleetStatus({
        isLinked: typeof linkedDeviceId === 'number',
        deviceStatus: device?.status || car.tracking?.status,
        position,
        stale,
        speedKmh,
        ignition,
        motion,
      })

      return {
        carId: String(car._id),
        carName: car.name,
        supplierName: getSupplierName(car),
        licensePlate: car.licensePlate,
        deviceId: linkedDeviceId,
        trackingEnabled: !!car.tracking?.enabled,
        deviceName: device?.name || car.tracking?.deviceName,
        deviceStatus: device?.status || car.tracking?.status,
        movementStatus,
        stale,
        staleMinutes,
        lastEventType: car.tracking?.lastEventType,
        lastSyncedAt: car.tracking?.lastSyncedAt,
        lastPositionAt,
        lastDeviceUpdate,
        ignition,
        motion,
        speedKmh,
        odometer,
        batteryLevel,
        address: position?.address,
        position,
      } satisfies bookcarsTypes.TraccarFleetItem
    })

    res.json({
      items,
      health: buildFleetHealth(items),
    })
  } catch (err) {
    logger.error('[traccar.getFleetOverview] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const linkDevice = async (req: Request, res: Response) => {
  const { carId } = req.params
  const { deviceId, deviceName, notes, enabled } = req.body

  try {
    if (!deviceId || Number.isNaN(Number(deviceId))) {
      throw new Error('Invalid deviceId')
    }

    const car = await Car.findById(carId)
    if (!car) {
      res.status(404).send('Car not found')
      return
    }

    const now = new Date()
    car.tracking = {
      ...car.tracking,
      enabled: enabled ?? true,
      deviceId: Number(deviceId),
      deviceName: deviceName || car.tracking?.deviceName,
      notes,
      linkedAt: car.tracking?.linkedAt || now,
      lastSyncedAt: now,
    }

    await car.save()
    res.json(car.tracking)
  } catch (err) {
    logger.error('[traccar.linkDevice] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const createGeofence = async (req: Request, res: Response) => {
  try {
    const geofence = await traccarService.createGeofence(sanitizeGeofencePayload(req.body))
    res.json(geofence)
  } catch (err) {
    logger.error('[traccar.createGeofence] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const updateGeofence = async (req: Request, res: Response) => {
  try {
    const geofence = await traccarService.updateGeofence(parseId(req.params.geofenceId, 'geofenceId'), sanitizeGeofencePayload(req.body))
    res.json(geofence)
  } catch (err) {
    logger.error('[traccar.updateGeofence] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const deleteGeofence = async (req: Request, res: Response) => {
  try {
    await traccarService.deleteGeofence(parseId(req.params.geofenceId, 'geofenceId'))
    res.status(204).send()
  } catch (err) {
    logger.error('[traccar.deleteGeofence] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const unlinkDevice = async (req: Request, res: Response) => {
  const { carId } = req.params

  try {
    const car = await Car.findById(carId)
    if (!car) {
      res.status(404).send('Car not found')
      return
    }

    car.tracking = { enabled: false }
    await car.save()

    res.json(car.tracking)
  } catch (err) {
    logger.error('[traccar.unlinkDevice] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getCurrentPositions = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const positions = await traccarService.getPositions(car.tracking?.deviceId as number)

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
    }

    await car.save()

    res.json(positions)
  } catch (err) {
    logger.error('[traccar.getCurrentPositions] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getCommandTypes = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const commandTypes = await traccarService.getCommandTypes(car.tracking?.deviceId as number)
    res.json(commandTypes)
  } catch (err) {
    logger.error('[traccar.getCommandTypes] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const sendDeviceCommand = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const command = await traccarService.sendCommand(sanitizeCommandPayload(req.body, car.tracking?.deviceId as number))

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
      lastEventType: 'commandSent',
    }

    await car.save()
    res.json(command)
  } catch (err) {
    logger.error('[traccar.sendDeviceCommand] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getRouteHistory = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const now = new Date()
    const from = parseDate(req.query.from as string | undefined, new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const to = parseDate(req.query.to as string | undefined, now)

    const route = await traccarService.getRoute(car.tracking?.deviceId as number, from.toISOString(), to.toISOString())

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
    }

    await car.save()

    res.json(route)
  } catch (err) {
    logger.error('[traccar.getRouteHistory] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getGeofences = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const geofences = await traccarService.getGeofences(car.tracking?.deviceId as number)

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
    }

    await car.save()

    res.json(geofences)
  } catch (err) {
    logger.error('[traccar.getGeofences] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const linkGeofence = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const geofenceId = parseId(req.params.geofenceId, 'geofenceId')

    await traccarService.linkDeviceGeofence(car.tracking?.deviceId as number, geofenceId)

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
    }

    await car.save()
    res.json(await traccarService.getGeofences(car.tracking?.deviceId as number))
  } catch (err) {
    logger.error('[traccar.linkGeofence] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const unlinkGeofence = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const geofenceId = parseId(req.params.geofenceId, 'geofenceId')

    await traccarService.unlinkDeviceGeofence(car.tracking?.deviceId as number, geofenceId)

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
    }

    await car.save()
    res.json(await traccarService.getGeofences(car.tracking?.deviceId as number))
  } catch (err) {
    logger.error('[traccar.unlinkGeofence] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getGeofenceAlerts = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const now = new Date()
    const from = parseDate(req.query.from as string | undefined, new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const to = parseDate(req.query.to as string | undefined, now)

    const events = await traccarService.getEvents(
      car.tracking?.deviceId as number,
      from.toISOString(),
      to.toISOString(),
      'geofenceExit',
    )

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
      lastEventType: 'geofenceExit',
    }

    await car.save()

    res.json(events)
  } catch (err) {
    logger.error('[traccar.getGeofenceAlerts] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getEventCenter = async (req: Request, res: Response) => {
  try {
    const now = new Date()
    const from = parseDate(req.query.from as string | undefined, new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const to = parseDate(req.query.to as string | undefined, now)
    const limitValue = Number.parseInt(req.query.limit as string, 10)
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : DEFAULT_EVENT_LIMIT
    const eventTypes = parseEventTypes(req.query.types)

    const cars = req.query.carId
      ? [await getCarWithTracking(req.query.carId as string)]
      : await getTrackedCars()

    if (!cars.length) {
      res.json([])
      return
    }

    const geofencesPromise = traccarService.getGeofences().catch(() => [])
    const deviceById = new Map<number, {
      carId: string
      carName?: string
      supplierName?: string
      licensePlate?: string
      deviceName?: string
    }>()

    for (const car of cars) {
      const deviceId = car.tracking?.deviceId
      if (typeof deviceId !== 'number') {
        continue
      }

      deviceById.set(deviceId, {
        carId: String(car._id),
        carName: car.name,
        supplierName: getSupplierName(car),
        licensePlate: car.licensePlate,
        deviceName: car.tracking?.deviceName,
      })
    }

    const deviceIds = [...deviceById.keys()]
    const [events, geofences] = await Promise.all([
      traccarService.getFleetEvents(deviceIds, from.toISOString(), to.toISOString(), eventTypes.length > 0 ? eventTypes : undefined),
      geofencesPromise,
    ])

    const geofenceLookup = new Map<number, string>()
    geofences.forEach((geofence) => {
      if (typeof geofence.id === 'number' && geofence.name) {
        geofenceLookup.set(geofence.id, geofence.name)
      }
    })

    const enriched = (events
      .map((event): bookcarsTypes.TraccarEventCenterEntry | null => {
        const deviceId = event.deviceId
        const meta = typeof deviceId === 'number' ? deviceById.get(deviceId) : undefined
        if (!meta) {
          return null
        }

        const speed = getNumberAttribute(event.attributes || {}, ['speed'])
        const address = typeof event.attributes?.address === 'string' ? event.attributes.address : undefined

        return {
          id: event.id,
          carId: meta.carId,
          carName: meta.carName,
          supplierName: meta.supplierName,
          licensePlate: meta.licensePlate,
          deviceId,
          deviceName: meta.deviceName,
          geofenceId: event.geofenceId,
          geofenceName: typeof event.geofenceId === 'number' ? geofenceLookup.get(event.geofenceId) : undefined,
          type: event.type,
          eventTime: event.eventTime,
          positionId: getNumberAttribute(event.attributes || {}, ['positionId']),
          address,
          speed,
          attributes: event.attributes,
          event,
        } satisfies bookcarsTypes.TraccarEventCenterEntry
      })
      .filter(Boolean) as bookcarsTypes.TraccarEventCenterEntry[])
      .sort((left, right) => getDateValue(right.eventTime) - getDateValue(left.eventTime))
      .slice(0, limit)

    res.json(enriched)
  } catch (err) {
    logger.error('[traccar.getEventCenter] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getVehicleReports = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const now = new Date()
    const from = parseDate(req.query.from as string | undefined, new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const to = parseDate(req.query.to as string | undefined, now)

    const [summary, trips, stops] = await Promise.all([
      traccarService.getSummary(car.tracking?.deviceId as number, from.toISOString(), to.toISOString()).catch(() => null),
      traccarService.getTrips(car.tracking?.deviceId as number, from.toISOString(), to.toISOString()).catch(() => []),
      traccarService.getStops(car.tracking?.deviceId as number, from.toISOString(), to.toISOString()).catch(() => []),
    ])

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
    }

    await car.save()

    res.json({
      summary,
      trips,
      stops,
    } satisfies bookcarsTypes.TraccarVehicleReportBundle)
  } catch (err) {
    logger.error('[traccar.getVehicleReports] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

// --- Drivers ---

export const getDrivers = async (_req: Request, res: Response) => {
  try {
    const drivers = await traccarService.getDrivers()
    res.json(drivers)
  } catch (err) {
    logger.error('[traccar.getDrivers] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const createDriver = async (req: Request, res: Response) => {
  try {
    const driver = await traccarService.createDriver(req.body)
    res.json(driver)
  } catch (err) {
    logger.error('[traccar.createDriver] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const updateDriver = async (req: Request, res: Response) => {
  try {
    const driver = await traccarService.updateDriver(parseId(req.params.id, 'id'), req.body)
    res.json(driver)
  } catch (err) {
    logger.error('[traccar.updateDriver] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const deleteDriver = async (req: Request, res: Response) => {
  try {
    await traccarService.deleteDriver(parseId(req.params.id, 'id'))
    res.status(204).send()
  } catch (err) {
    logger.error('[traccar.deleteDriver] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

// --- Maintenance ---

export const getMaintenance = async (_req: Request, res: Response) => {
  try {
    const maintenance = await traccarService.getMaintenance()
    res.json(maintenance)
  } catch (err) {
    logger.error('[traccar.getMaintenance] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const createMaintenance = async (req: Request, res: Response) => {
  try {
    const maintenance = await traccarService.createMaintenance(req.body)
    res.json(maintenance)
  } catch (err) {
    logger.error('[traccar.createMaintenance] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const updateMaintenance = async (req: Request, res: Response) => {
  try {
    const maintenance = await traccarService.updateMaintenance(parseId(req.params.id, 'id'), req.body)
    res.json(maintenance)
  } catch (err) {
    logger.error('[traccar.updateMaintenance] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const deleteMaintenance = async (req: Request, res: Response) => {
  try {
    await traccarService.deleteMaintenance(parseId(req.params.id, 'id'))
    res.status(204).send()
  } catch (err) {
    logger.error('[traccar.deleteMaintenance] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

// --- Notifications ---

export const getNotifications = async (_req: Request, res: Response) => {
  try {
    const notifications = await traccarService.getNotifications()
    res.json(notifications)
  } catch (err) {
    logger.error('[traccar.getNotifications] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const createNotification = async (req: Request, res: Response) => {
  try {
    const notification = await traccarService.createNotification(req.body)
    res.json(notification)
  } catch (err) {
    logger.error('[traccar.createNotification] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const updateNotification = async (req: Request, res: Response) => {
  try {
    const notification = await traccarService.updateNotification(parseId(req.params.id, 'id'), req.body)
    res.json(notification)
  } catch (err) {
    logger.error('[traccar.updateNotification] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    await traccarService.deleteNotification(parseId(req.params.id, 'id'))
    res.status(204).send()
  } catch (err) {
    logger.error('[traccar.deleteNotification] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getNotificationTypes = async (_req: Request, res: Response) => {
  try {
    const types = await traccarService.getNotificationTypes()
    res.json(types)
  } catch (err) {
    logger.error('[traccar.getNotificationTypes] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const testNotification = async (req: Request, res: Response) => {
  try {
    await traccarService.testNotification(parseId(req.params.id, 'id'))
    res.status(204).send()
  } catch (err) {
    logger.error('[traccar.testNotification] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

// --- Groups ---

export const getGroups = async (_req: Request, res: Response) => {
  try {
    const groups = await traccarService.getGroups()
    res.json(groups)
  } catch (err) {
    logger.error('[traccar.getGroups] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const createGroup = async (req: Request, res: Response) => {
  try {
    const group = await traccarService.createGroup(req.body)
    res.json(group)
  } catch (err) {
    logger.error('[traccar.createGroup] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const updateGroup = async (req: Request, res: Response) => {
  try {
    const group = await traccarService.updateGroup(parseId(req.params.id, 'id'), req.body)
    res.json(group)
  } catch (err) {
    logger.error('[traccar.updateGroup] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const deleteGroup = async (req: Request, res: Response) => {
  try {
    await traccarService.deleteGroup(parseId(req.params.id, 'id'))
    res.status(204).send()
  } catch (err) {
    logger.error('[traccar.deleteGroup] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

// --- Statistics ---

export const getStatistics = async (req: Request, res: Response) => {
  try {
    const from = req.query.from as string
    const to = req.query.to as string

    if (!from || !to) {
      res.status(400).json({ error: 'from and to query parameters are required' })
      return
    }

    const statistics = await traccarService.getStatistics(from, to)
    res.json(statistics)
  } catch (err) {
    logger.error('[traccar.getStatistics] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

// --- Device Accumulators ---

export const updateAccumulators = async (req: Request, res: Response) => {
  try {
    const deviceId = parseId(req.params.deviceId, 'deviceId')
    await traccarService.updateAccumulators(deviceId, req.body)
    res.status(204).send()
  } catch (err) {
    logger.error('[traccar.updateAccumulators] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

// --- Position Export ---

export const exportPositionsKML = async (req: Request, res: Response) => {
  try {
    const deviceId = parseId(req.params.deviceId, 'deviceId')
    const now = new Date()
    const from = parseDate(req.query.from as string | undefined, new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const to = parseDate(req.query.to as string | undefined, now)

    const data = await traccarService.exportPositionsKML(deviceId, from.toISOString(), to.toISOString())
    res.set('Content-Type', 'application/vnd.google-earth.kml+xml')
    res.set('Content-Disposition', `attachment; filename="positions-${deviceId}.kml"`)
    res.send(data)
  } catch (err) {
    logger.error('[traccar.exportPositionsKML] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const exportPositionsCSV = async (req: Request, res: Response) => {
  try {
    const deviceId = parseId(req.params.deviceId, 'deviceId')
    const now = new Date()
    const from = parseDate(req.query.from as string | undefined, new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const to = parseDate(req.query.to as string | undefined, now)

    const data = await traccarService.exportPositionsCSV(deviceId, from.toISOString(), to.toISOString())
    res.set('Content-Type', 'text/csv')
    res.set('Content-Disposition', `attachment; filename="positions-${deviceId}.csv"`)
    res.send(data)
  } catch (err) {
    logger.error('[traccar.exportPositionsCSV] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const exportPositionsGPX = async (req: Request, res: Response) => {
  try {
    const deviceId = parseId(req.params.deviceId, 'deviceId')
    const now = new Date()
    const from = parseDate(req.query.from as string | undefined, new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const to = parseDate(req.query.to as string | undefined, now)

    const data = await traccarService.exportPositionsGPX(deviceId, from.toISOString(), to.toISOString())
    res.set('Content-Type', 'application/gpx+xml')
    res.set('Content-Disposition', `attachment; filename="positions-${deviceId}.gpx"`)
    res.send(data)
  } catch (err) {
    logger.error('[traccar.exportPositionsGPX] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

// --- Computed Attributes ---

export const getComputedAttributes = async (_req: Request, res: Response) => {
  try {
    const attributes = await traccarService.getComputedAttributes()
    res.json(attributes)
  } catch (err) {
    logger.error('[traccar.getComputedAttributes] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const createComputedAttribute = async (req: Request, res: Response) => {
  try {
    const attribute = await traccarService.createComputedAttribute(req.body)
    res.json(attribute)
  } catch (err) {
    logger.error('[traccar.createComputedAttribute] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const updateComputedAttribute = async (req: Request, res: Response) => {
  try {
    const attribute = await traccarService.updateComputedAttribute(parseId(req.params.id, 'id'), req.body)
    res.json(attribute)
  } catch (err) {
    logger.error('[traccar.updateComputedAttribute] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const deleteComputedAttribute = async (req: Request, res: Response) => {
  try {
    await traccarService.deleteComputedAttribute(parseId(req.params.id, 'id'))
    res.status(204).send()
  } catch (err) {
    logger.error('[traccar.deleteComputedAttribute] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getIntegrationStatus = async (_req: Request, res: Response) => {
  res.json({ enabled: env.TRACCAR_ENABLED, baseUrl: env.TRACCAR_BASE_URL })
}

// --- Live Location Sharing ---

const LOCATION_SHARE_TTL_MS = 24 * 60 * 60 * 1000

const getLatestPosition = async (deviceId: number): Promise<bookcarsTypes.TraccarPosition | null> => {
  const positions = await traccarService.getPositions(deviceId)
  if (!positions.length) {
    return null
  }

  return positions.reduce<bookcarsTypes.TraccarPosition | null>((latest, position) => {
    if (!latest) {
      return position
    }
    return getPositionDate(position) >= getPositionDate(latest) ? position : latest
  }, null)
}

const computeMovementStatus = (
  position: bookcarsTypes.TraccarPosition | null,
  speedKmh: number,
): bookcarsTypes.TraccarFleetStatus => {
  if (!position) {
    return 'noGps'
  }

  const attributes = getPositionAttributes(position)
  const ignition = getBooleanAttribute(attributes, ['ignition', 'ignitionOn', 'io239'])
  const motion = getBooleanAttribute(attributes, ['motion', 'moving'])

  if (speedKmh >= MOVING_SPEED_KMH || motion === true) {
    return 'moving'
  }

  if (speedKmh > STOPPED_SPEED_KMH || ignition === true) {
    return 'idle'
  }

  return 'stopped'
}

export const createLocationShare = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params

    const car = await Car.findById(carId)
    if (!car) {
      res.status(404).send('Car not found')
      return
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expireAt = new Date(Date.now() + LOCATION_SHARE_TTL_MS)

    // Remove any existing share for this car so there is only one active token
    await LocationShare.deleteMany({ carId })
    await LocationShare.create({
      token,
      carId,
      createdAt: new Date(),
      expireAt,
    })

    const shareUrl = `${env.FRONTEND_HOST.replace(/\/$/, '')}/track/${token}`

    res.json({ token, shareUrl, expireAt })
  } catch (err) {
    logger.error('[traccar.createLocationShare] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const revokeLocationShare = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params
    await LocationShare.deleteMany({ carId })
    res.status(204).send()
  } catch (err) {
    logger.error('[traccar.revokeLocationShare] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getPublicPosition = async (req: Request, res: Response) => {
  try {
    const { token } = req.params

    const share = await LocationShare.findOne({ token })
    if (!share) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    if (share.expireAt && share.expireAt.getTime() <= Date.now()) {
      res.status(410).json({ error: 'Link expired' })
      return
    }

    const car = await Car.findById(share.carId)
    if (!car || !car.tracking?.deviceId) {
      res.status(404).json({ error: 'Car not found' })
      return
    }

    const position = await getLatestPosition(car.tracking.deviceId as number)

    const speedKmh = typeof position?.speed === 'number' && Number.isFinite(position.speed)
      ? Math.round(position.speed * 1.852 * 100) / 100
      : 0

    const movementStatus = computeMovementStatus(position, speedKmh)
    const lastUpdate = getPositionTimestamp(position)

    res.json({
      carName: car.name,
      licensePlate: car.licensePlate,
      position,
      lastUpdate,
      speedKmh,
      movementStatus,
    })
  } catch (err) {
    logger.error('[traccar.getPublicPosition] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

// --- Security Mode (quick 100m geofence around current position) ---

export const activateSecurityMode = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const deviceId = car.tracking?.deviceId as number

    const position = await getLatestPosition(deviceId)
    if (!position || typeof position.latitude !== 'number' || typeof position.longitude !== 'number') {
      res.status(400).json({ error: 'No current position available for this car' })
      return
    }

    const geofence = await traccarService.createGeofence({
      name: `Security Zone - ${car.name || car._id}`,
      description: 'Auto-generated 100m security zone',
      area: `CIRCLE (${position.latitude} ${position.longitude}, 100)`,
      attributes: {
        securityMode: true,
        carId: String(car._id),
      },
    })

    if (typeof geofence.id === 'number') {
      await traccarService.linkDeviceGeofence(deviceId, geofence.id)
    }

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
      lastEventType: 'securityModeActivated',
    }
    await car.save()

    res.json(geofence)
  } catch (err) {
    logger.error('[traccar.activateSecurityMode] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

// --- Towing Detection ---

export const getTowingAlerts = async (req: Request, res: Response) => {
  try {
    const now = new Date()
    const from = parseDate(req.query.from as string | undefined, new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const to = parseDate(req.query.to as string | undefined, now)

    const cars = await getTrackedCars()
    if (!cars.length) {
      res.json([])
      return
    }

    const carByDeviceId = new Map<number, typeof cars[number]>()
    for (const car of cars) {
      const deviceId = car.tracking?.deviceId
      if (typeof deviceId === 'number') {
        carByDeviceId.set(deviceId, car)
      }
    }

    const alerts: Array<{
      carId: string
      carName?: string
      position: bookcarsTypes.TraccarPosition | null
      detectedAt?: string | Date
      reason: 'alarm' | 'movementWithoutIgnition'
    }> = []

    // 1) Traccar alarm events with alarm=tow
    const deviceIds = [...carByDeviceId.keys()]
    const fleetEvents = await traccarService
      .getFleetEvents(deviceIds, from.toISOString(), to.toISOString(), ['alarm'])
      .catch(() => [])

    for (const event of fleetEvents) {
      const alarm = (event.attributes || {}).alarm
      if (typeof alarm !== 'string' || alarm.trim().toLowerCase() !== 'tow') {
        continue
      }

      const deviceId = event.deviceId
      const car = typeof deviceId === 'number' ? carByDeviceId.get(deviceId) : undefined
      if (!car) {
        continue
      }

      const position = await getLatestPosition(deviceId as number).catch(() => null)
      alerts.push({
        carId: String(car._id),
        carName: car.name,
        position,
        detectedAt: event.eventTime,
        reason: 'alarm',
      })
    }

    // 2) Heuristic: ignition=false but speed > 5 km/h
    for (const car of cars) {
      const deviceId = car.tracking?.deviceId
      if (typeof deviceId !== 'number') {
        continue
      }

      const position = await getLatestPosition(deviceId).catch(() => null)
      if (!position) {
        continue
      }

      const speedKmh = typeof position.speed === 'number' && Number.isFinite(position.speed)
        ? Math.round(position.speed * 1.852 * 100) / 100
        : 0

      const ignition = getBooleanAttribute(getPositionAttributes(position), ['ignition', 'ignitionOn', 'io239'])

      if (ignition === false && speedKmh > 5) {
        alerts.push({
          carId: String(car._id),
          carName: car.name,
          position,
          detectedAt: getPositionTimestamp(position),
          reason: 'movementWithoutIgnition',
        })
      }
    }

    res.json(alerts)
  } catch (err) {
    logger.error('[traccar.getTowingAlerts] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

// --- Telegram test ---

export const sendTelegramTest = async (req: Request, res: Response) => {
  try {
    const { chatId, carName } = req.body as { chatId?: string, carName?: string }

    if (!chatId || typeof chatId !== 'string') {
      res.status(400).json({ error: 'chatId is required' })
      return
    }

    const message = `<b>BookCars GPS-Trace</b>\nTest notification for <b>${carName || 'your fleet'}</b>.`
    await telegramService.sendTelegramMessage(chatId, message)

    res.status(204).send()
  } catch (err) {
    logger.error('[traccar.sendTelegramTest] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

// --- Geofence auto-commands ---

export const getAutoCommands = async (_req: Request, res: Response) => {
  try {
    const autoCommands = await GeofenceAutoCommand.find({}).lean()
    res.json(autoCommands)
  } catch (err) {
    logger.error('[traccar.getAutoCommands] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const createAutoCommand = async (req: Request, res: Response) => {
  try {
    const {
      geofenceId,
      carId,
      triggerEvent,
      commandType,
      commandAttributes,
      textChannel,
      enabled,
    } = req.body as {
      geofenceId?: number
      carId?: string
      triggerEvent?: 'geofenceEnter' | 'geofenceExit' | 'both'
      commandType?: string
      commandAttributes?: Record<string, any>
      textChannel?: boolean
      enabled?: boolean
    }

    if (typeof geofenceId !== 'number' || !Number.isFinite(geofenceId) || geofenceId <= 0) {
      res.status(400).json({ error: 'geofenceId is required' })
      return
    }

    if (!carId || typeof carId !== 'string') {
      res.status(400).json({ error: 'carId is required' })
      return
    }

    if (!commandType || typeof commandType !== 'string') {
      res.status(400).json({ error: 'commandType is required' })
      return
    }

    if (triggerEvent && !['geofenceEnter', 'geofenceExit', 'both'].includes(triggerEvent)) {
      res.status(400).json({ error: 'Invalid triggerEvent' })
      return
    }

    const autoCommand = await GeofenceAutoCommand.create({
      geofenceId,
      carId,
      triggerEvent: triggerEvent || 'both',
      commandType,
      commandAttributes: commandAttributes || {},
      textChannel: textChannel ?? false,
      enabled: enabled ?? true,
    })

    res.json(autoCommand)
  } catch (err) {
    logger.error('[traccar.createAutoCommand] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const updateAutoCommand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const {
      geofenceId,
      carId,
      triggerEvent,
      commandType,
      commandAttributes,
      textChannel,
      enabled,
    } = req.body as {
      geofenceId?: number
      carId?: string
      triggerEvent?: 'geofenceEnter' | 'geofenceExit' | 'both'
      commandType?: string
      commandAttributes?: Record<string, any>
      textChannel?: boolean
      enabled?: boolean
    }

    if (triggerEvent && !['geofenceEnter', 'geofenceExit', 'both'].includes(triggerEvent)) {
      res.status(400).json({ error: 'Invalid triggerEvent' })
      return
    }

    const update: Record<string, any> = {}
    if (typeof geofenceId === 'number') {
      update.geofenceId = geofenceId
    }
    if (typeof carId === 'string') {
      update.carId = carId
    }
    if (triggerEvent) {
      update.triggerEvent = triggerEvent
    }
    if (typeof commandType === 'string') {
      update.commandType = commandType
    }
    if (commandAttributes !== undefined) {
      update.commandAttributes = commandAttributes
    }
    if (typeof textChannel === 'boolean') {
      update.textChannel = textChannel
    }
    if (typeof enabled === 'boolean') {
      update.enabled = enabled
    }

    const autoCommand = await GeofenceAutoCommand.findByIdAndUpdate(id, update, { new: true })

    if (!autoCommand) {
      res.status(404).json({ error: i18n.t('ERROR') })
      return
    }

    res.json(autoCommand)
  } catch (err) {
    logger.error('[traccar.updateAutoCommand] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const deleteAutoCommand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const autoCommand = await GeofenceAutoCommand.findByIdAndDelete(id)

    if (!autoCommand) {
      res.status(404).json({ error: i18n.t('ERROR') })
      return
    }

    res.status(204).send()
  } catch (err) {
    logger.error('[traccar.deleteAutoCommand] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getAutoCommandByGeofence = async (req: Request, res: Response) => {
  try {
    const geofenceId = parseId(req.params.geofenceId, 'geofenceId')
    const autoCommand = await GeofenceAutoCommand.findOne({ geofenceId }).lean()

    if (!autoCommand) {
      res.status(404).json({ error: i18n.t('ERROR') })
      return
    }

    res.json(autoCommand)
  } catch (err) {
    logger.error('[traccar.getAutoCommandByGeofence] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}
