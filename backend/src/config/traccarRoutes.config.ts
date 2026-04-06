const routes = {
  status: '/api/status',
  devices: '/api/devices',
  fleet: '/api/fleet',
  geofenceCollection: '/api/geofences',
  geofenceEntity: '/api/geofences/entity/:geofenceId',
  geofenceLink: '/api/geofences/:carId/link/:geofenceId',
  geofenceUnlink: '/api/geofences/:carId/unlink/:geofenceId',
  link: '/api/link/:carId',
  unlink: '/api/unlink/:carId',
  positions: '/api/positions/:carId',
  commandTypes: '/api/commands/:carId/types',
  commandSend: '/api/commands/:carId/send',
  route: '/api/route/:carId',
  reports: '/api/reports/:carId',
  geofences: '/api/geofences/:carId',
  geofenceAlerts: '/api/geofence-alerts/:carId',
  eventCenter: '/api/events-center',

  // Drivers
  driverCollection: '/api/tracking/drivers',
  driverEntity: '/api/tracking/drivers/:id',

  // Maintenance
  maintenanceCollection: '/api/tracking/maintenance',
  maintenanceEntity: '/api/tracking/maintenance/:id',

  // Notifications
  notificationCollection: '/api/tracking/notifications',
  notificationEntity: '/api/tracking/notifications/:id',
  notificationTypes: '/api/tracking/notifications/types',
  notificationTest: '/api/tracking/notifications/:id/test',

  // Groups
  groupCollection: '/api/tracking/groups',
  groupEntity: '/api/tracking/groups/:id',

  // Statistics
  statistics: '/api/tracking/statistics',

  // Device Accumulators
  deviceAccumulators: '/api/tracking/devices/:deviceId/accumulators',

  // Position Export
  exportKml: '/api/tracking/export/kml/:deviceId',
  exportCsv: '/api/tracking/export/csv/:deviceId',
  exportGpx: '/api/tracking/export/gpx/:deviceId',

  // Computed Attributes
  computedAttributeCollection: '/api/tracking/attributes',
  computedAttributeEntity: '/api/tracking/attributes/:id',
}

export default routes
