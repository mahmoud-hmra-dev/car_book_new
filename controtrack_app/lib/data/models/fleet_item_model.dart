import 'package:equatable/equatable.dart';
import 'position_model.dart';

class FleetItem extends Equatable {
  final String carId;
  final String carName;
  final String licensePlate;
  final String? image;
  final PositionModel? position;
  final String movementStatus;
  final double speedKmh;
  final bool? ignition;
  final double? batteryLevel;
  final String? address;
  final DateTime? lastPositionAt;
  final String? deviceId;
  final String? supplierName;

  const FleetItem({
    required this.carId,
    required this.carName,
    required this.licensePlate,
    this.image,
    this.position,
    this.movementStatus = 'offline',
    this.speedKmh = 0,
    this.ignition,
    this.batteryLevel,
    this.address,
    this.lastPositionAt,
    this.deviceId,
    this.supplierName,
  });

  factory FleetItem.fromJson(Map<String, dynamic> json) {
    final carRaw = json['car'] ?? json;
    final carId = (json['carId'] ?? carRaw['_id'] ?? carRaw['id'] ?? '').toString();
    final carName = (json['carName'] ?? carRaw['name'] ?? '').toString();
    final plate = (json['licensePlate'] ?? json['plateNumber'] ?? carRaw['plateNumber'] ?? '').toString();

    final posRaw = json['position'];
    final position = posRaw is Map<String, dynamic> ? PositionModel.fromJson(posRaw) : null;

    double speedKmh = 0;
    bool? ignition;
    double? battery;
    DateTime? lastPosAt;

    if (position != null) {
      speedKmh = position.speedKmh;
      ignition = position.attributes.ignition;
      battery = position.attributes.batteryLevel;
      lastPosAt = position.fixTime ?? position.deviceTime ?? position.serverTime;
    }

    return FleetItem(
      carId: carId,
      carName: carName,
      licensePlate: plate,
      image: json['image']?.toString() ?? carRaw['image']?.toString(),
      position: position,
      movementStatus: (json['movementStatus'] ?? 'offline').toString().toLowerCase(),
      speedKmh: (json['speedKmh'] is num)
          ? (json['speedKmh'] as num).toDouble()
          : speedKmh,
      ignition: json['ignition'] is bool ? json['ignition'] as bool : ignition,
      batteryLevel: (json['batteryLevel'] is num)
          ? (json['batteryLevel'] as num).toDouble()
          : battery,
      address: json['address']?.toString() ?? position?.address,
      lastPositionAt: _parseDate(json['lastPositionAt']) ?? lastPosAt,
      deviceId: json['deviceId']?.toString(),
      supplierName: json['supplierName']?.toString(),
    );
  }

  static DateTime? _parseDate(dynamic v) {
    if (v == null) return null;
    if (v is DateTime) return v;
    return DateTime.tryParse(v.toString());
  }

  @override
  List<Object?> get props =>
      [carId, carName, licensePlate, movementStatus, speedKmh, ignition, batteryLevel, lastPositionAt];
}

class HealthSummary extends Equatable {
  final int total;
  final int moving;
  final int idle;
  final int stopped;
  final int offline;
  final int stale;
  final int noGps;
  final int unlinked;

  const HealthSummary({
    this.total = 0,
    this.moving = 0,
    this.idle = 0,
    this.stopped = 0,
    this.offline = 0,
    this.stale = 0,
    this.noGps = 0,
    this.unlinked = 0,
  });

  factory HealthSummary.fromList(List<FleetItem> items) {
    int moving = 0, idle = 0, stopped = 0, offline = 0, stale = 0, noGps = 0, unlinked = 0;
    for (final it in items) {
      switch (it.movementStatus) {
        case 'moving':
          moving++;
          break;
        case 'idle':
          idle++;
          break;
        case 'stopped':
          stopped++;
          break;
        case 'offline':
          offline++;
          break;
        case 'stale':
          stale++;
          break;
        case 'nogps':
        case 'no_gps':
          noGps++;
          break;
        case 'unlinked':
          unlinked++;
          break;
      }
    }
    return HealthSummary(
      total: items.length,
      moving: moving,
      idle: idle,
      stopped: stopped,
      offline: offline,
      stale: stale,
      noGps: noGps,
      unlinked: unlinked,
    );
  }

  @override
  List<Object?> get props => [total, moving, idle, stopped, offline, stale, noGps, unlinked];
}
