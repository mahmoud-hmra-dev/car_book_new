import 'package:equatable/equatable.dart';

class MaintenanceModel extends Equatable {
  final String id;
  final String? carId;
  final String? carName;
  final String type;
  final String? period;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? notes;
  final double? cost;

  const MaintenanceModel({
    required this.id,
    this.carId,
    this.carName,
    required this.type,
    this.period,
    this.startDate,
    this.endDate,
    this.notes,
    this.cost,
  });

  factory MaintenanceModel.fromJson(Map<String, dynamic> json) {
    return MaintenanceModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      carId: json['carId']?.toString(),
      carName: json['carName']?.toString(),
      type: (json['type'] ?? 'service').toString(),
      period: json['period']?.toString(),
      startDate: json['startDate'] != null ? DateTime.tryParse(json['startDate'].toString()) : null,
      endDate: json['endDate'] != null ? DateTime.tryParse(json['endDate'].toString()) : null,
      notes: json['notes']?.toString(),
      cost: json['cost'] is num ? (json['cost'] as num).toDouble() : null,
    );
  }

  Map<String, dynamic> toJson() => {
        if (id.isNotEmpty) '_id': id,
        if (carId != null) 'carId': carId,
        'type': type,
        if (period != null) 'period': period,
        if (startDate != null) 'startDate': startDate!.toIso8601String(),
        if (endDate != null) 'endDate': endDate!.toIso8601String(),
        if (notes != null) 'notes': notes,
        if (cost != null) 'cost': cost,
      };

  @override
  List<Object?> get props => [id, carId, type, startDate, endDate];
}
