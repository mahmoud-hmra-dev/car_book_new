import 'package:equatable/equatable.dart';

class EventModel extends Equatable {
  final String id;
  final String type;
  final String? carId;
  final String? carName;
  final DateTime? eventTime;
  final double? latitude;
  final double? longitude;
  final String? address;
  final Map<String, dynamic> attributes;

  const EventModel({
    required this.id,
    required this.type,
    this.carId,
    this.carName,
    this.eventTime,
    this.latitude,
    this.longitude,
    this.address,
    this.attributes = const {},
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    double? toD(dynamic v) => v is num ? v.toDouble() : (v == null ? null : double.tryParse(v.toString()));
    return EventModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      type: (json['type'] ?? 'event').toString(),
      carId: json['carId']?.toString(),
      carName: json['carName']?.toString(),
      eventTime: json['eventTime'] != null ? DateTime.tryParse(json['eventTime'].toString()) : null,
      latitude: toD(json['latitude']),
      longitude: toD(json['longitude']),
      address: json['address']?.toString(),
      attributes: json['attributes'] is Map<String, dynamic>
          ? json['attributes'] as Map<String, dynamic>
          : const {},
    );
  }

  @override
  List<Object?> get props => [id, type, carId, eventTime];
}
