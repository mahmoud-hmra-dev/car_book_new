import axiosInstance from './axiosInstance'
import * as UserService from './UserService'
import * as bookcarsTypes from ':bookcars-types'

// ==================== Integration Status ====================

export const getStatus = async (): Promise<{ enabled: boolean, baseUrl: string }> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get('/api/status', { headers }).then((res) => res.data)
}

// ==================== Fleet Overview ====================

export const getFleetOverview = async (): Promise<{ items: bookcarsTypes.TraccarFleetItem[], health: bookcarsTypes.TraccarFleetHealth }> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get('/api/fleet', { headers }).then((res) => res.data)
}

// ==================== Devices ====================

export const getDevices = async (): Promise<bookcarsTypes.TraccarDevice[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get('/api/devices', { headers }).then((res) => res.data)
}

// ==================== Positions ====================

export const getPositions = async (carId: string): Promise<bookcarsTypes.TraccarPosition[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get(`/api/positions/${encodeURIComponent(carId)}`, { headers }).then((res) => res.data)
}

// ==================== Route History ====================

export const getRoute = async (carId: string, from: string, to: string): Promise<bookcarsTypes.TraccarPosition[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get(`/api/route/${encodeURIComponent(carId)}`, { headers, params: { from, to } }).then((res) => res.data)
}

// ==================== Geofences ====================

export const getGeofences = async (carId?: string): Promise<bookcarsTypes.TraccarGeofence[]> => {
  const headers = await UserService.authHeader()
  const url = carId ? `/api/geofences/${encodeURIComponent(carId)}` : '/api/geofences'
  return axiosInstance.get(url, { headers }).then((res) => res.data)
}

export const getAllGeofences = async (): Promise<bookcarsTypes.TraccarGeofence[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get('/api/geofences', { headers }).then((res) => res.data)
}

export const createGeofence = async (data: bookcarsTypes.UpsertTraccarGeofencePayload): Promise<bookcarsTypes.TraccarGeofence> => {
  const headers = await UserService.authHeader()
  return axiosInstance.post('/api/geofences', data, { headers }).then((res) => res.data)
}

export const updateGeofence = async (geofenceId: number, data: bookcarsTypes.UpsertTraccarGeofencePayload): Promise<bookcarsTypes.TraccarGeofence> => {
  const headers = await UserService.authHeader()
  return axiosInstance.put(`/api/geofences/entity/${geofenceId}`, data, { headers }).then((res) => res.data)
}

export const deleteGeofence = async (geofenceId: number): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance.delete(`/api/geofences/entity/${geofenceId}`, { headers }).then(() => undefined)
}

export const linkGeofence = async (carId: string, geofenceId: number): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance.post(`/api/geofences/${encodeURIComponent(carId)}/link/${geofenceId}`, {}, { headers }).then(() => undefined)
}

export const unlinkGeofence = async (carId: string, geofenceId: number): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance.post(`/api/geofences/${encodeURIComponent(carId)}/unlink/${geofenceId}`, {}, { headers }).then(() => undefined)
}

export const getGeofenceAlerts = async (carId: string, from?: string, to?: string): Promise<bookcarsTypes.TraccarEventCenterEntry[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get(`/api/geofence-alerts/${encodeURIComponent(carId)}`, { headers, params: { from, to } }).then((res) => res.data)
}

// ==================== Commands ====================

export const getCommandTypes = async (carId: string): Promise<bookcarsTypes.TraccarCommandType[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get(`/api/commands/${encodeURIComponent(carId)}/types`, { headers }).then((res) => res.data)
}

export const sendCommand = async (carId: string, data: bookcarsTypes.TraccarCommand): Promise<number> => {
  const headers = await UserService.authHeader()
  return axiosInstance.post(`/api/commands/${encodeURIComponent(carId)}/send`, data, { headers }).then((res) => res.status)
}

// ==================== Events ====================

export const getEventCenter = async (params: {
  carId?: string
  from?: string
  to?: string
  types?: string[]
  limit?: number
}): Promise<bookcarsTypes.TraccarEventCenterEntry[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get('/api/events-center', { headers, params }).then((res) => res.data)
}

// ==================== Reports ====================

export const getReports = async (carId: string, from?: string, to?: string): Promise<bookcarsTypes.TraccarVehicleReportBundle> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get(`/api/reports/${encodeURIComponent(carId)}`, { headers, params: { from, to } }).then((res) => res.data)
}

// ==================== Device Link/Unlink ====================

export const linkDevice = async (carId: string, data: { uniqueId?: string, deviceId?: number }): Promise<any> => {
  const headers = await UserService.authHeader()
  return axiosInstance.post(`/api/link/${encodeURIComponent(carId)}`, data, { headers }).then((res) => res.data)
}

export const unlinkDevice = async (carId: string): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance.post(`/api/unlink/${encodeURIComponent(carId)}`, {}, { headers }).then(() => undefined)
}

// ==================== Drivers ====================

export const getDrivers = async (): Promise<bookcarsTypes.TraccarDriver[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get('/api/tracking/drivers', { headers }).then((res) => res.data)
}

export const createDriver = async (data: Partial<bookcarsTypes.TraccarDriver>): Promise<bookcarsTypes.TraccarDriver> => {
  const headers = await UserService.authHeader()
  return axiosInstance.post('/api/tracking/drivers', data, { headers }).then((res) => res.data)
}

export const updateDriver = async (id: number, data: Partial<bookcarsTypes.TraccarDriver>): Promise<bookcarsTypes.TraccarDriver> => {
  const headers = await UserService.authHeader()
  return axiosInstance.put(`/api/tracking/drivers/${id}`, data, { headers }).then((res) => res.data)
}

export const deleteDriver = async (id: number): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance.delete(`/api/tracking/drivers/${id}`, { headers }).then(() => undefined)
}

// ==================== Maintenance ====================

export const getMaintenance = async (): Promise<bookcarsTypes.TraccarMaintenance[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get('/api/tracking/maintenance', { headers }).then((res) => res.data)
}

export const createMaintenance = async (data: Partial<bookcarsTypes.TraccarMaintenance>): Promise<bookcarsTypes.TraccarMaintenance> => {
  const headers = await UserService.authHeader()
  return axiosInstance.post('/api/tracking/maintenance', data, { headers }).then((res) => res.data)
}

export const updateMaintenance = async (id: number, data: Partial<bookcarsTypes.TraccarMaintenance>): Promise<bookcarsTypes.TraccarMaintenance> => {
  const headers = await UserService.authHeader()
  return axiosInstance.put(`/api/tracking/maintenance/${id}`, data, { headers }).then((res) => res.data)
}

export const deleteMaintenance = async (id: number): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance.delete(`/api/tracking/maintenance/${id}`, { headers }).then(() => undefined)
}

// ==================== Notifications ====================

export const getNotificationTypes = async (): Promise<bookcarsTypes.TraccarNotification[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get('/api/tracking/notifications/types', { headers }).then((res) => res.data)
}

export const getNotifications = async (): Promise<bookcarsTypes.TraccarNotification[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get('/api/tracking/notifications', { headers }).then((res) => res.data)
}

export const createNotification = async (data: Partial<bookcarsTypes.TraccarNotification>): Promise<bookcarsTypes.TraccarNotification> => {
  const headers = await UserService.authHeader()
  return axiosInstance.post('/api/tracking/notifications', data, { headers }).then((res) => res.data)
}

export const updateNotification = async (id: number, data: Partial<bookcarsTypes.TraccarNotification>): Promise<bookcarsTypes.TraccarNotification> => {
  const headers = await UserService.authHeader()
  return axiosInstance.put(`/api/tracking/notifications/${id}`, data, { headers }).then((res) => res.data)
}

export const deleteNotification = async (id: number): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance.delete(`/api/tracking/notifications/${id}`, { headers }).then(() => undefined)
}

export const testNotification = async (id: number): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance.post(`/api/tracking/notifications/${id}/test`, {}, { headers }).then(() => undefined)
}

// ==================== Groups ====================

export const getGroups = async (): Promise<bookcarsTypes.TraccarGroup[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get('/api/tracking/groups', { headers }).then((res) => res.data)
}

export const createGroup = async (data: Partial<bookcarsTypes.TraccarGroup>): Promise<bookcarsTypes.TraccarGroup> => {
  const headers = await UserService.authHeader()
  return axiosInstance.post('/api/tracking/groups', data, { headers }).then((res) => res.data)
}

export const updateGroup = async (id: number, data: Partial<bookcarsTypes.TraccarGroup>): Promise<bookcarsTypes.TraccarGroup> => {
  const headers = await UserService.authHeader()
  return axiosInstance.put(`/api/tracking/groups/${id}`, data, { headers }).then((res) => res.data)
}

export const deleteGroup = async (id: number): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance.delete(`/api/tracking/groups/${id}`, { headers }).then(() => undefined)
}

// ==================== Statistics ====================

export const getStatistics = async (from: string, to: string): Promise<bookcarsTypes.TraccarStatistics[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get('/api/tracking/statistics', { headers, params: { from, to } }).then((res) => res.data)
}

// ==================== Device Accumulators ====================

export const updateAccumulators = async (deviceId: number, data: bookcarsTypes.TraccarDeviceAccumulators): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance.put(`/api/tracking/devices/${deviceId}/accumulators`, data, { headers }).then(() => undefined)
}

// ==================== Position Export ====================

export const exportPositionsKML = async (deviceId: number, from: string, to: string): Promise<string> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get(`/api/tracking/export/kml/${deviceId}`, { headers, params: { from, to } }).then((res) => res.data)
}

export const exportPositionsCSV = async (deviceId: number, from: string, to: string): Promise<string> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get(`/api/tracking/export/csv/${deviceId}`, { headers, params: { from, to } }).then((res) => res.data)
}

export const exportPositionsGPX = async (deviceId: number, from: string, to: string): Promise<string> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get(`/api/tracking/export/gpx/${deviceId}`, { headers, params: { from, to } }).then((res) => res.data)
}

// ==================== Computed Attributes ====================

export const getComputedAttributes = async (): Promise<bookcarsTypes.TraccarComputedAttribute[]> => {
  const headers = await UserService.authHeader()
  return axiosInstance.get('/api/tracking/attributes', { headers }).then((res) => res.data)
}

export const createComputedAttribute = async (data: Partial<bookcarsTypes.TraccarComputedAttribute>): Promise<bookcarsTypes.TraccarComputedAttribute> => {
  const headers = await UserService.authHeader()
  return axiosInstance.post('/api/tracking/attributes', data, { headers }).then((res) => res.data)
}

export const updateComputedAttribute = async (id: number, data: Partial<bookcarsTypes.TraccarComputedAttribute>): Promise<bookcarsTypes.TraccarComputedAttribute> => {
  const headers = await UserService.authHeader()
  return axiosInstance.put(`/api/tracking/attributes/${id}`, data, { headers }).then((res) => res.data)
}

export const deleteComputedAttribute = async (id: number): Promise<void> => {
  const headers = await UserService.authHeader()
  return axiosInstance.delete(`/api/tracking/attributes/${id}`, { headers }).then(() => undefined)
}
