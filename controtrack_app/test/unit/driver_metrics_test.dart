import 'package:flutter_test/flutter_test.dart';
import 'package:controtrack/data/models/driver_model.dart';
import 'package:controtrack/data/models/report_model.dart';
import 'package:controtrack/presentation/screens/drivers/driver_metrics.dart';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const _driver = DriverModel(id: 'drv1', name: 'Ali Hassan');
const _driverWithCar = DriverModel(
  id: 'drv2',
  name: 'Omar Khalil',
  assignedCarId: 'car42',
);

ReportModel _report({
  double maxSpeed = 80,
  int stops = 5,
  int duration = 7200, // 2 h
  double distance = 120,
  double avgSpeed = 60,
}) =>
    ReportModel(
      maxSpeed: maxSpeed,
      stops: stops,
      duration: duration,
      distance: distance,
      avgSpeed: avgSpeed,
    );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  group('DriverMetrics.fromHash', () {
    test('score is in range [45, 99]', () {
      // 45 + (code % 55) → min 45, max 45+54=99
      final m = DriverMetrics.fromHash(_driver);
      expect(m.score, inInclusiveRange(45, 99));
    });

    test('speeding is in range [0, 11]', () {
      final m = DriverMetrics.fromHash(_driver);
      expect(m.speeding, inInclusiveRange(0, 11));
    });

    test('braking is in range [0, 7]', () {
      final m = DriverMetrics.fromHash(_driver);
      expect(m.braking, inInclusiveRange(0, 7));
    });

    test('idleMin is in range [5, 59]', () {
      final m = DriverMetrics.fromHash(_driver);
      expect(m.idleMin, inInclusiveRange(5, 59));
    });

    test('same driver id always produces same metrics (deterministic)', () {
      final a = DriverMetrics.fromHash(_driver);
      final b = DriverMetrics.fromHash(_driver);
      expect(a.score, b.score);
      expect(a.speeding, b.speeding);
      expect(a.braking, b.braking);
      expect(a.idleMin, b.idleMin);
    });

    test('different driver ids produce different metrics', () {
      const other = DriverModel(id: 'drv999', name: 'Test');
      final a = DriverMetrics.fromHash(_driver);
      final b = DriverMetrics.fromHash(other);
      // Very unlikely to be identical for ids with different char sums
      expect(a.score == b.score && a.speeding == b.speeding, isFalse);
    });

    test('driver reference is preserved', () {
      final m = DriverMetrics.fromHash(_driver);
      expect(m.driver, _driver);
    });
  });

  group('DriverMetrics.fromReport', () {
    // ── Score calculation ─────────────────────────────────────────────────────

    test('score is 100 for perfect report (no speeding, no stops, short trip)',
        () {
      // 0 stops, 0 duration, max speed 80 → penalty = 0
      final report = _report(maxSpeed: 80, stops: 0, duration: 0);
      final m = DriverMetrics.fromReport(_driver, report);
      expect(m.score, 100);
    });

    test('score deducted 10 pts when maxSpeed > 120', () {
      final noSpeeding = _report(maxSpeed: 100, stops: 0, duration: 0);
      final speeding = _report(maxSpeed: 130, stops: 0, duration: 0);
      final mOk = DriverMetrics.fromReport(_driver, noSpeeding);
      final mBad = DriverMetrics.fromReport(_driver, speeding);
      expect(mOk.score - mBad.score, 10);
    });

    test('score penalised 1.5 pts per stop (clamped at 30 stops)', () {
      // 10 stops, no speeding, zero idle → 100 - 10*1.5 = 85
      final report = _report(maxSpeed: 80, stops: 10, duration: 0);
      final m = DriverMetrics.fromReport(_driver, report);
      expect(m.score, 85);
    });

    test('stops clamped at 30 for score calculation', () {
      // 100 stops should behave same as 30 stops
      final at30 = _report(maxSpeed: 80, stops: 30, duration: 0);
      final at100 = _report(maxSpeed: 80, stops: 100, duration: 0);
      final m30 = DriverMetrics.fromReport(_driver, at30);
      final m100 = DriverMetrics.fromReport(_driver, at100);
      expect(m30.score, m100.score);
    });

    test('score clamped to minimum of 30', () {
      // Extreme: 30+ stops, speeding, long trip → below 30 floor
      final report = _report(
        maxSpeed: 200,
        stops: 100,
        duration: 100000, // ~27.7 h → idle ≥ 3 h clamped
      );
      final m = DriverMetrics.fromReport(_driver, report);
      expect(m.score, greaterThanOrEqualTo(30));
    });

    test('score clamped to maximum of 100', () {
      final report = _report(maxSpeed: 0, stops: 0, duration: 0);
      final m = DriverMetrics.fromReport(_driver, report);
      expect(m.score, lessThanOrEqualTo(100));
    });

    // ── speeding field ────────────────────────────────────────────────────────

    test('speeding is 0 when maxSpeed <= 120', () {
      final m = DriverMetrics.fromReport(_driver, _report(maxSpeed: 120));
      expect(m.speeding, 0);
    });

    test('speeding is 1 when maxSpeed > 120', () {
      final m = DriverMetrics.fromReport(_driver, _report(maxSpeed: 121));
      expect(m.speeding, 1);
    });

    // ── braking field ─────────────────────────────────────────────────────────

    test('braking equals stops when stops <= 30', () {
      final m = DriverMetrics.fromReport(_driver, _report(stops: 15));
      expect(m.braking, 15);
    });

    test('braking clamped to 30 when stops > 30', () {
      final m = DriverMetrics.fromReport(_driver, _report(stops: 999));
      expect(m.braking, 30);
    });

    // ── idleMin field ─────────────────────────────────────────────────────────

    test('idleMin is 0 for zero-duration trip', () {
      final m = DriverMetrics.fromReport(
        _driver,
        _report(duration: 0),
      );
      expect(m.idleMin, 0);
    });

    test('idleMin is ~15% of duration in minutes', () {
      // 2 h trip → idle ≈ 0.15 * 2 h = 0.3 h = 18 min
      final m = DriverMetrics.fromReport(_driver, _report(duration: 7200));
      expect(m.idleMin, closeTo(18, 1));
    });

    test('idleMin capped at 180 min (3 h) for very long trips', () {
      // 100 h trip: 15% = 15 h, clamped to 3 h = 180 min
      final m = DriverMetrics.fromReport(
        _driver,
        _report(duration: 360000),
      );
      expect(m.idleMin, 180);
    });

    // ── driver reference ──────────────────────────────────────────────────────

    test('driver reference is preserved', () {
      final m = DriverMetrics.fromReport(_driverWithCar, _report());
      expect(m.driver, _driverWithCar);
    });
  });
}
