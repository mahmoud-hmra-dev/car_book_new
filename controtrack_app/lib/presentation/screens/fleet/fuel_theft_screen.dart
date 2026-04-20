import 'dart:math';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:controtrack/core/theme/app_colors.dart';
import 'package:controtrack/l10n/app_localizations.dart';

// ---------------------------------------------------------------------------
// Data models
// ---------------------------------------------------------------------------

enum AlertSeverity { critical, warning, info }

class _FuelAlert {
  final String id;
  final String vehicleName;
  final String plate;
  final DateTime time;
  final double before; // liters
  final double after; // liters
  final double drop; // liters lost
  final String location;
  final AlertSeverity severity;
  final bool reviewed;

  const _FuelAlert({
    required this.id,
    required this.vehicleName,
    required this.plate,
    required this.time,
    required this.before,
    required this.after,
    required this.drop,
    required this.location,
    required this.severity,
    required this.reviewed,
  });

  double get dropPercent => before > 0 ? (drop / before) * 100 : 0;
  double get estimatedCost => drop * 1.50; // ~$1.50/L
}

class _FuelPoint {
  final DateTime time;
  final double liters;
  const _FuelPoint(this.time, this.liters);
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

List<_FuelAlert> _buildAlerts() {
  final now = DateTime.now();
  return [
    _FuelAlert(
      id: '1',
      vehicleName: 'Truck-03',
      plate: 'GHI 9012',
      time: now.subtract(const Duration(hours: 2, minutes: 14)),
      before: 82.0,
      after: 37.5,
      drop: 44.5,
      location: 'Industrial Zone, Damascus',
      severity: AlertSeverity.critical,
      reviewed: false,
    ),
    _FuelAlert(
      id: '2',
      vehicleName: 'Van-07',
      plate: 'MNO 4455',
      time: now.subtract(const Duration(hours: 5, minutes: 43)),
      before: 55.0,
      after: 36.0,
      drop: 19.0,
      location: 'Highway 5, Km 42',
      severity: AlertSeverity.warning,
      reviewed: false,
    ),
    _FuelAlert(
      id: '3',
      vehicleName: 'Sedan-01',
      plate: 'ABC 1234',
      time: now.subtract(const Duration(days: 1, hours: 3)),
      before: 48.0,
      after: 37.0,
      drop: 11.0,
      location: 'Depot Parking, Aleppo',
      severity: AlertSeverity.info,
      reviewed: true,
    ),
    _FuelAlert(
      id: '4',
      vehicleName: 'Truck-08',
      plate: 'PQR 8877',
      time: now.subtract(const Duration(days: 1, hours: 10)),
      before: 92.0,
      after: 58.0,
      drop: 34.0,
      location: 'Rest Stop, Ring Road',
      severity: AlertSeverity.critical,
      reviewed: true,
    ),
    _FuelAlert(
      id: '5',
      vehicleName: 'Van-04',
      plate: 'DEF 5566',
      time: now.subtract(const Duration(days: 2, hours: 1)),
      before: 62.0,
      after: 50.5,
      drop: 11.5,
      location: 'Customer Site, Homs',
      severity: AlertSeverity.warning,
      reviewed: true,
    ),
  ];
}

List<_FuelPoint> _buildFuelHistory(String vehicleName) {
  final rng = Random(vehicleName.hashCode);
  final now = DateTime.now();
  final points = <_FuelPoint>[];
  double level = 80 + rng.nextDouble() * 20;
  for (int i = 48; i >= 0; i--) {
    final t = now.subtract(Duration(hours: i));
    // Normal consumption ~0.5L/h
    level -= 0.3 + rng.nextDouble() * 0.4;
    // Simulate sudden drop at hour 30 (theft event)
    if (i == 30) level -= 30 + rng.nextDouble() * 20;
    // Simulate refuel at hour 12
    if (i == 12) level = 75 + rng.nextDouble() * 15;
    level = level.clamp(0.0, 100.0);
    points.add(_FuelPoint(t, level));
  }
  return points;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class FuelTheftScreen extends StatefulWidget {
  const FuelTheftScreen({super.key});

  @override
  State<FuelTheftScreen> createState() => _FuelTheftScreenState();
}

class _FuelTheftScreenState extends State<FuelTheftScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late List<_FuelAlert> _alerts;
  String? _selectedVehicle;
  List<_FuelPoint> _history = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _alerts = _buildAlerts();
    _selectedVehicle = _alerts.first.vehicleName;
    _history = _buildFuelHistory(_selectedVehicle!);
    _tabController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _markReviewed(String id) {
    setState(() {
      final idx = _alerts.indexWhere((a) => a.id == id);
      if (idx < 0) return;
      final a = _alerts[idx];
      _alerts[idx] = _FuelAlert(
        id: a.id,
        vehicleName: a.vehicleName,
        plate: a.plate,
        time: a.time,
        before: a.before,
        after: a.after,
        drop: a.drop,
        location: a.location,
        severity: a.severity,
        reviewed: true,
      );
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(context.tr('alert_marked_reviewed')),
        backgroundColor: AppColors.primaryDark,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final unreviewed = _alerts.where((a) => !a.reviewed).length;
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.surfaceColor,
        title: Row(
          children: [
            Text(
              context.tr('fuel_theft'),
              style: TextStyle(
                color: context.textPrimaryColor,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (unreviewed > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.error,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$unreviewed',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new,
              color: context.textPrimaryColor, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.error,
          labelColor: AppColors.error,
          unselectedLabelColor: context.textMutedColor,
          tabs: [
            Tab(text: context.tr('theft_alerts')),
            Tab(text: context.tr('fuel_history')),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildAlertsTab(),
          _buildHistoryTab(),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Alerts tab
  // ---------------------------------------------------------------------------

  Widget _buildAlertsTab() {
    final unreviewed = _alerts.where((a) => !a.reviewed).toList();
    final reviewed = _alerts.where((a) => a.reviewed).toList();

    // Summary stats
    final totalDrop = _alerts.fold(0.0, (s, a) => s + a.drop);
    final totalCost = totalDrop * 1.50;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Summary strip
        _buildSummaryStrip(unreviewed.length, totalDrop, totalCost)
            .animate()
            .fadeIn(duration: 400.ms)
            .slideY(begin: -0.08),

        const SizedBox(height: 20),

        if (unreviewed.isNotEmpty) ...[
          _sectionLabel('⚠️  ${context.tr('theft_alerts')}'),
          const SizedBox(height: 8),
          ...unreviewed.mapIndexed(
            (i, a) => _buildAlertCard(a, i)
                .animate()
                .fadeIn(delay: (i * 80).ms)
                .slideX(begin: 0.04),
          ),
          const SizedBox(height: 16),
        ],

        if (reviewed.isNotEmpty) ...[
          _sectionLabel('✅  ${context.tr('reviewed')}'),
          const SizedBox(height: 8),
          ...reviewed.mapIndexed(
            (i, a) => _buildAlertCard(a, i)
                .animate()
                .fadeIn(delay: (i * 60).ms)
                .slideX(begin: 0.04),
          ),
        ],
      ],
    );
  }

  Widget _buildSummaryStrip(int unreviewed, double totalDrop, double cost) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.error.withValues(alpha: 0.15),
            AppColors.warning.withValues(alpha: 0.10),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _stripStat('Alerts', _alerts.length.toString(), AppColors.error),
          _vDivider(),
          _stripStat('Unreviewed', unreviewed.toString(), AppColors.warning),
          _vDivider(),
          _stripStat(
              'Total Loss', '${totalDrop.toStringAsFixed(0)} L', AppColors.error),
          _vDivider(),
          _stripStat(
              'Est. Cost', '\$${cost.toStringAsFixed(0)}', AppColors.warning),
        ],
      ),
    );
  }

  Widget _stripStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(value,
            style: TextStyle(
                fontSize: 20, fontWeight: FontWeight.bold, color: color)),
        Text(label,
            style: TextStyle(color: context.textMutedColor, fontSize: 10)),
      ],
    );
  }

  Widget _vDivider() =>
      Container(width: 1, height: 36, color: context.dividerColor);

  Widget _buildAlertCard(_FuelAlert alert, int index) {
    final color = _severityColor(alert.severity);
    final timeStr = _relativeTime(alert.time);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: color, width: 4)),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: alert.reviewed ? 0.04 : 0.1),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _severityLabel(alert.severity),
                    style: TextStyle(
                        color: color,
                        fontSize: 10,
                        fontWeight: FontWeight.bold),
                  ),
                ),
                if (alert.reviewed)
                  Padding(
                    padding: const EdgeInsets.only(left: 6),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'REVIEWED',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                const Spacer(),
                Text(timeStr,
                    style: TextStyle(
                        color: context.textMutedColor, fontSize: 11)),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.local_gas_station_rounded,
                      color: color, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        alert.vehicleName,
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        alert.plate,
                        style: TextStyle(
                            color: context.textMutedColor, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '−${alert.drop.toStringAsFixed(1)} L',
                      style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      '\$${alert.estimatedCost.toStringAsFixed(2)} est.',
                      style: TextStyle(
                          color: context.textMutedColor, fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            // Fuel bar before → after
            _buildFuelBar(alert),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(Icons.location_on_outlined,
                    size: 13, color: context.textMutedColor),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    alert.location,
                    style: TextStyle(
                        color: context.textMutedColor, fontSize: 11),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (!alert.reviewed)
                  TextButton(
                    onPressed: () => _markReviewed(alert.id),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      minimumSize: Size.zero,
                    ),
                    child: const Text(
                      'Mark Reviewed',
                      style: TextStyle(
                          color: AppColors.primary, fontSize: 11),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFuelBar(_FuelAlert alert) {
    final beforePct = (alert.before / 100).clamp(0.0, 1.0);
    final afterPct = (alert.after / 100).clamp(0.0, 1.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Before: ${alert.before.toStringAsFixed(0)}L',
              style:
                  TextStyle(color: context.textMutedColor, fontSize: 10),
            ),
            Text(
              'After: ${alert.after.toStringAsFixed(0)}L (${alert.dropPercent.toStringAsFixed(0)}% drop)',
              style: TextStyle(
                  color: AppColors.error,
                  fontSize: 10,
                  fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 4),
        LayoutBuilder(
          builder: (context, constraints) {
            final w = constraints.maxWidth;
            return Stack(
              children: [
                // Background
                Container(
                  height: 8,
                  decoration: BoxDecoration(
                    color: context.dividerColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                // Before bar (green)
                Container(
                  height: 8,
                  width: w * beforePct,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                // After bar (solid green)
                Container(
                  height: 8,
                  width: w * afterPct,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                // Theft indicator (red portion)
                Positioned(
                  left: w * afterPct,
                  child: Container(
                    height: 8,
                    width: w * (beforePct - afterPct),
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.55),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // History tab
  // ---------------------------------------------------------------------------

  Widget _buildHistoryTab() {
    final vehicles = _alerts.map((a) => a.vehicleName).toSet().toList();

    return Column(
      children: [
        // Vehicle selector
        Container(
          height: 44,
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: vehicles.map((v) {
              final sel = v == _selectedVehicle;
              return GestureDetector(
                onTap: () => setState(() {
                  _selectedVehicle = v;
                  _history = _buildFuelHistory(v);
                }),
                child: Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: sel
                        ? AppColors.primary.withValues(alpha: 0.15)
                        : context.cardColor,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                      color: sel ? AppColors.primary : context.dividerColor,
                      width: sel ? 1.5 : 1,
                    ),
                  ),
                  child: Text(
                    v,
                    style: TextStyle(
                      color: sel
                          ? AppColors.primary
                          : context.textSecondaryColor,
                      fontWeight: sel ? FontWeight.bold : FontWeight.normal,
                      fontSize: 13,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ).animate().fadeIn(duration: 400.ms),

        const SizedBox(height: 16),

        // Chart
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 20, 16),
            child: _buildFuelChart(),
          ),
        ).animate().fadeIn(delay: 150.ms, duration: 500.ms),
      ],
    );
  }

  Widget _buildFuelChart() {
    if (_history.isEmpty) return const SizedBox.shrink();

    final spots = _history.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), e.value.liters);
    }).toList();

    // Find the biggest drop for annotation
    int dropIdx = 0;
    double maxDrop = 0;
    for (int i = 1; i < _history.length; i++) {
      final drop = _history[i - 1].liters - _history[i].liters;
      if (drop > maxDrop) {
        maxDrop = drop;
        dropIdx = i;
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Fuel Level (last 48h) — $_selectedVehicle',
          style: TextStyle(
            color: context.textPrimaryColor,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Sudden drops may indicate theft or unauthorized drainage',
          style: TextStyle(color: context.textMutedColor, fontSize: 11),
        ),
        const SizedBox(height: 16),
        Expanded(
          child: LineChart(
            LineChartData(
              backgroundColor: Colors.transparent,
              minY: 0,
              maxY: 105,
              gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                horizontalInterval: 25,
                getDrawingHorizontalLine: (v) => FlLine(
                  color: context.dividerColor,
                  strokeWidth: 1,
                  dashArray: [4, 4],
                ),
              ),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    interval: 25,
                    reservedSize: 36,
                    getTitlesWidget: (v, _) => Text(
                      '${v.toInt()}L',
                      style: TextStyle(
                          color: context.textMutedColor, fontSize: 10),
                    ),
                  ),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    interval: 12,
                    getTitlesWidget: (v, _) {
                      final idx = v.toInt();
                      if (idx < 0 || idx >= _history.length) {
                        return const SizedBox.shrink();
                      }
                      final h = _history[idx].time;
                      return Text(
                        '${h.hour}:00',
                        style: TextStyle(
                            color: context.textMutedColor, fontSize: 9),
                      );
                    },
                  ),
                ),
                topTitles:
                    const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles:
                    const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              ),
              lineBarsData: [
                LineChartBarData(
                  spots: spots,
                  isCurved: true,
                  color: AppColors.primary,
                  barWidth: 2.5,
                  dotData: FlDotData(
                    show: true,
                    checkToShowDot: (spot, barData) =>
                        spot.x.toInt() == dropIdx,
                    getDotPainter: (spot, pct, barData, idx) =>
                        FlDotCirclePainter(
                      radius: 5,
                      color: AppColors.error,
                      strokeWidth: 2,
                      strokeColor: Colors.white,
                    ),
                  ),
                  belowBarData: BarAreaData(
                    show: true,
                    gradient: LinearGradient(
                      colors: [
                        AppColors.primary.withValues(alpha: 0.3),
                        AppColors.primary.withValues(alpha: 0.0),
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
              ],
              lineTouchData: LineTouchData(
                touchTooltipData: LineTouchTooltipData(
                  getTooltipColor: (spot) =>
                      context.cardColor.withValues(alpha: 0.95),
                  getTooltipItems: (touchedSpots) => touchedSpots.map((s) {
                    final pt = _history[s.spotIndex];
                    return LineTooltipItem(
                      '${pt.liters.toStringAsFixed(1)}L\n'
                      '${pt.time.hour}:${pt.time.minute.toString().padLeft(2, '0')}',
                      TextStyle(
                        color: context.textPrimaryColor,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    );
                  }).toList(),
                ),
              ),
              extraLinesData: ExtraLinesData(
                verticalLines: [
                  VerticalLine(
                    x: dropIdx.toDouble(),
                    color: AppColors.error.withValues(alpha: 0.6),
                    strokeWidth: 1.5,
                    dashArray: [4, 4],
                    label: VerticalLineLabel(
                      show: true,
                      alignment: Alignment.topRight,
                      labelResolver: (_) => '⚠ Drop',
                      style: const TextStyle(
                        color: AppColors.error,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        const SizedBox(height: 12),
        // Legend
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
                width: 14, height: 3, color: AppColors.primary),
            const SizedBox(width: 4),
            Text(context.tr('fuel_level'),
                style: TextStyle(color: context.textMutedColor, fontSize: 11)),
            const SizedBox(width: 16),
            Container(
                width: 10, height: 10,
                decoration: const BoxDecoration(
                    shape: BoxShape.circle, color: AppColors.error)),
            const SizedBox(width: 4),
            Text(context.tr('suspicious_drop'),
                style: TextStyle(color: context.textMutedColor, fontSize: 11)),
          ],
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  Widget _sectionLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Text(
        text,
        style: TextStyle(
          color: context.textMutedColor,
          fontSize: 12,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Color _severityColor(AlertSeverity s) {
    switch (s) {
      case AlertSeverity.critical:
        return AppColors.error;
      case AlertSeverity.warning:
        return AppColors.warning;
      case AlertSeverity.info:
        return AppColors.secondary;
    }
  }

  String _severityLabel(AlertSeverity s) {
    switch (s) {
      case AlertSeverity.critical:
        return 'CRITICAL';
      case AlertSeverity.warning:
        return 'WARNING';
      case AlertSeverity.info:
        return 'INFO';
    }
  }

  String _relativeTime(DateTime t) {
    final diff = DateTime.now().difference(t);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

extension _IndexedMap<T> on Iterable<T> {
  Iterable<R> mapIndexed<R>(R Function(int i, T e) f) {
    var i = 0;
    return map((e) => f(i++, e));
  }
}
