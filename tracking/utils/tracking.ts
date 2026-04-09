import { format, formatDistanceToNow } from 'date-fns'
import type * as bookcarsTypes from ':bookcars-types'
import { colors } from '@/theme'

export const STATUS_COLORS: Record<string, string> = {
  moving: colors.moving,
  idle: colors.idle,
  stopped: colors.stopped,
  offline: colors.offline,
  stale: colors.stale,
  noGps: colors.noGps,
  unlinked: colors.unlinked,
}

export const STATUS_LABELS: Record<string, string> = {
  moving: 'Moving',
  idle: 'Idle',
  stopped: 'Stopped',
  offline: 'Offline',
  stale: 'Stale',
  noGps: 'No GPS',
  unlinked: 'Unlinked',
}

export const STATUS_ICONS: Record<string, string> = {
  moving: 'navigation',
  idle: 'pause-circle',
  stopped: 'stop-circle',
  offline: 'wifi-off',
  stale: 'alert-triangle',
  noGps: 'map-pin-off',
  unlinked: 'link',
}

export const EVENT_TYPE_OPTIONS = [
  'geofenceEnter',
  'geofenceExit',
  'deviceOnline',
  'deviceOffline',
  'ignitionOn',
  'ignitionOff',
  'deviceOverspeed',
  'alarm',
  'deviceMoving',
  'deviceStopped',
  'maintenance',
  'driverChanged',
]

export const EVENT_TYPE_LABELS: Record<string, string> = {
  geofenceEnter: 'Zone Enter',
  geofenceExit: 'Zone Exit',
  deviceOnline: 'Online',
  deviceOffline: 'Offline',
  ignitionOn: 'Ignition On',
  ignitionOff: 'Ignition Off',
  deviceOverspeed: 'Overspeed',
  alarm: 'Alarm',
  deviceMoving: 'Moving',
  deviceStopped: 'Stopped',
  maintenance: 'Maintenance',
  driverChanged: 'Driver Changed',
}

export const EVENT_TYPE_COLORS: Record<string, string> = {
  geofenceEnter: colors.info,
  geofenceExit: colors.warning,
  deviceOnline: colors.success,
  deviceOffline: colors.offline,
  ignitionOn: colors.success,
  ignitionOff: colors.danger,
  deviceOverspeed: colors.danger,
  alarm: colors.danger,
  deviceMoving: colors.moving,
  deviceStopped: colors.stopped,
  maintenance: colors.stale,
  driverChanged: colors.info,
}

export const getStatusColor = (status: string): string =>
  STATUS_COLORS[status] || colors.offline

export const formatSpeed = (speedKmh?: number): string => {
  if (speedKmh == null || speedKmh < 0) return '--'
  return `${Math.round(speedKmh)} km/h`
}

export const formatDistanceKm = (meters?: number): string => {
  if (meters == null) return '--'
  const km = meters / 1000
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`
}

export const formatDuration = (seconds?: number): string => {
  if (seconds == null || seconds < 0) return '--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export const formatDurationMs = (ms?: number): string => {
  if (ms == null) return '--'
  return formatDuration(ms / 1000)
}

export const formatCoordinate = (coord?: number): string => {
  if (coord == null) return '--'
  return coord.toFixed(6)
}

export const formatTimestamp = (ts?: Date | string): string => {
  if (!ts) return '--'
  try {
    return format(new Date(ts), 'MMM dd, HH:mm')
  } catch {
    return '--'
  }
}

export const formatRelativeAge = (ts?: Date | string): string => {
  if (!ts) return '--'
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true })
  } catch {
    return '--'
  }
}

export type FleetCounts = {
  total: number
  moving: number
  idle: number
  stopped: number
  stale: number
  offline: number
  noGps: number
  unlinked: number
}

export const buildFleetCounts = (items: bookcarsTypes.TraccarFleetItem[]): FleetCounts => ({
  total: items.length,
  moving: items.filter((i) => i.movementStatus === 'moving').length,
  idle: items.filter((i) => i.movementStatus === 'idle').length,
  stopped: items.filter((i) => i.movementStatus === 'stopped').length,
  stale: items.filter((i) => i.movementStatus === 'stale').length,
  offline: items.filter((i) => i.movementStatus === 'offline').length,
  noGps: items.filter((i) => i.movementStatus === 'noGps').length,
  unlinked: items.filter((i) => i.movementStatus === 'unlinked').length,
})
