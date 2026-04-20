import 'package:flutter_test/flutter_test.dart';
import 'package:controtrack/data/models/event_model.dart';
import 'package:controtrack/data/models/fleet_item_model.dart';
import 'package:controtrack/data/models/driver_model.dart';
import 'package:controtrack/data/models/geofence_model.dart';
import 'package:controtrack/data/models/maintenance_model.dart';
import 'package:controtrack/data/models/position_model.dart';
import 'package:controtrack/data/models/report_model.dart';
import 'package:controtrack/data/models/user_model.dart';

void main() {
  group('UserModel', () {
    test('fromJson parses all fields', () {
      final json = {
        '_id': 'u1',
        'email': 'admin@test.com',
        'fullName': 'Admin User',
        'accessToken': 'tok123',
        'language': 'ar',
        'type': 'admin',
      };
      final user = UserModel.fromJson(json);
      expect(user.id, 'u1');
      expect(user.email, 'admin@test.com');
      expect(user.fullName, 'Admin User');
      expect(user.accessToken, 'tok123');
      expect(user.language, 'ar');
      expect(user.type, 'admin');
    });

    test('fromJson falls back to id when _id is absent', () {
      final json = {'id': 'u2', 'email': 'x@x.com', 'fullName': 'X', 'accessToken': 't'};
      final user = UserModel.fromJson(json);
      expect(user.id, 'u2');
    });

    test('fromJson returns empty strings for missing required fields', () {
      final user = UserModel.fromJson({});
      expect(user.id, isEmpty);
      expect(user.email, isEmpty);
      expect(user.accessToken, isEmpty);
    });

    test('toJsonString / fromJsonString round-trips', () {
      final original = const UserModel(
        id: 'u3',
        email: 'test@example.com',
        fullName: 'Test',
        accessToken: 'token',
      );
      final json = original.toJsonString();
      final recovered = UserModel.fromJsonString(json);
      expect(recovered.id, original.id);
      expect(recovered.email, original.email);
      expect(recovered.accessToken, original.accessToken);
    });

    test('equatable equality', () {
      const a = UserModel(id: '1', email: 'a@b.com', fullName: 'A', accessToken: 't');
      const b = UserModel(id: '1', email: 'a@b.com', fullName: 'A', accessToken: 't');
      expect(a, equals(b));
    });
  });

  // ── FleetItem ──────────────────────────────────────────────────────────────

  group('FleetItem', () {
    test('fromJson parses basic fields', () {
      final json = {
        'carId': 'car1',
        'carName': 'Truck Alpha',
        'licensePlate': 'AB-1234',
        'movementStatus': 'moving',
        'speedKmh': 88.5,
      };
      final item = FleetItem.fromJson(json);
      expect(item.carId, 'car1');
      expect(item.carName, 'Truck Alpha');
      expect(item.licensePlate, 'AB-1234');
      expect(item.movementStatus, 'moving');
      expect(item.speedKmh, 88.5);
    });

    test('fromJson defaults to offline for missing movementStatus', () {
      final item = FleetItem.fromJson({'carId': 'c', 'carName': 'C', 'licensePlate': ''});
      expect(item.movementStatus, 'offline');
    });

    test('fromJson reads carId from nested car object', () {
      final json = {
        'car': {'_id': 'nested1', 'name': 'Nested Truck'},
        'licensePlate': 'NX-001',
      };
      final item = FleetItem.fromJson(json);
      expect(item.carId, 'nested1');
      expect(item.carName, 'Nested Truck');
    });

    test('equatable equality', () {
      const a = FleetItem(carId: 'c1', carName: 'T', licensePlate: 'P');
      const b = FleetItem(carId: 'c1', carName: 'T', licensePlate: 'P');
      expect(a, equals(b));
    });

    test('different carIds are not equal', () {
      const a = FleetItem(carId: 'c1', carName: 'T', licensePlate: 'P');
      const b = FleetItem(carId: 'c2', carName: 'T', licensePlate: 'P');
      expect(a, isNot(equals(b)));
    });
  });

  // ── DriverModel ────────────────────────────────────────────────────────────

  group('DriverModel', () {
    test('fromJson parses all fields', () {
      final json = {
        '_id': 'd1',
        'name': 'John Doe',
        'phone': '+1234567890',
        'email': 'john@fleet.com',
        'licenseNumber': 'LN-999',
        'assignedCarId': 'car1',
      };
      final driver = DriverModel.fromJson(json);
      expect(driver.id, 'd1');
      expect(driver.name, 'John Doe');
      expect(driver.phone, '+1234567890');
      expect(driver.email, 'john@fleet.com');
      expect(driver.licenseNumber, 'LN-999');
      expect(driver.assignedCarId, 'car1');
    });

    test('fromJson returns null for missing optional fields', () {
      final driver = DriverModel.fromJson({'_id': 'd2', 'name': 'Anonymous'});
      expect(driver.phone, isNull);
      expect(driver.email, isNull);
      expect(driver.assignedCarId, isNull);
    });

    test('toJson includes only non-null fields', () {
      final driver = DriverModel(id: 'd3', name: 'Bob', phone: '+0');
      final json = driver.toJson();
      expect(json['name'], 'Bob');
      expect(json.containsKey('email'), isFalse);
      expect(json.containsKey('assignedCarId'), isFalse);
    });

    test('equatable equality', () {
      const a = DriverModel(id: 'd1', name: 'Alice');
      const b = DriverModel(id: 'd1', name: 'Alice');
      expect(a, equals(b));
    });
  });

  // ── ReportModel ────────────────────────────────────────────────────────────

  group('ReportModel', () {
    test('fromJson parses numeric fields', () {
      final json = {
        'distance': 142.5,
        'duration': 3600,
        'maxSpeed': 115.0,
        'avgSpeed': 75.3,
        'stops': 3,
        'trips': [
          {'id': 't1'},
          {'id': 't2'},
        ],
      };
      final report = ReportModel.fromJson(json);
      expect(report.distance, closeTo(142.5, 0.001));
      expect(report.duration, 3600);
      expect(report.maxSpeed, closeTo(115.0, 0.001));
      expect(report.avgSpeed, closeTo(75.3, 0.001));
      expect(report.stops, 3);
      expect(report.trips.length, 2);
    });

    test('fromJson handles string numbers', () {
      final json = {'distance': '99.9', 'duration': '1800', 'maxSpeed': '120', 'avgSpeed': '60', 'stops': '2'};
      final report = ReportModel.fromJson(json);
      expect(report.distance, closeTo(99.9, 0.001));
      expect(report.duration, 1800);
      expect(report.stops, 2);
    });

    test('default constructor produces zero values', () {
      const report = ReportModel();
      expect(report.distance, 0);
      expect(report.duration, 0);
      expect(report.trips, isEmpty);
    });

    test('fromJson with empty map defaults to 0', () {
      final report = ReportModel.fromJson({});
      expect(report.distance, 0);
      expect(report.stops, 0);
    });

    test('fromJson parses from/to dates', () {
      final json = {
        'from': '2026-01-01T00:00:00.000Z',
        'to': '2026-01-31T23:59:59.000Z',
      };
      final report = ReportModel.fromJson(json);
      expect(report.from, isNotNull);
      expect(report.to, isNotNull);
      expect(report.from!.year, 2026);
      expect(report.to!.month, 1);
    });
  });

  // ── MaintenanceModel ───────────────────────────────────────────────────────

  group('MaintenanceModel', () {
    test('fromJson parses required fields', () {
      final json = {
        '_id': 'm1',
        'carId': 'car1',
        'type': 'oil_change',
        'period': 'monthly',
        'cost': 250.0,
        'notes': 'Engine oil change',
      };
      final m = MaintenanceModel.fromJson(json);
      expect(m.id, 'm1');
      expect(m.carId, 'car1');
      expect(m.type, 'oil_change');
      expect(m.period, 'monthly');
      expect(m.cost, 250.0);
    });

    test('fromJson defaults type to service when missing', () {
      final json = {'_id': 'm2', 'carId': 'c2'};
      final m = MaintenanceModel.fromJson(json);
      expect(m.type, 'service');
    });

    test('fromJson parses startDate and endDate', () {
      final json = {
        '_id': 'm3',
        'type': 'inspection',
        'startDate': '2026-04-01T00:00:00.000Z',
        'endDate': '2026-04-02T00:00:00.000Z',
      };
      final m = MaintenanceModel.fromJson(json);
      expect(m.startDate, isNotNull);
      expect(m.endDate, isNotNull);
      expect(m.startDate!.month, 4);
    });

    test('toJson round-trips through fromJson', () {
      final original = MaintenanceModel(
        id: 'm4',
        carId: 'c4',
        type: 'brake_check',
        period: 'quarterly',
        cost: 180.0,
        notes: 'Brake pads replaced',
      );
      final json = original.toJson();
      final recovered = MaintenanceModel.fromJson(json);
      expect(recovered.carId, original.carId);
      expect(recovered.type, original.type);
      expect(recovered.period, original.period);
    });
  });

  // ── EventModel ─────────────────────────────────────────────────────────────

  group('EventModel', () {
    test('fromJson parses all fields', () {
      final json = {
        '_id': 'ev1',
        'type': 'geofenceEnter',
        'carId': 'car1',
        'carName': 'Truck Alpha',
        'eventTime': '2026-04-19T10:00:00.000Z',
        'latitude': 33.5,
        'longitude': 36.2,
        'address': 'Industrial Zone, Damascus',
        'attributes': {'speedLimit': 80},
      };
      final e = EventModel.fromJson(json);
      expect(e.id, 'ev1');
      expect(e.type, 'geofenceEnter');
      expect(e.carId, 'car1');
      expect(e.carName, 'Truck Alpha');
      expect(e.eventTime, isNotNull);
      expect(e.eventTime!.hour, 10);
      expect(e.latitude, closeTo(33.5, 0.001));
      expect(e.longitude, closeTo(36.2, 0.001));
      expect(e.address, 'Industrial Zone, Damascus');
      expect(e.attributes['speedLimit'], 80);
    });

    test('fromJson uses id when _id is absent', () {
      final e = EventModel.fromJson({'id': 'ev2', 'type': 'alarm'});
      expect(e.id, 'ev2');
    });

    test('fromJson defaults type to event for missing type', () {
      final e = EventModel.fromJson({'_id': 'ev3'});
      expect(e.type, 'event');
    });

    test('fromJson handles null optional fields', () {
      final e = EventModel.fromJson({'_id': 'ev4', 'type': 'stop'});
      expect(e.carId, isNull);
      expect(e.latitude, isNull);
      expect(e.longitude, isNull);
      expect(e.attributes, isEmpty);
    });

    test('equatable equality matches on id and type', () {
      const a = EventModel(id: 'e1', type: 'alarm');
      const b = EventModel(id: 'e1', type: 'alarm');
      expect(a, equals(b));
    });

    test('different ids are not equal', () {
      const a = EventModel(id: 'e1', type: 'alarm');
      const b = EventModel(id: 'e2', type: 'alarm');
      expect(a, isNot(equals(b)));
    });
  });

  // ── GeofenceModel ──────────────────────────────────────────────────────────

  group('GeofenceModel', () {
    const circleWkt = 'CIRCLE (33.5138 36.2765, 500)';

    test('fromJson parses basic fields', () {
      final json = {
        '_id': 'geo1',
        'name': 'Main Depot',
        'description': 'Primary parking area',
        'area': circleWkt,
        'linkedCarIds': ['car1', 'car2'],
      };
      final g = GeofenceModel.fromJson(json);
      expect(g.id, 'geo1');
      expect(g.name, 'Main Depot');
      expect(g.description, 'Primary parking area');
      expect(g.area, circleWkt);
      expect(g.linkedCarIds, ['car1', 'car2']);
    });

    test('fromJson parses CIRCLE WKT into center/radius', () {
      final json = {'_id': 'g2', 'name': 'Zone A', 'area': circleWkt};
      final g = GeofenceModel.fromJson(json);
      expect(g.centerLat, closeTo(33.5138, 0.0001));
      expect(g.centerLng, closeTo(36.2765, 0.0001));
      expect(g.radius, closeTo(500, 0.001));
    });

    test('fromJson returns null center/radius for non-circle WKT', () {
      final json = {'_id': 'g3', 'name': 'Z', 'area': 'POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10))'};
      final g = GeofenceModel.fromJson(json);
      expect(g.centerLat, isNull);
      expect(g.centerLng, isNull);
      expect(g.radius, isNull);
    });

    test('fromJson defaults linkedCarIds to empty list', () {
      final json = {'_id': 'g4', 'name': 'Empty', 'area': ''};
      final g = GeofenceModel.fromJson(json);
      expect(g.linkedCarIds, isEmpty);
    });

    test('toCircleWKT produces parseable WKT', () {
      final wkt = GeofenceModel.toCircleWKT(33.5, 36.2, 250.0);
      expect(wkt, contains('CIRCLE'));
      expect(wkt, contains('33.5'));
      expect(wkt, contains('250.0'));
    });

    test('equatable equality', () {
      const a = GeofenceModel(id: 'g1', name: 'A', area: 'x');
      const b = GeofenceModel(id: 'g1', name: 'A', area: 'x');
      expect(a, equals(b));
    });
  });

  // ── PositionModel ──────────────────────────────────────────────────────────

  group('PositionModel', () {
    test('fromJson parses coordinates and speed', () {
      final json = {
        'latitude': 33.5138,
        'longitude': 36.2765,
        'speed': 10.0, // knots
        'course': 180.0,
        'altitude': 700.0,
        'address': 'Damascus',
      };
      final p = PositionModel.fromJson(json);
      expect(p.latitude, closeTo(33.5138, 0.0001));
      expect(p.longitude, closeTo(36.2765, 0.0001));
      expect(p.speed, closeTo(10.0, 0.001));
      expect(p.course, closeTo(180.0, 0.001));
      expect(p.altitude, closeTo(700.0, 0.001));
      expect(p.address, 'Damascus');
    });

    test('speedKmh converts from knots correctly', () {
      const p = PositionModel(latitude: 0, longitude: 0, speed: 10);
      // 10 knots = 18.52 km/h
      expect(p.speedKmh, closeTo(18.52, 0.01));
    });

    test('speedMph converts from knots correctly', () {
      const p = PositionModel(latitude: 0, longitude: 0, speed: 10);
      // 10 knots ≈ 11.508 mph
      expect(p.speedMph, closeTo(11.508, 0.01));
    });

    test('fromJson parses device/fix/server times', () {
      final json = {
        'latitude': 0.0,
        'longitude': 0.0,
        'deviceTime': '2026-04-19T08:00:00.000Z',
        'fixTime': '2026-04-19T08:00:01.000Z',
        'serverTime': '2026-04-19T08:00:02.000Z',
      };
      final p = PositionModel.fromJson(json);
      expect(p.deviceTime, isNotNull);
      expect(p.fixTime, isNotNull);
      expect(p.serverTime, isNotNull);
      expect(p.deviceTime!.hour, 8);
    });

    test('fromJson defaults speed/course to 0 when missing', () {
      final p = PositionModel.fromJson({'latitude': 1.0, 'longitude': 2.0});
      expect(p.speed, 0);
      expect(p.course, 0);
    });

    test('fromJson parses nested attributes with ignition and battery', () {
      final json = {
        'latitude': 0.0,
        'longitude': 0.0,
        'attributes': {
          'ignition': true,
          'batteryLevel': 85.5,
          'totalDistance': 12345.6,
        },
      };
      final p = PositionModel.fromJson(json);
      expect(p.attributes.ignition, isTrue);
      expect(p.attributes.batteryLevel, closeTo(85.5, 0.001));
      expect(p.attributes.totalDistance, closeTo(12345.6, 0.001));
    });

    test('fromJson with empty attributes produces default PositionAttributes', () {
      final p = PositionModel.fromJson({'latitude': 0.0, 'longitude': 0.0});
      expect(p.attributes.ignition, isNull);
      expect(p.attributes.batteryLevel, isNull);
    });

    test('equatable equality on lat/lng/speed/course', () {
      const a = PositionModel(latitude: 33.5, longitude: 36.2, speed: 5);
      const b = PositionModel(latitude: 33.5, longitude: 36.2, speed: 5);
      expect(a, equals(b));
    });
  });
}
