import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/driver_model.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../data/repositories/tracking_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';
import 'driver_metrics.dart';

String _driverVehicleKey(String driverId) => 'driver_vehicle_$driverId';

class DriversScreen extends StatefulWidget {
  const DriversScreen({super.key});

  @override
  State<DriversScreen> createState() => _DriversScreenState();
}

class _DriversScreenState extends State<DriversScreen>
    with SingleTickerProviderStateMixin {
  late Future<List<DriverModel>> _future;
  late final TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
    _future = _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<List<DriverModel>> _load() =>
      context.read<TrackingRepository>().getDrivers();

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  Future<void> _edit(DriverModel? existing) async {
    final repo = context.read<TrackingRepository>();
    final msgFailed = context.tr('failed');
    final result = await showModalBottomSheet<DriverModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _DriverForm(existing: existing),
    );
    if (result == null) return;
    try {
      if (existing == null) {
        await repo.createDriver(result);
      } else {
        await repo.updateDriver(existing.id, result);
      }
      _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('$msgFailed: $e')));
    }
  }

  Future<void> _delete(DriverModel d) async {
    final delRepo = context.read<TrackingRepository>();
    final msgFailed = context.tr('failed');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: context.surfaceColor,
        title: Text(context.tr('confirm_delete')),
        content: Text('${context.tr('delete_geofence_msg')} "${d.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(context.tr('cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              context.tr('delete'),
              style: const TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await delRepo.deleteDriver(d.id);
      // Clean up assignment pref
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_driverVehicleKey(d.id));
      _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('$msgFailed: $e')));
    }
  }

  Future<void> _openAssignSheet(DriverModel driver) async {
    final vehicles = context.read<FleetCubit>().state.items;
    final prefs = await SharedPreferences.getInstance();
    final currentId = prefs.getString(_driverVehicleKey(driver.id));
    if (!mounted) return;
    final result = await showModalBottomSheet<_AssignResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _AssignVehicleSheet(
        driver: driver,
        vehicles: vehicles,
        currentCarId: currentId,
      ),
    );
    if (result == null) return;
    final prefs2 = await SharedPreferences.getInstance();
    if (result.clear) {
      await prefs2.remove(_driverVehicleKey(driver.id));
    } else if (result.carId != null) {
      await prefs2.setString(
          _driverVehicleKey(driver.id), result.carId!);
    }
    if (!mounted) return;
    setState(() {}); // rebuild tiles so assignment updates
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('drivers')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        bottom: TabBar(
          controller: _tab,
          labelColor: AppColors.primary,
          unselectedLabelColor: context.textSecondaryColor,
          indicatorColor: AppColors.primary,
          tabs: [
            Tab(
              icon: const Icon(Icons.badge_rounded, size: 18),
              text: context.tr('drivers'),
            ),
            Tab(
              icon: const Icon(Icons.insights_rounded, size: 18),
              text: context.tr('behavior_summary'),
            ),
          ],
        ),
      ),
      floatingActionButton: ListenableBuilder(
        listenable: _tab,
        builder: (context, _) {
          if (_tab.index != 0) return const SizedBox.shrink();
          return FloatingActionButton.extended(
            onPressed: () => _edit(null),
            icon: const Icon(Icons.person_add_rounded),
            label: Text(context.tr('add_driver')),
          );
        },
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          // ── Tab 1: Driver list ──
          FutureBuilder<List<DriverModel>>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const ShimmerList();
              }
              if (snap.hasError) {
                return AppError(
                    message: snap.error.toString(), onRetry: _refresh);
              }
              final list = snap.data ?? [];
              if (list.isEmpty) {
                return EmptyState(
                  title: context.tr('no_drivers'),
                  subtitle: context.tr('no_drivers_subtitle'),
                  icon: Icons.badge_outlined,
                );
              }
              return RefreshIndicator(
                color: AppColors.primary,
                onRefresh: _refresh,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _DriverTile(
                    driver: list[i],
                    onTap: () {
                      final d = list[i];
                      final name = Uri.encodeQueryComponent(
                        d.name.isEmpty ? 'Driver' : d.name,
                      );
                      context.push('/drivers/${d.id}/behavior?name=$name');
                    },
                    onEdit: () => _edit(list[i]),
                    onDelete: () => _delete(list[i]),
                    onAssign: () => _openAssignSheet(list[i]),
                    onHos: () {
                      final d = list[i];
                      final name = Uri.encodeQueryComponent(
                        d.name.isEmpty ? 'Driver' : d.name,
                      );
                      context.push('/drivers/${d.id}/hos?name=$name');
                    },
                    onScorecard: () => context.push('/drivers/scorecards'),
                  ),
                ),
              );
            },
          ),

          // ── Tab 2: Behavior summary ──
          FutureBuilder<List<DriverModel>>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const ShimmerList();
              }
              if (snap.hasError) {
                return AppError(
                    message: snap.error.toString(), onRetry: _refresh);
              }
              final list = snap.data ?? [];
              return _BehaviorSummaryTab(drivers: list);
            },
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// Behavior Summary Tab
// ============================================================================

// DriverMetrics is defined in driver_metrics.dart (public, testable).

class _BehaviorSummaryTab extends StatefulWidget {
  final List<DriverModel> drivers;
  const _BehaviorSummaryTab({required this.drivers});

  @override
  State<_BehaviorSummaryTab> createState() => _BehaviorSummaryTabState();
}

class _BehaviorSummaryTabState extends State<_BehaviorSummaryTab> {
  List<DriverMetrics>? _metrics;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadReports());
  }

  Future<void> _loadReports() async {
    if (!mounted) return;
    final repo = context.read<TrackingRepository>();
    final now = DateTime.now();
    final from = now.subtract(const Duration(days: 7));

    final results = await Future.wait(widget.drivers.map((d) async {
      final carId = d.assignedCarId;
      if (carId == null || carId.isEmpty) {
        return DriverMetrics.fromHash(d);
      }
      try {
        final report = await repo.getReport(carId, from, now);
        return DriverMetrics.fromReport(d, report);
      } catch (_) {
        return DriverMetrics.fromHash(d);
      }
    }));

    if (!mounted) return;
    setState(() {
      _metrics = results;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.drivers.isEmpty) {
      return EmptyState(
        title: context.tr('no_drivers'),
        subtitle: context.tr('no_drivers_subtitle'),
        icon: Icons.insights_rounded,
      );
    }

    if (_loading || _metrics == null) {
      return const AppLoading();
    }

    final sorted = [..._metrics!]
      ..sort((a, b) => b.score.compareTo(a.score));

    final avgScore =
        sorted.map((m) => m.score).reduce((a, b) => a + b) / sorted.length;
    final best = sorted.first.driver.name;
    final worst = sorted.last.driver.name;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
      children: [
        // ── Fleet overview card ──
        _FleetBehaviorCard(
          avgScore: avgScore,
          bestDriver: best,
          worstDriver: worst,
          totalDrivers: widget.drivers.length,
        ).animate().fadeIn(duration: 400.ms).slideY(
            begin: 0.08,
            end: 0,
            duration: 380.ms,
            curve: Curves.easeOutCubic),

        const SizedBox(height: 20),

        // ── Legend row ──
        Row(
          children: [
            Text(
              context.tr('driver_rankings'),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const Spacer(),
            _LegendDot(
                color: AppColors.primary, label: context.tr('score')),
          ],
        ),
        const SizedBox(height: 12),

        // ── Per-driver cards ──
        ...sorted.asMap().entries.map((e) {
          final i = e.key;
          final m = e.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _DriverBehaviorCard(
              rank: i + 1,
              driver: m.driver,
              score: m.score,
              speeding: m.speeding,
              braking: m.braking,
              idleMin: m.idleMin,
            )
                .animate(delay: (i * 60).ms)
                .fadeIn(duration: 380.ms)
                .slideY(
                    begin: 0.1,
                    end: 0,
                    duration: 360.ms,
                    curve: Curves.easeOutCubic),
          );
        }),
      ],
    );
  }
}

class _FleetBehaviorCard extends StatelessWidget {
  final double avgScore;
  final String bestDriver;
  final String worstDriver;
  final int totalDrivers;

  const _FleetBehaviorCard({
    required this.avgScore,
    required this.bestDriver,
    required this.worstDriver,
    required this.totalDrivers,
  });

  Color get _scoreColor {
    if (avgScore >= 80) return AppColors.primary;
    if (avgScore >= 60) return AppColors.warning;
    return AppColors.error;
  }

  @override
  Widget build(BuildContext context) {
    final pct = (avgScore / 100).clamp(0.0, 1.0);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            _scoreColor.withValues(alpha: 0.18),
            _scoreColor.withValues(alpha: 0.06),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _scoreColor.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: _scoreColor.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(Icons.insights_rounded,
                    color: _scoreColor, size: 20),
              ),
              const SizedBox(width: 10),
              Text(
                context.tr('fleet_behavior_overview'),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _scoreColor.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: _scoreColor.withValues(alpha: 0.5)),
                ),
                child: Text(
                  '$totalDrivers ${context.tr('drivers').toLowerCase()}',
                  style: TextStyle(
                    color: _scoreColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Score circle + progress
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Big score display
              Column(
                children: [
                  TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: avgScore),
                    duration: const Duration(milliseconds: 900),
                    curve: Curves.easeOutCubic,
                    builder: (_, v, __) => Text(
                      '${v.toInt()}',
                      style: TextStyle(
                        color: _scoreColor,
                        fontSize: 48,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -2,
                        height: 1,
                      ),
                    ),
                  ),
                  Text(
                    context.tr('avg_score'),
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Progress bar
                    TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: pct),
                      duration: const Duration(milliseconds: 900),
                      curve: Curves.easeOutCubic,
                      builder: (_, v, __) {
                        return ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: LinearProgressIndicator(
                            value: v,
                            minHeight: 10,
                            backgroundColor:
                                _scoreColor.withValues(alpha: 0.15),
                            valueColor: AlwaysStoppedAnimation(_scoreColor),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                    // Best / Worst
                    Row(
                      children: [
                        Expanded(
                          child: _MiniStat(
                            icon: Icons.emoji_events_rounded,
                            color: AppColors.primary,
                            label: context.tr('best'),
                            value: bestDriver.isEmpty ? '—' : bestDriver,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _MiniStat(
                            icon: Icons.warning_amber_rounded,
                            color: AppColors.warning,
                            label: context.tr('needs_improvement'),
                            value: worstDriver.isEmpty ? '—' : worstDriver,
                          ),
                        ),
                      ],
                    ),
                  ],
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
  final IconData icon;
  final Color color;
  final String label;
  final String value;
  const _MiniStat({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 6),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
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

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label,
            style: TextStyle(color: context.textMutedColor, fontSize: 11)),
      ],
    );
  }
}

class _DriverBehaviorCard extends StatelessWidget {
  final int rank;
  final DriverModel driver;
  final int score;
  final int speeding;
  final int braking;
  final int idleMin;

  const _DriverBehaviorCard({
    required this.rank,
    required this.driver,
    required this.score,
    required this.speeding,
    required this.braking,
    required this.idleMin,
  });

  Color get _scoreColor {
    if (score >= 80) return AppColors.primary;
    if (score >= 60) return AppColors.warning;
    return AppColors.error;
  }

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
          // Rank badge
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: rank == 1
                  ? AppColors.warning.withValues(alpha: 0.2)
                  : context.dividerColor,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: rank == 1
                    ? AppColors.warning.withValues(alpha: 0.6)
                    : context.dividerColor,
              ),
            ),
            child: Center(
              child: rank == 1
                  ? const Icon(Icons.emoji_events_rounded,
                      color: AppColors.warning, size: 16)
                  : Text(
                      '#$rank',
                      style: TextStyle(
                        color: context.textSecondaryColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 12),
          // Driver info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  driver.name.isEmpty ? '—' : driver.name,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                // Score bar
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: TweenAnimationBuilder<double>(
                          tween: Tween(begin: 0, end: score / 100),
                          duration: const Duration(milliseconds: 800),
                          curve: Curves.easeOutCubic,
                          builder: (_, v, __) => LinearProgressIndicator(
                            value: v,
                            minHeight: 6,
                            backgroundColor:
                                _scoreColor.withValues(alpha: 0.15),
                            valueColor:
                                AlwaysStoppedAnimation(_scoreColor),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '$score',
                      style: TextStyle(
                        color: _scoreColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Event stats
                Row(
                  children: [
                    _EventBadge(
                      icon: Icons.speed_rounded,
                      color: AppColors.error,
                      count: speeding,
                      label: context.tr('speeding'),
                    ),
                    const SizedBox(width: 6),
                    _EventBadge(
                      icon: Icons.front_hand_rounded,
                      color: AppColors.warning,
                      count: braking,
                      label: context.tr('hard_braking'),
                    ),
                    const SizedBox(width: 6),
                    _EventBadge(
                      icon: Icons.timer_off_rounded,
                      color: AppColors.statusStale,
                      count: idleMin,
                      label: context.tr('idle_min'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EventBadge extends StatelessWidget {
  final IconData icon;
  final Color color;
  final int count;
  final String label;

  const _EventBadge({
    required this.icon,
    required this.color,
    required this.count,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 12),
          const SizedBox(width: 4),
          Text(
            '$count',
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// Driver list tiles
// ============================================================================

class _DriverTile extends StatefulWidget {
  final DriverModel driver;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onAssign;
  final VoidCallback onHos;
  final VoidCallback? onScorecard;
  const _DriverTile({
    required this.driver,
    required this.onTap,
    required this.onEdit,
    required this.onDelete,
    required this.onAssign,
    required this.onHos,
    this.onScorecard,
  });

  @override
  State<_DriverTile> createState() => _DriverTileState();
}

class _DriverTileState extends State<_DriverTile> {
  String? _assignedCarId;
  bool _loadingAssignment = true;

  @override
  void initState() {
    super.initState();
    _assignedCarId = widget.driver.assignedCarId;
    _loadAssignment();
  }

  @override
  void didUpdateWidget(covariant _DriverTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Parent rebuild after assignment change – refresh
    _loadAssignment();
  }

  Future<void> _loadAssignment() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_driverVehicleKey(widget.driver.id));
    if (!mounted) return;
    setState(() {
      _assignedCarId = stored ?? widget.driver.assignedCarId;
      _loadingAssignment = false;
    });
  }

  FleetItem? _findVehicle(String? carId) {
    if (carId == null || carId.isEmpty) return null;
    final items = context.read<FleetCubit>().state.items;
    for (final v in items) {
      if (v.carId == carId) return v;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final vehicle = _findVehicle(_assignedCarId);
    final hasAssignment = _assignedCarId != null && _assignedCarId!.isNotEmpty;

    return InkWell(
      onTap: widget.onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
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
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      (widget.driver.name.isNotEmpty
                              ? widget.driver.name[0]
                              : 'D')
                          .toUpperCase(),
                      style: const TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.driver.name,
                          style: TextStyle(
                            color: context.textPrimaryColor,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          )),
                      const SizedBox(height: 2),
                      Text(
                          widget.driver.phone ??
                              widget.driver.email ??
                              '—',
                          style: TextStyle(
                              color: context.textSecondaryColor,
                              fontSize: 12)),
                      if (widget.driver.licenseNumber != null &&
                          widget.driver.licenseNumber!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                            '${context.tr('license')}: ${widget.driver.licenseNumber}',
                            style: TextStyle(
                                color: context.textMutedColor,
                                fontSize: 11)),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Scorecard',
                  icon: const Icon(Icons.emoji_events_rounded,
                      color: AppColors.warning),
                  onPressed: widget.onScorecard,
                ),
                IconButton(
                  tooltip: context.tr('hos'),
                  icon: Icon(Icons.schedule_rounded,
                      color: AppColors.primary),
                  onPressed: widget.onHos,
                ),
                IconButton(
                  icon: Icon(Icons.edit_outlined,
                      color: context.textSecondaryColor),
                  onPressed: widget.onEdit,
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline,
                      color: AppColors.error),
                  onPressed: widget.onDelete,
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (_loadingAssignment)
              Padding(
                padding: const EdgeInsets.only(left: 4, top: 2),
                child: Text(
                  context.tr('loading'),
                  style: TextStyle(
                      color: context.textMutedColor, fontSize: 11),
                ),
              )
            else
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: _AssignmentChip(
                  hasAssignment: hasAssignment,
                  vehicle: vehicle,
                  assignedCarId: _assignedCarId,
                  onTap: widget.onAssign,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _AssignmentChip extends StatelessWidget {
  final bool hasAssignment;
  final FleetItem? vehicle;
  final String? assignedCarId;
  final VoidCallback onTap;

  const _AssignmentChip({
    required this.hasAssignment,
    required this.vehicle,
    required this.assignedCarId,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (!hasAssignment) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: context.textMutedColor.withValues(alpha: 0.5),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.directions_car_outlined,
                    size: 14, color: context.textMutedColor),
                const SizedBox(width: 6),
                Text(
                  context.tr('assign_vehicle'),
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final label = vehicle != null
        ? (vehicle!.carName.isNotEmpty
            ? vehicle!.carName
            : (vehicle!.licensePlate.isNotEmpty
                ? vehicle!.licensePlate
                : assignedCarId!))
        : assignedCarId!;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.14),
            borderRadius: BorderRadius.circular(10),
            border:
                Border.all(color: AppColors.primary.withValues(alpha: 0.45)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle_rounded,
                  size: 14, color: AppColors.primary),
              const SizedBox(width: 6),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 220),
                child: Text(
                  '${context.tr('assigned_to')} $label',
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AssignResult {
  final String? carId;
  final bool clear;
  const _AssignResult({this.carId, this.clear = false});
}

class _AssignVehicleSheet extends StatefulWidget {
  final DriverModel driver;
  final List<FleetItem> vehicles;
  final String? currentCarId;

  const _AssignVehicleSheet({
    required this.driver,
    required this.vehicles,
    required this.currentCarId,
  });

  @override
  State<_AssignVehicleSheet> createState() => _AssignVehicleSheetState();
}

class _AssignVehicleSheetState extends State<_AssignVehicleSheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final q = _query.trim().toLowerCase();
    final filtered = q.isEmpty
        ? widget.vehicles
        : widget.vehicles
            .where((v) =>
                v.carName.toLowerCase().contains(q) ||
                v.licensePlate.toLowerCase().contains(q))
            .toList();

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
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
          const SizedBox(height: 16),
          Text(
            '${context.tr('assign_vehicle')}: ${widget.driver.name}',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 4),
          Text(
            context.tr('select_vehicle_for_driver'),
            style: TextStyle(
                color: context.textSecondaryColor, fontSize: 12),
          ),
          const SizedBox(height: 14),
          TextField(
            style: TextStyle(color: context.textPrimaryColor),
            onChanged: (v) => setState(() => _query = v),
            decoration: InputDecoration(
              hintText: context.tr('search_vehicles'),
              hintStyle: TextStyle(color: context.textMutedColor),
              prefixIcon: Icon(Icons.search_rounded,
                  color: context.textMutedColor),
              filled: true,
              fillColor: context.cardColor,
              isDense: true,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: context.dividerColor),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: context.dividerColor),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                    color: AppColors.primary, width: 1.5),
              ),
            ),
          ),
          const SizedBox(height: 12),
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.5,
            ),
            child: filtered.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text(
                        context.tr('no_vehicles'),
                        style: TextStyle(
                            color: context.textSecondaryColor),
                      ),
                    ),
                  )
                : ListView.separated(
                    shrinkWrap: true,
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final v = filtered[i];
                      final selected = widget.currentCarId == v.carId;
                      return _VehicleOption(
                        vehicle: v,
                        selected: selected,
                        onTap: () => Navigator.pop(
                            context, _AssignResult(carId: v.carId)),
                      );
                    },
                  ),
          ),
          const SizedBox(height: 12),
          if (widget.currentCarId != null &&
              widget.currentCarId!.isNotEmpty)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.error,
                  side: BorderSide(
                      color: AppColors.error.withValues(alpha: 0.6)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                onPressed: () => Navigator.pop(
                    context, const _AssignResult(clear: true)),
                icon: const Icon(Icons.link_off_rounded, size: 18),
                label: Text(context.tr('remove_assignment')),
              ),
            ),
        ],
      ),
    );
  }
}

class _VehicleOption extends StatelessWidget {
  final FleetItem vehicle;
  final bool selected;
  final VoidCallback onTap;

  const _VehicleOption({
    required this.vehicle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = AppColors.statusColor(vehicle.movementStatus);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: selected
                ? AppColors.primary.withValues(alpha: 0.08)
                : context.cardColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? AppColors.primary : context.dividerColor,
              width: selected ? 1.4 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: statusColor,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: statusColor.withValues(alpha: 0.6),
                      blurRadius: 6,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      vehicle.carName.isEmpty
                          ? context.tr('unnamed_vehicle')
                          : vehicle.carName,
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (vehicle.licensePlate.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        vehicle.licensePlate,
                        style: TextStyle(
                          color: context.textSecondaryColor,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (selected)
                const Icon(Icons.check_circle_rounded,
                    color: AppColors.primary, size: 22)
              else
                Icon(Icons.chevron_right_rounded,
                    color: context.textMutedColor),
            ],
          ),
        ),
      ),
    );
  }
}

class _DriverForm extends StatefulWidget {
  final DriverModel? existing;
  const _DriverForm({this.existing});

  @override
  State<_DriverForm> createState() => _DriverFormState();
}

class _DriverFormState extends State<_DriverForm> {
  late final TextEditingController _name;
  late final TextEditingController _phone;
  late final TextEditingController _email;
  late final TextEditingController _license;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.existing?.name ?? '');
    _phone = TextEditingController(text: widget.existing?.phone ?? '');
    _email = TextEditingController(text: widget.existing?.email ?? '');
    _license =
        TextEditingController(text: widget.existing?.licenseNumber ?? '');
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _license.dispose();
    super.dispose();
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
                widget.existing == null
                    ? context.tr('new_driver')
                    : context.tr('edit'),
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            TextField(
              controller: _name,
              decoration:
                  InputDecoration(labelText: context.tr('full_name')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _phone,
              decoration: InputDecoration(labelText: context.tr('phone')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _email,
              decoration: InputDecoration(labelText: context.tr('email')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _license,
              decoration: InputDecoration(labelText: context.tr('license')),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  if (_name.text.trim().isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text(context.tr('name_required'))),
                    );
                    return;
                  }
                  Navigator.pop(
                    context,
                    DriverModel(
                      id: widget.existing?.id ?? '',
                      name: _name.text.trim(),
                      phone: _phone.text.trim().isEmpty
                          ? null
                          : _phone.text.trim(),
                      email: _email.text.trim().isEmpty
                          ? null
                          : _email.text.trim(),
                      licenseNumber: _license.text.trim().isEmpty
                          ? null
                          : _license.text.trim(),
                    ),
                  );
                },
                child: Text(context.tr('save')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
