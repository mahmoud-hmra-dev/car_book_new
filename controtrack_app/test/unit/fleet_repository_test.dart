import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:controtrack/core/network/dio_client.dart';
import 'package:controtrack/data/repositories/fleet_repository.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class MockDioClient extends Mock implements DioClient {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

Response<T> _ok<T>(T data) => Response<T>(
      data: data,
      statusCode: 200,
      requestOptions: RequestOptions(path: '/'),
    );

const _fleetItemJson = <String, dynamic>{
  'carId': 'car1',
  'carName': 'Truck Alpha',
  'licensePlate': 'AB-001',
  'movementStatus': 'moving',
};

const _positionJson = <String, dynamic>{
  'latitude': 33.5,
  'longitude': 36.3,
  'speed': 25.0,
  'course': 90.0,
  'fixTime': '2026-04-01T10:00:00.000Z',
  'attributes': {},
};

const _eventJson = <String, dynamic>{
  '_id': 'e1',
  'carId': 'car1',
  'type': 'geofenceEnter',
  'serverTime': '2026-04-01T10:30:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  late MockDioClient client;
  late FleetRepository repo;

  setUp(() {
    client = MockDioClient();
    repo = FleetRepository(client);
  });

  // ── getFleet ───────────────────────────────────────────────────────────────

  group('getFleet', () {
    test('parses fleet items from array response', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<dynamic>[_fleetItemJson]));

      final items = await repo.getFleet();

      expect(items.length, 1);
      expect(items.first.carId, 'car1');
      expect(items.first.movementStatus, 'moving');
    });

    test('parses fleet from response wrapped in "fleet" key', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<String, dynamic>{
                'fleet': [_fleetItemJson],
              }));

      final items = await repo.getFleet();
      expect(items.length, 1);
    });

    test('parses fleet from response wrapped in "data" key', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<String, dynamic>{
                'data': [_fleetItemJson],
              }));

      final items = await repo.getFleet();
      expect(items.length, 1);
    });

    test('returns empty list on null response', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok<dynamic>(null));

      final items = await repo.getFleet();
      expect(items, isEmpty);
    });

    test('propagates exception from DioClient', () async {
      when(() => client.get(any())).thenThrow(Exception('timeout'));

      expect(() => repo.getFleet(), throwsException);
    });
  });

  // ── getPosition ────────────────────────────────────────────────────────────

  group('getPosition', () {
    test('returns PositionModel from Map response', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(_positionJson));

      final pos = await repo.getPosition('car1');

      expect(pos, isNotNull);
      expect(pos!.latitude, 33.5);
      expect(pos.longitude, 36.3);
    });

    test('returns PositionModel from List response (takes first element)', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<dynamic>[_positionJson]));

      final pos = await repo.getPosition('car1');

      expect(pos, isNotNull);
      expect(pos!.latitude, 33.5);
    });

    test('returns null when response data is null', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok<dynamic>(null));

      final pos = await repo.getPosition('car1');
      expect(pos, isNull);
    });

    test('returns null when response is an empty list', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<dynamic>[]));

      final pos = await repo.getPosition('car1');
      expect(pos, isNull);
    });

    test('propagates exception from DioClient', () async {
      when(() => client.get(any())).thenThrow(Exception('Not found'));

      expect(() => repo.getPosition('car1'), throwsException);
    });
  });

  // ── getRoute ───────────────────────────────────────────────────────────────

  group('getRoute', () {
    final from = DateTime(2026, 4, 1);
    final to = DateTime(2026, 4, 1, 23, 59);

    test('parses route positions from array response', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenAnswer((_) async => _ok(<dynamic>[_positionJson, _positionJson]));

      final route = await repo.getRoute('car1', from, to);

      expect(route.length, 2);
      expect(route.first.latitude, 33.5);
    });

    test('returns empty list on null response', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenAnswer((_) async => _ok<dynamic>(null));

      final route = await repo.getRoute('car1', from, to);
      expect(route, isEmpty);
    });

    test('propagates exception from DioClient', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenThrow(Exception('Network error'));

      expect(() => repo.getRoute('car1', from, to), throwsException);
    });
  });

  // ── getEvents ──────────────────────────────────────────────────────────────

  group('getEvents', () {
    test('parses events from array response', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenAnswer((_) async => _ok(<dynamic>[_eventJson]));

      final events = await repo.getEvents(carId: 'car1');

      expect(events.length, 1);
      expect(events.first.carId, 'car1');
      expect(events.first.type, 'geofenceEnter');
    });

    test('parses events from response wrapped in "events" key', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenAnswer((_) async => _ok(<String, dynamic>{
                'events': [_eventJson],
              }));

      final events = await repo.getEvents();
      expect(events.length, 1);
    });

    test('returns empty list on null response', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenAnswer((_) async => _ok<dynamic>(null));

      final events = await repo.getEvents();
      expect(events, isEmpty);
    });

    test('propagates exception from DioClient', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenThrow(Exception('timeout'));

      expect(() => repo.getEvents(), throwsException);
    });
  });

  // ── getStatistics ──────────────────────────────────────────────────────────

  group('getStatistics', () {
    test('returns Map from Map response', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenAnswer((_) async => _ok(<String, dynamic>{
                'totalKm': 5000.0,
                'activeCars': 12,
              }));

      final stats = await repo.getStatistics();

      expect(stats['totalKm'], 5000.0);
      expect(stats['activeCars'], 12);
    });

    test('returns empty Map when response is not a Map', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenAnswer((_) async => _ok<dynamic>(null));

      final stats = await repo.getStatistics();
      expect(stats, isEmpty);
    });

    test('propagates exception from DioClient', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenThrow(Exception('Server error'));

      expect(() => repo.getStatistics(), throwsException);
    });
  });

  // ── sendCommand ────────────────────────────────────────────────────────────

  group('sendCommand', () {
    test('completes without error on success', () async {
      when(() => client.post(any(), data: any(named: 'data')))
          .thenAnswer((_) async => _ok(<String, dynamic>{}));

      await expectLater(
        repo.sendCommand('car1', {'type': 'engineStop'}),
        completes,
      );
    });

    test('propagates exception from DioClient', () async {
      when(() => client.post(any(), data: any(named: 'data')))
          .thenThrow(Exception('Command failed'));

      expect(
        () => repo.sendCommand('car1', {'type': 'engineStop'}),
        throwsException,
      );
    });
  });

  // ── getCommandTypes ────────────────────────────────────────────────────────

  group('getCommandTypes', () {
    test('returns list of command type maps', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<dynamic>[
                {'type': 'engineStop', 'description': 'Stop engine'},
                {'type': 'engineResume', 'description': 'Resume engine'},
              ]));

      final types = await repo.getCommandTypes('car1');

      expect(types.length, 2);
      expect(types.first['type'], 'engineStop');
    });

    test('returns empty list on null response', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok<dynamic>(null));

      final types = await repo.getCommandTypes('car1');
      expect(types, isEmpty);
    });
  });
}
