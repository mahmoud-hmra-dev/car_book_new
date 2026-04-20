import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:timeago/timeago.dart' as timeago;

import 'config/app_config.dart';
import 'core/network/dio_client.dart';
import 'core/storage/secure_storage.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/fleet_repository.dart';
import 'data/repositories/geofence_repository.dart';
import 'data/repositories/tracking_repository.dart';
import 'l10n/app_localizations.dart';
import 'presentation/blocs/auth/auth_cubit.dart';
import 'presentation/blocs/fleet/fleet_cubit.dart';
import 'presentation/blocs/locale/locale_cubit.dart';
import 'presentation/blocs/theme/theme_cubit.dart';
import 'router/app_router.dart';

class ControTrackApp extends StatefulWidget {
  const ControTrackApp({super.key});

  @override
  State<ControTrackApp> createState() => _ControTrackAppState();
}

class _ControTrackAppState extends State<ControTrackApp> {
  late final SecureStorage _storage;
  late final DioClient _dio;
  late final AuthRepository _authRepo;
  late final FleetRepository _fleetRepo;
  late final GeofenceRepository _geofenceRepo;
  late final TrackingRepository _trackingRepo;
  late final AuthCubit _authCubit;
  late final FleetCubit _fleetCubit;
  late final ThemeCubit _themeCubit;
  late final LocaleCubit _localeCubit;

  @override
  void initState() {
    super.initState();
    timeago.setLocaleMessages('en_short', timeago.EnShortMessages());
    timeago.setLocaleMessages('ar', timeago.ArMessages());
    _storage = SecureStorage();
    _dio = DioClient(_storage);
    _authRepo = AuthRepository(_dio, _storage);
    _fleetRepo = FleetRepository(_dio);
    _geofenceRepo = GeofenceRepository(_dio);
    _trackingRepo = TrackingRepository(_dio);
    _authCubit = AuthCubit(_authRepo)..checkAuth();
    _fleetCubit = FleetCubit(_fleetRepo);
    _themeCubit = ThemeCubit();
    _localeCubit = LocaleCubit();
  }

  @override
  void dispose() {
    _authCubit.close();
    _fleetCubit.close();
    _themeCubit.close();
    _localeCubit.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider.value(value: _storage),
        RepositoryProvider.value(value: _dio),
        RepositoryProvider.value(value: _authRepo),
        RepositoryProvider.value(value: _fleetRepo),
        RepositoryProvider.value(value: _geofenceRepo),
        RepositoryProvider.value(value: _trackingRepo),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider.value(value: _authCubit),
          BlocProvider.value(value: _fleetCubit),
          BlocProvider.value(value: _themeCubit),
          BlocProvider.value(value: _localeCubit),
        ],
        child: Builder(
          builder: (context) {
            final router = AppRouter.build(_authCubit);
            return BlocBuilder<LocaleCubit, Locale>(
              builder: (context, locale) {
                return BlocBuilder<ThemeCubit, ThemeMode>(
                  builder: (context, themeMode) {
                    return MaterialApp.router(
                      title: AppConfig.appName,
                      debugShowCheckedModeBanner: false,
                      theme: AppTheme.lightTheme,
                      darkTheme: AppTheme.darkTheme,
                      themeMode: themeMode,
                      locale: locale,
                      supportedLocales: const [
                        Locale('en'),
                        Locale('ar'),
                      ],
                      localizationsDelegates: const [
                        AppLocalizationsDelegate(),
                        GlobalMaterialLocalizations.delegate,
                        GlobalWidgetsLocalizations.delegate,
                        GlobalCupertinoLocalizations.delegate,
                      ],
                      routerConfig: router,
                    );
                  },
                );
              },
            );
          },
        ),
      ),
    );
  }
}
