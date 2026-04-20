import 'package:equatable/equatable.dart';

class ReportModel extends Equatable {
  final double distance; // km
  final int duration; // seconds
  final double maxSpeed;
  final double avgSpeed;
  final int stops;
  final DateTime? from;
  final DateTime? to;
  final List<Map<String, dynamic>> trips;

  const ReportModel({
    this.distance = 0,
    this.duration = 0,
    this.maxSpeed = 0,
    this.avgSpeed = 0,
    this.stops = 0,
    this.from,
    this.to,
    this.trips = const [],
  });

  factory ReportModel.fromJson(Map<String, dynamic> json) {
    double toD(dynamic v) => v is num ? v.toDouble() : (v == null ? 0 : double.tryParse(v.toString()) ?? 0);
    int toI(dynamic v) => v is num ? v.toInt() : (v == null ? 0 : int.tryParse(v.toString()) ?? 0);

    return ReportModel(
      distance: toD(json['distance']),
      duration: toI(json['duration']),
      maxSpeed: toD(json['maxSpeed']),
      avgSpeed: toD(json['avgSpeed']),
      stops: toI(json['stops']),
      from: json['from'] != null ? DateTime.tryParse(json['from'].toString()) : null,
      to: json['to'] != null ? DateTime.tryParse(json['to'].toString()) : null,
      trips: json['trips'] is List
          ? List<Map<String, dynamic>>.from(
              (json['trips'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)))
          : const [],
    );
  }

  @override
  List<Object?> get props => [distance, duration, maxSpeed, avgSpeed, stops, from, to];
}
