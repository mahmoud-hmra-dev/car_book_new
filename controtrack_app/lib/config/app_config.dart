class AppConfig {
  static const String apiHost = 'https://api.carbook.controtrack.com';
  // WebSocket endpoint for self-hosted real-time push notifications
  // Protocol switches to wss:// automatically since the API uses HTTPS
  static const String wsNotificationsUrl =
      'wss://api.carbook.controtrack.com/ws/notifications';
  static const String defaultLanguage = 'en';
  static const String googleMapsApiKey = 'AIzaSyBpw1qAkE-NDvMJnjqU5Rj4K3T_XrAwxok';
  static const int trackingRefreshIntervalMs = 30000;
  static const String cdnUsers = 'https://api.carbook.controtrack.com/cdn/bookcars/users';
  static const String cdnCars = 'https://api.carbook.controtrack.com/cdn/bookcars/cars';

  static const String appName = 'ControTrack';
  static const String appVersion = '1.0.0';
}
