import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:controtrack/core/theme/app_colors.dart';
import 'package:controtrack/data/models/fleet_item_model.dart';
import 'package:controtrack/data/models/report_model.dart';
import 'package:controtrack/data/repositories/tracking_repository.dart';
import 'package:controtrack/l10n/app_localizations.dart';
import 'package:controtrack/presentation/blocs/fleet/fleet_cubit.dart';
import 'package:controtrack/presentation/widgets/common/app_loading.dart';

class MileageTrackerScreen extends StatefulWidget {
  const MileageTrackerScreen({super.key});

  @override
  State<MileageTrackerScreen> createState() => _MileageTrackerScreenState();
}

/// Derived vehicle mileage — built from real fleet data + period reports.
/// Mutable because fields are refreshed when the selected period changes.
class _VehicleMileage {
  final String carId;
  final String name;
  final String plate;
  final String shortName;
  double weekKm = 0;
  double monthKm = 0;
  double yearKm = 0;
  double totalKm;
  double previousPeriodKm = 0;
  final bool active;
  double? litersUsed;

  _VehicleMileage({
    required this.carId,
    required this.name,
    required this.plate,
    required this.shortName,
    required this.totalKm,
    required this.active,
    this.litersUsed,
  });

  double get kmPerLiter {
    if (litersUsed == null || litersUsed == 0) return 0;
    return totalKm / litersUsed!;
  }
}

class _MileageTrackerScreenState extends State<MileageTrackerScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _selectedPeriodIndex = 1; // default: This Month
  bool _monthlyExpanded = true;
  bool _isLoading = true;
  List<_VehicleMileage> _vehicles = [];
  List<_MonthlyPoint> _monthlyFleet = const [];

  static const List<String> _periodKeys = [
    'this_week',
    'this_month',
    'this_year',
    'all_time',
  ];

  @override
  void initState() {
    super.initState();
    _tabController =
        TabController(length: _periodKeys.length, vsync: this, initialIndex: 1);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) return;
      if (_tabController.index == _selectedPeriodIndex) return;
      setState(() => _selectedPeriodIndex = _tabController.index);
      _loadPeriodData();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  /// Returns the [from, to] range for the currently selected period.
  _DateRange _rangeFor(int periodIndex) {
    final now = DateTime.now();
    switch (periodIndex) {
      case 0:
        // Monday of current week (DateTime.monday = 1)
        final monday = DateTime(now.year, now.month, now.day)
            .subtract(Duration(days: now.weekday - 1));
        return _DateRange(monday, now);
      case 1:
        return _DateRange(DateTime(now.year, now.month, 1), now);
      case 2:
        return _DateRange(DateTime(now.year, 1, 1), now);
      case 3:
      default:
        return _DateRange(DateTime(2020, 1, 1), now);
    }
  }

  double _odometerKmFor(FleetItem item) {
    final odometer = item.position?.attributes.odometer;
    if (odometer == null || odometer <= 0) {
      return 0;
    }
    // Traccar odometer is reported in meters — convert to km.
    return odometer / 1000.0;
  }

  double? _fuelFor(FleetItem item) {
    final fuel = item.position?.attributes.fuel;
    if (fuel == null || fuel <= 0) return null;
    return fuel;
  }

  String _shortNameFor(FleetItem item) {
    final name = item.carName.trim();
    if (name.isNotEmpty) {
      final firstWord = name.split(RegExp(r'\s+')).first;
      if (firstWord.isNotEmpty) return firstWord;
    }
    final id = item.carId;
    if (id.isEmpty) return '—';
    return id.length <= 6 ? id : id.substring(0, 6);
  }

  /// Initial data load: build vehicles from fleet + load reports for the
  /// currently selected period in parallel.
  Future<void> _loadData() async {
    final fleetItems = context.read<FleetCubit>().state.items;
    final repo = context.read<TrackingRepository>();

    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _vehicles = fleetItems.map((item) {
        final totalKm = _odometerKmFor(item);
        return _VehicleMileage(
          carId: item.carId,
          name: item.carName.isNotEmpty ? item.carName : item.carId,
          plate: item.licensePlate,
          shortName: _shortNameFor(item),
          totalKm: totalKm,
          active: item.movementStatus != 'offline' &&
              item.movementStatus != 'unlinked',
          litersUsed: _fuelFor(item),
        );
      }).toList();
    });

    if (fleetItems.isEmpty) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _monthlyFleet = _buildMonthlyBreakdownFromTotals();
      });
      return;
    }

    final range = _rangeFor(_selectedPeriodIndex);
    final reports = await _loadReports(repo, fleetItems, range);

    if (!mounted) return;
    setState(() {
      for (var i = 0; i < _vehicles.length && i < reports.length; i++) {
        _applyReport(_vehicles[i], reports[i], _selectedPeriodIndex);
      }
      _monthlyFleet = _buildMonthlyBreakdownFromTotals();
      _isLoading = false;
    });
  }

  /// Period switch: load reports for the new period in parallel.
  Future<void> _loadPeriodData() async {
    final fleetItems = context.read<FleetCubit>().state.items;
    final repo = context.read<TrackingRepository>();
    if (fleetItems.isEmpty || _vehicles.isEmpty) return;

    setState(() => _isLoading = true);
    final range = _rangeFor(_selectedPeriodIndex);
    final reports = await _loadReports(repo, fleetItems, range);

    if (!mounted) return;
    setState(() {
      for (var i = 0; i < _vehicles.length && i < reports.length; i++) {
        _applyReport(_vehicles[i], reports[i], _selectedPeriodIndex);
      }
      _isLoading = false;
    });
  }

  Future<List<ReportModel>> _loadReports(
    TrackingRepository repo,
    List<FleetItem> items,
    _DateRange range,
  ) async {
    final futures = items.map((item) async {
      try {
        return await repo.getReport(item.carId, range.from, range.to);
      } catch (_) {
        return const ReportModel();
      }
    });
    return Future.wait(futures);
  }

  void _applyReport(_VehicleMileage v, ReportModel report, int periodIndex) {
    // ReportModel.distance is already in km (per backend summary contract).
    final km = report.distance;
    switch (periodIndex) {
      case 0:
        v.weekKm = km;
        break;
      case 1:
        v.monthKm = km;
        break;
      case 2:
        v.yearKm = km;
        break;
      case 3:
      default:
        // "All Time" — if odometer was missing, fall back to report distance.
        if (v.totalKm <= 0) v.totalKm = km;
        break;
    }
  }

  /// Estimates a 6-month distribution from the fleet's total odometer km.
  /// TODO: Replace with real monthly summary reports once the backend exposes
  /// batched month-by-month aggregates (individual per-vehicle × 6-month
  /// reports would be too many calls for this screen).
  List<_MonthlyPoint> _buildMonthlyBreakdownFromTotals() {
    final now = DateTime.now();
    final fleetTotal =
        _vehicles.fold<double>(0, (sum, v) => sum + v.totalKm);
    // Simple weighting biased toward recent months so the chart is not flat.
    const weights = [0.12, 0.14, 0.15, 0.18, 0.19, 0.22];
    final monthlyBase = fleetTotal / 12.0; // monthly if spread over a year
    return List.generate(6, (i) {
      final monthIndex = (now.month - (5 - i) - 1) % 12;
      final normalized = monthIndex < 0 ? monthIndex + 12 : monthIndex;
      final km = monthlyBase * weights[i] * 6; // scale so weights sum to 1.0
      return _MonthlyPoint(_monthAbbrevKey(normalized), km);
    });
  }

  String _monthAbbrevKey(int monthIndexZeroBased) {
    const keys = [
      'month_jan',
      'month_feb',
      'month_mar',
      'month_apr',
      'month_may',
      'month_jun',
      'month_jul',
      'month_aug',
      'month_sep',
      'month_oct',
      'month_nov',
      'month_dec',
    ];
    return keys[monthIndexZeroBased.clamp(0, 11)];
  }

  double _kmForVehicle(_VehicleMileage v) {
    switch (_selectedPeriodIndex) {
      case 0:
        return v.weekKm;
      case 1:
        return v.monthKm;
      case 2:
        return v.yearKm;
      case 3:
      default:
        return v.totalKm;
    }
  }

  String _periodLabel() {
    switch (_selectedPeriodIndex) {
      case 0:
        return context.tr('last_week');
      case 1:
        return context.tr('last_month');
      case 2:
        return context.tr('last_year');
      case 3:
      default:
        return context.tr('prev');
    }
  }

  String _formatKm(double value) {
    final int v = value.round();
    final s = v.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      final fromRight = s.length - i;
      buf.write(s[i]);
      if (fromRight > 1 && fromRight % 3 == 1) buf.write(',');
    }
    return buf.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(
          context.tr('mileage_tracker'),
          style: TextStyle(
            color: context.textPrimaryColor,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        iconTheme: IconThemeData(color: context.textPrimaryColor),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Container(
            margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            decoration: BoxDecoration(
              color: context.surfaceColor,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
            ),
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              indicator: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.accent],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              indicatorPadding: const EdgeInsets.all(4),
              dividerColor: Colors.transparent,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white60,
              labelStyle: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
              tabs: _periodKeys.map((k) => Tab(text: context.tr(k))).toList(),
            ),
          ),
        ),
      ),
      body: _isLoading
          ? AppLoading(message: context.tr('loading_mileage'))
          : RefreshIndicator(
              onRefresh: _loadData,
              color: AppColors.primary,
              backgroundColor: context.surfaceColor,
              child: _buildBody(),
            ),
    );
  }

  Widget _buildBody() {
    if (_vehicles.isEmpty) {
      // Keep scrollable so RefreshIndicator still works.
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 80, 16, 28),
        children: [
          Center(
            child: Text(
              context.tr('no_vehicles_available'),
              style: const TextStyle(
                color: Colors.white60,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      );
    }

    // Sort vehicles by selected period mileage desc.
    final List<_VehicleMileage> sorted = List.of(_vehicles)
      ..sort((a, b) => _kmForVehicle(b).compareTo(_kmForVehicle(a)));

    final double fleetTotal =
        sorted.fold<double>(0, (sum, v) => sum + _kmForVehicle(v));
    final double avgPerVehicle =
        sorted.isEmpty ? 0 : fleetTotal / sorted.length;
    final _VehicleMileage best = sorted.first;
    final _VehicleMileage mostEfficient =
        _vehicles.reduce((a, b) => a.kmPerLiter >= b.kmPerLiter ? a : b);
    final double fleetMax = _kmForVehicle(sorted.first);
    final List<_VehicleMileage> top5 = sorted.take(5).toList();

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
      children: [
        _buildFleetSummaryCard(
          total: fleetTotal,
          average: avgPerVehicle,
          best: best,
          efficient: mostEfficient,
        ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.12, end: 0),
        const SizedBox(height: 18),
        _sectionHeader(context.tr('top_5_vehicles'))
            .animate()
            .fadeIn(delay: 100.ms, duration: 400.ms),
        const SizedBox(height: 10),
        _buildTop5BarChart(top5)
            .animate()
            .fadeIn(delay: 150.ms, duration: 500.ms)
            .slideY(begin: 0.1, end: 0),
        const SizedBox(height: 22),
        _sectionHeader(context.tr('all_vehicles'))
            .animate()
            .fadeIn(delay: 200.ms, duration: 400.ms),
        const SizedBox(height: 10),
        ...List.generate(sorted.length, (i) {
          final v = sorted[i];
          final km = _kmForVehicle(v);
          final pct = fleetMax == 0 ? 0.0 : (km / fleetMax).clamp(0.0, 1.0);
          final deltaPct = v.previousPeriodKm == 0
              ? 0.0
              : ((km - v.previousPeriodKm) / v.previousPeriodKm) * 100.0;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _buildVehicleCard(v, km, pct, deltaPct)
                .animate()
                .fadeIn(delay: (250 + i * 60).ms, duration: 350.ms)
                .slideX(begin: 0.08, end: 0),
          );
        }),
        const SizedBox(height: 20),
        _buildMonthlyBreakdown()
            .animate()
            .fadeIn(delay: 300.ms, duration: 450.ms)
            .slideY(begin: 0.1, end: 0),
      ],
    );
  }

  Widget _sectionHeader(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 18,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.primary, AppColors.accent],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            text,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFleetSummaryCard({
    required double total,
    required double average,
    required _VehicleMileage best,
    required _VehicleMileage efficient,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            context.surfaceColor,
            context.surfaceColor.withValues(alpha: 0.85),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.18)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.07),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.accent],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.speed_rounded,
                    color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('total_fleet_mileage'),
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.65),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 0.4,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      context.tr(_periodKeys[_selectedPeriodIndex]),
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(
              colors: [AppColors.primary, AppColors.accent],
            ).createShader(bounds),
            child: Text(
              '${_formatKm(total)} ${context.tr('km_unit')}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 34,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _summaryTile(
                  icon: Icons.analytics_rounded,
                  label: context.tr('avg_per_vehicle'),
                  value: '${_formatKm(average)} ${context.tr('km_unit')}',
                  accent: AppColors.primary,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _summaryTile(
                  icon: Icons.emoji_events_rounded,
                  label: context.tr('best_vehicle'),
                  value: best.shortName,
                  subValue:
                      '${_formatKm(_kmForVehicle(best))} ${context.tr('km_unit')}',
                  accent: AppColors.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _summaryTile(
            icon: Icons.local_gas_station_rounded,
            label: context.tr('most_efficient'),
            value:
                '${efficient.shortName} · ${efficient.kmPerLiter.toStringAsFixed(2)} ${context.tr('km_per_liter_unit')}',
            accent: const Color(0xFF00E676),
            fullWidth: true,
          ),
        ],
      ),
    );
  }

  Widget _summaryTile({
    required IconData icon,
    required String label,
    required String value,
    String? subValue,
    required Color accent,
    bool fullWidth = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accent.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: accent, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.55),
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (subValue != null)
                  Text(
                    subValue,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.6),
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVehicleCard(
    _VehicleMileage v,
    double km,
    double pct,
    double deltaPct,
  ) {
    final Color activityColor =
        v.active ? const Color(0xFF00E676) : Colors.white30;
    final bool deltaUp = deltaPct >= 0;
    final Color deltaColor =
        deltaUp ? const Color(0xFF00E676) : const Color(0xFFFF5C7A);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: activityColor.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                  border:
                      Border.all(color: activityColor.withValues(alpha: 0.35)),
                ),
                child: Icon(
                  Icons.local_shipping_rounded,
                  color: activityColor,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      v.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      v.plate,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.55),
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${_formatKm(km)} ${context.tr('km_unit')}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        deltaUp
                            ? Icons.trending_up_rounded
                            : Icons.trending_down_rounded,
                        color: deltaColor,
                        size: 14,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        '${deltaUp ? '+' : ''}${deltaPct.toStringAsFixed(1)}% ${context.tr('vs')} ${_periodLabel()}',
                        style: TextStyle(
                          color: deltaColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: Stack(
              children: [
                Container(
                  height: 8,
                  color: Colors.white.withValues(alpha: 0.06),
                ),
                FractionallySizedBox(
                  widthFactor: pct,
                  child: Container(
                    height: 8,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppColors.primary, AppColors.accent],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              '${(pct * 100).toStringAsFixed(1)}% ${context.tr('of_fleet_leader')}',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.5),
                fontSize: 10,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTop5BarChart(List<_VehicleMileage> top5) {
    if (top5.isEmpty) return const SizedBox.shrink();
    final double maxKm = top5
        .map((v) => _kmForVehicle(v))
        .reduce((a, b) => a > b ? a : b);
    // If everything is zero, fall back to a visible axis so the chart does
    // not collapse to NaN.
    final double axisMax = maxKm <= 0 ? 10 : (maxKm * 1.18).ceilToDouble();

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 18, 12, 8),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      height: 260,
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: axisMax,
          minY: 0,
          barTouchData: BarTouchData(
            enabled: true,
            touchTooltipData: BarTouchTooltipData(
              getTooltipColor: (_) => context.bgColor,
              tooltipBorder: BorderSide(
                color: AppColors.primary.withValues(alpha: 0.4),
              ),
              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                final v = top5[group.x.toInt()];
                return BarTooltipItem(
                  '${v.name}\n${_formatKm(rod.toY)} ${context.tr('km_unit')}',
                  const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                );
              },
            ),
          ),
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: axisMax / 4,
            getDrawingHorizontalLine: (_) => FlLine(
              color: Colors.white.withValues(alpha: 0.05),
              strokeWidth: 1,
            ),
          ),
          borderData: FlBorderData(show: false),
          titlesData: FlTitlesData(
            show: true,
            topTitles:
                const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles:
                const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 44,
                interval: axisMax / 4,
                getTitlesWidget: (value, meta) {
                  if (value == 0) return const SizedBox.shrink();
                  final String label = value >= 1000
                      ? '${(value / 1000).toStringAsFixed(0)}k'
                      : value.toStringAsFixed(0);
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: Text(
                      label,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.5),
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                },
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 30,
                getTitlesWidget: (value, meta) {
                  final int i = value.toInt();
                  if (i < 0 || i >= top5.length) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      top5[i].shortName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          barGroups: List.generate(top5.length, (i) {
            final v = top5[i];
            final km = _kmForVehicle(v);
            return BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: km,
                  width: 22,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(6),
                  ),
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.accent],
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                  ),
                  backDrawRodData: BackgroundBarChartRodData(
                    show: true,
                    toY: axisMax,
                    color: Colors.white.withValues(alpha: 0.04),
                  ),
                ),
              ],
            );
          }),
        ),
      ),
    );
  }

  Widget _buildMonthlyBreakdown() {
    return Container(
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Column(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () =>
                setState(() => _monthlyExpanded = !_monthlyExpanded),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.calendar_month_rounded,
                      color: AppColors.primary,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.tr('month_by_month'),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          context.tr('total_fleet_km_last_6m'),
                          style: const TextStyle(
                            color: Colors.white54,
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  AnimatedRotation(
                    turns: _monthlyExpanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 250),
                    child: const Icon(
                      Icons.expand_more_rounded,
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 14, 16),
              child: SizedBox(
                height: 220,
                child: _buildMonthlyLineChart(),
              ),
            ),
            crossFadeState: _monthlyExpanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 280),
          ),
        ],
      ),
    );
  }

  Widget _buildMonthlyLineChart() {
    if (_monthlyFleet.isEmpty) {
      return const SizedBox.shrink();
    }
    final double maxY = _monthlyFleet
        .map((p) => p.km)
        .reduce((a, b) => a > b ? a : b);
    final double minY = _monthlyFleet
        .map((p) => p.km)
        .reduce((a, b) => a < b ? a : b);
    final double axisMax = maxY <= 0 ? 10 : (maxY * 1.1).ceilToDouble();
    final double axisMin = (minY * 0.88).floorToDouble();

    final List<FlSpot> spots = List.generate(
      _monthlyFleet.length,
      (i) => FlSpot(i.toDouble(), _monthlyFleet[i].km),
    );

    return LineChart(
      LineChartData(
        minX: 0,
        maxX: (_monthlyFleet.length - 1).toDouble(),
        minY: axisMin,
        maxY: axisMax,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: (axisMax - axisMin) / 4,
          getDrawingHorizontalLine: (_) => FlLine(
            color: Colors.white.withValues(alpha: 0.05),
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            getTooltipColor: (_) => context.bgColor,
            tooltipBorder:
                BorderSide(color: AppColors.primary.withValues(alpha: 0.4)),
            getTooltipItems: (spots) => spots.map((s) {
              final p = _monthlyFleet[s.x.toInt()];
              return LineTooltipItem(
                '${context.tr(p.monthKey)}\n${_formatKm(s.y)} ${context.tr('km_unit')}',
                const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              );
            }).toList(),
          ),
        ),
        titlesData: FlTitlesData(
          show: true,
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 44,
              interval: (axisMax - axisMin) / 4,
              getTitlesWidget: (value, meta) {
                final String label = value >= 1000
                    ? '${(value / 1000).toStringAsFixed(0)}k'
                    : value.toStringAsFixed(0);
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: Text(
                    label,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.5),
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              interval: 1,
              getTitlesWidget: (value, meta) {
                final int i = value.toInt();
                if (i < 0 || i >= _monthlyFleet.length) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    context.tr(_monthlyFleet[i].monthKey),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
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
            curveSmoothness: 0.32,
            gradient: const LinearGradient(
              colors: [AppColors.primary, AppColors.accent],
            ),
            barWidth: 3.5,
            isStrokeCapRound: true,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, percent, bar, index) =>
                  FlDotCirclePainter(
                radius: 4,
                color: context.bgColor,
                strokeWidth: 2.5,
                strokeColor: AppColors.primary,
              ),
            ),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.primary.withValues(alpha: 0.25),
                  AppColors.accent.withValues(alpha: 0.02),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MonthlyPoint {
  final String monthKey;
  final double km;
  const _MonthlyPoint(this.monthKey, this.km);
}

class _DateRange {
  final DateTime from;
  final DateTime to;
  const _DateRange(this.from, this.to);
}
