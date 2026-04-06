import axiosInstance from './axiosInstance'

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

export interface TraccarDriver {
  id: number
  name: string
  uniqueId: string
  attributes?: Record<string, unknown>
}

export type TraccarDriverPayload = Omit<TraccarDriver, 'id'> & { id?: number }

export const getDrivers = (): Promise<TraccarDriver[]> =>
  axiosInstance
    .get('/api/tracking/drivers', { withCredentials: true })
    .then((res) => res.data)

export const createDriver = (data: TraccarDriverPayload): Promise<TraccarDriver> =>
  axiosInstance
    .post('/api/tracking/drivers', data, { withCredentials: true })
    .then((res) => res.data)

export const updateDriver = (id: number, data: TraccarDriverPayload): Promise<TraccarDriver> =>
  axiosInstance
    .put(`/api/tracking/drivers/${id}`, data, { withCredentials: true })
    .then((res) => res.data)

export const deleteDriver = (id: number): Promise<number> =>
  axiosInstance
    .delete(`/api/tracking/drivers/${id}`, { withCredentials: true })
    .then((res) => res.status)

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

export interface TraccarMaintenance {
  id: number
  name: string
  type: string
  start: number
  period: number
  attributes?: Record<string, unknown>
}

export type TraccarMaintenancePayload = Omit<TraccarMaintenance, 'id'> & { id?: number }

export const getMaintenance = (): Promise<TraccarMaintenance[]> =>
  axiosInstance
    .get('/api/tracking/maintenance', { withCredentials: true })
    .then((res) => res.data)

export const createMaintenance = (data: TraccarMaintenancePayload): Promise<TraccarMaintenance> =>
  axiosInstance
    .post('/api/tracking/maintenance', data, { withCredentials: true })
    .then((res) => res.data)

export const updateMaintenance = (id: number, data: TraccarMaintenancePayload): Promise<TraccarMaintenance> =>
  axiosInstance
    .put(`/api/tracking/maintenance/${id}`, data, { withCredentials: true })
    .then((res) => res.data)

export const deleteMaintenance = (id: number): Promise<number> =>
  axiosInstance
    .delete(`/api/tracking/maintenance/${id}`, { withCredentials: true })
    .then((res) => res.status)

// ---------------------------------------------------------------------------
// Notifications (Traccar alert rules)
// ---------------------------------------------------------------------------

export interface TraccarNotification {
  id: number
  type: string
  always: boolean
  web: boolean
  mail: boolean
  sms: boolean
  calendarId: number
  attributes?: Record<string, unknown>
}

export type TraccarNotificationPayload = Omit<TraccarNotification, 'id'> & { id?: number }

export interface TraccarNotificationType {
  type: string
}

export const getNotifications = (): Promise<TraccarNotification[]> =>
  axiosInstance
    .get('/api/tracking/notifications', { withCredentials: true })
    .then((res) => res.data)

export const createNotification = (data: TraccarNotificationPayload): Promise<TraccarNotification> =>
  axiosInstance
    .post('/api/tracking/notifications', data, { withCredentials: true })
    .then((res) => res.data)

export const updateNotification = (id: number, data: TraccarNotificationPayload): Promise<TraccarNotification> =>
  axiosInstance
    .put(`/api/tracking/notifications/${id}`, data, { withCredentials: true })
    .then((res) => res.data)

export const deleteNotification = (id: number): Promise<number> =>
  axiosInstance
    .delete(`/api/tracking/notifications/${id}`, { withCredentials: true })
    .then((res) => res.status)

export const getNotificationTypes = (): Promise<TraccarNotificationType[]> =>
  axiosInstance
    .get('/api/tracking/notifications/types', { withCredentials: true })
    .then((res) => res.data)

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export interface TraccarGroup {
  id: number
  name: string
  groupId: number
  attributes?: Record<string, unknown>
}

export type TraccarGroupPayload = Omit<TraccarGroup, 'id'> & { id?: number }

export const getGroups = (): Promise<TraccarGroup[]> =>
  axiosInstance
    .get('/api/tracking/groups', { withCredentials: true })
    .then((res) => res.data)

export const createGroup = (data: TraccarGroupPayload): Promise<TraccarGroup> =>
  axiosInstance
    .post('/api/tracking/groups', data, { withCredentials: true })
    .then((res) => res.data)

export const updateGroup = (id: number, data: TraccarGroupPayload): Promise<TraccarGroup> =>
  axiosInstance
    .put(`/api/tracking/groups/${id}`, data, { withCredentials: true })
    .then((res) => res.data)

export const deleteGroup = (id: number): Promise<number> =>
  axiosInstance
    .delete(`/api/tracking/groups/${id}`, { withCredentials: true })
    .then((res) => res.status)

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export interface TraccarStatistics {
  activeUsers: number
  activeDevices: number
  messagesReceived: number
  messagesStored: number
  requests: number
  geocoderRequests: number
  captureTime?: string
}

export const getStatistics = (from: string, to: string): Promise<TraccarStatistics[]> =>
  axiosInstance
    .get(`/api/tracking/statistics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { withCredentials: true })
    .then((res) => res.data)

// ---------------------------------------------------------------------------
// Exports (KML / CSV / GPX)
// ---------------------------------------------------------------------------

export const exportKML = (deviceId: number, from: string, to: string): Promise<Blob> =>
  axiosInstance
    .get(`/api/tracking/export/kml/${deviceId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      withCredentials: true,
      responseType: 'blob',
    })
    .then((res) => res.data)

export const exportCSV = (deviceId: number, from: string, to: string): Promise<Blob> =>
  axiosInstance
    .get(`/api/tracking/export/csv/${deviceId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      withCredentials: true,
      responseType: 'blob',
    })
    .then((res) => res.data)

export const exportGPX = (deviceId: number, from: string, to: string): Promise<Blob> =>
  axiosInstance
    .get(`/api/tracking/export/gpx/${deviceId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      withCredentials: true,
      responseType: 'blob',
    })
    .then((res) => res.data)

// ---------------------------------------------------------------------------
// Accumulators
// ---------------------------------------------------------------------------

export interface AccumulatorsPayload {
  totalDistance?: number
  hours?: number
}

export const updateAccumulators = (deviceId: number, data: AccumulatorsPayload): Promise<number> =>
  axiosInstance
    .put(`/api/tracking/devices/${deviceId}/accumulators`, data, { withCredentials: true })
    .then((res) => res.status)
