import * as bookcarsTypes from ':bookcars-types'

export type TrackingTab = 'status' | 'route' | 'zones' | 'events' | 'device'
export type SidebarView = 'fleet' | 'vehicle'

export interface FleetVehicle {
  carId: string
  carName: string
  licensePlate?: string
  supplier?: string
  status: bookcarsTypes.TraccarFleetStatus
  speed: number
  address: string
  lastUpdate: string
  batteryLevel?: number
  ignition?: boolean
  latitude?: number
  longitude?: number
  deviceName?: string
  deviceId?: number
  course?: number
  sat?: number
  accuracy?: number
  totalDistance?: number
}

export interface FleetCounts {
  all: number
  moving: number
  idle: number
  stopped: number
  offline: number
  stale: number
  noGps: number
  unlinked: number
}
