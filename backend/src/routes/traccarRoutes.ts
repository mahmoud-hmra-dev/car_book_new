import express from 'express'
import authJwt from '../middlewares/authJwt'
import routeNames from '../config/traccarRoutes.config'
import * as traccarController from '../controllers/traccarController'

const routes = express.Router()

routes.route(routeNames.status).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getIntegrationStatus)
routes.route(routeNames.devices).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getDevices)
routes.route(routeNames.fleet).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getFleetOverview)
routes.route(routeNames.geofenceCollection)
  .get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getAllGeofences)
  .post(authJwt.verifyToken, authJwt.authAdmin, traccarController.createGeofence)
routes.route(routeNames.geofenceEntity)
  .put(authJwt.verifyToken, authJwt.authAdmin, traccarController.updateGeofence)
  .delete(authJwt.verifyToken, authJwt.authAdmin, traccarController.deleteGeofence)
routes.route(routeNames.geofenceLink).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.linkGeofence)
routes.route(routeNames.geofenceUnlink).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.unlinkGeofence)
routes.route(routeNames.link).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.linkDevice)
routes.route(routeNames.unlink).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.unlinkDevice)
routes.route(routeNames.positions).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getCurrentPositions)
routes.route(routeNames.commandTypes).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getCommandTypes)
routes.route(routeNames.commandSend).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.sendDeviceCommand)
routes.route(routeNames.route).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getRouteHistory)
routes.route(routeNames.reports).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getVehicleReports)
routes.route(routeNames.geofences).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getGeofences)
routes.route(routeNames.geofenceAlerts).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getGeofenceAlerts)
routes.route(routeNames.eventCenter).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getEventCenter)

// Drivers
routes.route(routeNames.driverCollection)
  .get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getDrivers)
  .post(authJwt.verifyToken, authJwt.authAdmin, traccarController.createDriver)
routes.route(routeNames.driverEntity)
  .put(authJwt.verifyToken, authJwt.authAdmin, traccarController.updateDriver)
  .delete(authJwt.verifyToken, authJwt.authAdmin, traccarController.deleteDriver)

// Maintenance
routes.route(routeNames.maintenanceCollection)
  .get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getMaintenance)
  .post(authJwt.verifyToken, authJwt.authAdmin, traccarController.createMaintenance)
routes.route(routeNames.maintenanceEntity)
  .put(authJwt.verifyToken, authJwt.authAdmin, traccarController.updateMaintenance)
  .delete(authJwt.verifyToken, authJwt.authAdmin, traccarController.deleteMaintenance)

// Notifications (types route MUST be registered before the :id param route)
routes.route(routeNames.notificationTypes).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getNotificationTypes)
routes.route(routeNames.notificationTest).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.testNotification)
routes.route(routeNames.notificationCollection)
  .get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getNotifications)
  .post(authJwt.verifyToken, authJwt.authAdmin, traccarController.createNotification)
routes.route(routeNames.notificationEntity)
  .put(authJwt.verifyToken, authJwt.authAdmin, traccarController.updateNotification)
  .delete(authJwt.verifyToken, authJwt.authAdmin, traccarController.deleteNotification)

// Groups
routes.route(routeNames.groupCollection)
  .get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getGroups)
  .post(authJwt.verifyToken, authJwt.authAdmin, traccarController.createGroup)
routes.route(routeNames.groupEntity)
  .put(authJwt.verifyToken, authJwt.authAdmin, traccarController.updateGroup)
  .delete(authJwt.verifyToken, authJwt.authAdmin, traccarController.deleteGroup)

// Statistics
routes.route(routeNames.statistics).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getStatistics)

// Device Accumulators
routes.route(routeNames.deviceAccumulators).put(authJwt.verifyToken, authJwt.authAdmin, traccarController.updateAccumulators)

// Position Export
routes.route(routeNames.exportKml).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.exportPositionsKML)
routes.route(routeNames.exportCsv).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.exportPositionsCSV)
routes.route(routeNames.exportGpx).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.exportPositionsGPX)

// Computed Attributes
routes.route(routeNames.computedAttributeCollection)
  .get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getComputedAttributes)
  .post(authJwt.verifyToken, authJwt.authAdmin, traccarController.createComputedAttribute)
routes.route(routeNames.computedAttributeEntity)
  .put(authJwt.verifyToken, authJwt.authAdmin, traccarController.updateComputedAttribute)
  .delete(authJwt.verifyToken, authJwt.authAdmin, traccarController.deleteComputedAttribute)

// Live location sharing
routes.route(routeNames.locationShare)
  .post(authJwt.verifyToken, authJwt.authAdmin, traccarController.createLocationShare)
  .delete(authJwt.verifyToken, authJwt.authAdmin, traccarController.revokeLocationShare)
routes.route(routeNames.locationShareRevoke)
  .delete(authJwt.verifyToken, authJwt.authAdmin, traccarController.revokeLocationShare)
routes.route(routeNames.locationPublic).get(traccarController.getPublicPosition)

// Security mode
routes.route(routeNames.securityMode).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.activateSecurityMode)

// Towing detection
routes.route(routeNames.towingAlerts).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getTowingAlerts)

// Telegram notifications
routes.route(routeNames.telegramTest).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.sendTelegramTest)

// Geofence auto-commands (by-geofence route MUST be registered before the :id param route)
routes.route(routeNames.autoCommandByGeofence).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getAutoCommandByGeofence)
routes.route(routeNames.autoCommandCollection)
  .get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getAutoCommands)
  .post(authJwt.verifyToken, authJwt.authAdmin, traccarController.createAutoCommand)
routes.route(routeNames.autoCommandEntity)
  .put(authJwt.verifyToken, authJwt.authAdmin, traccarController.updateAutoCommand)
  .delete(authJwt.verifyToken, authJwt.authAdmin, traccarController.deleteAutoCommand)

export default routes
