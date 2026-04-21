import 'dart:convert';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../widgets/common/app_error.dart';

class FuelEntry {
  final String id;
  final String carId;
  final DateTime date;
  final double liters;
  final double pricePerLiter;
  final double totalCost;
  final double odometer;
  final String fuelType; // 'petrol' | 'diesel' | 'electric'
  final String stationName;
  final bool fullTank;

  const FuelEntry({
    required this.id,
    required this.carId,
    required this.date,
    required this.liters,
    required this.pricePerLiter,
    required this.totalCost,
    required this.odometer,
    required this.fuelType,
    required this.stationName,
    required this.fullTank,
  });

  factory FuelEntry.fromJson(Map<String, dynamic> j) {
    double parseD(dynamic v) => v is num ? v.toDouble() : 0;
    return FuelEntry(
      id: (j['id'] ?? '').toString(),
      carId: (j['carId'] ?? '').toString(),
      date: DateTime.tryParse(j['date']?.toString() ?? '') ?? DateTime.now(),
      liters: parseD(j['liters']),
      pricePerLiter: parseD(j['pricePerLiter']),
      totalCost: parseD(j['totalCost']),
      odometer: parseD(j['odometer']),
      fuelType: (j['fuelType'] ?? 'petrol').toString(),
      stationName: (j['stationName'] ?? '').toString(),
      fullTank: j['fullTank'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'carId': carId,
        'date': date.toIso8601String(),
        'liters': liters,
        'pricePerLiter': pricePerLiter,
        'totalCost': totalCost,
        'odometer': odometer,
        'fuelType': fuelType,
        'stationName': stationName,
        'fullTank': fullTank,
      };
}

String fuelLogKey(String carId) => 'fuel_log_$carId';

class FuelLogScreen extends StatefulWidget {
  final String carId;
  const FuelLogScreen({super.key, required this.carId});

  @override
  State<FuelLogScreen> createState() => _FuelLogScreenState();
}

class _FuelLogScreenState extends State<FuelLogScreen> {
  List<FuelEntry> _entries = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(fuelLogKey(widget.carId));
    final list = <FuelEntry>[];
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = json.decode(raw);
        if (decoded is List) {
          for (final e in decoded) {
            if (e is Map) {
              list.add(FuelEntry.fromJson(Map<String, dynamic>.from(e)));
            }
          }
        }
      } catch (_) {
        // malformed data
      }
    }
    list.sort((a, b) => b.date.compareTo(a.date));
    if (!mounted) return;
    setState(() {
      _entries = list;
      _loading = false;
    });
  }

  Future<void> _save(List<FuelEntry> list) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = json.encode(list.map((e) => e.toJson()).toList());
    await prefs.setString(fuelLogKey(widget.carId), encoded);
  }

  Future<void> _addEntry() async {
    final result = await showModalBottomSheet<FuelEntry>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _FuelEntryForm(carId: widget.carId),
    );
    if (result == null) return;
    final list = [..._entries, result]
      ..sort((a, b) => b.date.compareTo(a.date));
    await _save(list);
    if (!mounted) return;
    setState(() => _entries = list);
  }

  Future<void> _delete(FuelEntry e) async {
    final list = _entries.where((x) => x.id != e.id).toList();
    await _save(list);
    if (!mounted) return;
    setState(() => _entries = list);
  }

  // ----- Stats (this month) -----

  bool _inThisMonth(DateTime d) {
    final now = DateTime.now();
    return d.year == now.year && d.month == now.month;
  }

  double get _monthSpent =>
      _entries.where((e) => _inThisMonth(e.date)).fold(0.0, (s, e) => s + e.totalCost);

  double get _monthLiters =>
      _entries.where((e) => _inThisMonth(e.date)).fold(0.0, (s, e) => s + e.liters);

  /// Computes average L/100km from consecutive full-tank fills in chronological
  /// order. Returns null if not enough data.
  double? get _avgConsumption {
    final fulls = _entries.where((e) => e.fullTank).toList()
      ..sort((a, b) => a.date.compareTo(b.date));
    if (fulls.length < 2) return null;
    double totalLiters = 0;
    double totalKm = 0;
    for (int i = 1; i < fulls.length; i++) {
      final prev = fulls[i - 1];
      final cur = fulls[i];
      final km = cur.odometer - prev.odometer;
      if (km <= 0) continue;
      // The liters consumed on the stretch from prev→cur is what was put into
      // the tank to fill it at `cur`.
      totalLiters += cur.liters;
      totalKm += km;
    }
    if (totalKm <= 0) return null;
    return (totalLiters / totalKm) * 100.0;
  }

  /// Total distance tracked from odometer entries (km).
  double? get _totalOdometerKm {
    final readings = _entries.map((e) => e.odometer).where((o) => o > 0).toList();
    if (readings.length < 2) return null;
    return readings.reduce((a, b) => a > b ? a : b) -
        readings.reduce((a, b) => a < b ? a : b);
  }

  /// Fuel type distribution.
  Map<String, int> get _fuelTypeCount {
    final counts = <String, int>{};
    for (final e in _entries) {
      counts[e.fuelType] = (counts[e.fuelType] ?? 0) + 1;
    }
    return counts;
  }

  /// Efficiency trend: negative = worsening (more L/100km), positive = improving.
  /// Compares oldest half vs newest half of full-tank fills.
  double? get _efficiencyTrend {
    final fulls = _entries.where((e) => e.fullTank).toList()
      ..sort((a, b) => a.date.compareTo(b.date));
    if (fulls.length < 4) return null;
    double calcAvg(List<FuelEntry> fills) {
      double totalL = 0;
      double totalKm = 0;
      for (int i = 1; i < fills.length; i++) {
        final km = fills[i].odometer - fills[i - 1].odometer;
        if (km <= 0) continue;
        totalL += fills[i].liters;
        totalKm += km;
      }
      if (totalKm <= 0) return 0;
      return (totalL / totalKm) * 100.0;
    }
    final half = fulls.length ~/ 2;
    final olderAvg = calcAvg(fulls.take(half + 1).toList());
    final newerAvg = calcAvg(fulls.skip(half - 1).toList());
    if (olderAvg == 0 || newerAvg == 0) return null;
    // Positive delta means newer is better (lower L/100)
    return olderAvg - newerAvg;
  }

  /// Cost per km over all full-tank stretches.
  double? get _costPerKm {
    final fulls = _entries.where((e) => e.fullTank).toList()
      ..sort((a, b) => a.date.compareTo(b.date));
    if (fulls.length < 2) return null;
    double totalCost = 0;
    double totalKm = 0;
    for (int i = 1; i < fulls.length; i++) {
      final km = fulls[i].odometer - fulls[i - 1].odometer;
      if (km <= 0) continue;
      totalCost += fulls[i].totalCost;
      totalKm += km;
    }
    if (totalKm <= 0) return null;
    return totalCost / totalKm;
  }

  /// L/100km for a specific fill, computed from the nearest previous full-tank
  /// fill. Returns null if unavailable.
  double? _consumptionFor(FuelEntry e) {
    if (!e.fullTank) return null;
    final priorFulls = _entries
        .where((x) => x.fullTank && x.date.isBefore(e.date))
        .toList()
      ..sort((a, b) => b.date.compareTo(a.date));
    if (priorFulls.isEmpty) return null;
    final prev = priorFulls.first;
    final km = e.odometer - prev.odometer;
    if (km <= 0) return null;
    return (e.liters / km) * 100.0;
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(context.tr('fuel_log')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      floatingActionButton: isWide
          ? null
          : FloatingActionButton.extended(
              onPressed: _addEntry,
              icon: const Icon(Icons.add_rounded),
              label: Text(context.tr('add_fuel')),
            ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : isWide
              ? _buildWideLayout(context)
              : _entries.isEmpty
                  ? ListView(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                      children: [
                        _SummaryCard(
                          monthSpent: _monthSpent,
                          monthLiters: _monthLiters,
                          avgConsumption: _avgConsumption,
                          costPerKm: _costPerKm,
                          carId: widget.carId,
                        ),
                        const SizedBox(height: 180),
                        EmptyState(
                          title: context.tr('no_fuel_entries'),
                          subtitle: context.tr('no_fuel_entries_subtitle'),
                          icon: Icons.local_gas_station_rounded,
                        ),
                      ],
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                      children: [
                        _SummaryCard(
                          monthSpent: _monthSpent,
                          monthLiters: _monthLiters,
                          avgConsumption: _avgConsumption,
                          costPerKm: _costPerKm,
                          carId: widget.carId,
                        ),
                        const SizedBox(height: 14),
                        _EfficiencyInsightsCard(
                          totalKm: _totalOdometerKm,
                          trend: _efficiencyTrend,
                          fuelTypeCount: _fuelTypeCount,
                        ),
                        const SizedBox(height: 14),
                        if (_entries.length >= 2) ...[
                          _CostChart(
                              entries:
                                  _entries.take(10).toList().reversed.toList()),
                          const SizedBox(height: 14),
                        ],
                        for (final e in _entries) ...[
                          Dismissible(
                            key: ValueKey(e.id),
                            direction: DismissDirection.endToStart,
                            background: Container(
                              alignment: Alignment.centerRight,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 20),
                              margin: const EdgeInsets.only(bottom: 10),
                              decoration: BoxDecoration(
                                color: AppColors.error.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Icon(Icons.delete_outline,
                                  color: AppColors.error),
                            ),
                            onDismissed: (_) => _delete(e),
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _FuelTile(
                                entry: e,
                                consumption: _consumptionFor(e),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Web 2-column layout
  // ──────────────────────────────────────────────────────────────────────────
  Widget _buildWideLayout(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 16, 28, 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ─── Left column: fuel entries list ───
          Expanded(
            flex: 6,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(bottom: 12, left: 2),
                  child: Text(
                    context.tr('fuel_log').toUpperCase(),
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
                Expanded(
                  child: _entries.isEmpty
                      ? Center(
                          child: EmptyState(
                            title: context.tr('no_fuel_entries'),
                            subtitle: context.tr('no_fuel_entries_subtitle'),
                            icon: Icons.local_gas_station_rounded,
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.only(right: 8, bottom: 16),
                          physics: const BouncingScrollPhysics(),
                          itemCount: _entries.length,
                          itemBuilder: (_, i) {
                            final e = _entries[i];
                            return Dismissible(
                              key: ValueKey(e.id),
                              direction: DismissDirection.endToStart,
                              background: Container(
                                alignment: Alignment.centerRight,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 20),
                                margin: const EdgeInsets.only(bottom: 10),
                                decoration: BoxDecoration(
                                  color:
                                      AppColors.error.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: const Icon(Icons.delete_outline,
                                    color: AppColors.error),
                              ),
                              onDismissed: (_) => _delete(e),
                              child: Padding(
                                padding:
                                    const EdgeInsets.only(bottom: 10),
                                child: _FuelTile(
                                  entry: e,
                                  consumption: _consumptionFor(e),
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 20),
          // ─── Right column: summary + inline add form ───
          Expanded(
            flex: 5,
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(left: 4, bottom: 16),
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SummaryCard(
                    monthSpent: _monthSpent,
                    monthLiters: _monthLiters,
                    avgConsumption: _avgConsumption,
                    costPerKm: _costPerKm,
                    carId: widget.carId,
                  ),
                  const SizedBox(height: 14),
                  _EfficiencyInsightsCard(
                    totalKm: _totalOdometerKm,
                    trend: _efficiencyTrend,
                    fuelTypeCount: _fuelTypeCount,
                  ),
                  const SizedBox(height: 14),
                  if (_entries.length >= 2) ...[
                    _CostChart(
                      entries:
                          _entries.take(10).toList().reversed.toList(),
                    ),
                    const SizedBox(height: 14),
                  ],
                  // Inline add entry card
                  Container(
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
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: AppColors.primary
                                    .withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(9),
                              ),
                              child: const Icon(Icons.add_rounded,
                                  color: AppColors.primary, size: 18),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              context.tr('add_fuel'),
                              style: TextStyle(
                                color: context.textPrimaryColor,
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          context.tr('no_fuel_entries_subtitle'),
                          style: TextStyle(
                            color: context.textMutedColor,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: _addEntry,
                            icon: const Icon(Icons.add_rounded),
                            label: Text(context.tr('add_fuel')),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                  vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------- Summary card ----------------

class _SummaryCard extends StatelessWidget {
  final double monthSpent;
  final double monthLiters;
  final double? avgConsumption;
  final double? costPerKm;
  final String carId;

  const _SummaryCard({
    required this.monthSpent,
    required this.monthLiters,
    required this.avgConsumption,
    required this.costPerKm,
    required this.carId,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary.withValues(alpha: 0.15),
            AppColors.secondary.withValues(alpha: 0.08),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.local_gas_station_rounded,
                    color: AppColors.primary, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  context.tr('this_month').toUpperCase(),
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: context.cardElevatedColor,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: context.dividerColor),
                ),
                child: Text(
                  '#${carId.length > 6 ? carId.substring(0, 6) : carId}',
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            monthSpent.toStringAsFixed(2),
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 34,
              fontWeight: FontWeight.w900,
              letterSpacing: -1,
            ),
          ),
          Text(
            context.tr('total_spent'),
            style: TextStyle(
              color: context.textSecondaryColor,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _MiniStat(
                  label: context.tr('liters'),
                  value: monthLiters.toStringAsFixed(1),
                  icon: Icons.water_drop_rounded,
                  color: AppColors.secondary,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MiniStat(
                  label: context.tr('avg_consumption'),
                  value: avgConsumption == null
                      ? '—'
                      : '${avgConsumption!.toStringAsFixed(1)} L/100',
                  icon: Icons.speed_rounded,
                  color: AppColors.warning,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MiniStat(
                  label: context.tr('cost_per_km'),
                  value: costPerKm == null ? '—' : costPerKm!.toStringAsFixed(2),
                  icon: Icons.attach_money_rounded,
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

class _MiniStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _MiniStat({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: context.cardColor.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 14,
              fontWeight: FontWeight.w800,
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
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

// ---------------- Efficiency Insights ----------------

class _EfficiencyInsightsCard extends StatelessWidget {
  final double? totalKm;
  final double? trend; // positive = improving, negative = worsening
  final Map<String, int> fuelTypeCount;

  const _EfficiencyInsightsCard({
    required this.totalKm,
    required this.trend,
    required this.fuelTypeCount,
  });

  Color _fuelTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'petrol':
        return AppColors.warning;
      case 'diesel':
        return AppColors.secondary;
      case 'electric':
        return AppColors.primary;
      default:
        return AppColors.accent;
    }
  }

  IconData _fuelTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'petrol':
        return Icons.local_gas_station_rounded;
      case 'diesel':
        return Icons.water_drop_rounded;
      case 'electric':
        return Icons.electric_bolt_rounded;
      default:
        return Icons.local_gas_station_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasTrend = trend != null;
    final improving = (trend ?? 0) > 0;
    final trendColor = improving ? AppColors.primary : AppColors.error;
    final total = fuelTypeCount.values.fold(0, (a, b) => a + b);

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
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: const Icon(Icons.insights_rounded,
                    color: AppColors.accent, size: 16),
              ),
              const SizedBox(width: 8),
              Text(
                context.tr('efficiency_insights'),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              // Total km card
              if (totalKm != null)
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.secondary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: AppColors.secondary.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.route_rounded,
                            color: AppColors.secondary, size: 18),
                        const SizedBox(height: 8),
                        Text(
                          '${totalKm!.toStringAsFixed(0)} km',
                          style: TextStyle(
                            color: context.textPrimaryColor,
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          context.tr('distance_tracked'),
                          style: TextStyle(
                            color: context.textMutedColor,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              if (totalKm != null && hasTrend) const SizedBox(width: 8),
              // Trend card
              if (hasTrend)
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: trendColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: trendColor.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          improving
                              ? Icons.trending_down_rounded
                              : Icons.trending_up_rounded,
                          color: trendColor,
                          size: 18,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          improving
                              ? context.tr('improving')
                              : context.tr('worsening'),
                          style: TextStyle(
                            color: trendColor,
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          context.tr('efficiency_trend'),
                          style: TextStyle(
                            color: context.textMutedColor,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          if (fuelTypeCount.isNotEmpty) ...[
            const SizedBox(height: 12),
            // Fuel type breakdown
            Text(
              context.tr('fuel_type_breakdown'),
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: fuelTypeCount.entries.map((entry) {
                final color = _fuelTypeColor(entry.key);
                final pct = total > 0
                    ? (entry.value / total * 100).toStringAsFixed(0)
                    : '0';
                return Expanded(
                  flex: entry.value,
                  child: Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: Column(
                      children: [
                        Container(
                          height: 6,
                          decoration: BoxDecoration(
                            color: color,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(_fuelTypeIcon(entry.key),
                                color: color, size: 12),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                '${entry.key} $pct%',
                                style: TextStyle(
                                  color: context.textSecondaryColor,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------- Chart ----------------

class _CostChart extends StatelessWidget {
  final List<FuelEntry> entries; // chronological, oldest first
  const _CostChart({required this.entries});

  @override
  Widget build(BuildContext context) {
    final spots = <FlSpot>[];
    for (int i = 0; i < entries.length; i++) {
      spots.add(FlSpot(i.toDouble(), entries[i].totalCost));
    }
    final maxY =
        entries.fold<double>(0, (m, e) => e.totalCost > m ? e.totalCost : m);
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 16, 14, 10),
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
              Icon(Icons.show_chart_rounded,
                  color: AppColors.primary, size: 18),
              const SizedBox(width: 8),
              Text(
                context.tr('cost_breakdown'),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 150,
            child: LineChart(
              LineChartData(
                minX: 0,
                maxX: (entries.length - 1).toDouble().clamp(0, double.infinity),
                minY: 0,
                maxY: maxY <= 0 ? 10 : maxY * 1.2,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: maxY <= 0 ? 5 : (maxY / 3),
                  getDrawingHorizontalLine: (_) => FlLine(
                    color: context.dividerColor.withValues(alpha: 0.4),
                    strokeWidth: 1,
                  ),
                ),
                titlesData: FlTitlesData(
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 36,
                      getTitlesWidget: (value, meta) => Text(
                        value.toStringAsFixed(0),
                        style: TextStyle(
                          color: context.textMutedColor,
                          fontSize: 10,
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
                      interval: 1,
                      getTitlesWidget: (value, meta) {
                        final i = value.toInt();
                        if (i < 0 || i >= entries.length) {
                          return const SizedBox.shrink();
                        }
                        final d = entries[i].date;
                        return Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            DateFormat('M/d').format(d),
                            style: TextStyle(
                              color: context.textMutedColor,
                              fontSize: 9,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    color: AppColors.primary,
                    barWidth: 3,
                    dotData: FlDotData(
                      show: true,
                      getDotPainter: (spot, p, bar, i) => FlDotCirclePainter(
                        radius: 3.5,
                        color: AppColors.primary,
                        strokeColor: Colors.white,
                        strokeWidth: 1,
                      ),
                    ),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          AppColors.primary.withValues(alpha: 0.3),
                          AppColors.primary.withValues(alpha: 0.0),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------- Tile ----------------

class _FuelTile extends StatelessWidget {
  final FuelEntry entry;
  final double? consumption;
  const _FuelTile({required this.entry, required this.consumption});

  Color _typeColor() {
    switch (entry.fuelType) {
      case 'diesel':
        return AppColors.warning;
      case 'electric':
        return AppColors.accent;
      default:
        return AppColors.primary;
    }
  }

  String _typeLabel(BuildContext context) {
    switch (entry.fuelType) {
      case 'diesel':
        return context.tr('diesel');
      case 'electric':
        return context.tr('electric');
      default:
        return context.tr('petrol');
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _typeColor();
    return Container(
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: color,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                DateFormat('MMM d, yyyy').format(entry.date),
                                style: TextStyle(
                                  color: context.textPrimaryColor,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              if (entry.stationName.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Row(
                                  children: [
                                    Icon(Icons.place_rounded,
                                        size: 12,
                                        color: context.textMutedColor),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        entry.stationName,
                                        style: TextStyle(
                                          color: context.textSecondaryColor,
                                          fontSize: 12,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                        Text(
                          entry.totalCost.toStringAsFixed(2),
                          style: TextStyle(
                            color: context.textPrimaryColor,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                                color: color.withValues(alpha: 0.5)),
                          ),
                          child: Text(
                            _typeLabel(context),
                            style: TextStyle(
                              color: color,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (entry.fullTank)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                  color: AppColors.success
                                      .withValues(alpha: 0.5)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.check_circle_rounded,
                                    size: 10, color: AppColors.success),
                                const SizedBox(width: 3),
                                Text(
                                  context.tr('full_tank'),
                                  style: const TextStyle(
                                    color: AppColors.success,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        const Spacer(),
                        Text(
                          '${entry.liters.toStringAsFixed(1)} L @ ${entry.pricePerLiter.toStringAsFixed(2)}',
                          style: TextStyle(
                            color: context.textSecondaryColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.speed_rounded,
                            size: 13, color: context.textMutedColor),
                        const SizedBox(width: 4),
                        Text(
                          '${entry.odometer.toStringAsFixed(0)} km',
                          style: TextStyle(
                            color: context.textMutedColor,
                            fontSize: 11,
                          ),
                        ),
                        if (consumption != null) ...[
                          const SizedBox(width: 14),
                          Icon(Icons.local_fire_department_rounded,
                              size: 13, color: AppColors.warning),
                          const SizedBox(width: 4),
                          Text(
                            '${consumption!.toStringAsFixed(1)} L/100km',
                            style: const TextStyle(
                              color: AppColors.warning,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ],
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
}

// ---------------- Form ----------------

class _FuelEntryForm extends StatefulWidget {
  final String carId;
  const _FuelEntryForm({required this.carId});

  @override
  State<_FuelEntryForm> createState() => _FuelEntryFormState();
}

class _FuelEntryFormState extends State<_FuelEntryForm> {
  final _liters = TextEditingController();
  final _price = TextEditingController();
  final _total = TextEditingController();
  final _odometer = TextEditingController();
  final _station = TextEditingController();
  DateTime _date = DateTime.now();
  String _fuelType = 'petrol';
  bool _fullTank = true;
  bool _totalTouched = false;

  @override
  void initState() {
    super.initState();
    _liters.addListener(_maybeRecompute);
    _price.addListener(_maybeRecompute);
  }

  void _maybeRecompute() {
    if (_totalTouched) return;
    final l = double.tryParse(_liters.text.trim()) ?? 0;
    final p = double.tryParse(_price.text.trim()) ?? 0;
    final t = l * p;
    final next = t == 0 ? '' : t.toStringAsFixed(2);
    if (_total.text != next) {
      _total.value = TextEditingValue(
        text: next,
        selection: TextSelection.collapsed(offset: next.length),
      );
    }
  }

  @override
  void dispose() {
    _liters.dispose();
    _price.dispose();
    _total.dispose();
    _odometer.dispose();
    _station.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 5)),
      lastDate: DateTime.now(),
    );
    if (picked == null) return;
    setState(() => _date = picked);
  }

  void _save() {
    final liters = double.tryParse(_liters.text.trim()) ?? 0;
    final price = double.tryParse(_price.text.trim()) ?? 0;
    final total = double.tryParse(_total.text.trim()) ?? (liters * price);
    final odo = double.tryParse(_odometer.text.trim()) ?? 0;
    if (liters <= 0 || total <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('name_required'))),
      );
      return;
    }
    Navigator.pop(
      context,
      FuelEntry(
        id: DateTime.now().microsecondsSinceEpoch.toString(),
        carId: widget.carId,
        date: _date,
        liters: liters,
        pricePerLiter: price,
        totalCost: total,
        odometer: odo,
        fuelType: _fuelType,
        stationName: _station.text.trim(),
        fullTank: _fullTank,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: context.textMutedColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              context.tr('add_fuel'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 14),
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: context.dividerColor),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_today_rounded,
                        color: AppColors.primary, size: 16),
                    const SizedBox(width: 10),
                    Text(
                      DateFormat('MMM d, yyyy').format(_date),
                      style: TextStyle(color: context.textPrimaryColor),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _liters,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration:
                        InputDecoration(labelText: context.tr('liters')),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _price,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                        labelText: context.tr('price_per_liter')),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _total,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => _totalTouched = true,
              decoration: InputDecoration(labelText: context.tr('total_cost')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _odometer,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(labelText: context.tr('odometer')),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              value: _fuelType,
              decoration: InputDecoration(labelText: context.tr('fuel_type')),
              dropdownColor: context.cardColor,
              items: [
                DropdownMenuItem(
                    value: 'petrol', child: Text(context.tr('petrol'))),
                DropdownMenuItem(
                    value: 'diesel', child: Text(context.tr('diesel'))),
                DropdownMenuItem(
                    value: 'electric', child: Text(context.tr('electric'))),
              ],
              onChanged: (v) {
                if (v != null) setState(() => _fuelType = v);
              },
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _station,
              decoration:
                  InputDecoration(labelText: context.tr('station_name')),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: context.dividerColor),
              ),
              child: SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(context.tr('full_tank')),
                value: _fullTank,
                activeColor: AppColors.primary,
                onChanged: (v) => setState(() => _fullTank = v),
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _save,
                icon: const Icon(Icons.check_rounded),
                label: Text(context.tr('save')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
