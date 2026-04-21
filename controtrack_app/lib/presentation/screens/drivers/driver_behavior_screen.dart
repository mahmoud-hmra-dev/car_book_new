import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';

class DriverBehaviorScreen extends StatefulWidget {
  final String driverId;
  final String driverName;
  const DriverBehaviorScreen({
    super.key,
    required this.driverId,
    required this.driverName,
  });

  @override
  State<DriverBehaviorScreen> createState() => _DriverBehaviorScreenState();
}

enum _Range { today, week, month }

class _DriverBehaviorScreenState extends State<DriverBehaviorScreen> {
  _Range _range = _Range.week;
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  (DateTime, DateTime) _bounds() {
    final now = DateTime.now();
    switch (_range) {
      case _Range.today:
        return (DateTime(now.year, now.month, now.day), now);
      case _Range.week:
        return (now.subtract(const Duration(days: 7)), now);
      case _Range.month:
        return (now.subtract(const Duration(days: 30)), now);
    }
  }

  Future<List<Map<String, dynamic>>> _load() async {
    final client = context.read<DioClient>();
    final b = _bounds();
    final resp = await client.get(
      '/api/tracking/events',
      queryParameters: {
        'driverId': widget.driverId,
        'from': b.$1.toUtc().toIso8601String(),
        'to': b.$2.toUtc().toIso8601String(),
      },
    );
    final data = resp.data;
    List<dynamic> list = const [];
    if (data is List) {
      list = data;
    } else if (data is Map<String, dynamic>) {
      for (final k in ['data', 'items', 'results', 'events']) {
        if (data[k] is List) {
          list = data[k] as List;
          break;
        }
      }
    }
    return list
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  void _selectRange(_Range r) {
    if (r == _range) return;
    setState(() {
      _range = r;
      _future = _load();
    });
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  int _calculateScore(List<Map<String, dynamic>> events) {
    int score = 100;
    for (final e in events) {
      final type = (e['type'] ?? '').toString().toLowerCase();
      if (type.contains('hardbraking') || type.contains('hard_braking')) {
        score -= 10;
      } else if (type.contains('hardacceleration') ||
          type.contains('hard_acceleration')) {
        score -= 8;
      } else if (type.contains('hardcornering') ||
          type.contains('hard_cornering')) {
        score -= 5;
      } else if (type.contains('overspeed')) {
        score -= 3;
      } else if (type.contains('idling')) {
        score -= 2;
      }
    }
    return score.clamp(0, 100);
  }

  Color _colorForScore(int score) {
    if (score >= 80) return AppColors.success;
    if (score >= 60) return const Color(0xFFFFD54F);
    if (score >= 40) return AppColors.warning;
    return AppColors.error;
  }

  Map<String, int> _countByType(List<Map<String, dynamic>> events) {
    final out = <String, int>{
      'hardBraking': 0,
      'hardAcceleration': 0,
      'hardCornering': 0,
      'overspeed': 0,
      'idling': 0,
    };
    for (final e in events) {
      final type = (e['type'] ?? '').toString().toLowerCase();
      if (type.contains('hardbraking') || type.contains('hard_braking')) {
        out['hardBraking'] = out['hardBraking']! + 1;
      } else if (type.contains('hardacceleration') ||
          type.contains('hard_acceleration')) {
        out['hardAcceleration'] = out['hardAcceleration']! + 1;
      } else if (type.contains('hardcornering') ||
          type.contains('hard_cornering')) {
        out['hardCornering'] = out['hardCornering']! + 1;
      } else if (type.contains('overspeed')) {
        out['overspeed'] = out['overspeed']! + 1;
      } else if (type.contains('idling')) {
        out['idling'] = out['idling']! + 1;
      }
    }
    return out;
  }

  DateTime? _timeOf(Map<String, dynamic> e) {
    final v = e['eventTime'] ?? e['serverTime'] ?? e['deviceTime'] ?? e['time'];
    if (v == null) return null;
    if (v is DateTime) return v;
    return DateTime.tryParse(v.toString());
  }

  IconData _iconForType(String type) {
    final t = type.toLowerCase();
    if (t.contains('hardbraking') || t.contains('hard_braking')) {
      return Icons.do_not_step_rounded;
    }
    if (t.contains('hardacceleration') || t.contains('hard_acceleration')) {
      return Icons.rocket_launch_rounded;
    }
    if (t.contains('hardcornering') || t.contains('hard_cornering')) {
      return Icons.turn_sharp_right_rounded;
    }
    if (t.contains('overspeed')) return Icons.speed_rounded;
    if (t.contains('idling')) return Icons.hourglass_bottom_rounded;
    return Icons.event_rounded;
  }

  Color _iconColor(String type) {
    final t = type.toLowerCase();
    if (t.contains('hardbraking') || t.contains('hard_braking')) {
      return AppColors.error;
    }
    if (t.contains('hardacceleration') || t.contains('hard_acceleration')) {
      return AppColors.warning;
    }
    if (t.contains('hardcornering') || t.contains('hard_cornering')) {
      return AppColors.accent;
    }
    if (t.contains('overspeed')) return AppColors.error;
    if (t.contains('idling')) return AppColors.statusIdle;
    return AppColors.secondary;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.driverName),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: _RangeSelector(
              current: _range,
              onSelected: _selectRange,
            ),
          ),
          Expanded(
            child: FutureBuilder<List<Map<String, dynamic>>>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const AppLoading();
                }
                if (snap.hasError) {
                  return AppError(
                    message: snap.error.toString(),
                    onRetry: _refresh,
                  );
                }
                final events = snap.data ?? const [];
                final score = _calculateScore(events);
                final color = _colorForScore(score);
                final counts = _countByType(events);

                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: _refresh,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    children: [
                      const SizedBox(height: 8),
                      Center(
                        child: Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: color.withValues(alpha: 0.15),
                            border: Border.all(color: color, width: 4),
                          ),
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  '$score',
                                  style: TextStyle(
                                    color: color,
                                    fontSize: 34,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                Text(
                                  '/ 100',
                                  style: TextStyle(
                                    color: color,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Center(
                        child: Text(
                          context.tr('behavior_score'),
                          style: TextStyle(
                            color: context.textSecondaryColor,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      _EventCountsRow(counts: counts),
                      const SizedBox(height: 20),
                      if (events.isEmpty)
                        EmptyState(
                          title: context.tr('no_data'),
                          icon: Icons.event_busy_rounded,
                        )
                      else
                        ...events.map((e) {
                          final type = (e['type'] ?? '').toString();
                          final t = _timeOf(e);
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: _EventTile(
                              icon: _iconForType(type),
                              color: _iconColor(type),
                              type: type.isEmpty ? 'event' : type,
                              time: t,
                            ),
                          );
                        }),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _RangeSelector extends StatelessWidget {
  final _Range current;
  final ValueChanged<_Range> onSelected;
  const _RangeSelector({required this.current, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          for (final r in _Range.values)
            Expanded(
              child: InkWell(
                onTap: () => onSelected(r),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: current == r
                        ? AppColors.primary.withValues(alpha: 0.18)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: current == r
                          ? AppColors.primary
                          : Colors.transparent,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      _label(context, r),
                      style: TextStyle(
                        color: current == r
                            ? AppColors.primary
                            : context.textSecondaryColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _label(BuildContext context, _Range r) {
    switch (r) {
      case _Range.today:
        return context.tr('today');
      case _Range.week:
        return context.tr('this_week');
      case _Range.month:
        return context.tr('this_month');
    }
  }
}

class _EventCountsRow extends StatelessWidget {
  final Map<String, int> counts;
  const _EventCountsRow({required this.counts});

  @override
  Widget build(BuildContext context) {
    final items = [
      ('hardBraking', Icons.do_not_step_rounded, AppColors.error, 'Brake'),
      ('hardAcceleration', Icons.rocket_launch_rounded, AppColors.warning, 'Accel'),
      ('hardCornering', Icons.turn_sharp_right_rounded, AppColors.accent, 'Corner'),
      ('overspeed', Icons.speed_rounded, AppColors.error, 'Speed'),
      ('idling', Icons.hourglass_bottom_rounded, AppColors.statusIdle, 'Idle'),
    ];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          for (final it in items)
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(it.$2, color: it.$3, size: 18),
                  const SizedBox(height: 4),
                  Text(
                    '${counts[it.$1] ?? 0}',
                    style: TextStyle(
                      color: context.textPrimaryColor,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    it.$4,
                    style: TextStyle(color: context.textMutedColor, fontSize: 10),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _EventTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String type;
  final DateTime? time;

  const _EventTile({
    required this.icon,
    required this.color,
    required this.type,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  type,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (time != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    DateFormat('MMM d, HH:mm').format(time!),
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
