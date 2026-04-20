import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:controtrack/core/network/dio_client.dart';
import 'package:controtrack/data/repositories/tracking_repository.dart';

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

void main() {
  late MockDioClient client;
  late TrackingRepository repo;

  final from = DateTime(2026, 4, 1);
  final to = DateTime(2026, 4, 30);

  setUp(() {
    client = MockDioClient();
    repo = TrackingRepository(client);
  });

  // ── getReport ──────────────────────────────────────────────────────────────

  group('getReport', () {
    test('parses report data from a Map response', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenAnswer((_) async => _ok(<String, dynamic>{
                'distance': 250.5,
                'duration': 7200,
                'maxSpeed': 120.0,
                'avgSpeed': 85.0,
                'stops': 4,
              }));

      final report = await repo.getReport('car1', from, to);

      expect(report.distance, closeTo(250.5, 0.001));
      expect(report.duration, 7200);
      expect(report.maxSpeed, closeTo(120.0, 0.001));
      expect(report.stops, 4);
    });

    test('returns default ReportModel when response is not a Map', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenAnswer((_) async => _ok(<dynamic>[])); // returns a list, not a map

      final report = await repo.getReport('car1', from, to);

      expect(report.distance, 0);
      expect(report.duration, 0);
      expect(report.stops, 0);
    });

    test('returns default ReportModel when response data is null', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenAnswer((_) async => _ok<dynamic>(null));

      final report = await repo.getReport('car1', from, to);

      expect(report.distance, 0);
    });

    test('propagates exception from DioClient', () async {
      when(() => client.get(any(), queryParameters: any(named: 'queryParameters')))
          .thenThrow(Exception('Network error'));

      expect(
        () => repo.getReport('car1', from, to),
        throwsException,
      );
    });
  });

  // ── getDrivers ─────────────────────────────────────────────────────────────

  group('getDrivers', () {
    test('parses a list of drivers from response', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<dynamic>[
                {'_id': 'd1', 'name': 'Ali Hassan', 'phone': '+963'},
                {'_id': 'd2', 'name': 'Omar Khalil'},
              ]));

      final drivers = await repo.getDrivers();

      expect(drivers.length, 2);
      expect(drivers.first.id, 'd1');
      expect(drivers.first.name, 'Ali Hassan');
      expect(drivers.last.id, 'd2');
    });

    test('returns empty list when response is not a list', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<String, dynamic>{'data': 'invalid'}));

      final drivers = await repo.getDrivers();
      expect(drivers, isEmpty);
    });
  });

  // ── getMaintenance ─────────────────────────────────────────────────────────

  group('getMaintenance', () {
    test('parses maintenance records from response', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok(<dynamic>[
                {
                  '_id': 'm1',
                  'carId': 'car1',
                  'type': 'oil_change',
                  'period': 'monthly',
                  'cost': 150.0,
                },
              ]));

      final records = await repo.getMaintenance();

      expect(records.length, 1);
      expect(records.first.id, 'm1');
      expect(records.first.type, 'oil_change');
    });

    test('returns empty list on null response', () async {
      when(() => client.get(any()))
          .thenAnswer((_) async => _ok<dynamic>(null));

      final records = await repo.getMaintenance();
      expect(records, isEmpty);
    });
  });
}
