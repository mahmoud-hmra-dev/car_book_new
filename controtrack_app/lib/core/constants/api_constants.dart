class ApiConstants {
  static const String signInAdmin = '/api/sign-in/admin';
  static const String validateAccessToken = '/api/validate-access-token';

  static const String fleet = '/api/fleet';
  static const String devices = '/api/devices';

  static String positions(String carId) => '/api/positions/$carId';
  static String route(String carId) => '/api/route/$carId';

  static const String geofences = '/api/geofences';
  static String geofencesForCar(String carId) => '/api/geofences/$carId';
  static String geofenceEntity(String id) => '/api/geofences/entity/$id';
  static String geofenceLink(String carId, String id) => '/api/geofences/$carId/link/$id';
  static String geofenceUnlink(String carId, String id) => '/api/geofences/$carId/unlink/$id';

  static String commandTypes(String carId) => '/api/commands/$carId/types';
  static String sendCommand(String carId) => '/api/commands/$carId/send';

  static const String drivers = '/api/tracking/drivers';
  static String driver(String id) => '/api/tracking/drivers/$id';

  static const String maintenance = '/api/tracking/maintenance';
  static String maintenanceItem(String id) => '/api/tracking/maintenance/$id';

  static String reports(String carId) => '/api/reports/$carId';

  static const String eventsCenter = '/api/events-center';
  static const String statistics = '/api/tracking/statistics';

  // Sensor / device telemetry (used by the sensors screen).
  // Resolves against the same backend proxy for Traccar. If the backend does
  // not expose these endpoints, the screen gracefully falls back to "no data".
  static String deviceInfo(String carId) => '/api/devices/$carId';
  static String latestPosition(String carId) => '/api/positions/$carId';
  static String positionHistory(String carId) => '/api/route/$carId';

  static const String notifications = '/api/tracking/notifications';
  static String notification(String id) => '/api/tracking/notifications/$id';

  static String shareLocation(String carId) => '/api/tracking/share/$carId';
  static String securityMode(String carId) => '/api/tracking/security-mode/$carId';
  static const String autoCommands = '/api/tracking/auto-commands';
  static String autoCommandsByGeofence(String geofenceId) =>
      '/api/tracking/auto-commands/geofence/$geofenceId';
  static String autoCommand(String id) => '/api/tracking/auto-commands/$id';
  static const String notificationTest = '/api/tracking/notifications/test';

  // Alert Rules (self-managed, stored in MongoDB via BookCars backend)
  static const String alertRules = '/api/alerts/rules';
  static String alertRule(String id) => '/api/alerts/rules/$id';

  static const String tokenHeader = 'x-access-token';
}
