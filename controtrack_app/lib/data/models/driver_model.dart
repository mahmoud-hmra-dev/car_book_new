import 'package:equatable/equatable.dart';

class DriverModel extends Equatable {
  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String? licenseNumber;
  final String? licenseExpiry;
  final String? assignedCarId;
  final String? notes;

  const DriverModel({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.licenseNumber,
    this.licenseExpiry,
    this.assignedCarId,
    this.notes,
  });

  factory DriverModel.fromJson(Map<String, dynamic> json) {
    return DriverModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      phone: json['phone']?.toString(),
      email: json['email']?.toString(),
      licenseNumber: json['licenseNumber']?.toString(),
      licenseExpiry: json['licenseExpiry']?.toString(),
      assignedCarId: json['assignedCarId']?.toString(),
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        if (id.isNotEmpty) '_id': id,
        'name': name,
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
        if (licenseNumber != null) 'licenseNumber': licenseNumber,
        if (licenseExpiry != null) 'licenseExpiry': licenseExpiry,
        if (assignedCarId != null) 'assignedCarId': assignedCarId,
        if (notes != null) 'notes': notes,
      };

  @override
  List<Object?> get props => [id, name, phone, email, licenseNumber, assignedCarId];
}
