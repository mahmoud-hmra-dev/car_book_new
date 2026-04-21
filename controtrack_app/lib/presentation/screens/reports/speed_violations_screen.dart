import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';
import '../../widgets/web/web_page_scaffold.dart';

class SpeedViolationsScreen extends StatefulWidget {
  const SpeedViolationsScreen({super.key});

  @override
  State<SpeedViolationsScreen> createState() => _SpeedViolationsScreenState();
}

class _SpeedViolationsScreenState extends State<SpeedViolationsScreen> {
  DateTime _from = DateTime.now().subtract(const Duration(days: 7));
  DateTime _to = DateTime.now();
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<Map<String, dynamic>>> _load() async {
    final client = context.read<DioClient>();
    final resp = await client.get(
      '/api/tracking/events',
      queryParameters: {
        'type': 'overspeed',
        'from': _from.toUtc().toIso8601String(),
        'to': _to.toUtc().toIso8601String(),
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

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  Future<void> _pickDate(bool isFrom) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isFrom ? _from : _to,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
    );
    if (picked == null) return;
    setState(() {
      if (isFrom) {
        _from = picked;
      } else {
        _to = picked;
      }
      _future = _load();
    });
  }

  double _speedOf(Map<String, dynamic> e) {
    final attrs = e['attributes'];
    if (attrs is Map) {
      final s = attrs['speed'] ?? attrs['maxSpeed'] ?? attrs['speedLimit'];
      if (s is num) return s.toDouble() * 1.852; // knots -> km/h
      if (s != null) return (double.tryParse(s.toString()) ?? 0) * 1.852;
    }
    final direct = e['speed'] ?? e['speedKmh'];
    if (direct is num) return direct.toDouble();
    if (direct != null) return double.tryParse(direct.toString()) ?? 0;
    return 0;
  }

  Color _colorForSpeed(double kmh) {
    if (kmh > 140) return AppColors.error;
    if (kmh > 120) return AppColors.warning;
    return const Color(0xFFFFD54F);
  }

  _DateRange? get _currentRange {
    final days = _to.difference(_from).inDays;
    for (final r in _DateRange.values) {
      if (days == r.days) return r;
    }
    return null;
  }

  DateTime? _timeOf(Map<String, dynamic> e) {
    final v = e['eventTime'] ?? e['serverTime'] ?? e['deviceTime'] ?? e['time'];
    if (v == null) return null;
    if (v is DateTime) return v;
    return DateTime.tryParse(v.toString());
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;
    return WebPageScaffoldScrollable(
      title: context.tr('speed_violations'),
      subtitle: 'Overspeed incident log',
      actions: isWide
          ? [
              IconButton(
                tooltip: 'Refresh',
                icon: Icon(
                  Icons.refresh_rounded,
                  color: context.textSecondaryColor,
                ),
                onPressed: _refresh,
              ),
            ]
          : const [],
      child: Scaffold(
        backgroundColor: context.bgColor,
        appBar: isWide
            ? null
            : AppBar(
                backgroundColor: context.bgColor,
                elevation: 0,
                title: Text(context.tr('speed_violations')),
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back_rounded),
                  onPressed: () => context.pop(),
                ),
              ),
        body: isWide ? _buildWebBody(context) : _buildMobileBody(context),
      ),
    );
  }

  Widget _buildMobileBody(BuildContext context) {
    return Column(
      children: [
        _RangeChipsBar(
          current: _currentRange,
          onSelected: (r) {
            setState(() {
              final now = DateTime.now();
              _from = now.subtract(Duration(days: r.days));
              _to = now;
              _future = _load();
            });
          },
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
          child: Row(
            children: [
              Expanded(
                child: _dateChip(
                  label: context.tr('from'),
                  date: _from,
                  onTap: () => _pickDate(true),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _dateChip(
                  label: context.tr('to'),
                  date: _to,
                  onTap: () => _pickDate(false),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: FutureBuilder<List<Map<String, dynamic>>>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const ShimmerList();
              }
              if (snap.hasError) {
                return AppError(
                  message: snap.error.toString(),
                  onRetry: _refresh,
                );
              }
              final list = snap.data ?? const [];
              if (list.isEmpty) {
                return EmptyState(
                  title: context.tr('no_violations'),
                  subtitle: context.tr('no_violations_subtitle'),
                  icon: Icons.speed_rounded,
                );
              }
              double maxSpeed = 0;
              double speedSum = 0;
              for (final e in list) {
                final s = _speedOf(e);
                if (s > maxSpeed) maxSpeed = s;
                speedSum += s;
              }
              final avgSpeed = list.isEmpty ? 0.0 : speedSum / list.length;
              final chartData = _buildChartData(list);
              return RefreshIndicator(
                color: AppColors.primary,
                onRefresh: _refresh,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: list.length + 2,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    if (i == 0) {
                      return _SummaryCard(
                        total: list.length,
                        maxSpeed: maxSpeed,
                        avgSpeed: avgSpeed,
                      );
                    }
                    if (i == 1) {
                      return _ViolationsChart(data: chartData)
                          .animate()
                          .fadeIn(delay: 200.ms, duration: 400.ms);
                    }
                    final e = list[i - 2];
                    final kmh = _speedOf(e);
                    final time = _timeOf(e);
                    final device = (e['deviceName'] ??
                            e['carName'] ??
                            context.tr('vehicle'))
                        .toString();
                    final lat = e['latitude'] is num
                        ? (e['latitude'] as num).toDouble()
                        : null;
                    final lng = e['longitude'] is num
                        ? (e['longitude'] as num).toDouble()
                        : null;
                    return _ViolationCard(
                      speedKmh: kmh,
                      color: _colorForSpeed(kmh),
                      deviceName: device,
                      time: time,
                      latitude: lat,
                      longitude: lng,
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildWebBody(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(28, 20, 28, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _WebFilterBar(
            currentRange: _currentRange,
            from: _from,
            to: _to,
            onRangeSelected: (r) {
              setState(() {
                final now = DateTime.now();
                _from = now.subtract(Duration(days: r.days));
                _to = now;
                _future = _load();
              });
            },
            onPickFrom: () => _pickDate(true),
            onPickTo: () => _pickDate(false),
          ),
          const SizedBox(height: 18),
          FutureBuilder<List<Map<String, dynamic>>>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const SizedBox(
                  height: 400,
                  child: ShimmerList(),
                );
              }
              if (snap.hasError) {
                return SizedBox(
                  height: 400,
                  child: AppError(
                    message: snap.error.toString(),
                    onRetry: _refresh,
                  ),
                );
              }
              final list = snap.data ?? const [];
              if (list.isEmpty) {
                return SizedBox(
                  height: 400,
                  child: EmptyState(
                    title: context.tr('no_violations'),
                    subtitle: context.tr('no_violations_subtitle'),
                    icon: Icons.speed_rounded,
                  ),
                );
              }
              double maxSpeed = 0;
              double speedSum = 0;
              for (final e in list) {
                final s = _speedOf(e);
                if (s > maxSpeed) maxSpeed = s;
                speedSum += s;
              }
              final avgSpeed = list.isEmpty ? 0.0 : speedSum / list.length;
              final chartData = _buildChartData(list);

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 4,
                        child: _SummaryCard(
                          total: list.length,
                          maxSpeed: maxSpeed,
                          avgSpeed: avgSpeed,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        flex: 6,
                        child: _ViolationsChart(data: chartData)
                            .animate()
                            .fadeIn(delay: 200.ms, duration: 400.ms),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  _WebViolationsTable(
                    rows: list,
                    speedOf: _speedOf,
                    timeOf: _timeOf,
                    colorForSpeed: _colorForSpeed,
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  /// Groups violations by day label and returns bar chart data points.
  List<(String label, int count)> _buildChartData(List<Map<String, dynamic>> list) {
    // Group by date
    final Map<String, int> counts = {};
    final int days = _to.difference(_from).inDays + 1;
    // Build zero-filled buckets
    for (int i = 0; i < days && i < 30; i++) {
      final d = _from.add(Duration(days: i));
      final key = '${d.month}/${d.day}';
      counts[key] = 0;
    }
    for (final e in list) {
      final t = _timeOf(e);
      if (t == null) continue;
      final key = '${t.month}/${t.day}';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts.entries.map((e) => (e.key, e.value)).toList();
  }

  Widget _dateChip({
    required String label,
    required DateTime date,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: context.dividerColor),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_today_rounded,
                color: AppColors.primary, size: 16),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(
                          color: context.textMutedColor, fontSize: 10)),
                  const SizedBox(height: 2),
                  Text(
                    DateFormat('MMM d, yyyy').format(date),
                    style: TextStyle(
                      color: context.textPrimaryColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _DateRange {
  d7(7, 'range_7d'),
  d30(30, 'range_30d'),
  d90(90, 'range_90d');

  final int days;
  final String labelKey;
  const _DateRange(this.days, this.labelKey);
}

class _RangeChipsBar extends StatelessWidget {
  final _DateRange? current;
  final ValueChanged<_DateRange> onSelected;
  const _RangeChipsBar({required this.current, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 50,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
        itemCount: _DateRange.values.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final r = _DateRange.values[i];
          final selected = current == r;
          return Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => onSelected(r),
              borderRadius: BorderRadius.circular(12),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 220),
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
                child: Text(
                  context.tr(r.labelKey),
                  style: TextStyle(
                    color: selected
                        ? AppColors.primary
                        : context.textPrimaryColor,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final int total;
  final double maxSpeed;
  final double avgSpeed;
  const _SummaryCard({
    required this.total,
    required this.maxSpeed,
    required this.avgSpeed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Expanded(
            child: _StatCell(
              value: '$total',
              label: context.tr('violations'),
              valueColor: context.textPrimaryColor,
            ),
          ),
          Container(width: 1, height: 40, color: context.dividerColor),
          Expanded(
            child: _StatCell(
              value: '${maxSpeed.toStringAsFixed(0)} km/h',
              label: context.tr('max_speed'),
              valueColor: AppColors.error,
            ),
          ),
          Container(width: 1, height: 40, color: context.dividerColor),
          Expanded(
            child: _StatCell(
              value: '${avgSpeed.toStringAsFixed(0)} km/h',
              label: context.tr('avg_speed'),
              valueColor: AppColors.warning,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCell extends StatelessWidget {
  final String value;
  final String label;
  final Color valueColor;
  const _StatCell({
    required this.value,
    required this.label,
    required this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: TextStyle(
              color: valueColor,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            label,
            style: TextStyle(color: context.textMutedColor, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _ViolationCard extends StatelessWidget {
  final double speedKmh;
  final Color color;
  final String deviceName;
  final DateTime? time;
  final double? latitude;
  final double? longitude;

  const _ViolationCard({
    required this.speedKmh,
    required this.color,
    required this.deviceName,
    required this.time,
    required this.latitude,
    required this.longitude,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: color.withValues(alpha: 0.5)),
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    speedKmh.toStringAsFixed(0),
                    style: TextStyle(
                      color: color,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Text(
                    'km/h',
                    style: TextStyle(
                      color: color,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  deviceName,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                if (time != null)
                  Text(
                    DateFormat('MMM d, yyyy HH:mm').format(time!),
                    style:
                        TextStyle(color: context.textSecondaryColor, fontSize: 12),
                  ),
                if (latitude != null && longitude != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    '${latitude!.toStringAsFixed(4)}, ${longitude!.toStringAsFixed(4)}',
                    style: TextStyle(color: context.textMutedColor, fontSize: 11),
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

// ============================================================================
// Violations per day bar chart
// ============================================================================

class _ViolationsChart extends StatelessWidget {
  final List<(String label, int count)> data;
  const _ViolationsChart({required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty || data.every((e) => e.$2 == 0)) {
      return const SizedBox.shrink();
    }

    final maxY = data.map((e) => e.$2).fold(0, (a, b) => a > b ? a : b)
        .toDouble();
    final displayData = data.length > 14
        ? data.sublist(data.length - 14)
        : data;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
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
              Icon(Icons.bar_chart_rounded,
                  color: AppColors.error, size: 16),
              const SizedBox(width: 8),
              Text(
                context.tr('violations_per_day'),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 120,
            child: BarChart(
              BarChartData(
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: maxY > 4 ? (maxY / 4).roundToDouble() : 1,
                  getDrawingHorizontalLine: (v) => FlLine(
                    color: context.dividerColor,
                    strokeWidth: 0.8,
                    dashArray: [4, 4],
                  ),
                ),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 28,
                      interval: maxY > 4 ? (maxY / 4).roundToDouble() : 1,
                      getTitlesWidget: (v, _) => Text(
                        v.toInt().toString(),
                        style: TextStyle(
                          color: context.textMutedColor,
                          fontSize: 9,
                        ),
                      ),
                    ),
                  ),
                  rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 22,
                      interval: displayData.length > 7 ? 2 : 1,
                      getTitlesWidget: (v, _) {
                        final idx = v.toInt();
                        if (idx < 0 || idx >= displayData.length) {
                          return const SizedBox.shrink();
                        }
                        return Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            displayData[idx].$1,
                            style: TextStyle(
                              color: context.textMutedColor,
                              fontSize: 8,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                maxY: maxY + 1,
                barGroups: displayData.asMap().entries.map((e) {
                  final count = e.value.$2.toDouble();
                  return BarChartGroupData(
                    x: e.key,
                    barRods: [
                      BarChartRodData(
                        toY: count,
                        color: count == 0
                            ? context.dividerColor
                            : count > 5
                                ? AppColors.error
                                : AppColors.warning,
                        width: displayData.length > 10 ? 8 : 14,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(4),
                        ),
                        backDrawRodData: BackgroundBarChartRodData(
                          show: true,
                          toY: maxY + 1,
                          color: context.dividerColor.withValues(alpha: 0.2),
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// Web-only: filter bar
// ============================================================================

class _WebFilterBar extends StatelessWidget {
  final _DateRange? currentRange;
  final DateTime from;
  final DateTime to;
  final ValueChanged<_DateRange> onRangeSelected;
  final VoidCallback onPickFrom;
  final VoidCallback onPickTo;
  const _WebFilterBar({
    required this.currentRange,
    required this.from,
    required this.to,
    required this.onRangeSelected,
    required this.onPickFrom,
    required this.onPickTo,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Icon(Icons.filter_list_rounded,
              color: context.textSecondaryColor, size: 18),
          const SizedBox(width: 10),
          Text(
            'Filters',
            style: TextStyle(
              color: context.textPrimaryColor,
              fontWeight: FontWeight.w800,
              fontSize: 13,
            ),
          ),
          const SizedBox(width: 20),
          // Date ranges as pills
          for (int i = 0; i < _DateRange.values.length; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            _WebRangePill(
              range: _DateRange.values[i],
              selected: currentRange == _DateRange.values[i],
              onTap: () => onRangeSelected(_DateRange.values[i]),
            ),
          ],
          const Spacer(),
          _WebDatePill(
            label: context.tr('from'),
            date: from,
            onTap: onPickFrom,
          ),
          const SizedBox(width: 10),
          _WebDatePill(
            label: context.tr('to'),
            date: to,
            onTap: onPickTo,
          ),
        ],
      ),
    );
  }
}

class _WebRangePill extends StatelessWidget {
  final _DateRange range;
  final bool selected;
  final VoidCallback onTap;
  const _WebRangePill({
    required this.range,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: selected
                ? AppColors.primary.withValues(alpha: 0.16)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: selected
                  ? AppColors.primary.withValues(alpha: 0.6)
                  : context.dividerColor,
            ),
          ),
          child: Text(
            context.tr(range.labelKey),
            style: TextStyle(
              color: selected
                  ? AppColors.primary
                  : context.textSecondaryColor,
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }
}

class _WebDatePill extends StatelessWidget {
  final String label;
  final DateTime date;
  final VoidCallback onTap;
  const _WebDatePill({
    required this.label,
    required this.date,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: context.isDarkMode
                ? Colors.white.withValues(alpha: 0.04)
                : Colors.black.withValues(alpha: 0.03),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: context.dividerColor),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.calendar_today_rounded,
                  color: AppColors.primary, size: 14),
              const SizedBox(width: 8),
              Text(
                label.toUpperCase(),
                style: TextStyle(
                  color: context.textMutedColor,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.4,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                DateFormat('MMM d, yyyy').format(date),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// Web-only: data table
// ============================================================================

class _WebViolationsTable extends StatelessWidget {
  final List<Map<String, dynamic>> rows;
  final double Function(Map<String, dynamic>) speedOf;
  final DateTime? Function(Map<String, dynamic>) timeOf;
  final Color Function(double) colorForSpeed;
  const _WebViolationsTable({
    required this.rows,
    required this.speedOf,
    required this.timeOf,
    required this.colorForSpeed,
  });

  String _severity(double kmh) {
    if (kmh > 140) return 'CRITICAL';
    if (kmh > 120) return 'HIGH';
    return 'MODERATE';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
            child: Row(
              children: [
                Icon(Icons.warning_amber_rounded,
                    color: AppColors.error, size: 18),
                const SizedBox(width: 8),
                Text(
                  '${rows.length} ${context.tr('violations')}',
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          // Header row
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            decoration: BoxDecoration(
              color: context.isDarkMode
                  ? Colors.white.withValues(alpha: 0.03)
                  : Colors.black.withValues(alpha: 0.02),
              border: Border(
                top: BorderSide(color: context.dividerColor),
                bottom: BorderSide(color: context.dividerColor),
              ),
            ),
            child: Row(
              children: [
                _headerCell(context, context.tr('vehicle'), flex: 3),
                _headerCell(context, 'Speed', flex: 2),
                _headerCell(context, 'Limit', flex: 2),
                _headerCell(context, 'Location', flex: 3),
                _headerCell(context, 'Time', flex: 3),
                _headerCell(context, 'Severity', flex: 2),
              ],
            ),
          ),
          // Rows
          for (int i = 0; i < rows.length; i++)
            _buildRow(context, i, rows[i]),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _headerCell(BuildContext context, String label,
      {required int flex}) {
    return Expanded(
      flex: flex,
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: context.textMutedColor,
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.6,
        ),
      ),
    );
  }

  Widget _buildRow(
      BuildContext context, int index, Map<String, dynamic> e) {
    final kmh = speedOf(e);
    final time = timeOf(e);
    final device =
        (e['deviceName'] ?? e['carName'] ?? context.tr('vehicle')).toString();
    final lat = e['latitude'] is num
        ? (e['latitude'] as num).toDouble()
        : null;
    final lng = e['longitude'] is num
        ? (e['longitude'] as num).toDouble()
        : null;
    final location = (lat != null && lng != null)
        ? '${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}'
        : '—';
    double limit = 0;
    final attrs = e['attributes'];
    if (attrs is Map) {
      final l = attrs['speedLimit'] ?? attrs['limit'];
      if (l is num) limit = l.toDouble() * 1.852;
    }
    final limitStr = limit > 0 ? '${limit.toStringAsFixed(0)} km/h' : '—';
    final sev = _severity(kmh);
    final sevColor = colorForSpeed(kmh);

    final isEven = index.isEven;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(
        color: isEven
            ? (context.isDarkMode
                ? Colors.white.withValues(alpha: 0.015)
                : Colors.black.withValues(alpha: 0.015))
            : Colors.transparent,
        border: Border(
          bottom: BorderSide(
            color: context.dividerColor.withValues(alpha: 0.5),
          ),
        ),
      ),
      child: Row(
        children: [
          // Vehicle
          Expanded(
            flex: 3,
            child: Row(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.directions_car_rounded,
                      color: AppColors.primary, size: 16),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    device,
                    style: TextStyle(
                      color: context.textPrimaryColor,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          // Speed
          Expanded(
            flex: 2,
            child: Text(
              '${kmh.toStringAsFixed(0)} km/h',
              style: TextStyle(
                color: sevColor,
                fontSize: 13,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          // Limit
          Expanded(
            flex: 2,
            child: Text(
              limitStr,
              style: TextStyle(
                color: context.textSecondaryColor,
                fontSize: 12.5,
              ),
            ),
          ),
          // Location
          Expanded(
            flex: 3,
            child: Text(
              location,
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 12,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          // Time
          Expanded(
            flex: 3,
            child: Text(
              time != null
                  ? DateFormat('MMM d, yyyy HH:mm').format(time)
                  : '—',
              style: TextStyle(
                color: context.textSecondaryColor,
                fontSize: 12,
              ),
            ),
          ),
          // Severity badge
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerLeft,
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: sevColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border:
                      Border.all(color: sevColor.withValues(alpha: 0.5)),
                ),
                child: Text(
                  sev,
                  style: TextStyle(
                    color: sevColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.6,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
