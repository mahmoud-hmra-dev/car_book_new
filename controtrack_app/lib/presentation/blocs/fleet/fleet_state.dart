import 'package:equatable/equatable.dart';
import '../../../data/models/fleet_item_model.dart';

enum FleetStatus { initial, loading, loaded, error, refreshing }

class FleetState extends Equatable {
  final FleetStatus status;
  final List<FleetItem> items;
  final HealthSummary summary;
  final String? errorMessage;
  final String? statusFilter; // null = all
  final String query;
  final DateTime? lastUpdated;
  final int unreadAlertsCount;

  const FleetState({
    this.status = FleetStatus.initial,
    this.items = const [],
    this.summary = const HealthSummary(),
    this.errorMessage,
    this.statusFilter,
    this.query = '',
    this.lastUpdated,
    this.unreadAlertsCount = 0,
  });

  List<FleetItem> get filtered {
    Iterable<FleetItem> it = items;
    if (statusFilter != null && statusFilter!.isNotEmpty) {
      it = it.where((e) => e.movementStatus == statusFilter);
    }
    if (query.trim().isNotEmpty) {
      final q = query.toLowerCase();
      it = it.where((e) =>
          e.carName.toLowerCase().contains(q) ||
          e.licensePlate.toLowerCase().contains(q) ||
          (e.address ?? '').toLowerCase().contains(q));
    }
    return it.toList();
  }

  FleetState copyWith({
    FleetStatus? status,
    List<FleetItem>? items,
    HealthSummary? summary,
    String? errorMessage,
    Object? statusFilter = _sentinel,
    String? query,
    DateTime? lastUpdated,
    int? unreadAlertsCount,
  }) =>
      FleetState(
        status: status ?? this.status,
        items: items ?? this.items,
        summary: summary ?? this.summary,
        errorMessage: errorMessage,
        statusFilter: identical(statusFilter, _sentinel) ? this.statusFilter : statusFilter as String?,
        query: query ?? this.query,
        lastUpdated: lastUpdated ?? this.lastUpdated,
        unreadAlertsCount: unreadAlertsCount ?? this.unreadAlertsCount,
      );

  @override
  List<Object?> get props => [
        status,
        items,
        summary,
        errorMessage,
        statusFilter,
        query,
        lastUpdated,
        unreadAlertsCount,
      ];
}

const _sentinel = Object();
