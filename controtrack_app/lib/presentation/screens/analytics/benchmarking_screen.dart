import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../blocs/fleet/fleet_state.dart';

enum _BenchMetric { speed, distance, idleTime, onlineTime }

enum _BenchPeriod { today, week, month }

class BenchmarkingScreen extends StatefulWidget {
  const BenchmarkingScreen({super.key});

  @override
  State<BenchmarkingScreen> createState() => _BenchmarkingScreenState();
}

class _BenchmarkingScreenState extends State<BenchmarkingScreen> {
  _BenchMetric _metric = _BenchMetric.speed;
  _BenchPeriod _period = _BenchPeriod.today;
  String? _vehicleAId;
  String? _vehicleBId;

  // Compute a synthetic "metric value" for each vehicle from what we have in
  // memory. Real historical totals would require backend aggregation; this
  // gives a consistent ranking from current state data.
  double _metricValue(FleetItem item, _BenchMetric metric) {
    switch (metric) {
      case _BenchMetric.speed:
        return item.speedKmh;
      case _BenchMetric.distance:
        final total = item.position?.attributes.totalDistance;
        if (total != null && total > 0) return total / 1000.0; // km
        // Fallback estimate: speed proxy (km that would be covered in 1h).
        return item.speedKmh;
      case _BenchMetric.idleTime:
        // Lower is better; we still return a positive number so the bar shows
        // relative idleness. Minutes since last move.
        if (item.movementStatus != 'idle') return 0;
        final last = item.lastPositionAt;
        if (last == null) return 0;
        return DateTime.now().difference(last).inMinutes.toDouble();
      case _BenchMetric.onlineTime:
        // % heuristic from movement state: moving/idle = online, else offline.
        final online = item.movementStatus == 'moving' ||
            item.movementStatus == 'idle' ||
            item.movementStatus == 'stopped';
        return online ? 100 : 0;
    }
  }

  String _unit(_BenchMetric m) {
    switch (m) {
      case _BenchMetric.speed:
        return 'km/h';
      case _BenchMetric.distance:
        return 'km';
      case _BenchMetric.idleTime:
        return 'min';
      case _BenchMetric.onlineTime:
        return '%';
    }
  }

  bool get _lowerIsBetter => _metric == _BenchMetric.idleTime;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(context.tr('benchmarking')),
      ),
      body: BlocBuilder<FleetCubit, FleetState>(
        builder: (context, state) {
          final items = state.items;
          if (items.isEmpty) {
            return Center(
              child: Text(
                context.tr('no_vehicles'),
                style: TextStyle(color: context.textMutedColor),
              ),
            );
          }

          // Sort ranking list.
          final ranked = [...items]..sort((a, b) {
              final av = _metricValue(a, _metric);
              final bv = _metricValue(b, _metric);
              return _lowerIsBetter ? av.compareTo(bv) : bv.compareTo(av);
            });
          final maxVal = ranked.fold<double>(
              0, (p, e) => _metricValue(e, _metric) > p ? _metricValue(e, _metric) : p);

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
            children: [
              _PeriodTabs(
                period: _period,
                onChanged: (p) => setState(() => _period = p),
              ).animate().fadeIn(duration: 300.ms),
              const SizedBox(height: 16),
              _FleetAveragesCard(items: items)
                  .animate(delay: 80.ms)
                  .fadeIn(duration: 320.ms)
                  .slideY(begin: 0.04, end: 0),
              const SizedBox(height: 18),
              _MetricSelector(
                metric: _metric,
                onChanged: (m) => setState(() => _metric = m),
              ).animate(delay: 120.ms).fadeIn(duration: 320.ms),
              const SizedBox(height: 12),
              ...List.generate(ranked.length, (i) {
                final item = ranked[i];
                final value = _metricValue(item, _metric);
                final pct = maxVal > 0 ? (value / maxVal).clamp(0.0, 1.0) : 0.0;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _RankCard(
                    rank: i + 1,
                    isTop: i == 0,
                    isBottom: i == ranked.length - 1 && ranked.length > 2,
                    item: item,
                    value: value,
                    unit: _unit(_metric),
                    relative: pct,
                    metric: _metric,
                  )
                      .animate(delay: (160 + i * 40).ms)
                      .fadeIn(duration: 280.ms)
                      .slideX(begin: -0.05, end: 0),
                );
              }),
              const SizedBox(height: 20),
              _ComparisonSection(
                items: items,
                selectedA: _vehicleAId,
                selectedB: _vehicleBId,
                onSelectA: (id) => setState(() => _vehicleAId = id),
                onSelectB: (id) => setState(() => _vehicleBId = id),
              ).animate(delay: 220.ms).fadeIn(duration: 320.ms),
            ],
          );
        },
      ),
    );
  }
}

class _PeriodTabs extends StatelessWidget {
  final _BenchPeriod period;
  final ValueChanged<_BenchPeriod> onChanged;
  const _PeriodTabs({required this.period, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final labels = {
      _BenchPeriod.today: context.tr('today'),
      _BenchPeriod.week: context.tr('last_7_days'),
      _BenchPeriod.month: context.tr('this_month'),
    };
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: _BenchPeriod.values.map((p) {
          final selected = p == period;
          return Expanded(
            child: GestureDetector(
              onTap: () => onChanged(p),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  gradient: selected ? AppColors.primaryGradient : null,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(
                    labels[p] ?? '',
                    style: TextStyle(
                      color: selected
                          ? Colors.black
                          : context.textSecondaryColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _MetricSelector extends StatelessWidget {
  final _BenchMetric metric;
  final ValueChanged<_BenchMetric> onChanged;
  const _MetricSelector({required this.metric, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final labels = {
      _BenchMetric.speed: context.tr('speed'),
      _BenchMetric.distance: context.tr('distance'),
      _BenchMetric.idleTime: context.tr('idle'),
      _BenchMetric.onlineTime: context.tr('online'),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Icon(Icons.insights_rounded,
              color: AppColors.primary, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              context.tr('performance'),
              style: TextStyle(
                color: context.textPrimaryColor,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          DropdownButtonHideUnderline(
            child: DropdownButton<_BenchMetric>(
              value: metric,
              dropdownColor: context.cardColor,
              style: TextStyle(color: context.textPrimaryColor),
              onChanged: (v) {
                if (v != null) onChanged(v);
              },
              items: _BenchMetric.values
                  .map((m) => DropdownMenuItem(
                        value: m,
                        child: Text(labels[m] ?? ''),
                      ))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _RankCard extends StatelessWidget {
  final int rank;
  final bool isTop;
  final bool isBottom;
  final FleetItem item;
  final double value;
  final String unit;
  final double relative;
  final _BenchMetric metric;

  const _RankCard({
    required this.rank,
    required this.isTop,
    required this.isBottom,
    required this.item,
    required this.value,
    required this.unit,
    required this.relative,
    required this.metric,
  });

  Color _rankColor(BuildContext context, int rank) {
    switch (rank) {
      case 1:
        return const Color(0xFFFFD700); // gold
      case 2:
        return const Color(0xFFC0C0C0); // silver
      case 3:
        return const Color(0xFFCD7F32); // bronze
      default:
        return context.textMutedColor;
    }
  }

  bool _isStaleIdle() {
    if (metric != _BenchMetric.idleTime) return false;
    return value >= 30;
  }

  @override
  Widget build(BuildContext context) {
    final rankColor = _rankColor(context, rank);
    final name = item.carName.isEmpty
        ? context.tr('unnamed_vehicle')
        : item.carName;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isTop
              ? AppColors.primary.withValues(alpha: 0.5)
              : context.dividerColor,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: rankColor.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: rankColor.withValues(alpha: 0.5)),
                ),
                child: Center(
                  child: rank <= 3
                      ? Icon(Icons.emoji_events_rounded,
                          color: rankColor, size: 18)
                      : Text(
                          '$rank',
                          style: TextStyle(
                            color: rankColor,
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                          ),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    if (item.licensePlate.isNotEmpty)
                      Text(
                        item.licensePlate,
                        style: TextStyle(
                          color: context.textMutedColor,
                          fontSize: 11,
                        ),
                      ),
                  ],
                ),
              ),
              Text(
                '${value.toStringAsFixed(1)} $unit',
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: relative,
              minHeight: 6,
              backgroundColor: context.dividerColor,
              valueColor: AlwaysStoppedAnimation<Color>(
                isTop
                    ? AppColors.primary
                    : (isBottom ? AppColors.warning : AppColors.secondary),
              ),
            ),
          ),
          if (isTop || _isStaleIdle() || isBottom) ...[
            const SizedBox(height: 8),
            if (isTop)
              _Badge(
                icon: Icons.workspace_premium_rounded,
                label: context.tr('top_performer'),
                color: AppColors.primary,
              )
            else if (_isStaleIdle())
              _Badge(
                icon: Icons.warning_amber_rounded,
                label: '${value.toStringAsFixed(0)} min idle',
                color: AppColors.warning,
              )
            else if (isBottom && item.movementStatus == 'offline')
              _Badge(
                icon: Icons.wifi_off_rounded,
                label: context.tr('offline'),
                color: AppColors.statusOffline,
              ),
          ],
        ],
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _Badge({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w700,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _FleetAveragesCard extends StatelessWidget {
  final List<FleetItem> items;
  const _FleetAveragesCard({required this.items});

  @override
  Widget build(BuildContext context) {
    final moving = items.where((e) => e.movementStatus == 'moving').toList();
    final avgSpeed = moving.isEmpty
        ? 0.0
        : moving.map((e) => e.speedKmh).reduce((a, b) => a + b) /
            moving.length;
    final online = items
        .where((e) =>
            e.movementStatus == 'moving' ||
            e.movementStatus == 'idle' ||
            e.movementStatus == 'stopped')
        .length;
    final pctOnline = items.isEmpty ? 0 : (online * 100 / items.length).round();
    final pctMoving =
        items.isEmpty ? 0 : (moving.length * 100 / items.length).round();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.analytics_rounded,
                  color: AppColors.primary, size: 18),
              const SizedBox(width: 8),
              Text(
                context.tr('fleet_average'),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _AvgStat(
                  label: context.tr('avg_speed'),
                  value: '${avgSpeed.toStringAsFixed(1)} km/h',
                  color: AppColors.primary,
                ),
              ),
              Container(
                width: 1,
                height: 38,
                color: context.dividerColor,
              ),
              Expanded(
                child: _AvgStat(
                  label: context.tr('online'),
                  value: '$pctOnline%',
                  color: AppColors.secondary,
                ),
              ),
              Container(
                width: 1,
                height: 38,
                color: context.dividerColor,
              ),
              Expanded(
                child: _AvgStat(
                  label: context.tr('moving'),
                  value: '$pctMoving%',
                  color: AppColors.accent,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AvgStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _AvgStat(
      {required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 15,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            color: context.textMutedColor,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}

class _ComparisonSection extends StatelessWidget {
  final List<FleetItem> items;
  final String? selectedA;
  final String? selectedB;
  final ValueChanged<String?> onSelectA;
  final ValueChanged<String?> onSelectB;

  const _ComparisonSection({
    required this.items,
    required this.selectedA,
    required this.selectedB,
    required this.onSelectA,
    required this.onSelectB,
  });

  FleetItem? _byId(String? id) {
    if (id == null) return null;
    for (final e in items) {
      if (e.carId == id) return e;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final a = _byId(selectedA);
    final b = _byId(selectedB);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.compare_arrows_rounded,
                  color: AppColors.secondary, size: 18),
              const SizedBox(width: 8),
              Text(
                context.tr('compare_vehicles'),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _VehiclePicker(
                  label: context.tr('vehicle_a'),
                  items: items,
                  value: selectedA,
                  onChanged: onSelectA,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _VehiclePicker(
                  label: context.tr('vehicle_b'),
                  items: items,
                  value: selectedB,
                  onChanged: onSelectB,
                ),
              ),
            ],
          ),
          if (a != null && b != null) ...[
            const SizedBox(height: 18),
            _ComparisonRow(
              label: context.tr('speed'),
              valueA: '${a.speedKmh.toStringAsFixed(1)} km/h',
              valueB: '${b.speedKmh.toStringAsFixed(1)} km/h',
              betterA: a.speedKmh > b.speedKmh,
              betterB: b.speedKmh > a.speedKmh,
            ),
            _ComparisonRow(
              label: context.tr('status'),
              valueA: a.movementStatus,
              valueB: b.movementStatus,
              betterA: a.movementStatus == 'moving' && b.movementStatus != 'moving',
              betterB: b.movementStatus == 'moving' && a.movementStatus != 'moving',
            ),
            _ComparisonRow(
              label: context.tr('battery'),
              valueA: a.batteryLevel != null
                  ? '${a.batteryLevel!.toStringAsFixed(0)}%'
                  : '—',
              valueB: b.batteryLevel != null
                  ? '${b.batteryLevel!.toStringAsFixed(0)}%'
                  : '—',
              betterA: (a.batteryLevel ?? 0) > (b.batteryLevel ?? 0),
              betterB: (b.batteryLevel ?? 0) > (a.batteryLevel ?? 0),
            ),
            _ComparisonRow(
              label: context.tr('last_update'),
              valueA: _formatLastSeen(context, a.lastPositionAt),
              valueB: _formatLastSeen(context, b.lastPositionAt),
              betterA: _isMoreRecent(a.lastPositionAt, b.lastPositionAt),
              betterB: _isMoreRecent(b.lastPositionAt, a.lastPositionAt),
            ),
          ] else ...[
            const SizedBox(height: 18),
            Center(
              child: Text(
                context.tr('select_vehicle'),
                style: TextStyle(color: context.textMutedColor, fontSize: 13),
              ),
            ),
          ],
        ],
      ),
    );
  }

  static bool _isMoreRecent(DateTime? a, DateTime? b) {
    if (a == null) return false;
    if (b == null) return true;
    return a.isAfter(b);
  }

  static String _formatLastSeen(BuildContext context, DateTime? d) {
    if (d == null) return '—';
    final diff = DateTime.now().difference(d);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    return '${diff.inDays}d';
  }
}

class _VehiclePicker extends StatelessWidget {
  final String label;
  final List<FleetItem> items;
  final String? value;
  final ValueChanged<String?> onChanged;

  const _VehiclePicker({
    required this.label,
    required this.items,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: context.textMutedColor,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: context.cardColor,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: context.dividerColor),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: value,
              dropdownColor: context.cardColor,
              hint: Text(
                context.tr('select_vehicle'),
                style: TextStyle(color: context.textMutedColor, fontSize: 12),
              ),
              style: TextStyle(color: context.textPrimaryColor, fontSize: 13),
              onChanged: onChanged,
              items: items
                  .map((it) => DropdownMenuItem(
                        value: it.carId,
                        child: Text(
                          it.carName.isEmpty
                              ? context.tr('unnamed_vehicle')
                              : it.carName,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ))
                  .toList(),
            ),
          ),
        ),
      ],
    );
  }
}

class _ComparisonRow extends StatelessWidget {
  final String label;
  final String valueA;
  final String valueB;
  final bool betterA;
  final bool betterB;

  const _ComparisonRow({
    required this.label,
    required this.valueA,
    required this.valueB,
    required this.betterA,
    required this.betterB,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: _SideValue(
              value: valueA,
              better: betterA,
              worse: betterB,
            ),
          ),
          SizedBox(
            width: 90,
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.4,
              ),
            ),
          ),
          Expanded(
            child: _SideValue(
              value: valueB,
              better: betterB,
              worse: betterA,
              alignEnd: true,
            ),
          ),
        ],
      ),
    );
  }
}

class _SideValue extends StatelessWidget {
  final String value;
  final bool better;
  final bool worse;
  final bool alignEnd;

  const _SideValue({
    required this.value,
    required this.better,
    required this.worse,
    this.alignEnd = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = better
        ? AppColors.primary
        : worse
            ? AppColors.error
            : context.textPrimaryColor;
    return Align(
      alignment: alignEnd ? Alignment.centerRight : Alignment.centerLeft,
      child: Text(
        value,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 13,
        ),
        textAlign: alignEnd ? TextAlign.right : TextAlign.left,
      ),
    );
  }
}
