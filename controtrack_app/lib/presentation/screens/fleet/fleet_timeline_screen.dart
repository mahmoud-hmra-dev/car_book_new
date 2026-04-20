import 'dart:math';

import 'package:controtrack/core/theme/app_colors.dart';
import 'package:controtrack/data/repositories/tracking_repository.dart';
import 'package:controtrack/l10n/app_localizations.dart';
import 'package:controtrack/presentation/widgets/common/app_error.dart';
import 'package:controtrack/presentation/widgets/common/app_loading.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// Fleet Activity Timeline Screen.
///
/// Displays a unified, chronological activity feed across every vehicle in
/// the fleet, pulled from the live events-center API endpoint.
class FleetTimelineScreen extends StatefulWidget {
  const FleetTimelineScreen({super.key});

  @override
  State<FleetTimelineScreen> createState() => _FleetTimelineScreenState();
}

class _FleetTimelineScreenState extends State<FleetTimelineScreen>
    with TickerProviderStateMixin {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  late Future<List<_FleetEvent>> _future;
  _EventFilter _activeFilter = _EventFilter.all;
  late final AnimationController _livePulseController;

  @override
  void initState() {
    super.initState();
    _livePulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
    _future = _load();
  }

  @override
  void dispose() {
    _livePulseController.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  Future<List<_FleetEvent>> _load() async {
    final repo = context.read<TrackingRepository>();
    final raw = await repo.getEvents(limit: 100);
    return raw.map(_FleetEvent.fromJson).toList();
  }

  Future<void> _onRefresh() async {
    setState(() => _future = _load());
    await _future;
  }

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------
  List<_FleetEvent> _applyFilter(List<_FleetEvent> events) {
    if (_activeFilter == _EventFilter.all) return events;
    return events.where((e) {
      switch (_activeFilter) {
        case _EventFilter.all:
          return true;
        case _EventFilter.moving:
          return e.type == _EventType.moving || e.type == _EventType.speeding;
        case _EventFilter.stopped:
          return e.type == _EventType.stopped || e.type == _EventType.idle;
        case _EventFilter.alerts:
          return e.type == _EventType.alert || e.type == _EventType.speeding;
        case _EventFilter.geofence:
          return e.type == _EventType.geofenceEnter ||
              e.type == _EventType.geofenceExit;
        case _EventFilter.commands:
          return e.type == _EventType.command;
      }
    }).toList();
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        centerTitle: false,
        title: Text(
          context.tr('fleet_timeline'),
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.2,
          ),
        ),
        actions: [
          IconButton(
            tooltip: context.tr('filter'),
            icon: const Icon(Icons.tune_rounded),
            onPressed: _showFilterSheet,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: FutureBuilder<List<_FleetEvent>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const AppLoading();
          }
          if (snap.hasError) {
            return AppError(
              message: snap.error.toString(),
              onRetry: () => setState(() => _future = _load()),
            );
          }
          final events = _applyFilter(snap.data ?? []);
          return Stack(
            children: [
              Column(
                children: [
                  _buildFilterBar(),
                  Expanded(child: _buildTimeline(events)),
                ],
              ),
              Positioned(
                top: 8,
                right: 16,
                child: _buildLiveBadge(),
              ),
            ],
          );
        },
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Filter bar
  // ---------------------------------------------------------------------------
  Widget _buildFilterBar() {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _EventFilter.values.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final f = _EventFilter.values[i];
          final selected = _activeFilter == f;
          return _FilterChipTile(
            label: f.label(context),
            selected: selected,
            onTap: () => setState(() => _activeFilter = f),
          )
              .animate()
              .fadeIn(duration: 280.ms, delay: (40 * i).ms)
              .slideX(begin: 0.2, end: 0, curve: Curves.easeOutCubic);
        },
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Timeline body
  // ---------------------------------------------------------------------------
  Widget _buildTimeline(List<_FleetEvent> events) {
    if (events.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inbox_rounded,
                size: 56, color: context.textMutedColor),
            const SizedBox(height: 12),
            Text(
              context.tr('no_events_match'),
              style: TextStyle(color: context.textSecondaryColor, fontSize: 15),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: context.cardColor,
      onRefresh: _onRefresh,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        itemCount: events.length,
        itemBuilder: (context, index) {
          final ev = events[index];
          final isLast = index == events.length - 1;
          return _TimelineTile(event: ev, isLast: isLast)
              .animate()
              .fadeIn(duration: 320.ms, delay: (20 * min(index, 12)).ms)
              .slideX(
                  begin: 0.12,
                  end: 0,
                  curve: Curves.easeOutCubic,
                  duration: 320.ms);
        },
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Live badge (pulsing)
  // ---------------------------------------------------------------------------
  Widget _buildLiveBadge() {
    const colorMoving = Color(0xFF4CAF50);
    return AnimatedBuilder(
      animation: _livePulseController,
      builder: (context, child) {
        final t = _livePulseController.value;
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: context.cardColor.withValues(alpha: 0.85),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: colorMoving.withValues(alpha: 0.35 + 0.35 * t),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: colorMoving.withValues(alpha: 0.25 * t),
                blurRadius: 10 + 10 * t,
                spreadRadius: 1,
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: colorMoving,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: colorMoving.withValues(alpha: 0.6 * (1 - t)),
                      blurRadius: 8,
                      spreadRadius: 2 * t,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              const Text(
                'LIVE',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.4,
                ),
              ),
            ],
          ),
        );
      },
    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.5, end: 0);
  }

  // ---------------------------------------------------------------------------
  // Filter bottom sheet
  // ---------------------------------------------------------------------------
  void _showFilterSheet() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.cardColor,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr('filter_events'),
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _EventFilter.values.map((f) {
                    final selected = _activeFilter == f;
                    return _FilterChipTile(
                      label: f.label(context),
                      selected: selected,
                      onTap: () {
                        setState(() => _activeFilter = f);
                        Navigator.of(ctx).pop();
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        );
      },
    );
  }
}

// =============================================================================
// Timeline tile
// =============================================================================
class _TimelineTile extends StatelessWidget {
  const _TimelineTile({required this.event, required this.isLast});

  final _FleetEvent event;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final dotColor = event.type.color;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // --- Left rail: dot + vertical line ---
          SizedBox(
            width: 36,
            child: Column(
              children: [
                const SizedBox(height: 16),
                Container(
                  width: 14,
                  height: 14,
                  decoration: BoxDecoration(
                    color: dotColor,
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: Colors.white.withValues(alpha: 0.15), width: 2),
                    boxShadow: [
                      BoxShadow(
                          color: dotColor.withValues(alpha: 0.45),
                          blurRadius: 8,
                          spreadRadius: 1),
                    ],
                  ),
                ),
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    color: isLast
                        ? Colors.transparent
                        : Colors.white.withValues(alpha: 0.08),
                  ),
                ),
              ],
            ),
          ),

          // --- Right: card ---
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 14, left: 4),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: context.cardColor,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: dotColor.withValues(alpha: 0.15), width: 1),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.25),
                        blurRadius: 8,
                        offset: const Offset(0, 3)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Row 1: vehicle + timestamp
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                                color:
                                    AppColors.primary.withValues(alpha: 0.35),
                                width: 1),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.local_shipping_rounded,
                                  size: 13, color: AppColors.primary),
                              const SizedBox(width: 4),
                              Text(
                                event.vehicle,
                                style: const TextStyle(
                                    color: AppColors.primary,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        Text(
                          _relativeTime(event.timestamp),
                          style: TextStyle(
                              color: context.textMutedColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Row 2: event type icon + label
                    Row(
                      children: [
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: dotColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(event.type.icon,
                              color: dotColor, size: 18),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          event.type.label(context),
                          style: TextStyle(
                              color: dotColor,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.2),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Row 3: description
                    Text(
                      event.description,
                      style: TextStyle(
                          color: context.textPrimaryColor,
                          fontSize: 13.5,
                          height: 1.35,
                          fontWeight: FontWeight.w500),
                    ),
                    if (event.location.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      // Row 4: location
                      Row(
                        children: [
                          Icon(Icons.location_on_outlined,
                              size: 14, color: context.textMutedColor),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              event.location,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                  color: context.textSecondaryColor,
                                  fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Filter chip tile
// =============================================================================
class _FilterChipTile extends StatelessWidget {
  const _FilterChipTile({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          gradient: selected
              ? const LinearGradient(
                  colors: [AppColors.primary, AppColors.accent],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: selected ? null : context.cardColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? Colors.transparent
                : Colors.white.withValues(alpha: 0.08),
            width: 1,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.35),
                      blurRadius: 12,
                      offset: const Offset(0, 3)),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected
                ? Colors.white
                : context.textSecondaryColor,
            fontSize: 13,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            letterSpacing: 0.2,
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Relative timestamp helper
// =============================================================================
String _relativeTime(DateTime then) {
  final diff = DateTime.now().difference(then);
  if (diff.inSeconds < 30) return 'just now';
  if (diff.inMinutes < 1) return '${diff.inSeconds}s ago';
  if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays == 1) return 'yesterday';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  if (diff.inDays < 30) return '${(diff.inDays / 7).floor()}w ago';
  if (diff.inDays < 365) return '${(diff.inDays / 30).floor()}mo ago';
  return '${(diff.inDays / 365).floor()}y ago';
}

// =============================================================================
// Models / enums
// =============================================================================
class _FleetEvent {
  const _FleetEvent({
    required this.id,
    required this.vehicle,
    required this.type,
    required this.description,
    required this.location,
    required this.timestamp,
  });

  final String id;
  final String vehicle;
  final _EventType type;
  final String description;
  final String location;
  final DateTime timestamp;

  factory _FleetEvent.fromJson(Map<String, dynamic> j) {
    final typeStr = (j['type'] ?? j['eventType'] ?? '').toString().toLowerCase();
    final type = _eventTypeFromString(typeStr);

    final vehicle = j['deviceName'] ??
        j['vehicle'] ??
        j['carName'] ??
        j['car'] ??
        '';
    final description = j['description'] ??
        j['message'] ??
        j['attributes']?['message'] ??
        typeStr;
    final location = j['address'] ?? j['location'] ?? j['geofenceName'] ?? '';

    DateTime ts = DateTime.now();
    final rawTs = j['eventTime'] ?? j['timestamp'] ?? j['createdAt'];
    if (rawTs != null) {
      try {
        ts = DateTime.parse(rawTs.toString());
      } catch (_) {}
    }

    return _FleetEvent(
      id: (j['id'] ?? j['_id'] ?? '').toString(),
      vehicle: vehicle.toString(),
      type: type,
      description: description.toString(),
      location: location.toString(),
      timestamp: ts,
    );
  }
}

_EventType _eventTypeFromString(String s) {
  if (s.contains('speed')) return _EventType.speeding;
  if (s.contains('idle')) return _EventType.idle;
  if (s.contains('stop')) return _EventType.stopped;
  if (s.contains('move') || s.contains('moving')) return _EventType.moving;
  if (s.contains('geofenceEnter') || s.contains('geofence_enter')) {
    return _EventType.geofenceEnter;
  }
  if (s.contains('geofenceExit') || s.contains('geofence_exit')) {
    return _EventType.geofenceExit;
  }
  if (s.contains('command') || s.contains('immobilize') || s.contains('arm')) {
    return _EventType.command;
  }
  if (s.contains('alert') ||
      s.contains('alarm') ||
      s.contains('brake') ||
      s.contains('panic')) {
    return _EventType.alert;
  }
  return _EventType.alert;
}

enum _EventType {
  moving,
  stopped,
  alert,
  geofenceEnter,
  geofenceExit,
  command,
  speeding,
  idle,
}

extension _EventTypeMeta on _EventType {
  String label(BuildContext context) {
    switch (this) {
      case _EventType.moving:
        return context.tr('moving');
      case _EventType.stopped:
        return context.tr('stopped');
      case _EventType.alert:
        return context.tr('alert');
      case _EventType.geofenceEnter:
        return context.tr('geofence_enter');
      case _EventType.geofenceExit:
        return context.tr('geofence_exit');
      case _EventType.command:
        return context.tr('command');
      case _EventType.speeding:
        return context.tr('speeding');
      case _EventType.idle:
        return context.tr('idle');
    }
  }

  IconData get icon {
    switch (this) {
      case _EventType.moving:
        return Icons.directions_car_filled_rounded;
      case _EventType.stopped:
        return Icons.stop_circle_outlined;
      case _EventType.alert:
        return Icons.warning_amber_rounded;
      case _EventType.geofenceEnter:
        return Icons.login_rounded;
      case _EventType.geofenceExit:
        return Icons.logout_rounded;
      case _EventType.command:
        return Icons.settings_remote_rounded;
      case _EventType.speeding:
        return Icons.speed_rounded;
      case _EventType.idle:
        return Icons.hourglass_bottom_rounded;
    }
  }

  Color get color {
    switch (this) {
      case _EventType.moving:
        return const Color(0xFF4CAF50);
      case _EventType.stopped:
        return const Color(0xFFFF9800);
      case _EventType.alert:
        return AppColors.error;
      case _EventType.geofenceEnter:
        return AppColors.primary;
      case _EventType.geofenceExit:
        return AppColors.accent;
      case _EventType.command:
        return AppColors.secondary;
      case _EventType.speeding:
        return AppColors.error;
      case _EventType.idle:
        return AppColors.warning;
    }
  }
}

enum _EventFilter { all, moving, stopped, alerts, geofence, commands }

extension _EventFilterMeta on _EventFilter {
  String label(BuildContext context) {
    switch (this) {
      case _EventFilter.all:
        return context.tr('all');
      case _EventFilter.moving:
        return context.tr('moving');
      case _EventFilter.stopped:
        return context.tr('stopped');
      case _EventFilter.alerts:
        return context.tr('alerts');
      case _EventFilter.geofence:
        return context.tr('geofence');
      case _EventFilter.commands:
        return context.tr('commands');
    }
  }
}
