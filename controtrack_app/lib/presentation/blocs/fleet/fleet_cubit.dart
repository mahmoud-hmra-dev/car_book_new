import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../config/app_config.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../data/repositories/fleet_repository.dart';
import 'fleet_state.dart';

class FleetCubit extends Cubit<FleetState> {
  final FleetRepository _repo;
  Timer? _timer;

  /// Tracks per-car last-known `lastPositionAt` so we can detect new events
  /// between fetches. Null values mean we have not seen the car yet.
  final Map<String, DateTime?> _lastSeenByCar = {};

  FleetCubit(this._repo) : super(const FleetState());

  Future<void> load({bool refreshing = false}) async {
    if (!refreshing) {
      emit(state.copyWith(status: FleetStatus.loading, errorMessage: null));
    } else {
      emit(state.copyWith(status: FleetStatus.refreshing, errorMessage: null));
    }
    try {
      final items = await _repo.getFleet();
      final summary = HealthSummary.fromList(items);

      // Compute how many new events appeared since last check.
      final isFirstLoad = _lastSeenByCar.isEmpty;
      int newCount = 0;
      for (final it in items) {
        final prev = _lastSeenByCar[it.carId];
        final current = it.lastPositionAt;
        if (!_lastSeenByCar.containsKey(it.carId)) {
          // New car appearing — count it once (unless this is the very first load).
          if (!isFirstLoad) newCount += 1;
        } else if (current != null && prev != null && current.isAfter(prev)) {
          newCount += 1;
        } else if (current != null && prev == null) {
          newCount += 1;
        }
        _lastSeenByCar[it.carId] = current;
      }

      final unread = isFirstLoad
          ? state.unreadAlertsCount
          : state.unreadAlertsCount + newCount;

      emit(state.copyWith(
        status: FleetStatus.loaded,
        items: items,
        summary: summary,
        lastUpdated: DateTime.now(),
        unreadAlertsCount: unread,
      ));
    } catch (e) {
      emit(state.copyWith(status: FleetStatus.error, errorMessage: e.toString()));
    }
  }

  void startAutoRefresh() {
    _timer?.cancel();
    _timer = Timer.periodic(
      const Duration(milliseconds: AppConfig.trackingRefreshIntervalMs),
      (_) => load(refreshing: true),
    );
  }

  void stopAutoRefresh() {
    _timer?.cancel();
    _timer = null;
  }

  void setStatusFilter(String? status) {
    emit(state.copyWith(statusFilter: status));
  }

  void setQuery(String q) {
    emit(state.copyWith(query: q));
  }

  /// Clears the unread alert badge count. Call when the user opens the Alerts
  /// screen.
  void clearAlertsCount() {
    if (state.unreadAlertsCount == 0) return;
    emit(state.copyWith(unreadAlertsCount: 0));
  }

  @override
  Future<void> close() {
    _timer?.cancel();
    return super.close();
  }
}
