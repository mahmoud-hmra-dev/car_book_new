import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/theme/app_colors.dart';
import '../../../data/models/event_model.dart';
import '../../../data/repositories/fleet_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';

enum _AlertFilter { all, geofence, speed, maintenance, other }

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  late Future<List<EventModel>> _future;
  _AlertFilter _filter = _AlertFilter.all;
  final Set<String> _dismissed = <String>{};

  @override
  void initState() {
    super.initState();
    _future = _load();
    // Reset the unread alerts badge when the screen is opened.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<FleetCubit>().clearAlertsCount();
      }
    });
  }

  Future<List<EventModel>> _load() {
    final now = DateTime.now();
    final from = now.subtract(const Duration(days: 7));
    return context
        .read<FleetRepository>()
        .getEvents(from: from, to: now, limit: 100);
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _load();
      _dismissed.clear();
    });
    await _future;
  }

  _AlertFilter _categoryOf(EventModel e) {
    final t = e.type.toLowerCase();
    if (t.contains('geofence')) return _AlertFilter.geofence;
    if (t.contains('overspeed') || t.contains('speed')) return _AlertFilter.speed;
    if (t.contains('maintenance') || t.contains('service')) {
      return _AlertFilter.maintenance;
    }
    return _AlertFilter.other;
  }

  _Severity _severityOf(EventModel e) {
    final t = e.type.toLowerCase();
    if (t.contains('sos') ||
        t.contains('alarm') ||
        t.contains('crash') ||
        t.contains('panic')) {
      return _Severity.critical;
    }
    if (t.contains('overspeed') ||
        t.contains('geofence') ||
        t.contains('speed')) {
      return _Severity.warning;
    }
    return _Severity.info;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(context.tr('alerts_events')),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _refresh,
          ),
        ],
      ),
      body: FutureBuilder<List<EventModel>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return Column(
              children: [
                _FilterChipsBar(
                  current: _filter,
                  counts: const {},
                  onSelected: (f) => setState(() => _filter = f),
                ),
                const Expanded(child: ShimmerList()),
              ],
            );
          }
          if (snap.hasError) {
            return AppError(message: snap.error.toString(), onRetry: _refresh);
          }
          final all = (snap.data ?? [])
              .where((e) => !_dismissed.contains(e.id))
              .toList();

          final filtered = _filter == _AlertFilter.all
              ? all
              : all.where((e) => _categoryOf(e) == _filter).toList();

          // Build per-category counts for badge display
          final counts = <_AlertFilter, int>{
            _AlertFilter.all: all.length,
            _AlertFilter.geofence: all.where((e) => _categoryOf(e) == _AlertFilter.geofence).length,
            _AlertFilter.speed: all.where((e) => _categoryOf(e) == _AlertFilter.speed).length,
            _AlertFilter.maintenance: all.where((e) => _categoryOf(e) == _AlertFilter.maintenance).length,
            _AlertFilter.other: all.where((e) => _categoryOf(e) == _AlertFilter.other).length,
          };

          return Column(
            children: [
              _FilterChipsBar(
                current: _filter,
                counts: counts,
                onSelected: (f) => setState(() => _filter = f),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? RefreshIndicator(
                        color: AppColors.primary,
                        onRefresh: _refresh,
                        child: ListView(
                          children: [
                            SizedBox(
                              height: MediaQuery.of(context).size.height * 0.55,
                              child: EmptyState(
                                title: context.tr('no_alerts'),
                                subtitle: context.tr('no_alerts_subtitle'),
                                icon: Icons.notifications_none_rounded,
                              ),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: AppColors.primary,
                        onRefresh: _refresh,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (_, i) {
                            final e = filtered[i];
                            return Dismissible(
                              key: ValueKey('alert-${e.id}'),
                              direction: DismissDirection.endToStart,
                              background: Container(
                                alignment: Alignment.centerRight,
                                padding: const EdgeInsets.only(right: 20),
                                decoration: BoxDecoration(
                                  color: AppColors.error.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color:
                                        AppColors.error.withValues(alpha: 0.4),
                                  ),
                                ),
                                child: const Icon(
                                  Icons.delete_outline_rounded,
                                  color: AppColors.error,
                                ),
                              ),
                              onDismissed: (_) =>
                                  setState(() => _dismissed.add(e.id)),
                              child: _EventTile(
                                event: e,
                                category: _categoryOf(e),
                                severity: _severityOf(e),
                              )
                                  .animate()
                                  .fadeIn(
                                      duration: 280.ms, delay: (i * 30).ms)
                                  .slideY(begin: 0.1, end: 0),
                            );
                          },
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

enum _Severity { critical, warning, info }

extension on _Severity {
  Color get color {
    switch (this) {
      case _Severity.critical:
        return AppColors.error;
      case _Severity.warning:
        return AppColors.warning;
      case _Severity.info:
        return AppColors.secondary;
    }
  }

  String labelKey() {
    switch (this) {
      case _Severity.critical:
        return 'severity_critical';
      case _Severity.warning:
        return 'severity_warning';
      case _Severity.info:
        return 'severity_info';
    }
  }
}

class _FilterChipsBar extends StatelessWidget {
  final _AlertFilter current;
  final Map<_AlertFilter, int> counts;
  final ValueChanged<_AlertFilter> onSelected;
  const _FilterChipsBar({
    required this.current,
    required this.counts,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final filters = <(_AlertFilter, String, IconData)>[
      (_AlertFilter.all, context.tr('all'), Icons.all_inclusive_rounded),
      (_AlertFilter.geofence, context.tr('geofence'), Icons.layers_rounded),
      (_AlertFilter.speed, context.tr('speed'), Icons.speed_rounded),
      (_AlertFilter.maintenance, context.tr('maintenance'), Icons.build_rounded),
      (_AlertFilter.other, context.tr('other'), Icons.more_horiz_rounded),
    ];

    return SizedBox(
      height: 52,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final (f, label, icon) = filters[i];
          final selected = current == f;
          final count = counts[f];
          return Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => onSelected(f),
              borderRadius: BorderRadius.circular(12),
              child: AnimatedContainer(
                duration: 220.ms,
                padding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.primary.withValues(alpha: 0.18)
                      : context.cardColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: selected
                        ? AppColors.primary
                        : context.dividerColor,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      icon,
                      size: 14,
                      color: selected
                          ? AppColors.primary
                          : context.textSecondaryColor,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      label,
                      style: TextStyle(
                        color: selected
                            ? AppColors.primary
                            : context.textPrimaryColor,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (count != null && count > 0) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: selected
                              ? AppColors.primary
                              : context.dividerColor,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '$count',
                          style: TextStyle(
                            color: selected
                                ? Colors.black
                                : context.textMutedColor,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _EventTile extends StatelessWidget {
  final EventModel event;
  final _AlertFilter category;
  final _Severity severity;

  const _EventTile({
    required this.event,
    required this.category,
    required this.severity,
  });

  (IconData, Color) _iconForType(String t) {
    switch (t.toLowerCase()) {
      case 'ignitionon':
      case 'ignition_on':
        return (Icons.power_settings_new_rounded, AppColors.statusMoving);
      case 'ignitionoff':
      case 'ignition_off':
        return (Icons.power_off_outlined, AppColors.statusOffline);
      case 'overspeed':
      case 'speedlimit':
        return (Icons.speed_rounded, AppColors.statusStopped);
      case 'geofenceenter':
      case 'geofence_enter':
        return (Icons.login_rounded, AppColors.primary);
      case 'geofenceexit':
      case 'geofence_exit':
        return (Icons.logout_rounded, AppColors.warning);
      case 'devicemoving':
      case 'motion':
        return (Icons.navigation_rounded, AppColors.statusMoving);
      case 'devicestopped':
        return (Icons.stop_circle_outlined, AppColors.statusStopped);
      case 'deviceoffline':
        return (Icons.cloud_off_rounded, AppColors.statusOffline);
      case 'sos':
      case 'alarm':
        return (Icons.warning_rounded, AppColors.error);
      default:
        return (Icons.event_note_rounded, AppColors.secondary);
    }
  }

  @override
  Widget build(BuildContext context) {
    final (icon, color) = _iconForType(event.type);
    final sevColor = severity.color;

    return Container(
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            // Colored severity left border
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: sevColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(icon, color: color, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _prettyType(event.type),
                                  style: TextStyle(
                                    color: context.textPrimaryColor,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 6),
                              _SeverityBadge(severity: severity),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            event.carName ?? '—',
                            style: TextStyle(
                              color: context.textSecondaryColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (event.address != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              event.address!,
                              style: TextStyle(
                                color: context.textMutedColor,
                                fontSize: 11,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                          if (event.eventTime != null) ...[
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Icon(
                                  Icons.schedule_rounded,
                                  size: 12,
                                  color: context.textMutedColor,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  timeago.format(
                                    event.eventTime!,
                                    locale: context.isRtl
                                        ? 'ar'
                                        : 'en_short',
                                  ),
                                  style: TextStyle(
                                    color: context.textMutedColor,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _prettyType(String t) {
    return t
        .replaceAllMapped(RegExp('([A-Z])'), (m) => ' ${m[1]}')
        .replaceAll('_', ' ')
        .trim()
        .split(' ')
        .map((w) =>
            w.isEmpty ? w : w[0].toUpperCase() + w.substring(1).toLowerCase())
        .join(' ');
  }
}

class _SeverityBadge extends StatelessWidget {
  final _Severity severity;
  const _SeverityBadge({required this.severity});

  @override
  Widget build(BuildContext context) {
    final color = severity.color;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.45)),
      ),
      child: Text(
        context.tr(severity.labelKey()).toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 9,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}
