import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:controtrack/core/theme/app_colors.dart';
import 'package:controtrack/l10n/app_localizations.dart';
import 'package:controtrack/data/models/fleet_item_model.dart';
import 'package:controtrack/data/models/report_model.dart';
import 'package:controtrack/data/repositories/tracking_repository.dart';
import 'package:controtrack/presentation/blocs/fleet/fleet_cubit.dart';
import 'package:controtrack/presentation/blocs/fleet/fleet_state.dart';
import 'package:controtrack/presentation/widgets/common/app_loading.dart';
import 'package:controtrack/presentation/widgets/common/app_error.dart';

class IdleTimeScreen extends StatefulWidget {
  const IdleTimeScreen({super.key});

  @override
  State<IdleTimeScreen> createState() => _IdleTimeScreenState();
}

enum _RangeOption { thisWeek, thisMonth, allTime }

class _IdleTimeScreenState extends State<IdleTimeScreen> {
  // Assumptions: 2 L/hr idle consumption, $1.50 / L
  static const double _litersPerHour = 2.0;
  static const double _pricePerLiter = 1.5;

  _RangeOption _selectedRange = _RangeOption.thisWeek;
  int? _touchedPieIndex;

  bool _isLoading = true;
  String? _errorMessage;
  List<_VehicleIdleData> _vehicles = const [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _applyDateRange();
    });
  }

  String _rangeLabel(_RangeOption opt) {
    switch (opt) {
      case _RangeOption.thisWeek:
        return context.tr('this_week');
      case _RangeOption.thisMonth:
        return context.tr('this_month');
      case _RangeOption.allTime:
        return context.tr('all_time');
    }
  }

  ({DateTime from, DateTime to}) _rangeBounds(_RangeOption opt) {
    final now = DateTime.now();
    switch (opt) {
      case _RangeOption.thisWeek:
        return (from: now.subtract(const Duration(days: 7)), to: now);
      case _RangeOption.thisMonth:
        return (from: now.subtract(const Duration(days: 30)), to: now);
      case _RangeOption.allTime:
        return (from: now.subtract(const Duration(days: 90)), to: now);
    }
  }

  Future<void> _applyDateRange() async {
    final fleetCubit = context.read<FleetCubit>();
    final tracking = context.read<TrackingRepository>();

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final items = fleetCubit.state.items;

      if (items.isEmpty) {
        if (!mounted) return;
        setState(() {
          _vehicles = const [];
          _isLoading = false;
        });
        return;
      }

      final bounds = _rangeBounds(_selectedRange);

      final results = await Future.wait(
        items.map((item) async {
          try {
            final report =
                await tracking.getReport(item.carId, bounds.from, bounds.to);
            return _buildVehicleData(item, report);
          } catch (_) {
            return _buildVehicleData(item, null);
          }
        }),
      );

      if (!mounted) return;
      setState(() {
        _vehicles = results;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  _VehicleIdleData _buildVehicleData(FleetItem item, ReportModel? report) {
    // Derive idle hours using the same heuristic as the driver scorecard
    // screen: a stop ~= 5 minutes of idle time.
    final idleHours = report == null ? 0.0 : (report.stops * 5) / 60.0;
    final runningHours = report == null ? 0.0 : report.duration / 3600.0;
    final trend = idleHours > 5.0 ? _Trend.up : _Trend.down;
    return _VehicleIdleData(
      name: item.carName,
      plate: item.licensePlate,
      idleHours: idleHours,
      runningHours: runningHours,
      topLocation: item.address ?? '',
      trend: trend,
    );
  }

  double get _totalIdleHours =>
      _vehicles.fold<double>(0, (sum, v) => sum + v.idleHours);

  double get _totalFuelWasted => _totalIdleHours * _litersPerHour;

  double get _totalCost => _totalFuelWasted * _pricePerLiter;

  String _formatHours(double hours) {
    final int h = hours.floor();
    final int m = ((hours - h) * 60).round();
    return '${h}h ${m.toString().padLeft(2, '0')}m';
  }

  double _costFor(double hours) => hours * _litersPerHour * _pricePerLiter;

  @override
  Widget build(BuildContext context) {
    return BlocListener<FleetCubit, FleetState>(
      listenWhen: (prev, curr) => prev.items.length != curr.items.length,
      listener: (context, _) {
        _applyDateRange();
      },
      child: Scaffold(
        backgroundColor: context.bgColor,
        appBar: AppBar(
          backgroundColor: context.bgColor,
          elevation: 0,
          title: Text(
            context.tr('idle_time_reports'),
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          iconTheme: IconThemeData(color: context.textPrimaryColor),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 16, top: 10, bottom: 10),
              child: _DateRangeChip(
                label: _rangeLabel(_selectedRange),
                onTap: _showRangePicker,
              ),
            ),
          ],
        ),
        body: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const AppLoading();
    }
    if (_errorMessage != null) {
      return AppError(
        message: _errorMessage!,
        onRetry: _applyDateRange,
      );
    }
    if (_vehicles.isEmpty || _totalIdleHours <= 0) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            context.tr('no_idle_data'),
            style: TextStyle(
              color: context.textSecondaryColor,
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    final sorted = [..._vehicles]
      ..sort((a, b) => b.idleHours.compareTo(a.idleHours));
    final worst = sorted.take(3).toList();

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSummaryBanner()
              .animate()
              .fadeIn(duration: 400.ms)
              .slideY(begin: -0.1, end: 0, curve: Curves.easeOutCubic),
          const SizedBox(height: 24),
          _sectionTitle(context.tr('worst_offenders'), Icons.warning_amber_rounded),
          const SizedBox(height: 12),
          ...List.generate(worst.length, (i) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _WorstOffenderCard(
                rank: i + 1,
                data: worst[i],
                cost: _costFor(worst[i].idleHours),
                idlePercent: worst[i].runningHours > 0
                    ? (worst[i].idleHours / worst[i].runningHours) * 100
                    : 0,
                formattedIdle: _formatHours(worst[i].idleHours),
              )
                  .animate()
                  .fadeIn(delay: (100 * i).ms, duration: 400.ms)
                  .slideX(begin: 0.1, end: 0, curve: Curves.easeOutCubic),
            );
          }),
          const SizedBox(height: 24),
          _sectionTitle(context.tr('all_vehicles'), Icons.list_alt_rounded),
          const SizedBox(height: 12),
          _buildVehicleList(sorted),
          const SizedBox(height: 28),
          _sectionTitle(context.tr('idle_distribution'), Icons.pie_chart_rounded),
          const SizedBox(height: 12),
          _buildPieChartCard(sorted)
              .animate()
              .fadeIn(delay: 200.ms, duration: 500.ms)
              .slideY(begin: 0.1, end: 0, curve: Curves.easeOutCubic),
          const SizedBox(height: 28),
          _sectionTitle(context.tr('tips_reduce_idle'), Icons.lightbulb_outline),
          const SizedBox(height: 12),
          _buildTips(),
        ],
      ),
    );
  }

  // ---------------------------- Widgets ----------------------------

  Widget _sectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppColors.primary, size: 20),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 17,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.2,
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryBanner() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary.withValues(alpha: 0.18),
            AppColors.accent.withValues(alpha: 0.18),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.35),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.timer_outlined,
                    color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 10),
              Text(
                context.tr('fleet_idle_summary'),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _SummaryStat(
                  label: context.tr('idle_time'),
                  value: _formatHours(_totalIdleHours),
                  color: AppColors.primary,
                  icon: Icons.schedule,
                ),
              ),
              _divider(),
              Expanded(
                child: _SummaryStat(
                  label: context.tr('fuel_wasted'),
                  value: '${_totalFuelWasted.toStringAsFixed(1)} L',
                  color: AppColors.warning,
                  icon: Icons.local_gas_station_outlined,
                ),
              ),
              _divider(),
              Expanded(
                child: _SummaryStat(
                  label: context.tr('cost_estimate'),
                  value: '\$${_totalCost.toStringAsFixed(2)}',
                  color: AppColors.error,
                  icon: Icons.attach_money,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _divider() => Container(
        height: 48,
        width: 1,
        color: Colors.white.withValues(alpha: 0.08),
      );

  Widget _buildVehicleList(List<_VehicleIdleData> sorted) {
    return Container(
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Column(
        children: List.generate(sorted.length, (index) {
          final v = sorted[index];
          final idlePercent =
              v.runningHours > 0 ? (v.idleHours / v.runningHours) * 100 : 0;
          final isLast = index == sorted.length - 1;
          return Container(
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: isLast
                      ? Colors.transparent
                      : Colors.white.withValues(alpha: 0.05),
                ),
              ),
            ),
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: Text(
                    '#${index + 1}',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        v.name,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${v.plate}  ·  ${_formatHours(v.idleHours)}  ·  ${idlePercent.toStringAsFixed(1)}%',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.55),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '\$${_costFor(v.idleHours).toStringAsFixed(2)}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    _TrendBadge(trend: v.trend),
                  ],
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(delay: (40 * index).ms, duration: 300.ms)
              .slideX(begin: 0.05, end: 0);
        }),
      ),
    );
  }

  Widget _buildPieChartCard(List<_VehicleIdleData> sorted) {
    final palette = <Color>[
      AppColors.primary,
      AppColors.accent,
      AppColors.warning,
      AppColors.error,
      const Color(0xFF4CAF50),
      const Color(0xFF29B6F6),
      const Color(0xFFAB47BC),
      const Color(0xFFFF8A65),
    ];

    final totalIdle = _totalIdleHours;
    final sections = <PieChartSectionData>[];
    for (int i = 0; i < sorted.length; i++) {
      final v = sorted[i];
      if (v.idleHours <= 0) continue;
      final percent = totalIdle > 0 ? (v.idleHours / totalIdle) * 100 : 0;
      final isTouched = _touchedPieIndex == i;
      final radius = isTouched ? 78.0 : 68.0;
      final fontSize = isTouched ? 13.0 : 11.0;
      sections.add(
        PieChartSectionData(
          color: palette[i % palette.length],
          value: v.idleHours,
          title: '${percent.toStringAsFixed(0)}%',
          radius: radius,
          titleStyle: TextStyle(
            fontSize: fontSize,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Column(
        children: [
          SizedBox(
            height: 220,
            child: PieChart(
              PieChartData(
                sectionsSpace: 2,
                centerSpaceRadius: 44,
                sections: sections,
                pieTouchData: PieTouchData(
                  touchCallback: (event, response) {
                    setState(() {
                      if (!event.isInterestedForInteractions ||
                          response == null ||
                          response.touchedSection == null) {
                        _touchedPieIndex = null;
                        return;
                      }
                      _touchedPieIndex =
                          response.touchedSection!.touchedSectionIndex;
                    });
                  },
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 14,
            runSpacing: 8,
            children: List.generate(sorted.length, (i) {
              final v = sorted[i];
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: palette[i % palette.length],
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    v.plate,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.7),
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildTips() {
    final tips = <_Tip>[
      _Tip(
        icon: Icons.power_settings_new,
        title: context.tr('tip_auto_shutoff_title'),
        description: context.tr('tip_auto_shutoff_desc'),
        color: AppColors.primary,
      ),
      _Tip(
        icon: Icons.school_outlined,
        title: context.tr('tip_idle_policy_title'),
        description: context.tr('tip_idle_policy_desc'),
        color: AppColors.accent,
      ),
      _Tip(
        icon: Icons.location_on_outlined,
        title: context.tr('tip_geofence_depot_title'),
        description: context.tr('tip_geofence_depot_desc'),
        color: AppColors.warning,
      ),
    ];

    return Column(
      children: List.generate(tips.length, (i) {
        final t = tips[i];
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: context.cardColor,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: t.color.withValues(alpha: 0.25),
                width: 1,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: t.color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(t.icon, color: t.color, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        t.title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        t.description,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.65),
                          fontSize: 12.5,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        )
            .animate()
            .fadeIn(delay: (120 * i).ms, duration: 400.ms)
            .slideY(begin: 0.1, end: 0, curve: Curves.easeOutCubic);
      }),
    );
  }

  void _showRangePicker() {
    final options = <_RangeOption>[
      _RangeOption.thisWeek,
      _RangeOption.thisMonth,
      _RangeOption.allTime,
    ];
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  context.tr('select_date_range'),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              ...options.map(
                (o) => ListTile(
                  title: Text(
                    _rangeLabel(o),
                    style: const TextStyle(color: Colors.white),
                  ),
                  trailing: _selectedRange == o
                      ? Icon(Icons.check, color: AppColors.primary)
                      : null,
                  onTap: () {
                    Navigator.of(ctx).pop();
                    if (_selectedRange != o) {
                      setState(() => _selectedRange = o);
                      _applyDateRange();
                    }
                  },
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }
}

// ---------------------------- Supporting widgets ----------------------------

class _DateRangeChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _DateRangeChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.4),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.calendar_today_outlined,
                size: 13, color: AppColors.primary),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: AppColors.primary,
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 2),
            Icon(Icons.arrow_drop_down, size: 18, color: AppColors.primary),
          ],
        ),
      ),
    );
  }
}

class _SummaryStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  const _SummaryStat({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(height: 6),
        FittedBox(
          child: Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 17,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.6),
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _WorstOffenderCard extends StatelessWidget {
  final int rank;
  final _VehicleIdleData data;
  final double cost;
  final double idlePercent;
  final String formattedIdle;

  const _WorstOffenderCard({
    required this.rank,
    required this.data,
    required this.cost,
    required this.idlePercent,
    required this.formattedIdle,
  });

  @override
  Widget build(BuildContext context) {
    // Rank 1 = red, rank 2/3 = orange/warning
    final Color borderColor =
        rank == 1 ? AppColors.error : AppColors.warning;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor.withValues(alpha: 0.7), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: borderColor.withValues(alpha: 0.12),
            blurRadius: 18,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: borderColor.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '#$rank',
                  style: TextStyle(
                    color: borderColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      data.name,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      data.plate,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.6),
                        fontSize: 12,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: borderColor.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '\$${cost.toStringAsFixed(2)}',
                  style: TextStyle(
                    color: borderColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _MetricBlock(
                  icon: Icons.schedule,
                  label: context.tr('idle'),
                  value: formattedIdle,
                ),
              ),
              Container(
                width: 1,
                height: 32,
                color: Colors.white.withValues(alpha: 0.08),
              ),
              Expanded(
                child: _MetricBlock(
                  icon: Icons.percent,
                  label: context.tr('of_run_time'),
                  value: '${idlePercent.toStringAsFixed(1)}%',
                ),
              ),
            ],
          ),
          if (data.topLocation.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(
                  Icons.location_on_outlined,
                  size: 15,
                  color: Colors.white.withValues(alpha: 0.5),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    data.topLocation,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.7),
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _MetricBlock extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _MetricBlock({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, size: 14, color: Colors.white.withValues(alpha: 0.5)),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.5),
                fontSize: 10.5,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _TrendBadge extends StatelessWidget {
  final _Trend trend;

  const _TrendBadge({required this.trend});

  @override
  Widget build(BuildContext context) {
    final bool isUp = trend == _Trend.up;
    final Color color = isUp ? AppColors.error : const Color(0xFF4CAF50);
    final IconData icon =
        isUp ? Icons.trending_up_rounded : Icons.trending_down_rounded;
    final String label =
        isUp ? context.tr('worse') : context.tr('better');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------- Models ----------------------------

enum _Trend { up, down }

class _VehicleIdleData {
  final String name;
  final String plate;
  final double idleHours;
  final double runningHours;
  final String topLocation;
  final _Trend trend;

  const _VehicleIdleData({
    required this.name,
    required this.plate,
    required this.idleHours,
    required this.runningHours,
    required this.topLocation,
    required this.trend,
  });
}

class _Tip {
  final IconData icon;
  final String title;
  final String description;
  final Color color;

  const _Tip({
    required this.icon,
    required this.title,
    required this.description,
    required this.color,
  });
}
