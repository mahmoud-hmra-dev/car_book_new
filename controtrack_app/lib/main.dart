import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app.dart';
import 'core/services/push_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialise notification service in the background — do NOT await so the
  // app is never blocked at the splash screen waiting for the OS permission
  // dialog. The service will be ready well before the user signs in.
  PushNotificationService().init().ignore();

  // Edge-to-edge: app renders behind both status bar and system nav bar.
  // On gesture-navigation devices the 3 buttons disappear entirely;
  // on button-navigation devices they float over a transparent background.
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarDividerColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const ControTrackApp());
}
