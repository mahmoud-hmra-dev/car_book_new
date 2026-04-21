import 'package:controtrack/core/theme/app_colors.dart';
import 'package:controtrack/data/models/fleet_item_model.dart';
import 'package:controtrack/data/models/report_model.dart';
import 'package:controtrack/data/repositories/tracking_repository.dart';
import 'package:controtrack/l10n/app_localizations.dart';
import 'package:controtrack/presentation/blocs/fleet/fleet_cubit.dart';
import 'package:controtrack/presentation/widgets/common/app_error.dart';
import 'package:controtrack/presentation/widgets/common/app_loading.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

class ExecutiveSummaryScreen extends StatefulWidget {
  const ExecutiveSummaryScreen({super.key});

  @override
  State<ExecutiveSummaryScreen> createState() => _ExecutiveSummaryScreenState();
}

class _ExecutiveSummaryScreenState extends State<ExecutiveSummaryScreen> {
  String _selectedPeriod = 'This Month';
  final List<String> _periods = <String>[
    'Today',
    'This Week',
    'This Month',
    'This Quarter',
    'This Year',
  ];

  // Chart line toggles
  bool _showTrips = true;
  bool _showKmPerDay = true;
  bool _showAlerts = false;
  bool _showIdleHours = false;

  // Donut touched segment
  int _touchedIndex = -1;

  // Loading state
  bool _isLoading = true;
  String? _error;

  // Data populated from API
  List<_Kpi> _kpis = <_Kpi>[];
  List<_HealthSegment> _health = <_HealthSegment>[];
  List<double> _trips = List<double>.filled(7, 0);
  List<double> _kmPerDay = List<double>.filled(7, 0);
  List<double> _alerts = List<double>.filled(7, 0);
  List<double> _idleHours = List<double>.filled(7, 0);

  // Top performers — populated from per-vehicle reports
  String _topVehicleName = '';
  int _topVehicleScore = 0;
  String _bestDistanceVehicleName = '';
  double _bestVehicleDistance = 0;
  double _bestVehicleUptime = 0;

  final List<_Concern> _concerns = <_Concern>[
    _Concern(
      icon: Icons.build_circle_outlined,
      color: AppColors.warning,
      messageKey: 'concern_overdue_service',
      actionLabelKey: 'schedule',
    ),
    _Concern(
      icon: Icons.access_time,
      color: AppColors.error,
      messageKey: 'concern_hos_limit',
      actionLabelKey: 'review',
    ),
    _Concern(
      icon: Icons.location_off_outlined,
      color: AppColors.accent,
      messageKey: 'concern_geofence_violations',
      actionLabelKey: 'view',
    ),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  /// Returns `[from, to]` for the currently selected period.
  _DateRange _rangeForSelected() {
    final DateTime now = DateTime.now();
    switch (_selectedPeriod) {
      case 'Today':
        return _DateRange(now.subtract(const Duration(hours: 24)), now);
      case 'This Week':
        return _DateRange(now.subtract(const Duration(days: 7)), now);
      case 'This Quarter':
        return _DateRange(now.subtract(const Duration(days: 90)), now);
      case 'This Year':
        return _DateRange(now.subtract(const Duration(days: 365)), now);
      case 'This Month':
      default:
        return _DateRange(now.subtract(const Duration(days: 30)), now);
    }
  }

  /// Number of days covered by the currently selected period. Used to
  /// approximate daily averages for the weekly chart.
  int _daysInSelected() {
    switch (_selectedPeriod) {
      case 'Today':
        return 1;
      case 'This Week':
        return 7;
      case 'This Quarter':
        return 90;
      case 'This Year':
        return 365;
      case 'This Month':
      default:
        return 30;
    }
  }

  Future<void> _load() async {
    // Capture dependencies before any await so that we never read `context`
    // across an async gap.
    final FleetCubit fleetCubit = context.read<FleetCubit>();
    final TrackingRepository repo = context.read<TrackingRepository>();
    final HealthSummary summary = fleetCubit.state.summary;
    final List<FleetItem> items = fleetCubit.state.items;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    // Fleet health doesn't depend on reports — populate immediately.
    final List<_HealthSegment> health = <_HealthSegment>[
      _HealthSegment('moving', summary.moving.toDouble(), AppColors.primary),
      _HealthSegment('idle', summary.idle.toDouble(), AppColors.warning),
      _HealthSegment('stopped', summary.stopped.toDouble(), AppColors.secondary),
      _HealthSegment(
        'offline',
        (summary.offline + summary.stale + summary.noGps + summary.unlinked)
            .toDouble(),
        context.textMutedColor,
      ),
    ];

    try {
      final _DateRange range = _rangeForSelected();
      final List<ReportModel> reports = await _loadReports(repo, items, range);

      // Aggregate KPIs from reports.
      double totalDistance = 0;
      int totalTrips = 0;
      int incidentsCount = 0;
      double avgSpeedSum = 0;
      int avgSpeedCount = 0;
      int totalStops = 0;

      for (final ReportModel r in reports) {
        totalDistance += r.distance;
        totalTrips += r.trips.length;
        if (r.maxSpeed > 120) incidentsCount += 1;
        if (r.avgSpeed > 0) {
          avgSpeedSum += r.avgSpeed;
          avgSpeedCount += 1;
        }
        totalStops += r.stops;
      }

      final double avgSpeed =
          avgSpeedCount > 0 ? avgSpeedSum / avgSpeedCount : 0;
      final double fleetUtilization = summary.total > 0
          ? ((summary.moving + summary.idle) / summary.total) * 100.0
          : 0;
      // Same scoring formula used by the driver behavior screen.
      final double avgDriverScore =
          (100 - totalStops * 1.5).clamp(30.0, 100.0).toDouble();

      // Fuel cost is not provided by the backend — approximate from distance
      // using a rough industry average (L/100km × price per L). We keep the
      // KPI card visible so the layout is stable, and mark the delta flat.
      const double litersPer100Km = 10.0;
      const double pricePerLiter = 1.5; // USD
      final double fuelCost =
          (totalDistance * litersPer100Km / 100.0) * pricePerLiter;

      // Approximate total idle time across the fleet (hours). We don't have a
      // dedicated idle metric from the report, so we derive it from the number
      // of currently-idle vehicles as a rough average over the period.
      final double totalIdleHours =
          summary.idle * (_daysInSelected().toDouble() * 2.0);

      final List<_Kpi> kpis = <_Kpi>[
        _Kpi(
          titleKey: 'total_distance',
          value: _formatNumber(totalDistance),
          unit: 'km',
          delta: '—',
          deltaDirection: _Delta.flat,
          icon: Icons.route_outlined,
          accent: AppColors.primary,
        ),
        _Kpi(
          titleKey: 'kpi_fleet_utilization',
          value: fleetUtilization.toStringAsFixed(0),
          unit: '%',
          delta: '—',
          deltaDirection: _Delta.flat,
          icon: Icons.pie_chart_outline,
          accent: AppColors.secondary,
        ),
        _Kpi(
          titleKey: 'fuel_cost',
          value: '\$${_formatNumber(fuelCost)}',
          unit: '',
          delta: '—',
          deltaDirection: _Delta.flat,
          icon: Icons.local_gas_station_outlined,
          accent: AppColors.warning,
          reverseColors: true,
        ),
        _Kpi(
          titleKey: 'avg_fleet_speed',
          value: avgSpeed.toStringAsFixed(0),
          unit: 'km/h',
          delta: '—',
          deltaDirection: _Delta.flat,
          icon: Icons.speed_outlined,
          accent: AppColors.accent,
        ),
        _Kpi(
          titleKey: 'kpi_incidents',
          value: incidentsCount.toString(),
          unit: '',
          delta: '—',
          deltaDirection: _Delta.flat,
          icon: Icons.warning_amber_outlined,
          accent: AppColors.error,
          reverseColors: true,
        ),
        _Kpi(
          titleKey: 'kpi_driver_score_avg',
          value: avgDriverScore.toStringAsFixed(0),
          unit: '/100',
          delta: '—',
          deltaDirection: _Delta.flat,
          icon: Icons.emoji_events_outlined,
          accent: AppColors.success,
        ),
      ];

      // Weekly chart: spread aggregate evenly across the 7 day points. The
      // report API doesn't expose per-day breakdowns, so this is the best we
      // can approximate without firing 7× per-vehicle calls.
      final double dailyTrips = totalTrips / 7.0;
      final double dailyKm = totalDistance / 7.0;
      final double dailyAlerts = incidentsCount / 7.0;
      final double dailyIdle = totalIdleHours / 7.0;

      // Find top-performing vehicle (fewest stops → highest score) and most
      // active vehicle (highest distance) from per-vehicle reports.
      String topName = '';
      int topScore = 0;
      String bestDistName = '';
      double bestDist = 0;
      double bestUptime = 0;
      final int periodSeconds = _daysInSelected() * 86400;
      for (int i = 0; i < reports.length; i++) {
        final ReportModel r = reports[i];
        final String name = i < items.length ? items[i].carName : 'Vehicle ${i + 1}';
        final int score = (100 - r.stops * 1.5).clamp(30.0, 100.0).toInt();
        if (topName.isEmpty || score > topScore) {
          topScore = score;
          topName = name;
        }
        if (r.distance > bestDist) {
          bestDist = r.distance;
          bestDistName = name;
          bestUptime = periodSeconds > 0
              ? (r.duration / periodSeconds * 100).clamp(0.0, 100.0)
              : 0;
        }
      }

      if (!mounted) return;
      setState(() {
        _health = health;
        _kpis = kpis;
        _trips = List<double>.filled(7, dailyTrips);
        _kmPerDay = List<double>.filled(7, dailyKm);
        _alerts = List<double>.filled(7, dailyAlerts);
        _idleHours = List<double>.filled(7, dailyIdle);
        _topVehicleName = topName.isNotEmpty ? topName : '—';
        _topVehicleScore = topScore;
        _bestDistanceVehicleName = bestDistName.isNotEmpty ? bestDistName : '—';
        _bestVehicleDistance = bestDist;
        _bestVehicleUptime = bestUptime;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _health = health;
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  /// Loads reports for every fleet vehicle in parallel. Individual failures
  /// fall back to an empty report so a single bad vehicle doesn't kill the
  /// whole screen.
  Future<List<ReportModel>> _loadReports(
    TrackingRepository repo,
    List<FleetItem> items,
    _DateRange range,
  ) async {
    if (items.isEmpty) return const <ReportModel>[];
    final Iterable<Future<ReportModel>> futures = items.map((FleetItem item) async {
      try {
        return await repo.getReport(item.carId, range.from, range.to);
      } catch (_) {
        return const ReportModel();
      }
    });
    return Future.wait(futures);
  }

  /// Formats a number with thousands separators and no decimals.
  String _formatNumber(double value) {
    final int rounded = value.round();
    final String s = rounded.toString();
    final StringBuffer out = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      final int remaining = s.length - i;
      out.write(s[i]);
      if (remaining > 1 && remaining % 3 == 1) out.write(',');
    }
    return out.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: _buildAppBar(),
      body: SafeArea(
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const AppLoading();
    }
    if (_error != null) {
      return AppError(message: _error!, onRetry: _load);
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 24),
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const SizedBox(height: 8),
          _buildHeaderSummary(),
          const SizedBox(height: 20),
          _buildSectionTitle(context.tr('section_kpi')),
          const SizedBox(height: 12),
          _buildKpiRow(),
          const SizedBox(height: 24),
          _buildSectionTitle(context.tr('fleet_health')),
          const SizedBox(height: 12),
          _buildFleetHealthCard(),
          const SizedBox(height: 24),
          _buildSectionTitle(context.tr('section_weekly_activity')),
          const SizedBox(height: 12),
          _buildActivityCard(),
          const SizedBox(height: 24),
          _buildSectionTitle(context.tr('top_performers')),
          const SizedBox(height: 12),
          _buildTopPerformers(),
          const SizedBox(height: 24),
          _buildSectionTitle(context.tr('section_concerns')),
          const SizedBox(height: 12),
          _buildConcernsList(),
          const SizedBox(height: 28),
          _buildExportButton(),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: context.bgColor,
      elevation: 0,
      scrolledUnderElevation: 0,
      title: Text(
        context.tr('executive_summary'),
        style: TextStyle(
          color: context.textPrimaryColor,
          fontWeight: FontWeight.w700,
          fontSize: 20,
        ),
      ),
      iconTheme: IconThemeData(color: context.textPrimaryColor),
      actions: <Widget>[
        Padding(
          padding: const EdgeInsets.only(right: 12),
          child: _buildPeriodSelector(),
        ),
      ],
    );
  }

  Widget _buildPeriodSelector() {
    return PopupMenuButton<String>(
      color: context.cardColor,
      initialValue: _selectedPeriod,
      onSelected: (String value) {
        if (value == _selectedPeriod) return;
        setState(() => _selectedPeriod = value);
        _load();
      },
      itemBuilder: (BuildContext context) => _periods
          .map(
            (String p) => PopupMenuItem<String>(
              value: p,
              child: Text(
                p,
                style: TextStyle(color: context.textPrimaryColor),
              ),
            ),
          )
          .toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: context.dividerColor),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text(
              _selectedPeriod,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.keyboard_arrow_down,
              color: context.textSecondaryColor,
              size: 18,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderSummary() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: <Color>[
              AppColors.primary.withValues(alpha: 0.16),
              AppColors.secondary.withValues(alpha: 0.12),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.25),
          ),
        ),
        child: Row(
          children: <Widget>[
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.insights,
                color: AppColors.primary,
                size: 24,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    context.tr('perf_overview'),
                    style: TextStyle(
                      color: context.textPrimaryColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    context.tr('perf_overview_subtitle'),
                    style: TextStyle(
                      color: context.textSecondaryColor,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.1, end: 0),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Text(
        title,
        style: TextStyle(
          color: context.textPrimaryColor,
          fontWeight: FontWeight.w700,
          fontSize: 16,
        ),
      ),
    );
  }

  Widget _buildKpiRow() {
    return SizedBox(
      height: 150,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _kpis.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (BuildContext context, int index) {
          final _Kpi kpi = _kpis[index];
          return _buildKpiCard(kpi, index);
        },
      ),
    );
  }

  Widget _buildKpiCard(_Kpi kpi, int index) {
    final Color deltaColor = switch (kpi.deltaDirection) {
      _Delta.up => AppColors.success,
      _Delta.down =>
        kpi.reverseColors ? AppColors.success : AppColors.error,
      _Delta.flat => context.textSecondaryColor,
    };

    final IconData deltaIcon = switch (kpi.deltaDirection) {
      _Delta.up => Icons.trending_up,
      _Delta.down => Icons.trending_down,
      _Delta.flat => Icons.trending_flat,
    };

    return Container(
      width: 180,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: kpi.accent.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(kpi.icon, color: kpi.accent, size: 18),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 6,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: deltaColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Icon(deltaIcon, size: 12, color: deltaColor),
                    const SizedBox(width: 2),
                    Text(
                      kpi.delta,
                      style: TextStyle(
                        color: deltaColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            context.tr(kpi.titleKey),
            style: TextStyle(
              color: context.textSecondaryColor,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          RichText(
            text: TextSpan(
              children: <InlineSpan>[
                TextSpan(
                  text: kpi.value,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (kpi.unit.isNotEmpty)
                  TextSpan(
                    text: ' ${kpi.unit}',
                    style: TextStyle(
                      color: context.textSecondaryColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
              ],
            ),
          ),
          const Spacer(),
          Text(
            context.tr('vs_last_month'),
            style: TextStyle(
              color: context.textMutedColor,
              fontSize: 10,
            ),
          ),
        ],
      ),
    )
        .animate(delay: (index * 80).ms)
        .fadeIn(duration: 400.ms)
        .slideX(begin: 0.2, end: 0);
  }

  Widget _buildFleetHealthCard() {
    final double total = _health.fold<double>(
      0,
      (double sum, _HealthSegment s) => sum + s.value,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: context.dividerColor),
        ),
        child: Row(
          children: <Widget>[
            SizedBox(
              width: 140,
              height: 140,
              child: Stack(
                alignment: Alignment.center,
                children: <Widget>[
                  PieChart(
                    PieChartData(
                      sectionsSpace: 2,
                      centerSpaceRadius: 42,
                      startDegreeOffset: -90,
                      pieTouchData: PieTouchData(
                        touchCallback:
                            (FlTouchEvent event, PieTouchResponse? response) {
                          setState(() {
                            if (!event.isInterestedForInteractions ||
                                response == null ||
                                response.touchedSection == null) {
                              _touchedIndex = -1;
                              return;
                            }
                            _touchedIndex =
                                response.touchedSection!.touchedSectionIndex;
                          });
                        },
                      ),
                      sections: List<PieChartSectionData>.generate(
                        _health.length,
                        (int i) {
                          final bool isTouched = i == _touchedIndex;
                          final _HealthSegment s = _health[i];
                          final double radius = isTouched ? 26 : 22;
                          return PieChartSectionData(
                            value: s.value <= 0 ? 0.0001 : s.value,
                            color: s.color,
                            radius: radius,
                            showTitle: false,
                          );
                        },
                      ),
                    ),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Text(
                        '${total.toInt()}',
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        context.tr('vehicles'),
                        style: TextStyle(
                          color: context.textSecondaryColor,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: _health.map((_HealthSegment s) {
                  final double pct = total == 0 ? 0 : (s.value / total) * 100;
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: <Widget>[
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: s.color,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            context.tr(s.labelKey),
                            style: TextStyle(
                              color: context.textSecondaryColor,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        Text(
                          '${s.value.toInt()}  ',
                          style: TextStyle(
                            color: context.textPrimaryColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          '${pct.toStringAsFixed(0)}%',
                          style: TextStyle(
                            color: context.textMutedColor,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.1, end: 0),
    );
  }

  Widget _buildActivityCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: context.dividerColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: <Widget>[
                _buildLegendChip(
                  context.tr('trips_today'),
                  AppColors.primary,
                  _showTrips,
                  () => setState(() => _showTrips = !_showTrips),
                ),
                _buildLegendChip(
                  'km/day',
                  AppColors.secondary,
                  _showKmPerDay,
                  () => setState(() => _showKmPerDay = !_showKmPerDay),
                ),
                _buildLegendChip(
                  context.tr('alerts'),
                  AppColors.error,
                  _showAlerts,
                  () => setState(() => _showAlerts = !_showAlerts),
                ),
                _buildLegendChip(
                  context.tr('idle_hours'),
                  AppColors.warning,
                  _showIdleHours,
                  () => setState(() => _showIdleHours = !_showIdleHours),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: LineChart(
                LineChartData(
                  minY: 0,
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    getDrawingHorizontalLine: (double value) => FlLine(
                      color: context.dividerColor.withValues(alpha: 0.5),
                      strokeWidth: 1,
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  titlesData: FlTitlesData(
                    leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        interval: 1,
                        reservedSize: 26,
                        getTitlesWidget: (double value, TitleMeta meta) {
                          const List<String> dayKeys = <String>[
                            'day_mon',
                            'day_tue',
                            'day_wed',
                            'day_thu',
                            'day_fri',
                            'day_sat',
                            'day_sun',
                          ];
                          final int idx = value.toInt();
                          if (idx < 0 || idx >= dayKeys.length) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              context.tr(dayKeys[idx]),
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
                  lineTouchData: LineTouchData(
                    touchTooltipData: LineTouchTooltipData(
                      getTooltipColor: (_) => context.bgColor,
                    ),
                  ),
                  lineBarsData: <LineChartBarData>[
                    if (_showTrips)
                      _buildLineBar(_trips, AppColors.primary),
                    if (_showKmPerDay)
                      _buildLineBar(
                        _kmPerDay.map((double v) => v / 10).toList(),
                        AppColors.secondary,
                      ),
                    if (_showAlerts)
                      _buildLineBar(_alerts, AppColors.error),
                    if (_showIdleHours)
                      _buildLineBar(_idleHours, AppColors.warning),
                  ],
                ),
              ),
            ),
          ],
        ),
      ).animate().fadeIn(duration: 500.ms),
    );
  }

  LineChartBarData _buildLineBar(List<double> values, Color color) {
    return LineChartBarData(
      isCurved: true,
      curveSmoothness: 0.3,
      color: color,
      barWidth: 2.5,
      dotData: FlDotData(
        show: true,
        getDotPainter:
            (FlSpot spot, double percent, LineChartBarData bar, int i) =>
                FlDotCirclePainter(
          radius: 3,
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
          colors: <Color>[
            color.withValues(alpha: 0.25),
            color.withValues(alpha: 0.02),
          ],
        ),
      ),
      spots: List<FlSpot>.generate(
        values.length,
        (int i) => FlSpot(i.toDouble(), values[i]),
      ),
    );
  }

  Widget _buildLegendChip(
    String label,
    Color color,
    bool active,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: active
              ? color.withValues(alpha: 0.18)
              : context.bgColor.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: active ? color : context.dividerColor,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: active ? color : context.textMutedColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: active ? context.textPrimaryColor : context.textMutedColor,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopPerformers() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: <Widget>[
          Expanded(
            child: _buildTopDriverCard(),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildEfficientVehicleCard(),
          ),
        ],
      ),
    );
  }

  Widget _buildTopDriverCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(
                Icons.emoji_events,
                color: AppColors.warning,
                size: 16,
              ),
              const SizedBox(width: 6),
              Text(
                context.tr('top_driver'),
                style: TextStyle(
                  color: context.textSecondaryColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Center(
            child: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: <Color>[AppColors.primary, AppColors.secondary],
                ),
                borderRadius: BorderRadius.circular(28),
                boxShadow: <BoxShadow>[
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              alignment: Alignment.center,
              child: Text(
                _topVehicleName.length >= 2
                    ? _topVehicleName.substring(0, 2).toUpperCase()
                    : _topVehicleName.toUpperCase(),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              _topVehicleName,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Center(
            child: RichText(
              text: TextSpan(
                children: <InlineSpan>[
                  TextSpan(
                    text: _topVehicleScore.toString(),
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  TextSpan(
                    text: '/100',
                    style: TextStyle(
                      color: context.textSecondaryColor,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 4),
          Center(
            child: Text(
              context.tr('safety_score'),
              style: TextStyle(color: context.textMutedColor, fontSize: 10),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms).slideX(begin: -0.1, end: 0);
  }

  Widget _buildEfficientVehicleCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(
                Icons.eco_outlined,
                color: AppColors.success,
                size: 16,
              ),
              const SizedBox(width: 6),
              Text(
                context.tr('most_efficient'),
                style: TextStyle(
                  color: context.textSecondaryColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Center(
            child: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(16),
              ),
              alignment: Alignment.center,
              child: const Icon(
                Icons.local_shipping_outlined,
                color: AppColors.success,
                size: 28,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              _bestDistanceVehicleName,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: <Widget>[
              Column(
                children: <Widget>[
                  Text(
                    _formatNumber(_bestVehicleDistance),
                    style: const TextStyle(
                      color: AppColors.success,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    'km',
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
              Container(
                width: 1,
                height: 28,
                color: context.dividerColor,
              ),
              Column(
                children: <Widget>[
                  Text(
                    '${_bestVehicleUptime.toStringAsFixed(0)}%',
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    context.tr('uptime'),
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms).slideX(begin: 0.1, end: 0);
  }

  Widget _buildConcernsList() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: List<Widget>.generate(_concerns.length, (int i) {
          final _Concern c = _concerns[i];
          return Padding(
            padding: EdgeInsets.only(
              bottom: i == _concerns.length - 1 ? 0 : 10,
            ),
            child: _buildConcernCard(c, i),
          );
        }),
      ),
    );
  }

  Widget _buildConcernCard(_Concern c, int index) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: <Widget>[
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: c.color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(c.icon, color: c.color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              context.tr(c.messageKey),
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 10),
          TextButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: context.cardColor,
                  content: Text(
                    '${context.tr(c.actionLabelKey)}: ${context.tr(c.messageKey)}',
                    style: TextStyle(color: context.textPrimaryColor),
                  ),
                ),
              );
            },
            style: TextButton.styleFrom(
              backgroundColor: c.color.withValues(alpha: 0.15),
              foregroundColor: c.color,
              padding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 8,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: Text(
              context.tr(c.actionLabelKey),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    )
        .animate(delay: (index * 80).ms)
        .fadeIn(duration: 400.ms)
        .slideX(begin: 0.1, end: 0);
  }

  Widget _buildExportButton() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: SizedBox(
        width: double.infinity,
        height: 54,
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: <Color>[
                AppColors.primary,
                AppColors.secondary,
                AppColors.accent,
              ],
            ),
            borderRadius: BorderRadius.circular(14),
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.35),
                blurRadius: 18,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: context.cardColor,
                    content: Text(
                      context.tr('generating_report'),
                      style: TextStyle(color: context.textPrimaryColor),
                    ),
                  ),
                );
              },
              child: Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Icon(
                      Icons.picture_as_pdf_outlined,
                      color: context.textPrimaryColor,
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      context.tr('export_pdf'),
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ).animate().fadeIn(delay: 300.ms, duration: 500.ms).scale(
            begin: const Offset(0.95, 0.95),
            end: const Offset(1, 1),
          ),
    );
  }
}

// ---------- Models ----------

enum _Delta { up, down, flat }

class _Kpi {
  _Kpi({
    required this.titleKey,
    required this.value,
    required this.unit,
    required this.delta,
    required this.deltaDirection,
    required this.icon,
    required this.accent,
    this.reverseColors = false,
  });

  /// Translation key for the KPI title.
  final String titleKey;
  final String value;
  final String unit;
  final String delta;
  final _Delta deltaDirection;
  final IconData icon;
  final Color accent;

  /// When true, a "down" delta is considered positive (e.g. lower fuel cost).
  final bool reverseColors;
}

class _HealthSegment {
  _HealthSegment(this.labelKey, this.value, this.color);

  /// Translation key for the segment label.
  final String labelKey;
  final double value;
  final Color color;
}

class _Concern {
  _Concern({
    required this.icon,
    required this.color,
    required this.messageKey,
    required this.actionLabelKey,
  });

  final IconData icon;
  final Color color;

  /// Translation key for the concern message.
  final String messageKey;

  /// Translation key for the action button label.
  final String actionLabelKey;
}

class _DateRange {
  const _DateRange(this.from, this.to);
  final DateTime from;
  final DateTime to;
}
