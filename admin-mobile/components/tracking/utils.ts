import * as bookcarsTypes from ':bookcars-types'
import type { FleetVehicle, FleetCounts } from './types'

export const STATUS_COLORS: Record<bookcarsTypes.TraccarFleetStatus, string> = {
  moving: '#10b981',
  idle: '#f59e0b',
  stopped: '#3b82f6',
  stale: '#fb923c',
  noGps: '#a78bfa',
  offline: '#64748b',
  unlinked: '#334155',
}

export const STATUS_LABELS: Record<bookcarsTypes.TraccarFleetStatus, string> = {
  moving: 'Moving',
  idle: 'Idle',
  stopped: 'Stopped',
  stale: 'Stale',
  noGps: 'No GPS',
  offline: 'Offline',
  unlinked: 'Unlinked',
}

export const formatRelativeAge = (dateStr: string): string => {
  if (!dateStr) return '-'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  if (Number.isNaN(then)) return '-'
  const diffMs = Math.max(0, now - then)
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export const formatSpeed = (speed: number): string => {
  if (!speed || speed < 0) return '0 km/h'
  return `${Math.round(speed)} km/h`
}

export const formatDistanceKm = (meters: number): string => {
  if (!meters || meters <= 0) return '0 km'
  return `${(meters / 1000).toFixed(1)} km`
}

export const formatDuration = (ms: number): string => {
  if (!ms || ms <= 0) return '0m'
  const totalMin = Math.max(1, Math.round(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export const formatCoordinate = (coord?: number): string =>
  typeof coord === 'number' && Number.isFinite(coord) ? coord.toFixed(6) : '-'

export const formatTimestamp = (value?: Date | string | number | null): string => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? `${value}` : date.toLocaleString()
}

export const buildFleetVehicles = (
  items: bookcarsTypes.TraccarFleetItem[],
): FleetVehicle[] =>
  items.map((item) => ({
    carId: item.carId,
    carName: item.carName || 'Unknown',
    licensePlate: (item as any).licensePlate,
    supplier: (item as any).supplier,
    status: (item.movementStatus || item.deviceStatus || 'offline') as bookcarsTypes.TraccarFleetStatus,
    speed: item.speedKmh || 0,
    address: item.address || '',
    lastUpdate: String(item.position?.fixTime || item.position?.serverTime || ''),
    batteryLevel: item.batteryLevel,
    ignition: item.ignition,
    latitude: item.position?.latitude,
    longitude: item.position?.longitude,
    deviceName: (item as any).deviceName,
    deviceId: item.deviceId,
    course: item.position?.course,
    sat: item.position?.attributes?.sat,
    accuracy: item.position?.accuracy,
    totalDistance: item.position?.attributes?.totalDistance,
  }))

export const buildFleetCounts = (vehicles: FleetVehicle[]): FleetCounts => {
  const counts: FleetCounts = { all: vehicles.length, moving: 0, idle: 0, stopped: 0, offline: 0, stale: 0, noGps: 0, unlinked: 0 }
  for (const v of vehicles) {
    if (v.status in counts) {
      (counts as any)[v.status]++
    }
  }
  return counts
}

export const EVENT_TYPE_OPTIONS = [
  'all',
  'geofenceEnter',
  'geofenceExit',
  'deviceOnline',
  'deviceOffline',
  'ignitionOn',
  'ignitionOff',
  'overspeed',
  'alarm',
  'motion',
  'deviceMoving',
  'deviceStopped',
] as const

export const EVENT_TYPE_LABELS: Record<string, string> = {
  all: 'All Events',
  geofenceEnter: 'Geofence Enter',
  geofenceExit: 'Geofence Exit',
  deviceOnline: 'Device Online',
  deviceOffline: 'Device Offline',
  ignitionOn: 'Ignition On',
  ignitionOff: 'Ignition Off',
  overspeed: 'Overspeed',
  alarm: 'Alarm',
  motion: 'Motion',
  deviceMoving: 'Device Moving',
  deviceStopped: 'Device Stopped',
}

export const EVENT_TYPE_COLORS: Record<string, string> = {
  geofenceEnter: '#3b82f6',
  geofenceExit: '#3b82f6',
  deviceOnline: '#10b981',
  deviceOffline: '#64748b',
  ignitionOn: '#f59e0b',
  ignitionOff: '#64748b',
  overspeed: '#ef4444',
  alarm: '#ef4444',
  motion: '#3b82f6',
  deviceMoving: '#10b981',
  deviceStopped: '#3b82f6',
}

export const getEventBorderColor = (type?: string): string => {
  switch (type) {
    case 'geofenceEnter':
    case 'deviceOnline':
    case 'ignitionOn':
    case 'deviceMoving':
      return '#22c55e'
    case 'geofenceExit':
    case 'deviceOffline':
    case 'ignitionOff':
    case 'deviceStopped':
      return '#ef4444'
    case 'alarm':
    case 'overspeed':
      return '#f59e0b'
    case 'motion':
      return '#3b82f6'
    default:
      return '#94a3b8'
  }
}
