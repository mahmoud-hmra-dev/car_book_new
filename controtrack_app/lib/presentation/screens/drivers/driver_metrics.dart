import '../../../data/models/driver_model.dart';
import '../../../data/models/report_model.dart';

/// Per-driver computed behavior metrics derived from real report data.
///
/// Extracted from drivers_screen.dart so it can be unit-tested independently.
class DriverMetrics {
  final DriverModel driver;
  final int score;     // 0-100
  final int speeding;  // events count
  final int braking;   // events count (proxy: stops)
  final int idleMin;   // idle minutes

  const DriverMetrics({
    required this.driver,
    required this.score,
    required this.speeding,
    required this.braking,
    required this.idleMin,
  });

  /// Fallback: deterministic hash when no report is available.
  factory DriverMetrics.fromHash(DriverModel driver) {
    final code = driver.id.codeUnits.fold(0, (int a, int b) => a + b);
    return DriverMetrics(
      driver: driver,
      score: 45 + (code % 55),
      speeding: code % 12,
      braking: code % 8,
      idleMin: 5 + (code % 55),
    );
  }

  /// Compute metrics from a real [ReportModel].
  ///
  /// Score starts at 100 and is penalised for:
  /// - `speeding` – 10 pts when max speed > 120 km/h
  /// - `braking`  – 1.5 pts per stop (harsh-event proxy, clamped at 30)
  /// - `idle`     – ~15 % of trip duration treated as idle; 5 pts per idle-hour
  ///
  /// Final score is clamped to [30, 100].
  factory DriverMetrics.fromReport(DriverModel driver, ReportModel report) {
    final speedingEvents = report.maxSpeed > 120 ? 1 : 0;
    final harshStops = report.stops.clamp(0, 30);
    final idleHours =
        ((report.duration / 3600.0) * 0.15).clamp(0.0, 3.0); // ~15 % idle
    final score = (100 -
            speedingEvents * 10 -
            harshStops * 1.5 -
            idleHours * 5)
        .clamp(30.0, 100.0)
        .round();

    return DriverMetrics(
      driver: driver,
      score: score,
      speeding: speedingEvents,
      braking: harshStops,
      idleMin: (idleHours * 60).round(),
    );
  }
}
