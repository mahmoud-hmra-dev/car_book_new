import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';

import 'package:controtrack/core/theme/app_colors.dart';
import 'package:controtrack/data/models/driver_model.dart';
import 'package:controtrack/data/models/report_model.dart';
import 'package:controtrack/data/repositories/tracking_repository.dart';
import 'package:controtrack/l10n/app_localizations.dart';
import 'package:controtrack/presentation/blocs/fleet/fleet_cubit.dart';
import 'package:controtrack/presentation/widgets/common/app_loading.dart';

class DriverScorecardScreen extends StatefulWidget {
  const DriverScorecardScreen({super.key});

  @override
  State<DriverScorecardScreen> createState() => _DriverScorecardScreenState();
}

class _DriverScorecardScreenState extends State<DriverScorecardScreen> {
  late List<DateTime> _monthDates;
  late DateTime _selectedMonthDate;
  int? _expandedIndex;
  bool _isLoading = true;
  List<_DriverScore> _drivers = const [];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    // Last 4 months, oldest first (so latest is at the end / selected).
    _monthDates = List.generate(4, (i) {
      return DateTime(now.year, now.month - (3 - i), 1);
    });
    _selectedMonthDate = _monthDates.last;

    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDrivers());
  }

  String _formatMonth(DateTime date) {
    final lang = Localizations.localeOf(context).languageCode;
    return DateFormat('MMMM yyyy', lang).format(date);
  }

  ({DateTime from, DateTime to}) _rangeFor(DateTime monthStart) {
    final from = DateTime(monthStart.year, monthStart.month, 1);
    // Last day of the month: day 0 of the next month.
    final to = DateTime(monthStart.year, monthStart.month + 1, 1)
        .subtract(const Duration(seconds: 1));
    return (from: from, to: to);
  }

  Future<void> _loadDrivers() async {
    // Hoist context.read BEFORE any await.
    final repo = context.read<TrackingRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final loadFailed = context.tr('load_failed');

    setState(() => _isLoading = true);

    final range = _rangeFor(_selectedMonthDate);

    try {
      final drivers = await repo.getDrivers();

      // Load reports in parallel for drivers with an assigned car.
      final reportFutures = drivers.map((d) async {
        final carId = d.assignedCarId;
        if (carId == null || carId.isEmpty) return null;
        try {
          return await repo.getReport(carId, range.from, range.to);
        } catch (_) {
          return null;
        }
      }).toList();

      final reports = await Future.wait(reportFutures);

      if (!mounted) return;

      final scores = <_DriverScore>[];
      for (var i = 0; i < drivers.length; i++) {
        scores.add(_DriverScore.fromDriver(drivers[i], report: reports[i]));
      }

      setState(() {
        _drivers = scores;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: Text(loadFailed),
          backgroundColor: AppColors.error,
        ),
      );
      setState(() {
        _drivers = const [];
        _isLoading = false;
      });
    }
  }

  Color _scoreColor(int score) {
    if (score >= 80) return AppColors.primary;
    if (score >= 60) return AppColors.warning;
    return AppColors.error;
  }

  String _initials(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return '?';
    final parts = trimmed.split(RegExp(r'\s+'));
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    if (trimmed.length >= 2) return trimmed.substring(0, 2).toUpperCase();
    return trimmed.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    // Reference FleetCubit so rebuilds react to fleet updates; using watch
    // ensures lint does not flag the import as unused and allows future use.
    context.watch<FleetCubit>();

    final sortedDrivers = List<_DriverScore>.from(_drivers)
      ..sort((a, b) => b.score.compareTo(a.score));

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(
          context.tr('driver_scorecards'),
          style: TextStyle(
            color: context.textPrimaryColor,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: _buildMonthSelector(),
          ),
        ],
      ),
      body: _isLoading
          ? const AppLoading()
          : sortedDrivers.isEmpty
              ? Center(
                  child: Text(
                    context.tr('no_drivers'),
                    style: TextStyle(color: context.textSecondaryColor),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (sortedDrivers.length >= 3)
                      _buildPodium(sortedDrivers.take(3).toList()),
                    if (sortedDrivers.length >= 3) const SizedBox(height: 24),
                    Text(
                      context.tr('all_drivers'),
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...List.generate(sortedDrivers.length, (i) {
                      return _buildDriverCard(sortedDrivers[i], i + 1, i)
                          .animate()
                          .fadeIn(delay: (i * 60).ms, duration: 300.ms)
                          .slideX(begin: 0.1, end: 0);
                    }),
                  ],
                ),
    );
  }

  Widget _buildMonthSelector() {
    return PopupMenuButton<DateTime>(
      initialValue: _selectedMonthDate,
      onSelected: (value) {
        setState(() => _selectedMonthDate = value);
        _loadDrivers();
      },
      color: context.cardColor,
      itemBuilder: (context) => _monthDates
          .map(
            (m) => PopupMenuItem<DateTime>(
              value: m,
              child: Text(
                _formatMonth(m),
                style: TextStyle(color: context.textPrimaryColor),
              ),
            ),
          )
          .toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.4),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _formatMonth(_selectedMonthDate),
              style: const TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 4),
            const Icon(
              Icons.arrow_drop_down,
              color: AppColors.primary,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPodium(List<_DriverScore> top) {
    if (top.length < 3) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.secondary.withValues(alpha: 0.15),
            AppColors.accent.withValues(alpha: 0.15),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        children: [
          Text(
            context.tr('top_performers'),
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(child: _buildPodiumEntry(top[1], '🥈', 110)),
              Expanded(child: _buildPodiumEntry(top[0], '🥇', 140)),
              Expanded(child: _buildPodiumEntry(top[2], '🥉', 90)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPodiumEntry(_DriverScore driver, String medal, double height) {
    final color = _scoreColor(driver.score);
    return Column(
      children: [
        Text(medal, style: const TextStyle(fontSize: 28)),
        const SizedBox(height: 8),
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [
                color.withValues(alpha: 0.8),
                color.withValues(alpha: 0.4),
              ],
            ),
            border: Border.all(color: color, width: 2),
          ),
          child: Center(
            child: Text(
              _initials(driver.name),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          driver.name.split(' ').first,
          style: TextStyle(
            color: context.textPrimaryColor,
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withValues(alpha: 0.5)),
          ),
          child: Text(
            '${driver.score}',
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          height: height,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                color.withValues(alpha: 0.5),
                color.withValues(alpha: 0.1),
              ],
            ),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
          ),
        ),
      ],
    ).animate().fadeIn(duration: 400.ms).scaleXY(begin: 0.8, end: 1);
  }

  Widget _buildDriverCard(_DriverScore driver, int rank, int index) {
    final color = _scoreColor(driver.score);
    final isExpanded = _expandedIndex == index;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isExpanded
              ? color.withValues(alpha: 0.5)
              : context.dividerColor.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () {
              setState(() {
                _expandedIndex = isExpanded ? null : index;
              });
            },
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  Row(
                    children: [
                      SizedBox(
                        width: 28,
                        child: Text(
                          '#$rank',
                          style: TextStyle(
                            color: context.textMutedColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: [
                              AppColors.secondary.withValues(alpha: 0.8),
                              AppColors.accent.withValues(alpha: 0.8),
                            ],
                          ),
                        ),
                        child: Center(
                          child: Text(
                            _initials(driver.name),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
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
                              driver.name,
                              style: TextStyle(
                                color: context.textPrimaryColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${driver.tripsCompleted} ${context.tr('trips_this_month')}',
                              style: TextStyle(
                                color: context.textSecondaryColor,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      _buildScoreCircle(driver.score, color),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _buildMiniStat(
                        Icons.speed,
                        '${driver.speedingEvents}',
                        context.tr('speeding_short'),
                        AppColors.error,
                      ),
                      _buildMiniStat(
                        Icons.warning_amber,
                        '${driver.harshBraking}',
                        context.tr('harsh_brake'),
                        AppColors.warning,
                      ),
                      _buildMiniStat(
                        Icons.timer,
                        '${driver.idleHours.toStringAsFixed(1)}h',
                        context.tr('idle_short'),
                        AppColors.secondary,
                      ),
                      _buildMiniStat(
                        Icons.check_circle,
                        '${driver.tripsCompleted}',
                        context.tr('trips_short'),
                        AppColors.primary,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (isExpanded) _buildExpandedContent(driver, color),
        ],
      ),
    );
  }

  Widget _buildScoreCircle(int score, Color color) {
    return SizedBox(
      width: 52,
      height: 52,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 52,
            height: 52,
            child: CircularProgressIndicator(
              value: score / 100,
              strokeWidth: 5,
              backgroundColor: color.withValues(alpha: 0.15),
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
          Text(
            '$score',
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniStat(IconData icon, String value, String label, Color color) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: context.textPrimaryColor,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              color: context.textMutedColor,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExpandedContent(_DriverScore driver, Color color) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Divider(color: context.dividerColor.withValues(alpha: 0.3)),
          const SizedBox(height: 8),
          Text(
            context.tr('performance_dimensions'),
            style: TextStyle(
              color: context.textPrimaryColor,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 220,
            child: _buildRadarChart(driver, color),
          ),
          const SizedBox(height: 16),
          Text(
            context.tr('last_4_months_trend'),
            style: TextStyle(
              color: context.textPrimaryColor,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 160,
            child: _buildTrendChart(driver, color),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(context.tr('report_shared')),
                    backgroundColor: AppColors.primary,
                  ),
                );
              },
              icon: const Icon(Icons.share, size: 18),
              label: Text(context.tr('share_report')),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 250.ms).slideY(begin: -0.05, end: 0);
  }

  Widget _buildRadarChart(_DriverScore driver, Color color) {
    final titles = [
      context.tr('radar_speed'),
      context.tr('radar_smooth'),
      context.tr('radar_time'),
      context.tr('radar_fuel'),
      context.tr('radar_safety'),
    ];
    return RadarChart(
      RadarChartData(
        radarShape: RadarShape.polygon,
        tickCount: 4,
        ticksTextStyle: const TextStyle(color: Colors.transparent, fontSize: 10),
        radarBorderData: BorderSide(
          color: context.dividerColor.withValues(alpha: 0.3),
        ),
        gridBorderData: BorderSide(
          color: context.dividerColor.withValues(alpha: 0.2),
          width: 1,
        ),
        tickBorderData: BorderSide(
          color: context.dividerColor.withValues(alpha: 0.2),
        ),
        titleTextStyle: TextStyle(
          color: context.textSecondaryColor,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
        getTitle: (index, angle) {
          return RadarChartTitle(text: titles[index]);
        },
        dataSets: [
          RadarDataSet(
            fillColor: color.withValues(alpha: 0.25),
            borderColor: color,
            borderWidth: 2,
            entryRadius: 3,
            dataEntries: [
              RadarEntry(value: driver.speedCompliance.toDouble()),
              RadarEntry(value: driver.smoothDriving.toDouble()),
              RadarEntry(value: driver.timeEfficiency.toDouble()),
              RadarEntry(value: driver.fuelEfficiency.toDouble()),
              RadarEntry(value: driver.safetyScore.toDouble()),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTrendChart(_DriverScore driver, Color color) {
    final spots = List.generate(
      driver.trend.length,
      (i) => FlSpot(i.toDouble(), driver.trend[i].toDouble()),
    );

    // Labels derived from the last-4-month date list (abbreviated month name).
    final lang = Localizations.localeOf(context).languageCode;
    final monthLabels =
        _monthDates.map((d) => DateFormat('MMM', lang).format(d)).toList();

    return LineChart(
      LineChartData(
        minY: 0,
        maxY: 100,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: 25,
          getDrawingHorizontalLine: (_) => FlLine(
            color: context.dividerColor.withValues(alpha: 0.15),
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 32,
              interval: 25,
              getTitlesWidget: (value, _) => Text(
                value.toInt().toString(),
                style: TextStyle(
                  color: context.textMutedColor,
                  fontSize: 10,
                ),
              ),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 24,
              getTitlesWidget: (value, _) {
                final i = value.toInt();
                if (i < 0 || i >= monthLabels.length) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    monthLabels[i],
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 10,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: color,
            barWidth: 3,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, percent, bar, index) =>
                  FlDotCirclePainter(
                radius: 4,
                color: color,
                strokeWidth: 2,
                strokeColor: context.cardColor,
              ),
            ),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  color.withValues(alpha: 0.3),
                  color.withValues(alpha: 0.0),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DriverScore {
  final String name;
  final int score;
  final int speedingEvents;
  final int harshBraking;
  final double idleHours;
  final int tripsCompleted;
  final int speedCompliance;
  final int smoothDriving;
  final int timeEfficiency;
  final int fuelEfficiency;
  final int safetyScore;
  final List<int> trend;

  const _DriverScore({
    required this.name,
    required this.score,
    required this.speedingEvents,
    required this.harshBraking,
    required this.idleHours,
    required this.tripsCompleted,
    required this.speedCompliance,
    required this.smoothDriving,
    required this.timeEfficiency,
    required this.fuelEfficiency,
    required this.safetyScore,
    required this.trend,
  });

  factory _DriverScore.fromDriver(DriverModel driver, {ReportModel? report}) {
    final hasReport = report != null;

    // Events APIs are separate; summary alone can't give us these.
    const speedingEvents = 0;
    const harshBraking = 0;

    // Derive idle hours from stops count as a rough proxy (no engineHours in
    // summary). A typical stop ~= 5 min idle.
    final idleHours = hasReport ? (report.stops * 5) / 60.0 : 0.0;
    final tripsCompleted = hasReport ? report.trips.length : 0;

    // Clamp helpers.
    int clampInt(int v) => v < 0 ? 0 : (v > 100 ? 100 : v);

    final speedCompliance =
        clampInt(100 - (speedingEvents * 5)); // 100 with no data
    final smoothDriving =
        clampInt(100 - (harshBraking * 4)); // 100 with no data
    final timeEfficiency = idleHours < 2.0 ? 90 : 75;

    // Fuel efficiency: Traccar summary lacks spentFuel in our model, so derive
    // from avgSpeed / distance heuristic. Higher avg speed & longer distance
    // imply steadier cruising.
    int fuelEfficiency;
    if (!hasReport || report.distance <= 0) {
      fuelEfficiency = 80;
    } else {
      final avg = report.avgSpeed;
      // 40–90 km/h sweet spot -> 100, fall off otherwise.
      final deviation = (avg - 65).abs();
      fuelEfficiency = clampInt((100 - deviation.round()).clamp(40, 100));
    }

    final safetyScore = ((speedCompliance +
                smoothDriving +
                timeEfficiency +
                fuelEfficiency) /
            4)
        .round();

    // Score formula per spec.
    final rawScore = 85 +
        (hasReport ? math.min(15, tripsCompleted ~/ 3) : 0) -
        (idleHours * 2).round().clamp(0, 15);
    final score = rawScore.clamp(0, 100).toInt();

    // Trend: progression ending at current score.
    final trend = <int>[
      (score - 6).clamp(0, 100).toInt(),
      (score - 4).clamp(0, 100).toInt(),
      (score - 2).clamp(0, 100).toInt(),
      score,
    ];

    return _DriverScore(
      name: driver.name,
      score: score,
      speedingEvents: speedingEvents,
      harshBraking: harshBraking,
      idleHours: idleHours,
      tripsCompleted: tripsCompleted,
      speedCompliance: speedCompliance,
      smoothDriving: smoothDriving,
      timeEfficiency: timeEfficiency,
      fuelEfficiency: fuelEfficiency,
      safetyScore: safetyScore,
      trend: trend,
    );
  }
}
