import '../../core/constants/api_constants.dart';
import '../../core/network/dio_client.dart';
import '../models/driver_model.dart';
import '../models/maintenance_model.dart';
import '../models/report_model.dart';

class TrackingRepository {
  final DioClient _client;
  TrackingRepository(this._client);

  // Drivers
  Future<List<DriverModel>> getDrivers() async {
    final resp = await _client.get(ApiConstants.drivers);
    final list = _extract(resp.data);
    return list
        .whereType<Map>()
        .map((e) => DriverModel.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<DriverModel> createDriver(DriverModel driver) async {
    final resp = await _client.post(ApiConstants.drivers, data: driver.toJson());
    return DriverModel.fromJson(Map<String, dynamic>.from(resp.data as Map));
  }

  Future<void> updateDriver(String id, DriverModel driver) async {
    await _client.put(ApiConstants.driver(id), data: driver.toJson());
  }

  Future<void> deleteDriver(String id) async {
    await _client.delete(ApiConstants.driver(id));
  }

  // Maintenance
  Future<List<MaintenanceModel>> getMaintenance() async {
    final resp = await _client.get(ApiConstants.maintenance);
    final list = _extract(resp.data);
    return list
        .whereType<Map>()
        .map((e) => MaintenanceModel.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<MaintenanceModel> createMaintenance(MaintenanceModel m) async {
    final resp = await _client.post(ApiConstants.maintenance, data: m.toJson());
    return MaintenanceModel.fromJson(Map<String, dynamic>.from(resp.data as Map));
  }

  Future<void> updateMaintenance(String id, MaintenanceModel m) async {
    await _client.put(ApiConstants.maintenanceItem(id), data: m.toJson());
  }

  Future<void> deleteMaintenance(String id) async {
    await _client.delete(ApiConstants.maintenanceItem(id));
  }

  // Reports
  Future<ReportModel> getReport(String carId, DateTime from, DateTime to) async {
    final resp = await _client.get(
      ApiConstants.reports(carId),
      queryParameters: {
        'from': from.toUtc().toIso8601String(),
        'to': to.toUtc().toIso8601String(),
      },
    );
    final data = resp.data;
    if (data is Map<String, dynamic>) return ReportModel.fromJson(data);
    return const ReportModel();
  }

  // Notifications
  Future<List<Map<String, dynamic>>> getNotifications() async {
    final resp = await _client.get(ApiConstants.notifications);
    final list = _extract(resp.data);
    return list.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<void> createNotification(Map<String, dynamic> body) async {
    await _client.post(ApiConstants.notifications, data: body);
  }

  Future<void> updateNotification(String id, Map<String, dynamic> body) async {
    await _client.put(ApiConstants.notification(id), data: body);
  }

  Future<void> deleteNotification(String id) async {
    await _client.delete(ApiConstants.notification(id));
  }

  // Alert Rules
  Future<List<Map<String, dynamic>>> getAlertRules() async {
    final resp = await _client.get(ApiConstants.alertRules);
    final list = _extract(resp.data);
    return list.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<Map<String, dynamic>> createAlertRule(Map<String, dynamic> body) async {
    final resp = await _client.post(ApiConstants.alertRules, data: body);
    return Map<String, dynamic>.from(resp.data as Map);
  }

  Future<Map<String, dynamic>> updateAlertRule(String id, Map<String, dynamic> body) async {
    final resp = await _client.put(ApiConstants.alertRule(id), data: body);
    return Map<String, dynamic>.from(resp.data as Map);
  }

  Future<void> deleteAlertRule(String id) async {
    await _client.delete(ApiConstants.alertRule(id));
  }

  // Events Center
  Future<List<Map<String, dynamic>>> getEvents({int? limit}) async {
    final resp = await _client.get(
      ApiConstants.eventsCenter,
      queryParameters: limit != null ? {'limit': limit} : null,
    );
    final list = _extract(resp.data);
    return list.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  List<dynamic> _extract(dynamic data) {
    if (data is List) return data;
    if (data is Map<String, dynamic>) {
      for (final k in ['data', 'items', 'results', 'drivers', 'maintenance', 'notifications']) {
        if (data[k] is List) return data[k] as List;
      }
    }
    return const [];
  }
}
