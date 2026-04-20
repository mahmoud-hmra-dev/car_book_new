import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as ws_status;

import '../../config/app_config.dart';

/// Payload delivered from the backend via WebSocket.
class WsNotificationPayload {
  final String id;
  final String message;
  final bool isRead;
  final DateTime createdAt;
  final String? booking;
  final String? car;

  const WsNotificationPayload({
    required this.id,
    required this.message,
    required this.isRead,
    required this.createdAt,
    this.booking,
    this.car,
  });

  factory WsNotificationPayload.fromJson(Map<String, dynamic> json) {
    return WsNotificationPayload(
      id: json['id'] as String? ?? '',
      message: json['message'] as String? ?? '',
      isRead: json['isRead'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      booking: json['booking'] as String?,
      car: json['car'] as String?,
    );
  }
}

/// Self-hosted push notification service using WebSockets + local notifications.
///
/// Connects to `wss://api.carbook.controtrack.com/ws/notifications?token=<jwt>`
/// and shows a local notification whenever a push arrives from the backend.
class PushNotificationService {
  static final PushNotificationService _instance =
      PushNotificationService._internal();
  factory PushNotificationService() => _instance;
  PushNotificationService._internal();

  // ── Local notification plugin ──────────────────────────────────────────────
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  // ── WebSocket state ────────────────────────────────────────────────────────
  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _channelSub;
  Timer? _reconnectTimer;
  Timer? _pingTimer;

  bool _initialized = false;
  bool _disposed = false;
  String? _currentToken;

  /// Stream that external listeners (e.g., cubits) can subscribe to.
  final StreamController<WsNotificationPayload> _notificationController =
      StreamController<WsNotificationPayload>.broadcast();

  Stream<WsNotificationPayload> get notificationStream =>
      _notificationController.stream;

  // ── Reconnect settings ─────────────────────────────────────────────────────
  static const _reconnectDelay = Duration(seconds: 5);
  static const _pingInterval = Duration(seconds: 30);
  static const _maxReconnectDelay = Duration(minutes: 2);
  int _reconnectAttempts = 0;

  // ── Android notification channel ──────────────────────────────────────────
  static const _androidChannelId = 'controtrack_push';
  static const _androidChannelName = 'ControTrack Alerts';
  static const _androidChannelDesc = 'Real-time fleet alerts and notifications';

  /// Initialise local notifications and request OS permissions.
  /// Call this once during app startup (e.g., in main.dart).
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwinInit = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const initSettings = InitializationSettings(
      android: androidInit,
      iOS: darwinInit,
    );

    await _localNotifications.initialize(initSettings);

    // Create the Android notification channel
    if (!kIsWeb && Platform.isAndroid) {
      const channel = AndroidNotificationChannel(
        _androidChannelId,
        _androidChannelName,
        description: _androidChannelDesc,
        importance: Importance.high,
        playSound: true,
      );
      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);

      // Request POST_NOTIFICATIONS permission (Android 13+).
      // Fire-and-forget: the dialog can appear after the app is visible,
      // which is better UX than blocking at the splash screen.
      _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission()
          .ignore();
    }

    if (!kIsWeb && Platform.isIOS) {
      // Same rationale: non-blocking permission request on iOS.
      _localNotifications
          .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(alert: true, badge: true, sound: true)
          .ignore();
    }
  }

  /// Connect to the WebSocket server using the user's JWT token.
  /// Automatically reconnects on disconnection.
  Future<void> connect(String token) async {
    if (!_initialized) await init();
    _currentToken = token;
    _disposed = false;
    _reconnectAttempts = 0;
    await _connect();
  }

  Future<void> _connect() async {
    if (_disposed) return;

    _cancelChannel();

    final uri = Uri.parse(
      '${AppConfig.wsNotificationsUrl}?token=${Uri.encodeComponent(_currentToken ?? '')}',
    );

    try {
      _channel = WebSocketChannel.connect(uri);
      await _channel!.ready;

      _reconnectAttempts = 0;

      _channelSub = _channel!.stream.listen(
        _onMessage,
        onError: _onError,
        onDone: _onDone,
        cancelOnError: false,
      );

      _startPing();
      debugPrint('[PushNotif] WebSocket connected');
    } catch (e) {
      debugPrint('[PushNotif] Connection failed: $e');
      _scheduleReconnect();
    }
  }

  void _onMessage(dynamic raw) {
    try {
      final json = jsonDecode(raw as String) as Map<String, dynamic>;
      final type = json['type'] as String?;

      if (type == 'notification') {
        final payload = WsNotificationPayload.fromJson(json);
        _notificationController.add(payload);
        _showLocalNotification(payload);
      }
      // 'connected' and 'pong' are silently acknowledged
    } catch (e) {
      debugPrint('[PushNotif] Error parsing message: $e');
    }
  }

  void _onError(Object error) {
    debugPrint('[PushNotif] WebSocket error: $error');
    _scheduleReconnect();
  }

  void _onDone() {
    debugPrint('[PushNotif] WebSocket closed');
    if (!_disposed) {
      _scheduleReconnect();
    }
  }

  void _startPing() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(_pingInterval, (_) {
      if (_channel != null) {
        try {
          _channel!.sink.add(jsonEncode({'type': 'ping'}));
        } catch (_) {}
      }
    });
  }

  void _scheduleReconnect() {
    if (_disposed || _currentToken == null) return;

    _reconnectTimer?.cancel();
    _reconnectAttempts++;

    // Exponential back-off capped at maxReconnectDelay
    final delay = Duration(
      seconds: (_reconnectDelay.inSeconds * _reconnectAttempts)
          .clamp(0, _maxReconnectDelay.inSeconds),
    );

    debugPrint(
        '[PushNotif] Reconnecting in ${delay.inSeconds}s (attempt $_reconnectAttempts)');

    _reconnectTimer = Timer(delay, _connect);
  }

  void _cancelChannel() {
    _pingTimer?.cancel();
    _channelSub?.cancel();
    try {
      _channel?.sink.close(ws_status.normalClosure);
    } catch (_) {}
    _channel = null;
    _channelSub = null;
  }

  /// Show a local notification using flutter_local_notifications.
  Future<void> _showLocalNotification(WsNotificationPayload payload) async {
    final id = payload.id.hashCode;

    const androidDetails = AndroidNotificationDetails(
      _androidChannelId,
      _androidChannelName,
      channelDescription: _androidChannelDesc,
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );
    const darwinDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    const details = NotificationDetails(
      android: androidDetails,
      iOS: darwinDetails,
    );

    await _localNotifications.show(
      id,
      AppConfig.appName,
      payload.message,
      details,
      payload: payload.id,
    );
  }

  /// Disconnect and clean up. Call when the user signs out.
  Future<void> disconnect() async {
    _disposed = true;
    _currentToken = null;
    _reconnectTimer?.cancel();
    _cancelChannel();
    debugPrint('[PushNotif] Disconnected');
  }

  /// Release all resources. Call only when the app is terminating.
  void dispose() {
    disconnect();
    _notificationController.close();
  }
}
