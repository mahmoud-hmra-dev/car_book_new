import axiosInstance from './axiosInstance'
import * as UserService from './UserService'
import * as bookcarsTypes from ':bookcars-types'

export const getStatus = async (): Promise<{ enabled: boolean, baseUrl: string }> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get('/api/status', { headers })
    .then((res) => res.data)
}

export const getFleetOverview = async (): Promise<{ items: bookcarsTypes.TraccarFleetItem[], health: bookcarsTypes.TraccarFleetHealth }> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get('/api/fleet', { headers })
    .then((res) => res.data)
}

export const getPositions = async (carId: string): Promise<bookcarsTypes.TraccarPosition[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/positions/${encodeURIComponent(carId)}`, { headers })
    .then((res) => res.data)
}

export const getRoute = async (carId: string, from: string, to: string): Promise<bookcarsTypes.TraccarPosition[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/route/${encodeURIComponent(carId)}`, { headers, params: { from, to } })
    .then((res) => res.data)
}

export const getDevices = async (): Promise<bookcarsTypes.TraccarDevice[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get('/api/devices', { headers })
    .then((res) => res.data)
}

export const getCommandTypes = async (carId: string): Promise<bookcarsTypes.TraccarCommandType[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/commands/${encodeURIComponent(carId)}/types`, { headers })
    .then((res) => res.data)
}

export const sendCommand = async (carId: string, data: bookcarsTypes.TraccarCommand): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/commands/${encodeURIComponent(carId)}/send`, data, { headers })
    .then((res) => res.status)
}

export const getEventCenter = async (params: { carId?: string, from?: string, to?: string, types?: string[], limit?: number }): Promise<bookcarsTypes.TraccarEventCenterEntry[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get('/api/events-center', { headers, params })
    .then((res) => res.data)
}

export const getGeofences = async (carId?: string): Promise<bookcarsTypes.TraccarGeofence[]> => {
  const headers = await UserService.authHeader()
  const url = carId ? `/api/geofences/${encodeURIComponent(carId)}` : '/api/geofences'
  return axiosInstance
    .get(url, { headers })
    .then((res) => res.data)
}

export const createGeofence = async (data: bookcarsTypes.UpsertTraccarGeofencePayload): Promise<bookcarsTypes.TraccarGeofence> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post('/api/geofences', data, { headers })
    .then((res) => res.data)
}

export const updateGeofence = async (geofenceId: number, data: bookcarsTypes.UpsertTraccarGeofencePayload): Promise<bookcarsTypes.TraccarGeofence> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .put(`/api/geofences/entity/${geofenceId}`, data, { headers })
    .then((res) => res.data)
}

export const deleteGeofence = async (geofenceId: number): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .delete(`/api/geofences/entity/${geofenceId}`, { headers })
    .then(() => undefined)
}

export const linkGeofence = async (carId: string, geofenceId: number): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/geofences/${encodeURIComponent(carId)}/link/${geofenceId}`, {}, { headers })
    .then(() => undefined)
}

export const unlinkGeofence = async (carId: string, geofenceId: number): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .post(`/api/geofences/${encodeURIComponent(carId)}/unlink/${geofenceId}`, {}, { headers })
    .then(() => undefined)
}

export const getReports = async (carId: string, from: string, to: string): Promise<bookcarsTypes.TraccarVehicleReportBundle> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/reports/${encodeURIComponent(carId)}`, { headers, params: { from, to } })
    .then((res) => res.data)
}

// ── Google Roads API - snap route to roads ──

export interface SnappedRoute {
  displayPoints: [number, number][]
  playbackPoints: [number, number][]
}

const SNAP_CHUNK = 100
const SNAP_OVERLAP = 1

const almostEqual = (a: number, b: number) => Math.abs(a - b) < 1e-7

export const snapToRoads = async (
  points: [number, number][],
  apiKey: string,
): Promise<SnappedRoute> => {
  if (points.length < 2 || !apiKey) {
    return { displayPoints: points, playbackPoints: points }
  }

  try {
    const allSnapped: [number, number][] = []
    const indexMap = new Map<number, [number, number]>()

    for (let start = 0; start < points.length; start += SNAP_CHUNK - SNAP_OVERLAP) {
      const chunk = points.slice(start, start + SNAP_CHUNK)
      const pathStr = chunk.map((p) => `${p[0]},${p[1]}`).join('|')
      const url = `https://roads.googleapis.com/v1/snapToRoads?path=${encodeURIComponent(pathStr)}&interpolate=true&key=${apiKey}`

      const res = await fetch(url)
      if (!res.ok) throw new Error(`Roads API ${res.status}`)
      const data = await res.json()

      if (data.snappedPoints) {
        for (const sp of data.snappedPoints) {
          const pt: [number, number] = [sp.location.latitude, sp.location.longitude]
          if (allSnapped.length === 0 || !almostEqual(allSnapped[allSnapped.length - 1][0], pt[0]) || !almostEqual(allSnapped[allSnapped.length - 1][1], pt[1])) {
            allSnapped.push(pt)
          }
          if (sp.originalIndex != null) {
            indexMap.set(start + sp.originalIndex, pt)
          }
        }
      }
    }

    const playbackPts: [number, number][] = points.map((raw, i) => indexMap.get(i) || raw)
    return { displayPoints: allSnapped.length >= 2 ? allSnapped : points, playbackPoints: playbackPts }
  } catch {
    return { displayPoints: points, playbackPoints: points }
  }
}
