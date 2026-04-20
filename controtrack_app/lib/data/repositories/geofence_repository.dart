import '../../core/constants/api_constants.dart';
import '../../core/network/dio_client.dart';
import '../models/geofence_model.dart';

class GeofenceRepository {
  final DioClient _client;
  GeofenceRepository(this._client);

  Future<List<GeofenceModel>> getAll() async {
    final resp = await _client.get(ApiConstants.geofences);
    final list = _extract(resp.data);
    return list
        .whereType<Map>()
        .map((e) => GeofenceModel.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<List<GeofenceModel>> getForCar(String carId) async {
    final resp = await _client.get(ApiConstants.geofencesForCar(carId));
    final list = _extract(resp.data);
    return list
        .whereType<Map>()
        .map((e) => GeofenceModel.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<GeofenceModel> create({
    required String name,
    required String area,
    String? description,
  }) async {
    final resp = await _client.post(ApiConstants.geofences, data: {
      'name': name,
      'area': area,
      if (description != null) 'description': description,
    });
    return GeofenceModel.fromJson(Map<String, dynamic>.from(resp.data as Map));
  }

  Future<void> update(String id, Map<String, dynamic> body) async {
    await _client.put(ApiConstants.geofenceEntity(id), data: body);
  }

  Future<void> delete(String id) async {
    await _client.delete(ApiConstants.geofenceEntity(id));
  }

  Future<void> link(String carId, String id) async {
    await _client.post(ApiConstants.geofenceLink(carId, id));
  }

  Future<void> unlink(String carId, String id) async {
    await _client.post(ApiConstants.geofenceUnlink(carId, id));
  }

  List<dynamic> _extract(dynamic data) {
    if (data is List) return data;
    if (data is Map<String, dynamic>) {
      for (final k in ['data', 'items', 'results', 'geofences']) {
        if (data[k] is List) return data[k] as List;
      }
    }
    return const [];
  }
}
