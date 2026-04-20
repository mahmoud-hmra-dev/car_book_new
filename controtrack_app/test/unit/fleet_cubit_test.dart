import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:controtrack/data/models/fleet_item_model.dart';
import 'package:controtrack/data/repositories/fleet_repository.dart';
import 'package:controtrack/presentation/blocs/fleet/fleet_cubit.dart';
import 'package:controtrack/presentation/blocs/fleet/fleet_state.dart';

class MockFleetRepository extends Mock implements FleetRepository {}

const _truck1 = FleetItem(
  carId: 'car1',
  carName: 'Truck Alpha',
  licensePlate: 'AB-001',
  movementStatus: 'moving',
  speedKmh: 90,
);

const _truck2 = FleetItem(
  carId: 'car2',
  carName: 'Van Beta',
  licensePlate: 'XY-002',
  movementStatus: 'idle',
  speedKmh: 0,
);

const _truck3 = FleetItem(
  carId: 'car3',
  carName: 'Truck Gamma',
  licensePlate: 'GG-003',
  movementStatus: 'offline',
  speedKmh: 0,
);

void main() {
  late MockFleetRepository repo;
  late FleetCubit cubit;

  setUp(() {
    repo = MockFleetRepository();
    cubit = FleetCubit(repo);
  });

  tearDown(() {
    cubit.close();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  test('initial state is FleetStatus.initial with empty items', () {
    expect(cubit.state.status, FleetStatus.initial);
    expect(cubit.state.items, isEmpty);
    expect(cubit.state.unreadAlertsCount, 0);
  });

  // ── load ───────────────────────────────────────────────────────────────────

  group('load', () {
    test('emits loaded with fleet items on success', () async {
      when(() => repo.getFleet()).thenAnswer((_) async => [_truck1, _truck2]);

      await cubit.load();

      expect(cubit.state.status, FleetStatus.loaded);
      expect(cubit.state.items.length, 2);
      expect(cubit.state.items.first.carId, 'car1');
    });

    test('emits loading before loaded', () async {
      when(() => repo.getFleet()).thenAnswer((_) async => [_truck1]);

      final expectation = expectLater(
        cubit.stream.map((s) => s.status),
        emitsInOrder([FleetStatus.loading, FleetStatus.loaded]),
      );
      await cubit.load();
      await expectation;
    });

    test('emits error status on repository exception', () async {
      when(() => repo.getFleet()).thenThrow(Exception('Network unavailable'));

      await cubit.load();

      expect(cubit.state.status, FleetStatus.error);
      expect(cubit.state.errorMessage, contains('Network unavailable'));
    });

    test('emits refreshing status (not loading) when refreshing=true', () async {
      when(() => repo.getFleet()).thenAnswer((_) async => [_truck1]);

      final expectation = expectLater(
        cubit.stream.map((s) => s.status),
        emitsInOrder([FleetStatus.refreshing, FleetStatus.loaded]),
      );
      await cubit.load(refreshing: true);
      await expectation;
    });

    test('computes HealthSummary correctly', () async {
      when(() => repo.getFleet()).thenAnswer((_) async => [_truck1, _truck2, _truck3]);

      await cubit.load();

      final summary = cubit.state.summary;
      expect(summary.total, 3);
      expect(summary.moving, 1);
      expect(summary.idle, 1);
      expect(summary.offline, 1);
    });
  });

  // ── Filtering ──────────────────────────────────────────────────────────────

  group('filtered getter', () {
    setUp(() async {
      when(() => repo.getFleet()).thenAnswer((_) async => [_truck1, _truck2, _truck3]);
      await cubit.load();
    });

    test('returns all items when no filter set', () {
      expect(cubit.state.filtered.length, 3);
    });

    test('filters by movementStatus', () {
      cubit.setStatusFilter('moving');
      expect(cubit.state.filtered.length, 1);
      expect(cubit.state.filtered.first.carId, 'car1');
    });

    test('clears filter when null is set', () {
      cubit.setStatusFilter('idle');
      cubit.setStatusFilter(null);
      expect(cubit.state.filtered.length, 3);
    });

    test('filters by query matching carName', () {
      cubit.setQuery('alpha');
      expect(cubit.state.filtered.length, 1);
      expect(cubit.state.filtered.first.carName, 'Truck Alpha');
    });

    test('filters by query matching licensePlate', () {
      cubit.setQuery('GG-003');
      expect(cubit.state.filtered.length, 1);
      expect(cubit.state.filtered.first.carId, 'car3');
    });

    test('returns empty list when no match', () {
      cubit.setQuery('ZZZZZZ');
      expect(cubit.state.filtered, isEmpty);
    });

    test('query is case-insensitive', () {
      cubit.setQuery('VAN');
      expect(cubit.state.filtered.length, 1);
      expect(cubit.state.filtered.first.carId, 'car2');
    });
  });

  // ── Alert count ────────────────────────────────────────────────────────────

  group('clearAlertsCount', () {
    test('clears unread alerts to 0', () async {
      when(() => repo.getFleet()).thenAnswer((_) async => [_truck1]);
      await cubit.load(); // first load

      // Simulate a second load with a position update — sets unreadAlertsCount > 0
      final updatedTruck = const FleetItem(
        carId: 'car1',
        carName: 'Truck Alpha',
        licensePlate: 'AB-001',
        movementStatus: 'moving',
        speedKmh: 110,
        lastPositionAt: null,
      );
      when(() => repo.getFleet()).thenAnswer((_) async => [updatedTruck]);
      await cubit.load(refreshing: true);

      cubit.clearAlertsCount();
      expect(cubit.state.unreadAlertsCount, 0);
    });
  });
}
