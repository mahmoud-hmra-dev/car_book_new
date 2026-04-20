// Widget tests for key UI components that can be tested in isolation.
// These tests use real widgets but mock heavy dependencies.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'package:controtrack/data/models/fleet_item_model.dart';
import 'package:controtrack/data/repositories/fleet_repository.dart';
import 'package:controtrack/l10n/app_localizations.dart';
import 'package:controtrack/presentation/blocs/fleet/fleet_cubit.dart';
import 'package:controtrack/presentation/blocs/fleet/fleet_state.dart';

// ignore_for_file: prefer_const_constructors

// ── Mocks ────────────────────────────────────────────────────────────────────

class MockFleetRepository extends Mock implements FleetRepository {}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Wraps a widget in the minimal environment needed: MaterialApp with
/// localizations and the required BlocProviders.
Widget _wrap(Widget child, {FleetCubit? fleetCubit}) {
  final cubit = fleetCubit ?? FleetCubit(MockFleetRepository());
  return MultiBlocProvider(
    providers: [
      BlocProvider<FleetCubit>.value(value: cubit),
    ],
    child: MaterialApp(
      localizationsDelegates: const [
        AppLocalizationsDelegate(),
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ],
      supportedLocales: const [Locale('en'), Locale('ar')],
      home: child,
    ),
  );
}

// ── Fleet-related widget tests ────────────────────────────────────────────────

void main() {
  group('HealthSummary', () {
    test('fromList counts statuses correctly', () {
      final items = [
        const FleetItem(carId: '1', carName: 'A', licensePlate: '', movementStatus: 'moving'),
        const FleetItem(carId: '2', carName: 'B', licensePlate: '', movementStatus: 'moving'),
        const FleetItem(carId: '3', carName: 'C', licensePlate: '', movementStatus: 'idle'),
        const FleetItem(carId: '4', carName: 'D', licensePlate: '', movementStatus: 'stopped'),
        const FleetItem(carId: '5', carName: 'E', licensePlate: '', movementStatus: 'offline'),
        const FleetItem(carId: '6', carName: 'F', licensePlate: '', movementStatus: 'stale'),
        const FleetItem(carId: '7', carName: 'G', licensePlate: '', movementStatus: 'no_gps'),
        const FleetItem(carId: '8', carName: 'H', licensePlate: '', movementStatus: 'unlinked'),
      ];

      final summary = HealthSummary.fromList(items);

      expect(summary.total, 8);
      expect(summary.moving, 2);
      expect(summary.idle, 1);
      expect(summary.stopped, 1);
      expect(summary.offline, 1);
      expect(summary.stale, 1);
      expect(summary.noGps, 1);
      expect(summary.unlinked, 1);
    });

    test('empty list produces zero summary', () {
      final summary = HealthSummary.fromList([]);
      expect(summary.total, 0);
      expect(summary.moving, 0);
    });
  });

  group('FleetState.filtered', () {
    final items = [
      const FleetItem(
          carId: '1',
          carName: 'Truck Alpha',
          licensePlate: 'TA-001',
          movementStatus: 'moving'),
      const FleetItem(
          carId: '2',
          carName: 'Van Beta',
          licensePlate: 'VB-002',
          movementStatus: 'idle'),
      const FleetItem(
          carId: '3',
          carName: 'SUV Gamma',
          licensePlate: 'SG-003',
          movementStatus: 'offline'),
    ];

    test('no filter returns all items', () {
      final state = FleetState(status: FleetStatus.loaded, items: items);
      expect(state.filtered.length, 3);
    });

    test('status filter narrows results', () {
      final state = FleetState(
          status: FleetStatus.loaded, items: items, statusFilter: 'moving');
      expect(state.filtered.length, 1);
      expect(state.filtered.first.carId, '1');
    });

    test('query filter is case-insensitive', () {
      final state =
          FleetState(status: FleetStatus.loaded, items: items, query: 'beta');
      expect(state.filtered.length, 1);
      expect(state.filtered.first.carId, '2');
    });

    test('combined status + query filter', () {
      final state = FleetState(
          status: FleetStatus.loaded,
          items: items,
          statusFilter: 'idle',
          query: 'beta');
      expect(state.filtered.length, 1);
    });

    test('combined filter with no match returns empty', () {
      final state = FleetState(
          status: FleetStatus.loaded,
          items: items,
          statusFilter: 'moving',
          query: 'beta');
      expect(state.filtered, isEmpty);
    });
  });

  // ── Basic render smoke test ──────────────────────────────────────────────────

  testWidgets('Scaffold renders without crash inside localization wrapper',
      (tester) async {
    await tester.pumpWidget(
      _wrap(const Scaffold(body: Center(child: Text('hello')))),
    );
    // Allow async localization delegate to finish loading
    await tester.pumpAndSettle();
    expect(find.text('hello'), findsOneWidget);
  });

  testWidgets('FleetCubit state flows to BlocBuilder', (tester) async {
    final mockRepo = MockFleetRepository();
    when(() => mockRepo.getFleet()).thenAnswer((_) async => [
          const FleetItem(
              carId: 'car1',
              carName: 'Alpha',
              licensePlate: 'AA-001',
              movementStatus: 'moving'),
        ]);

    final cubit = FleetCubit(mockRepo);
    await cubit.load();

    await tester.pumpWidget(
      _wrap(
        BlocBuilder<FleetCubit, FleetState>(
          builder: (ctx, state) =>
              Text('${state.items.length} vehicles'),
        ),
        fleetCubit: cubit,
      ),
    );

    await tester.pump();
    expect(find.text('1 vehicles'), findsOneWidget);
    cubit.close();
  });
}
