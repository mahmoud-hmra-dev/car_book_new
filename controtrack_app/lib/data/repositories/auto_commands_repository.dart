import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Local-storage repository for auto commands.
///
/// Auto commands are stored in [SharedPreferences] as JSON, keyed per geofence.
/// Each entry is a List<Map> serialised with `jsonEncode`.
///
/// Key format: `auto_commands_<geofenceId>`
///
/// When the backend eventually supports this feature the repository can be
/// swapped out or enriched with a remote datasource while keeping the same
/// interface.
class AutoCommandsRepository {
  static const _prefix = 'auto_commands_';

  // ── Read ───────────────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> getForGeofence(String geofenceId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_prefix$geofenceId');
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      }
    } catch (_) {}
    return const [];
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> create({
    required String geofenceId,
    required String commandType,
    required String trigger,
    bool onlyWhenStopped = false,
  }) async {
    final list = List<Map<String, dynamic>>.from(
      await getForGeofence(geofenceId),
    );

    final id = '${geofenceId}_${DateTime.now().millisecondsSinceEpoch}';
    final entry = <String, dynamic>{
      'id': id,
      '_id': id,
      'geofenceId': geofenceId,
      'commandType': commandType,
      'trigger': trigger,
      'onlyWhenStopped': onlyWhenStopped,
      'createdAt': DateTime.now().toIso8601String(),
    };

    list.add(entry);
    await _save(geofenceId, list);
    return entry;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  Future<void> delete({
    required String geofenceId,
    required String id,
  }) async {
    final list = List<Map<String, dynamic>>.from(
      await getForGeofence(geofenceId),
    );
    list.removeWhere(
      (e) => (e['_id'] ?? e['id'] ?? '').toString() == id,
    );
    await _save(geofenceId, list);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  Future<void> _save(
    String geofenceId,
    List<Map<String, dynamic>> list,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_prefix$geofenceId', jsonEncode(list));
  }
}
