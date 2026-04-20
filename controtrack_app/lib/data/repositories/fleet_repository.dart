import '../../core/constants/api_constants.dart';
import '../../core/network/dio_client.dart';
import '../models/fleet_item_model.dart';
import '../models/position_model.dart';
import '../models/event_model.dart';

class FleetRepository {
  final DioClient _client;
  FleetRepository(this._client);

  Future<List<FleetItem>> getFleet() async {
    final resp = await _client.get(ApiConstants.fleet);
    final data = resp.data;
    final list = _extractList(data);
    return list
        .whereType<Map>()
        .map((e) => FleetItem.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<PositionModel?> getPosition(String carId) async {
    final resp = await _client.get(ApiConstants.positions(carId));
    final data = resp.data;
    if (data is Map<String, dynamic>) {
      return PositionModel.fromJson(data);
    }
    if (data is List && data.isNotEmpty && data.first is Map) {
      return PositionModel.fromJson(Map<String, dynamic>.from(data.first as Map));
    }
    return null;
  }

  Future<List<PositionModel>> getRoute(String carId, DateTime from, DateTime to) async {
    final resp = await _client.get(
      ApiConstants.route(carId),
      queryParameters: {
        'from': from.toUtc().toIso8601String(),
        'to': to.toUtc().toIso8601String(),
      },
    );
    final list = _extractList(resp.data);
    return list
        .whereType<Map>()
        .map((e) => PositionModel.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<List<EventModel>> getEvents({
    String? carId,
    DateTime? from,
    DateTime? to,
    int limit = 50,
  }) async {
    final resp = await _client.get(
      ApiConstants.eventsCenter,
      queryParameters: {
        if (carId != null) 'carId': carId,
        if (from != null) 'from': from.toUtc().toIso8601String(),
        if (to != null) 'to': to.toUtc().toIso8601String(),
        'limit': limit,
      },
    );
    final list = _extractList(resp.data);
    return list
        .whereType<Map>()
        .map((e) => EventModel.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getStatistics({DateTime? from, DateTime? to}) async {
    final resp = await _client.get(
      ApiConstants.statistics,
      queryParameters: {
        if (from != null) 'from': from.toUtc().toIso8601String(),
        if (to != null) 'to': to.toUtc().toIso8601String(),
      },
    );
    if (resp.data is Map<String, dynamic>) return resp.data as Map<String, dynamic>;
    return {};
  }

  Future<List<Map<String, dynamic>>> getCommandTypes(String carId) async {
    final resp = await _client.get(ApiConstants.commandTypes(carId));
    final list = _extractList(resp.data);
    return list.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<void> sendCommand(String carId, Map<String, dynamic> payload) async {
    await _client.post(ApiConstants.sendCommand(carId), data: payload);
  }

  List<dynamic> _extractList(dynamic data) {
    if (data is List) return data;
    if (data is Map<String, dynamic>) {
      for (final k in ['data', 'items', 'results', 'fleet', 'events', 'positions']) {
        if (data[k] is List) return data[k] as List;
      }
    }
    return const [];
  }
}
