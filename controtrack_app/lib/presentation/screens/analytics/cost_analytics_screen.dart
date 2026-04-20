import 'dart:convert';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../data/models/maintenance_model.dart';
import '../../../data/repositories/tracking_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../widgets/common/app_error.dart';
import '../vehicles/fuel_log_screen.dart';
import '../infractions/infractions_screen.dart';

enum CostPeriod { thisMonth, last3Months, thisYear }

class _VehicleCost {
  final String carId;
  final String carName;
  double fuel = 0;
  double maintenance = 0;
  double fines = 0;
  _VehicleCost({required this.carId, required this.carName});
  double get total => fuel + maintenance + fines;
}

class CostAnalyticsScreen extends StatefulWidget {
  const CostAnalyticsScreen({super.key});

  @override
  State<CostAnalyticsScreen> createState() => _CostAnalyticsScreenState();
}

class _CostAnalyticsScreenState extends State<CostAnalyticsScreen> {
  CostPeriod _period = CostPeriod.thisMonth;
  bool _loading = true;

  Map<String, _VehicleCost> _byVehicle = {};
  double _totalFuel = 0;
  double _totalMaintenance = 0;
  double _totalFines = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  DateTimeRange _range(CostPeriod p) {
    final now = DateTime.now();
    switch (p) {
      case CostPeriod.thisMonth:
        return DateTimeRange(
          start: DateTime(now.year, now.month, 1),
          end: DateTime(now.year, now.month + 1, 1),
        );
      case CostPeriod.last3Months:
        return DateTimeRange(
          start: DateTime(now.year, now.month - 3, now.day),
          end: now.add(const Duration(days: 1)),
        );
      case CostPeriod.thisYear:
        return DateTimeRange(
          start: DateTime(now.year, 1, 1),
          end: DateTime(now.year + 1, 1, 1),
        );
    }
  }

  bool _inRange(DateTime d, DateTimeRange r) =>
      !d.isBefore(r.start) && d.isBefore(r.end);

  Future<void> _load() async {
    setState(() => _loading = true);

    // Hoist dependencies BEFORE any await.
    final fleetItems = context.read<FleetCubit>().state.items;
    final trackingRepo = context.read<TrackingRepository>();
    final range = _range(_period);

    final prefs = await SharedPreferences.getInstance();
    final byVehicle = <String, _VehicleCost>{};
    for (final v in fleetItems) {
      byVehicle[v.carId] = _VehicleCost(
        carId: v.carId,
        carName: v.carName.isEmpty ? v.licensePlate : v.carName,
      );
    }

    // --- Fuel ---
    double fuelTotal = 0;
    for (final v in fleetItems) {
      final raw = prefs.getString(fuelLogKey(v.carId));
      if (raw == null || raw.isEmpty) continue;
      try {
        final decoded = json.decode(raw);
        if (decoded is List) {
          for (final e in decoded) {
            if (e is Map) {
              final entry = FuelEntry.fromJson(Map<String, dynamic>.from(e));
              if (_inRange(entry.date, range)) {
                fuelTotal += entry.totalCost;
                final bucket = byVehicle[v.carId];
                if (bucket != null) bucket.fuel += entry.totalCost;
              }
            }
          }
        }
      } catch (_) {
        // malformed
      }
    }

    // --- Maintenance (remote) ---
    double maintTotal = 0;
    try {
      final List<MaintenanceModel> maint = await trackingRepo.getMaintenance();
      for (final m in maint) {
        final d = m.startDate ?? m.endDate;
        final cost = m.cost ?? 0;
        if (cost <= 0) continue;
        if (d == null || _inRange(d, range)) {
          maintTotal += cost;
          final id = m.carId;
          if (id != null) {
            final bucket = byVehicle[id];
            if (bucket != null) bucket.maintenance += cost;
          }
        }
      }
    } catch (_) {
      // Remote unavailable — skip silently, fuel/fines still show.
    }

    // --- Infractions (local) ---
    double finesTotal = 0;
    final infRaw = prefs.getString('infractions_list');
    if (infRaw != null && infRaw.isNotEmpty) {
      try {
        final decoded = json.decode(infRaw);
        if (decoded is List) {
          for (final e in decoded) {
            if (e is Map) {
              final inf =
                  InfractionModel.fromJson(Map<String, dynamic>.from(e));
              if (_inRange(inf.date, range)) {
                finesTotal += inf.amount;
                final bucket = byVehicle[inf.vehicleId];
                if (bucket != null) bucket.fines += inf.amount;
              }
            }
          }
        }
      } catch (_) {
        // malformed
      }
    }

    if (!mounted) return;
    setState(() {
      _byVehicle = byVehicle;
      _totalFuel = fuelTotal;
      _totalMaintenance = maintTotal;
      _totalFines = finesTotal;
      _loading = false;
    });
  }

  double get _grandTotal => _totalFuel + _totalMaintenance + _totalFines;

  @override
  Widget build(BuildContext context) {
    final sorted = _byVehicle.values
        .where((v) => v.total > 0)
        .toList()
      ..sort((a, b) => b.total.compareTo(a.total));

    final top5 = sorted.take(5).toList();

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(context.tr('cost_analytics')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _load,
            tooltip: context.tr('retry'),
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 40),
                children: [
                  _PeriodSelector(
                    period: _period,
                    onChange: (p) {
                      setState(() => _period = p);
                      _load();
                    },
                  ),
                  const SizedBox(height: 14),
                  if (_grandTotal <= 0)
                    Padding(
                      padding: const EdgeInsets.only(top: 40),
                      child: EmptyState(
                        title: context.tr('no_cost_data'),
                        subtitle: context.tr('no_cost_data_subtitle'),
                        icon: Icons.query_stats_rounded,
                      ),
                    )
                  else ...[
                    _MetricsRow(
                      fuel: _totalFuel,
                      maintenance: _totalMaintenance,
                      fines: _totalFines,
                    ),
                    const SizedBox(height: 12),
                    _TotalCard(total: _grandTotal),
                    const SizedBox(height: 16),
                    if (top5.isNotEmpty) ...[
                      _ChartCard(
                        title: context.tr('cost_by_vehicle'),
                        icon: Icons.bar_chart_rounded,
                        child: SizedBox(
                          height: 200,
                          child: _CostBarChart(data: top5),
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],
                    _ChartCard(
                      title: context.tr('cost_breakdown'),
                      icon: Icons.pie_chart_rounded,
                      child: SizedBox(
                        height: 200,
                        child: _CostPieChart(
                          fuel: _totalFuel,
                          maintenance: _totalMaintenance,
                          fines: _totalFines,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _VehicleTable(rows: sorted),
                  ],
                ],
              ),
            ),
    );
  }
}

// ---------------- Period selector ----------------

class _PeriodSelector extends StatelessWidget {
  final CostPeriod period;
  final ValueChanged<CostPeriod> onChange;
  const _PeriodSelector({required this.period, required this.onChange});

  @override
  Widget build(BuildContext context) {
    final items = <(CostPeriod, String)>[
      (CostPeriod.thisMonth, context.tr('this_month')),
      (CostPeriod.last3Months, context.tr('last_3_months')),
      (CostPeriod.thisYear, context.tr('this_year')),
    ];
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          for (final it in items)
            Expanded(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => onChange(it.$1),
                  borderRadius: BorderRadius.circular(8),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      gradient: period == it.$1
                          ? AppColors.primaryGradient
                          : null,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      it.$2,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: period == it.$1
                            ? Colors.black
                            : context.textSecondaryColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
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
}

// ---------------- Metric cards ----------------

class _MetricsRow extends StatelessWidget {
  final double fuel;
  final double maintenance;
  final double fines;
  const _MetricsRow({
    required this.fuel,
    required this.maintenance,
    required this.fines,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _MetricCard(
            label: context.tr('fuel_cost'),
            value: fuel,
            icon: Icons.local_gas_station_rounded,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MetricCard(
            label: context.tr('maintenance_cost'),
            value: maintenance,
            icon: Icons.build_rounded,
            color: AppColors.accent,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MetricCard(
            label: context.tr('fines'),
            value: fines,
            icon: Icons.receipt_long_rounded,
            color: AppColors.error,
          ),
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final double value;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withValues(alpha: 0.18),
            color.withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(height: 10),
          Text(
            value.toStringAsFixed(0),
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 20,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: context.textMutedColor,
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _TotalCard extends StatelessWidget {
  final double total;
  const _TotalCard({required this.total});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.3),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.account_balance_wallet_rounded,
                color: Colors.black, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr('total_fleet_cost').toUpperCase(),
                  style: TextStyle(
                    color: Colors.black.withValues(alpha: 0.7),
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  total.toStringAsFixed(2),
                  style: const TextStyle(
                    color: Colors.black,
                    fontSize: 30,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.8,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------- Chart wrapper ----------------

class _ChartCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;
  const _ChartCard({
    required this.title,
    required this.icon,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
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
              Icon(icon, color: AppColors.primary, size: 18),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

// ---------------- Bar chart ----------------

class _CostBarChart extends StatelessWidget {
  final List<_VehicleCost> data;
  const _CostBarChart({required this.data});

  @override
  Widget build(BuildContext context) {
    final maxY = data.fold<double>(0, (m, v) => v.total > m ? v.total : m);
    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: maxY <= 0 ? 10 : maxY * 1.2,
        minY: 0,
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            getTooltipColor: (_) => context.surfaceColor,
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              final v = data[group.x];
              return BarTooltipItem(
                '${v.carName}\n${v.total.toStringAsFixed(2)}',
                TextStyle(
                  color: context.textPrimaryColor,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              );
            },
          ),
        ),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxY <= 0 ? 5 : maxY / 3,
          getDrawingHorizontalLine: (_) => FlLine(
            color: context.dividerColor.withValues(alpha: 0.4),
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 40,
              getTitlesWidget: (value, meta) => Text(
                value.toStringAsFixed(0),
                style: TextStyle(
                  color: context.textMutedColor,
                  fontSize: 10,
                ),
              ),
            ),
          ),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 32,
              getTitlesWidget: (value, meta) {
                final i = value.toInt();
                if (i < 0 || i >= data.length) {
                  return const SizedBox.shrink();
                }
                final name = data[i].carName;
                final short = name.length > 8 ? '${name.substring(0, 7)}…' : name;
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    short,
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        barGroups: [
          for (int i = 0; i < data.length; i++)
            BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: data[i].total,
                  width: 20,
                  borderRadius: BorderRadius.circular(6),
                  gradient: const LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [AppColors.primary, AppColors.secondary],
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

// ---------------- Pie chart ----------------

class _CostPieChart extends StatelessWidget {
  final double fuel;
  final double maintenance;
  final double fines;
  const _CostPieChart({
    required this.fuel,
    required this.maintenance,
    required this.fines,
  });

  @override
  Widget build(BuildContext context) {
    final total = fuel + maintenance + fines;
    if (total <= 0) {
      return Center(
        child: Text(
          context.tr('no_data'),
          style: TextStyle(color: context.textMutedColor),
        ),
      );
    }

    double pct(double v) => (v / total) * 100;
    final sections = <PieChartSectionData>[
      if (fuel > 0)
        PieChartSectionData(
          value: fuel,
          color: AppColors.primary,
          title: '${pct(fuel).toStringAsFixed(0)}%',
          radius: 58,
          titleStyle: const TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.w800,
            fontSize: 12,
          ),
        ),
      if (maintenance > 0)
        PieChartSectionData(
          value: maintenance,
          color: AppColors.accent,
          title: '${pct(maintenance).toStringAsFixed(0)}%',
          radius: 58,
          titleStyle: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: 12,
          ),
        ),
      if (fines > 0)
        PieChartSectionData(
          value: fines,
          color: AppColors.error,
          title: '${pct(fines).toStringAsFixed(0)}%',
          radius: 58,
          titleStyle: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: 12,
          ),
        ),
    ];

    return Row(
      children: [
        Expanded(
          flex: 3,
          child: PieChart(
            PieChartData(
              sections: sections,
              centerSpaceRadius: 36,
              sectionsSpace: 2,
              borderData: FlBorderData(show: false),
            ),
          ),
        ),
        Expanded(
          flex: 2,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _LegendRow(
                color: AppColors.primary,
                label: context.tr('fuel_cost'),
                value: fuel,
              ),
              const SizedBox(height: 6),
              _LegendRow(
                color: AppColors.accent,
                label: context.tr('maintenance_cost'),
                value: maintenance,
              ),
              const SizedBox(height: 6),
              _LegendRow(
                color: AppColors.error,
                label: context.tr('fines'),
                value: fines,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LegendRow extends StatelessWidget {
  final Color color;
  final String label;
  final double value;
  const _LegendRow({
    required this.color,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: context.textSecondaryColor,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                value.toStringAsFixed(0),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ---------------- Per-vehicle table ----------------

class _VehicleTable extends StatelessWidget {
  final List<_VehicleCost> rows;
  const _VehicleTable({required this.rows});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
            child: Row(
              children: [
                Icon(Icons.table_chart_rounded,
                    color: AppColors.primary, size: 18),
                const SizedBox(width: 8),
                Text(
                  context.tr('cost_by_vehicle'),
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Text(
                    context.tr('vehicle'),
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    context.tr('fuel_cost'),
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    context.tr('maintenance'),
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    context.tr('fines'),
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    context.tr('total'),
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Divider(height: 16, color: context.dividerColor),
          for (int i = 0; i < rows.length; i++) ...[
            _VehicleTableRow(row: rows[i]),
            if (i < rows.length - 1)
              Divider(
                height: 1,
                indent: 14,
                endIndent: 14,
                color: context.dividerColor.withValues(alpha: 0.5),
              ),
          ],
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _VehicleTableRow extends StatelessWidget {
  final _VehicleCost row;
  const _VehicleTableRow({required this.row});

  @override
  Widget build(BuildContext context) {
    TextStyle cell(BuildContext context) => TextStyle(
          color: context.textSecondaryColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        );

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              row.carName,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Expanded(
            child: Text(
              row.fuel.toStringAsFixed(0),
              textAlign: TextAlign.end,
              style: cell(context),
            ),
          ),
          Expanded(
            child: Text(
              row.maintenance.toStringAsFixed(0),
              textAlign: TextAlign.end,
              style: cell(context),
            ),
          ),
          Expanded(
            child: Text(
              row.fines.toStringAsFixed(0),
              textAlign: TextAlign.end,
              style: cell(context),
            ),
          ),
          Expanded(
            child: Text(
              row.total.toStringAsFixed(0),
              textAlign: TextAlign.end,
              style: TextStyle(
                color: AppColors.primary,
                fontSize: 13,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Marker import used so `FleetItem` reference is valid in some editors.
// ignore: unused_element
typedef _FleetItemAlias = FleetItem;
