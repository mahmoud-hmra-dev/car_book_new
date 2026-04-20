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
import '../presentation/screens/vehicles/pod_screen.dart';
import '../presentation/screens/vehicles/eta_share_screen.dart';
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
import '../presentation/screens/drivers/driver_checkin_screen.dart';
import '../presentation/screens/drivers/hos_screen.dart';
import '../presentation/screens/cargo/cargo_screen.dart';
import '../presentation/screens/vehicles/sensors_screen.dart';
import '../presentation/screens/vehicles/dvir_screen.dart';
import '../presentation/screens/vehicles/documents_screen.dart';
import '../presentation/screens/infractions/infractions_screen.dart';
import '../presentation/screens/maintenance/maintenance_screen.dart';
import '../presentation/screens/search/search_screen.dart';
import '../presentation/screens/settings/settings_screen.dart';
import '../presentation/screens/settings/sms_alerts_screen.dart';
import '../presentation/screens/vehicles/fuel_log_screen.dart';
import '../presentation/screens/analytics/cost_analytics_screen.dart';
import '../presentation/screens/analytics/benchmarking_screen.dart';
import '../presentation/screens/reports/route_optimization_screen.dart';
import '../presentation/screens/fleet/fleet_timeline_screen.dart';
import '../presentation/screens/fleet/mileage_tracker_screen.dart';
import '../presentation/screens/fleet/idle_time_screen.dart';
import '../presentation/screens/fleet/vehicle_sharing_screen.dart';
import '../presentation/screens/drivers/driver_scorecard_screen.dart';
import '../presentation/screens/alerts/smart_alerts_screen.dart';
import '../presentation/screens/fleet/executive_summary_screen.dart';
import '../presentation/screens/fleet/fuel_theft_screen.dart';
import '../presentation/screens/settings/emergency_contacts_screen.dart';

/// Shared fade + subtle upward slide transition builder used across routes.
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

CustomTransitionPage<void> _page({
  required Widget child,
  LocalKey? key,
}) {
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
        if (status == AuthStatus.initial || status == AuthStatus.loading) {
          return null;
        }
        final authed = status == AuthStatus.authenticated;
        if (!authed && !loggingIn) return '/login';
        if (authed && loggingIn) return '/dashboard';
        return null;
      },
      routes: [
        GoRoute(
          path: '/login',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const LoginScreen(),
          ),
        ),
        ShellRoute(
          pageBuilder: (context, state, child) => _page(
            key: state.pageKey,
            child: MainShell(child: child),
          ),
          routes: [
            GoRoute(
              path: '/dashboard',
              pageBuilder: (_, state) => _page(
                key: state.pageKey,
                child: const DashboardScreen(),
              ),
            ),
            GoRoute(
              path: '/map',
              pageBuilder: (_, state) => _page(
                key: state.pageKey,
                child: const MapScreen(),
              ),
            ),
            GoRoute(
              path: '/vehicles',
              pageBuilder: (_, state) => _page(
                key: state.pageKey,
                child: const VehiclesScreen(),
              ),
            ),
            GoRoute(
              path: '/alerts',
              pageBuilder: (_, state) => _page(
                key: state.pageKey,
                child: const AlertsScreen(),
              ),
            ),
            GoRoute(
              path: '/more',
              pageBuilder: (_, state) => _page(
                key: state.pageKey,
                child: const MoreScreen(),
              ),
            ),
          ],
        ),
        GoRoute(
          path: '/route-history',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const RouteHistoryScreen(),
          ),
        ),
        GoRoute(
          path: '/geofences',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const GeofencesScreen(),
          ),
        ),
        GoRoute(
          path: '/reports',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const ReportsScreen(),
          ),
        ),
        GoRoute(
          path: '/drivers',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const DriversScreen(),
          ),
        ),
        GoRoute(
          path: '/drivers/checkin',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const DriverCheckinScreen(),
          ),
        ),
        GoRoute(
          path: '/cargo',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const CargoScreen(),
          ),
        ),
        GoRoute(
          path: '/maintenance',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const MaintenanceScreen(),
          ),
        ),
        GoRoute(
          path: '/settings',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const SettingsScreen(),
          ),
        ),
        GoRoute(
          path: '/vehicles/:carId',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: VehicleDetailScreen(
                carId: state.pathParameters['carId']!),
          ),
        ),
        GoRoute(
          path: '/vehicles/:carId/commands',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: VehicleCommandsScreen(
                carId: state.pathParameters['carId']!),
          ),
        ),
        GoRoute(
          path: '/vehicles/:carId/panic',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: PanicButtonScreen(
                carId: state.pathParameters['carId']!),
          ),
        ),
        GoRoute(
          path: '/vehicles/:carId/immobilize',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: ImmobilizationScreen(
                carId: state.pathParameters['carId']!),
          ),
        ),
        GoRoute(
          path: '/vehicles/:carId/pod',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: PodScreen(carId: state.pathParameters['carId']!),
          ),
        ),
        GoRoute(
          path: '/reports/summary',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const SummaryReportScreen(),
          ),
        ),
        GoRoute(
          path: '/notifications',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const NotificationsScreen(),
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
        GoRoute(
          path: '/geofence-editor',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const GeofenceEditorScreen(),
          ),
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
          path: '/reports/speed-violations',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const SpeedViolationsScreen(),
          ),
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
        GoRoute(
          path: '/drivers/:driverId/hos',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: HosScreen(
              driverId: state.pathParameters['driverId']!,
              driverName: state.uri.queryParameters['name'] ?? 'Driver',
            ),
          ),
        ),
        GoRoute(
          path: '/vehicles/:carId/eta',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: EtaShareScreen(carId: state.pathParameters['carId']!),
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
          path: '/vehicles/:carId/dvir',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: DvirScreen(carId: state.pathParameters['carId']!),
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
          path: '/infractions',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const InfractionsScreen(),
          ),
        ),
        GoRoute(
          path: '/search',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const SearchScreen(),
          ),
        ),
        GoRoute(
          path: '/settings/sms-alerts',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const SmsAlertsScreen(),
          ),
        ),
        GoRoute(
          path: '/vehicles/:carId/fuel-log',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: FuelLogScreen(carId: state.pathParameters['carId']!),
          ),
        ),
        GoRoute(
          path: '/analytics/costs',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const CostAnalyticsScreen(),
          ),
        ),
        GoRoute(
          path: '/analytics/benchmarking',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const BenchmarkingScreen(),
          ),
        ),
        GoRoute(
          path: '/reports/route-optimization',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const RouteOptimizationScreen(),
          ),
        ),
        GoRoute(
          path: '/fleet/timeline',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const FleetTimelineScreen(),
          ),
        ),
        GoRoute(
          path: '/fleet/mileage',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const MileageTrackerScreen(),
          ),
        ),
        GoRoute(
          path: '/fleet/idle',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const IdleTimeScreen(),
          ),
        ),
        GoRoute(
          path: '/fleet/sharing',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const VehicleSharingScreen(),
          ),
        ),
        GoRoute(
          path: '/drivers/scorecards',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const DriverScorecardScreen(),
          ),
        ),
        GoRoute(
          path: '/alerts/smart',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const SmartAlertsScreen(),
          ),
        ),
        GoRoute(
          path: '/fleet/executive',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const ExecutiveSummaryScreen(),
          ),
        ),
        GoRoute(
          path: '/settings/emergency-contacts',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const EmergencyContactsScreen(),
          ),
        ),
        GoRoute(
          path: '/fleet/fuel-theft',
          pageBuilder: (_, state) => _page(
            key: state.pageKey,
            child: const FuelTheftScreen(),
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
