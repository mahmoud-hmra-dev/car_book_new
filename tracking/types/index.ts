import type * as bookcarsTypes from ':bookcars-types'

export type FleetVehicle = {
  car: { _id: string, name: string, licensePlate?: string, supplier?: { fullName: string } }
  snapshot?: bookcarsTypes.TraccarFleetItem
  position: bookcarsTypes.TraccarPosition | null
  point: [number, number] | null
  isLinked: boolean
  isOnline: boolean
  status: bookcarsTypes.TraccarFleetStatus
  speedKmh: number
  lastSeenLabel: string
  supplierName: string
  deviceName: string
  deviceStatus: string
  batteryLevel?: number
  ignition?: boolean
  address?: string
  staleMinutes?: number
}

export type TrackingTab = 'status' | 'route' | 'geofences' | 'events' | 'device'
export type MapFilterStatus = 'all' | 'moving' | 'idle' | 'stopped' | 'offline' | 'stale'
export type MapType = 'standard' | 'satellite' | 'hybrid'
export type DrawingMode = 'circle' | 'polygon' | 'rectangle'

export type PlaybackState = {
  isPlaying: boolean
  speed: number
  currentIndex: number
  totalPoints: number
}

export type EventFilter = {
  types: string[]
  carId?: string
  from?: string
  to?: string
  limit?: number
}

export type ReportFilter = {
  carId: string
  from: string
  to: string
}
