import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../presentation/blocs/auth/auth_cubit.dart';
import '../presentation/blocs/auth/auth_state.dart';
import '../presentation/screens/auth/login_screen.dart';
import '../presentation/screens/main/main_shell.dart';
import '../presentation/screens/dashboard/dashboard_screen.dart';
import '../presentation/screens/map/map_screen.dart';
import '../presentation/screens/vehicles/vehicles_screen.dart';
import '../presentation/screens/vehicles/vehicle_detail_screen.dart';
import '../presentation/screens/vehicles/vehicle_commands_screen.dart';
import '../presentation/screens/vehicles/panic_button_screen.dart';
import '../presentation/screens/vehicles/immobilization_screen.dart';
import '../presentation/screens/alerts/alerts_screen.dart';
import '../presentation/screens/more/more_screen.dart';
import '../presentation/screens/route_history/route_history_screen.dart';
import '../presentation/screens/geofences/geofences_screen.dart';
import '../presentation/screens/geofences/auto_commands_screen.dart';
import '../presentation/screens/geofences/geofence_editor_screen.dart';
import '../presentation/screens/geofences/link_geofences_screen.dart';
import '../presentation/screens/notifications/notifications_screen.dart';
import '../presentation/screens/reports/reports_screen.dart';
import '../presentation/screens/reports/speed_violations_screen.dart';
import '../presentation/screens/reports/summary_report_screen.dart';
import '../presentation/screens/drivers/drivers_screen.dart';
import '../presentation/screens/drivers/driver_behavior_screen.dart';
import '../presentation/screens/vehicles/sensors_screen.dart';
import '../presentation/screens/vehicles/documents_screen.dart';
import '../presentation/screens/maintenance/maintenance_screen.dart';
import '../presentation/screens/search/search_screen.dart';
import '../presentation/screens/settings/settings_screen.dart';
import '../presentation/screens/settings/sms_alerts_screen.dart';
import '../presentation/screens/vehicles/fuel_log_screen.dart';
import '../presentation/screens/settings/emergency_contacts_screen.dart';

/// Shared fade + subtle upward slide transition used across all routes.
Widget _fadeSlideTransition(
  BuildContext context,
  Animation<double> animation,
  Animation<double> secondaryAnimation,
  Widget child,
) {
  return FadeTransition(
    opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
    child: SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0, 0.04),
        end: Offset.zero,
      ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOut)),
      child: child,
    ),
  );
}

CustomTransitionPage<void> _page({required Widget child, LocalKey? key}) {
  return CustomTransitionPage<void>(
    key: key,
    child: child,
    transitionDuration: const Duration(milliseconds: 260),
    reverseTransitionDuration: const Duration(milliseconds: 200),
    transitionsBuilder: _fadeSlideTransition,
  );
}

class AppRouter {
  static GoRouter build(AuthCubit authCubit) {
    return GoRouter(
      initialLocation: '/login',
      refreshListenable: _AuthListenable(authCubit),
      redirect: (context, state) {
        final status = authCubit.state.status;
        final loggingIn = state.matchedLocation == '/login';
        if (status == AuthStatus.initial || status == AuthStatus.loading) return null;
        final authed = status == AuthStatus.authenticated;
        if (!authed && !loggingIn) return '/login';
        if (authed && loggingIn) return '/dashboard';
        return null;
      },
      routes: [
        // ── Auth ──────────────────────────────────────────────────────────
        GoRoute(
          path: '/login',
          pageBuilder: (_, state) => _page(key: state.pageKey, child: const LoginScreen()),
        ),

        // ── Shell (sidebar on web, bottom nav on mobile) ──────────────────
        // ALL main navigation routes live inside the shell so the sidebar
        // is always visible on desktop.
        ShellRoute(
          pageBuilder: (context, state, child) => _page(
            key: state.pageKey,
            child: MainShell(child: child),
          ),
          routes: [
            // Primary tabs (mobile bottom nav)
            GoRoute(
              path: '/dashboard',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const DashboardScreen()),
            ),
            GoRoute(
              path: '/map',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const MapScreen()),
            ),
            GoRoute(
              path: '/vehicles',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const VehiclesScreen()),
            ),
            GoRoute(
              path: '/alerts',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const AlertsScreen()),
            ),
            GoRoute(
              path: '/more',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const MoreScreen()),
            ),

            // ── Reports section ──────────────────────────────────────────
            GoRoute(
              path: '/reports',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const ReportsScreen()),
            ),
            GoRoute(
              path: '/reports/summary',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const SummaryReportScreen()),
            ),
            GoRoute(
              path: '/reports/speed-violations',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const SpeedViolationsScreen()),
            ),

            // ── Drivers section ──────────────────────────────────────────
            GoRoute(
              path: '/drivers',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const DriversScreen()),
            ),
            GoRoute(
              path: '/drivers/:driverId/behavior',
              pageBuilder: (_, state) => _page(
                key: state.pageKey,
                child: DriverBehaviorScreen(
                  driverId: state.pathParameters['driverId']!,
                  driverName: state.uri.queryParameters['name'] ?? 'Driver',
                ),
              ),
            ),

            // ── Geofences section ────────────────────────────────────────
            GoRoute(
              path: '/geofences',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const GeofencesScreen()),
            ),
            GoRoute(
              path: '/geofence-editor',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const GeofenceEditorScreen()),
            ),
            GoRoute(
              path: '/link-geofences',
              pageBuilder: (_, state) => _page(
                key: state.pageKey,
                child: LinkGeofencesScreen(
                  carId: state.uri.queryParameters['carId'] ?? '',
                  carName: state.uri.queryParameters['carName'] ?? '',
                ),
              ),
            ),
            GoRoute(
              path: '/auto-commands',
              pageBuilder: (_, state) => _page(
                key: state.pageKey,
                child: AutoCommandsScreen(
                  geofenceId: state.uri.queryParameters['geofenceId'] ?? '',
                  geofenceName: state.uri.queryParameters['name'] ?? '',
                ),
              ),
            ),

            // ── Maintenance ──────────────────────────────────────────────
            GoRoute(
              path: '/maintenance',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const MaintenanceScreen()),
            ),

            // ── Settings section ─────────────────────────────────────────
            GoRoute(
              path: '/settings',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const SettingsScreen()),
            ),
            GoRoute(
              path: '/settings/sms-alerts',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const SmsAlertsScreen()),
            ),
            GoRoute(
              path: '/settings/emergency-contacts',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const EmergencyContactsScreen()),
            ),

            // ── Notifications / Route history / Search ───────────────────
            GoRoute(
              path: '/notifications',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const NotificationsScreen()),
            ),
            GoRoute(
              path: '/route-history',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const RouteHistoryScreen()),
            ),
            GoRoute(
              path: '/search',
              pageBuilder: (_, state) => _page(key: state.pageKey, child: const SearchScreen()),
            ),
          ],
        ),

        // ── Full-screen detail routes (no shell / sidebar) ────────────────
        // These are pushed on top and have their own AppBar back button.
        GoRoute(
          path: '/vehicles/:carId',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: VehicleDetailScreen(carId: state.pathParameters['carId']!),
          ),
        ),
        GoRoute(
          path: '/vehicles/:carId/commands',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: VehicleCommandsScreen(carId: state.pathParameters['carId']!),
          ),
        ),
        GoRoute(
          path: '/vehicles/:carId/panic',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: PanicButtonScreen(carId: state.pathParameters['carId']!),
          ),
        ),
        GoRoute(
          path: '/vehicles/:carId/immobilize',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: ImmobilizationScreen(carId: state.pathParameters['carId']!),
          ),
        ),
        GoRoute(
          path: '/vehicles/:carId/sensors',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: SensorsScreen(carId: state.pathParameters['carId']!),
          ),
        ),
        GoRoute(
          path: '/vehicles/:carId/documents',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: DocumentsScreen(carId: state.pathParameters['carId']!),
          ),
        ),
        GoRoute(
          path: '/vehicles/:carId/fuel-log',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: FuelLogScreen(carId: state.pathParameters['carId']!),
          ),
        ),
      ],
    );
  }
}

class _AuthListenable extends ChangeNotifier {
  _AuthListenable(AuthCubit cubit) {
    _subscription = cubit.stream.listen((_) => notifyListeners());
  }
  late final dynamic _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
