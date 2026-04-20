import 'package:equatable/equatable.dart';

class PositionAttributes extends Equatable {
  final bool? ignition;
  final double? batteryLevel;
  final double? totalDistance;
  final double? odometer;
  final double? fuel;
  final Map<String, dynamic> raw;

  const PositionAttributes({
    this.ignition,
    this.batteryLevel,
    this.totalDistance,
    this.odometer,
    this.fuel,
    this.raw = const {},
  });

  factory PositionAttributes.fromJson(Map<String, dynamic> json) {
    return PositionAttributes(
      ignition: json['ignition'] is bool ? json['ignition'] as bool : null,
      batteryLevel: _toDouble(json['batteryLevel']),
      totalDistance: _toDouble(json['totalDistance']),
      odometer: _toDouble(json['odometer']),
      fuel: _toDouble(json['fuel']),
      raw: json,
    );
  }

  static double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }

  @override
  List<Object?> get props => [ignition, batteryLevel, totalDistance, odometer, fuel];
}

class PositionModel extends Equatable {
  final double latitude;
  final double longitude;
  final double speed; // in knots
  final double course;
  final double? altitude;
  final DateTime? deviceTime;
  final DateTime? fixTime;
  final DateTime? serverTime;
  final String? address;
  final PositionAttributes attributes;

  const PositionModel({
    required this.latitude,
    required this.longitude,
    this.speed = 0,
    this.course = 0,
    this.altitude,
    this.deviceTime,
    this.fixTime,
    this.serverTime,
    this.address,
    this.attributes = const PositionAttributes(),
  });

  factory PositionModel.fromJson(Map<String, dynamic> json) {
    return PositionModel(
      latitude: _toDouble(json['latitude']) ?? 0,
      longitude: _toDouble(json['longitude']) ?? 0,
      speed: _toDouble(json['speed']) ?? 0,
      course: _toDouble(json['course']) ?? 0,
      altitude: _toDouble(json['altitude']),
      deviceTime: _parseDate(json['deviceTime']),
      fixTime: _parseDate(json['fixTime']),
      serverTime: _parseDate(json['serverTime']),
      address: json['address']?.toString(),
      attributes: json['attributes'] is Map<String, dynamic>
          ? PositionAttributes.fromJson(json['attributes'] as Map<String, dynamic>)
          : const PositionAttributes(),
    );
  }

  double get speedKmh => speed * 1.852;
  double get speedMph => speed * 1.15078;

  static double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }

  static DateTime? _parseDate(dynamic v) {
    if (v == null) return null;
    if (v is DateTime) return v;
    return DateTime.tryParse(v.toString());
  }

  @override
  List<Object?> get props => [latitude, longitude, speed, course, deviceTime, fixTime];
}
