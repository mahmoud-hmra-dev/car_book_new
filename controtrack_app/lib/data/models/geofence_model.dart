import 'package:equatable/equatable.dart';

class GeofenceModel extends Equatable {
  final String id;
  final String name;
  final String? description;
  final String area; // WKT format e.g. CIRCLE (lat lon, radius)
  final List<String> linkedCarIds;
  final double? centerLat;
  final double? centerLng;
  final double? radius;

  const GeofenceModel({
    required this.id,
    required this.name,
    this.description,
    required this.area,
    this.linkedCarIds = const [],
    this.centerLat,
    this.centerLng,
    this.radius,
  });

  factory GeofenceModel.fromJson(Map<String, dynamic> json) {
    final area = (json['area'] ?? '').toString();
    final parsed = _parseCircleWKT(area);
    return GeofenceModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: json['description']?.toString(),
      area: area,
      linkedCarIds: json['linkedCarIds'] is List
          ? (json['linkedCarIds'] as List).map((e) => e.toString()).toList()
          : const [],
      centerLat: parsed?.$1,
      centerLng: parsed?.$2,
      radius: parsed?.$3,
    );
  }

  /// parse `CIRCLE (lat lon, radius)`
  static (double, double, double)? _parseCircleWKT(String wkt) {
    try {
      final match = RegExp(r'CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([-\d.]+)\s*\)',
              caseSensitive: false)
          .firstMatch(wkt);
      if (match == null) return null;
      final lat = double.parse(match.group(1)!);
      final lng = double.parse(match.group(2)!);
      final radius = double.parse(match.group(3)!);
      return (lat, lng, radius);
    } catch (_) {
      return null;
    }
  }

  static String toCircleWKT(double lat, double lng, double radius) =>
      'CIRCLE ($lat $lng, $radius)';

  @override
  List<Object?> get props => [id, name, description, area, linkedCarIds];
}
