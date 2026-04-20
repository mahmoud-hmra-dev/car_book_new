import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:controtrack/core/network/dio_client.dart';
import 'package:controtrack/data/repositories/geofence_repository.dart';

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

const _geoJson = <String, dynamic>{
  '_id': 'g1',
  'name': 'Warehouse Zone',
  'area': 'CIRCLE (33.5 36.3, 500)',
  'description': 'Main warehouse',
};

void main() {
  late MockDioClient client;
  late GeofenceRepository repo;

  setUp(() {
    client = MockDioClient();
    repo = GeofenceRepository(client);
  });

  // ── getAll ─────────────────────────────────────────────────────────────────

  group('getAll', () {
    test('parses list of geofences from array response', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<dynamic>[_geoJson]));

      final list = await repo.getAll();

      expect(list.length, 1);
      expect(list.first.id, 'g1');
      expect(list.first.name, 'Warehouse Zone');
    });

    test('parses geofences from response wrapped in "data" key', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<String, dynamic>{
                'data': [_geoJson],
              }));

      final list = await repo.getAll();
      expect(list.length, 1);
      expect(list.first.id, 'g1');
    });

    test('parses geofences from response wrapped in "geofences" key', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<String, dynamic>{
                'geofences': [_geoJson],
              }));

      final list = await repo.getAll();
      expect(list.length, 1);
    });

    test('returns empty list when response data is null', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok<dynamic>(null));

      final list = await repo.getAll();
      expect(list, isEmpty);
    });

    test('returns empty list when response is an unknown Map shape', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<String, dynamic>{'unknown': 42}));

      final list = await repo.getAll();
      expect(list, isEmpty);
    });

    test('propagates exception from DioClient', () async {
      when(() => client.get(any())).thenThrow(Exception('timeout'));

      expect(() => repo.getAll(), throwsException);
    });
  });

  // ── getForCar ──────────────────────────────────────────────────────────────

  group('getForCar', () {
    test('returns geofences for given carId', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<dynamic>[_geoJson]));

      final list = await repo.getForCar('car1');

      expect(list.length, 1);
      expect(list.first.id, 'g1');
    });

    test('returns empty when car has no geofences', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<dynamic>[]));

      final list = await repo.getForCar('carX');
      expect(list, isEmpty);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  group('create', () {
    test('returns created GeofenceModel on success', () async {
      when(() => client.post(any(), data: any(named: 'data')))
          .thenAnswer((_) async => _ok(_geoJson));

      final geo = await repo.create(
        name: 'Warehouse Zone',
        area: 'CIRCLE (33.5 36.3, 500)',
      );

      expect(geo.id, 'g1');
      expect(geo.name, 'Warehouse Zone');
    });

    test('propagates exception from DioClient', () async {
      when(() => client.post(any(), data: any(named: 'data')))
          .thenThrow(Exception('Server error'));

      expect(
        () => repo.create(name: 'Zone', area: 'CIRCLE (0 0, 100)'),
        throwsException,
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  group('update', () {
    test('completes without error on success', () async {
      when(() => client.put(any(), data: any(named: 'data')))
          .thenAnswer((_) async => _ok(<String, dynamic>{}));

      await expectLater(
        repo.update('g1', {'name': 'New Name'}),
        completes,
      );
    });

    test('propagates exception from DioClient', () async {
      when(() => client.put(any(), data: any(named: 'data')))
          .thenThrow(Exception('Not found'));

      expect(() => repo.update('g999', {}), throwsException);
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────────

  group('delete', () {
    test('completes without error on success', () async {
      when(() => client.delete(any()))
          .thenAnswer((_) async => _ok<dynamic>(null));

      await expectLater(repo.delete('g1'), completes);
    });

    test('propagates exception from DioClient', () async {
      when(() => client.delete(any())).thenThrow(Exception('Not found'));

      expect(() => repo.delete('g999'), throwsException);
    });
  });

  // ── link / unlink ──────────────────────────────────────────────────────────

  group('link / unlink', () {
    test('link completes without error', () async {
      when(() => client.post(any()))
          .thenAnswer((_) async => _ok<dynamic>(null));

      await expectLater(repo.link('car1', 'g1'), completes);
    });

    test('unlink completes without error', () async {
      when(() => client.post(any()))
          .thenAnswer((_) async => _ok<dynamic>(null));

      await expectLater(repo.unlink('car1', 'g1'), completes);
    });

    test('link propagates exception from DioClient', () async {
      when(() => client.post(any())).thenThrow(Exception('Forbidden'));

      expect(() => repo.link('car1', 'g1'), throwsException);
    });
  });
}
