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

export const getReports = async (carId: string, from: string, to: string): Promise<bookcarsTypes.TraccarVehicleReportBundle> => {
  const headers = await UserService.authHeader()
  return axiosInstance
    .get(`/api/reports/${encodeURIComponent(carId)}`, { headers, params: { from, to } })
    .then((res) => res.data)
}
