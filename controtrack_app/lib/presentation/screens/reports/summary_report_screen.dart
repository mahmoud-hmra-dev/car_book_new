import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../data/repositories/fleet_repository.dart';
import '../../../data/repositories/tracking_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../widgets/web/web_page_scaffold.dart';

class SummaryReportScreen extends StatefulWidget {
  const SummaryReportScreen({super.key});

  @override
  State<SummaryReportScreen> createState() => _SummaryReportScreenState();
}

enum _Period { today, week, month }

class _SummaryReportScreenState extends State<SummaryReportScreen> {
  _Period _period = _Period.today;

  int _infractionsCount = 0;
  Map<String, int> _infractionsByType = const {};
  int _overdueMaintenance = 0;
  int _upcomingMaintenance = 0;
  int _alertsCount = 0;
  bool _alertsAvailable = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  DateTime get _periodStart {
    final now = DateTime.now();
    switch (_period) {
      case _Period.today:
        return DateTime(now.year, now.month, now.day);
      case _Period.week:
        return now.subtract(const Duration(days: 7));
      case _Period.month:
        return now.subtract(const Duration(days: 30));
    }
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    // Capture repos before any await.
    final fleetRepo = context.read<FleetRepository>();
    final trackingRepo = context.read<TrackingRepository>();

    try {
      final eventsFuture = fleetRepo.getEvents(
        from: _periodStart,
        to: DateTime.now(),
        limit: 200,
      );
      final maintFuture = trackingRepo.getMaintenance();
      final events = await eventsFuture;
      final maintenance = await maintFuture;

      // Count events as alerts; classify driving infractions by type.
      int infractionsCount = 0;
      final Map<String, int> typeCounts = {};
      for (final e in events) {
        final t = e.type.toLowerCase();
        if (t.contains('speed')) {
          infractionsCount++;
          typeCounts['speeding'] = (typeCounts['speeding'] ?? 0) + 1;
        } else if (t.contains('brake') || t.contains('harshbraking') || t.contains('hard_braking')) {
          infractionsCount++;
          typeCounts['harsh_braking'] = (typeCounts['harsh_braking'] ?? 0) + 1;
        } else if (t.contains('acceleration') || t.contains('harshacceleration')) {
          infractionsCount++;
          typeCounts['harsh_accel'] = (typeCounts['harsh_accel'] ?? 0) + 1;
        } else if (t.contains('alarm') || t.contains('sos') || t.contains('panic') || t.contains('crash')) {
          infractionsCount++;
          typeCounts['alert'] = (typeCounts['alert'] ?? 0) + 1;
        }
      }

      // Maintenance overdue / upcoming.
      final now = DateTime.now();
      final weekFromNow = now.add(const Duration(days: 7));
      int overdue = 0;
      int upcoming = 0;
      for (final m in maintenance) {
        final end = m.endDate;
        if (end == null) continue;
        if (end.isBefore(now)) {
          overdue++;
        } else if (end.isBefore(weekFromNow)) {
          upcoming++;
        }
      }

      if (!mounted) return;
      setState(() {
        _infractionsCount = infractionsCount;
        _infractionsByType = typeCounts;
        _overdueMaintenance = overdue;
        _upcomingMaintenance = upcoming;
        _alertsCount = events.length;
        _alertsAvailable = true;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _setPeriod(_Period p) {
    if (_period == p) return;
    setState(() => _period = p);
    _loadData();
  }

  double _avgFleetSpeed(List<FleetItem> items) {
    final moving = items.where((e) => e.movementStatus == 'moving').toList();
    if (moving.isEmpty) return 0;
    final sum = moving.fold<double>(0, (acc, e) => acc + e.speedKmh);
    return sum / moving.length;
  }

  /// Very rough best-effort estimate based on current movement snapshot.
  double _estimatedDistance(List<FleetItem> items) {
    final moving = items.where((e) => e.movementStatus == 'moving').toList();
    if (moving.isEmpty) return 0;
    final avg = _avgFleetSpeed(items);
    final hours = switch (_period) {
      _Period.today => 8.0,
      _Period.week => 40.0,
      _Period.month => 160.0,
    };
    return avg * hours * moving.length;
  }

  /// Utilisation = (moving + idle) / total
  double _utilizationRate(List<FleetItem> items) {
    if (items.isEmpty) return 0;
    final active =
        items.where((e) => e.movementStatus == 'moving' || e.movementStatus == 'idle').length;
    return active / items.length;
  }

  /// Composite fleet health score 0–100.
  int _fleetScore(List<FleetItem> items) {
    int score = 100;
    // Offline penalty
    if (items.isNotEmpty) {
      final offline =
          items.where((e) => e.movementStatus == 'offline').length;
      score -= ((offline / items.length) * 20).round();
    }
    // Overdue maintenance penalty (max -25)
    score -= (_overdueMaintenance * 5).clamp(0, 25);
    // Infraction penalty (max -20)
    score -= (_infractionsCount * 2).clamp(0, 20);
    return score.clamp(0, 100);
  }

  String _scoreGrade(int score) {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 45) return 'D';
    return 'F';
  }

  Color _scoreColor(int score) {
    if (score >= 75) return AppColors.primary;
    if (score >= 55) return AppColors.warning;
    return AppColors.error;
  }

  String _periodLabel(BuildContext ctx) {
    switch (_period) {
      case _Period.today:
        return ctx.tr('today');
      case _Period.week:
        return ctx.tr('last_7_days');
      case _Period.month:
        return ctx.tr('this_month');
    }
  }

  String _buildReportText(BuildContext ctx, List<FleetItem> items,
      HealthSummary summary) {
    final dateStr = DateFormat('d MMM yyyy').format(DateTime.now());
    final avgSpeed = _avgFleetSpeed(items);
    final estDistance = _estimatedDistance(items);
    final score = _fleetScore(items);
    final grade = _scoreGrade(score);
    final utilPct = (_utilizationRate(items) * 100).toStringAsFixed(0);

    final buf = StringBuffer()
      ..writeln('ControTrack Fleet Summary — $dateStr')
      ..writeln('Period: ${_periodLabel(ctx)}')
      ..writeln('Fleet Health Score: $score/100 (Grade: $grade)')
      ..writeln('')
      ..writeln('== Fleet Status ==')
      ..writeln('Total: ${summary.total} vehicles')
      ..writeln('Moving: ${summary.moving}')
      ..writeln('Idle: ${summary.idle}')
      ..writeln('Stopped: ${summary.stopped}')
      ..writeln('Offline: ${summary.offline}')
      ..writeln('Utilisation: $utilPct%')
      ..writeln('')
      ..writeln('== Performance ==')
      ..writeln('Avg fleet speed: ${avgSpeed.toStringAsFixed(1)} km/h')
      ..writeln('Estimated distance: ${estDistance.toStringAsFixed(0)} km')
      ..writeln('')
      ..writeln('== Safety ==')
      ..writeln('Infractions this period: $_infractionsCount');
    if (_infractionsByType.isNotEmpty) {
      for (final entry in _infractionsByType.entries) {
        buf.writeln('  - ${entry.key}: ${entry.value}');
      }
    }
    buf
      ..writeln('')
      ..writeln('== Maintenance ==')
      ..writeln('Overdue: $_overdueMaintenance')
      ..writeln('Upcoming (7 days): $_upcomingMaintenance')
      ..writeln('')
      ..writeln('== Alerts ==');
    if (_alertsAvailable) {
      buf.writeln('Total alerts: $_alertsCount');
    } else {
      buf.writeln('Check alerts screen');
    }
    return buf.toString();
  }

  Future<void> _shareReport(
      List<FleetItem> items, HealthSummary summary) async {
    final messenger = ScaffoldMessenger.of(context);
    final copiedMsg = context.tr('report_copied');
    final text = _buildReportText(context, items, summary);
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    messenger.showSnackBar(
      SnackBar(
        backgroundColor: AppColors.primaryDark,
        content: Text(copiedMsg),
      ),
    );
  }

  void _openSchedule() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: ctx.textMutedColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.schedule_rounded,
                        color: AppColors.accent, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    ctx.tr('schedule'),
                    style: TextStyle(
                      color: ctx.textPrimaryColor,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                ctx.tr('scheduling_info'),
                style: TextStyle(
                  color: ctx.textSecondaryColor,
                  fontSize: 14,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: Text(ctx.tr('close')),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<FleetCubit>().state;
    final items = state.items;
    final summary = state.summary;
    final avgSpeed = _avgFleetSpeed(items);
    final estDistance = _estimatedDistance(items);
    final utilRate = _utilizationRate(items);
    final score = _fleetScore(items);
    final grade = _scoreGrade(score);
    final scoreCol = _scoreColor(score);

    final isWide = MediaQuery.sizeOf(context).width >= 900;

    return WebPageScaffoldScrollable(
      title: context.tr('summary_report'),
      subtitle: 'Period performance overview',
      actions: isWide
          ? [
              _WebPeriodSelector(
                period: _period,
                onChanged: _setPeriod,
              ),
              const SizedBox(width: 8),
              IconButton(
                tooltip: context.tr('schedule'),
                icon: Icon(
                  Icons.schedule_rounded,
                  color: context.textSecondaryColor,
                ),
                onPressed: _openSchedule,
              ),
              IconButton(
                tooltip: context.tr('share_report'),
                icon: Icon(
                  Icons.ios_share_rounded,
                  color: context.textSecondaryColor,
                ),
                onPressed: () => _shareReport(items, summary),
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
                title: Text(context.tr('summary_report')),
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back_rounded),
                  onPressed: () => context.pop(),
                ),
                actions: [
                  IconButton(
                    tooltip: context.tr('schedule'),
                    icon: const Icon(Icons.schedule_rounded),
                    onPressed: _openSchedule,
                  ),
                ],
              ),
        body: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              )
            : (isWide
                ? _buildWebBody(
                    context,
                    items: items,
                    summary: summary,
                    avgSpeed: avgSpeed,
                    estDistance: estDistance,
                    utilRate: utilRate,
                    score: score,
                    grade: grade,
                    scoreCol: scoreCol,
                  )
                : _buildMobileBody(
                    context,
                    items: items,
                    summary: summary,
                    avgSpeed: avgSpeed,
                    estDistance: estDistance,
                    utilRate: utilRate,
                    score: score,
                    grade: grade,
                    scoreCol: scoreCol,
                  )),
      ),
    );
  }

  Widget _buildMobileBody(
    BuildContext context, {
    required List<FleetItem> items,
    required HealthSummary summary,
    required double avgSpeed,
    required double estDistance,
    required double utilRate,
    required int score,
    required String grade,
    required Color scoreCol,
  }) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        _PeriodSelector(
          period: _period,
          onChanged: _setPeriod,
        )
            .animate()
            .fadeIn(duration: 300.ms)
            .slideY(begin: -0.04, end: 0),
        const SizedBox(height: 16),
        _ReportHeaderCard(periodLabel: _periodLabel(context))
            .animate()
            .fadeIn(delay: 40.ms, duration: 300.ms),
        const SizedBox(height: 14),
        _FleetScoreCard(
          score: score,
          grade: grade,
          color: scoreCol,
          overdueCount: _overdueMaintenance,
          infractionsCount: _infractionsCount,
          utilizationRate: utilRate,
        )
            .animate()
            .fadeIn(delay: 60.ms, duration: 300.ms)
            .slideY(begin: 0.04, end: 0),
        const SizedBox(height: 12),
        _FleetStatusSection(summary: summary)
            .animate()
            .fadeIn(delay: 80.ms, duration: 300.ms)
            .slideY(begin: 0.04, end: 0),
        const SizedBox(height: 12),
        _PerformanceSection(
          avgSpeed: avgSpeed,
          estDistance: estDistance,
          utilizationRate: utilRate,
          activeCount: summary.moving + summary.idle,
        )
            .animate()
            .fadeIn(delay: 120.ms, duration: 300.ms)
            .slideY(begin: 0.04, end: 0),
        const SizedBox(height: 12),
        _SafetySection(
          count: _infractionsCount,
          breakdown: _infractionsByType,
        )
            .animate()
            .fadeIn(delay: 160.ms, duration: 300.ms)
            .slideY(begin: 0.04, end: 0),
        const SizedBox(height: 12),
        _MaintenanceSection(
          overdue: _overdueMaintenance,
          upcoming: _upcomingMaintenance,
        )
            .animate()
            .fadeIn(delay: 200.ms, duration: 300.ms)
            .slideY(begin: 0.04, end: 0),
        const SizedBox(height: 12),
        _AlertsSection(
          count: _alertsCount,
          available: _alertsAvailable,
        )
            .animate()
            .fadeIn(delay: 240.ms, duration: 300.ms)
            .slideY(begin: 0.04, end: 0),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _openSchedule,
                icon: const Icon(Icons.schedule_rounded),
                label: Text(context.tr('schedule')),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.accent,
                  side: BorderSide(
                      color: AppColors.accent.withValues(alpha: 0.6)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: () => _shareReport(items, summary),
                icon: const Icon(Icons.ios_share_rounded),
                label: Text(context.tr('share_report')),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildWebBody(
    BuildContext context, {
    required List<FleetItem> items,
    required HealthSummary summary,
    required double avgSpeed,
    required double estDistance,
    required double utilRate,
    required int score,
    required String grade,
    required Color scoreCol,
  }) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(28, 24, 28, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ReportHeaderCard(periodLabel: _periodLabel(context))
              .animate()
              .fadeIn(duration: 300.ms),
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left column — 40% — KPIs
              Expanded(
                flex: 4,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _FleetScoreCard(
                      score: score,
                      grade: grade,
                      color: scoreCol,
                      overdueCount: _overdueMaintenance,
                      infractionsCount: _infractionsCount,
                      utilizationRate: utilRate,
                    )
                        .animate()
                        .fadeIn(delay: 60.ms, duration: 300.ms)
                        .slideY(begin: 0.04, end: 0),
                    const SizedBox(height: 14),
                    _SafetySection(
                      count: _infractionsCount,
                      breakdown: _infractionsByType,
                    )
                        .animate()
                        .fadeIn(delay: 120.ms, duration: 300.ms)
                        .slideY(begin: 0.04, end: 0),
                    const SizedBox(height: 14),
                    _MaintenanceSection(
                      overdue: _overdueMaintenance,
                      upcoming: _upcomingMaintenance,
                    )
                        .animate()
                        .fadeIn(delay: 160.ms, duration: 300.ms)
                        .slideY(begin: 0.04, end: 0),
                    const SizedBox(height: 14),
                    _AlertsSection(
                      count: _alertsCount,
                      available: _alertsAvailable,
                    )
                        .animate()
                        .fadeIn(delay: 200.ms, duration: 300.ms)
                        .slideY(begin: 0.04, end: 0),
                  ],
                ),
              ),
              const SizedBox(width: 20),
              // Right column — 60% — charts/details
              Expanded(
                flex: 6,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _FleetStatusSection(summary: summary)
                        .animate()
                        .fadeIn(delay: 80.ms, duration: 300.ms)
                        .slideY(begin: 0.04, end: 0),
                    const SizedBox(height: 14),
                    _PerformanceSection(
                      avgSpeed: avgSpeed,
                      estDistance: estDistance,
                      utilizationRate: utilRate,
                      activeCount: summary.moving + summary.idle,
                    )
                        .animate()
                        .fadeIn(delay: 140.ms, duration: 300.ms)
                        .slideY(begin: 0.04, end: 0),
                    const SizedBox(height: 14),
                    _WebActionsCard(
                      onSchedule: _openSchedule,
                      onShare: () => _shareReport(items, summary),
                    )
                        .animate()
                        .fadeIn(delay: 220.ms, duration: 300.ms),
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

// ---------------------------------------------------------------------------
// Web-only: compact period selector for header actions
// ---------------------------------------------------------------------------

class _WebPeriodSelector extends StatelessWidget {
  final _Period period;
  final ValueChanged<_Period> onChanged;
  const _WebPeriodSelector({required this.period, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: context.isDarkMode
            ? Colors.white.withValues(alpha: 0.05)
            : Colors.black.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _seg(context, context.tr('today'), _Period.today),
          _seg(context, context.tr('last_7_days'), _Period.week),
          _seg(context, context.tr('this_month'), _Period.month),
        ],
      ),
    );
  }

  Widget _seg(BuildContext context, String label, _Period p) {
    final selected = period == p;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => onChanged(p),
        borderRadius: BorderRadius.circular(7),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            gradient: selected ? AppColors.primaryGradient : null,
            borderRadius: BorderRadius.circular(7),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.black : context.textSecondaryColor,
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Web-only: actions card
// ---------------------------------------------------------------------------

class _WebActionsCard extends StatelessWidget {
  final VoidCallback onSchedule;
  final VoidCallback onShare;
  const _WebActionsCard({
    required this.onSchedule,
    required this.onShare,
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
            child: OutlinedButton.icon(
              onPressed: onSchedule,
              icon: const Icon(Icons.schedule_rounded),
              label: Text(context.tr('schedule')),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.accent,
                side: BorderSide(
                    color: AppColors.accent.withValues(alpha: 0.6)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton.icon(
              onPressed: onShare,
              icon: const Icon(Icons.ios_share_rounded),
              label: Text(context.tr('share_report')),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Period selector
// ---------------------------------------------------------------------------

class _PeriodSelector extends StatelessWidget {
  final _Period period;
  final ValueChanged<_Period> onChanged;
  const _PeriodSelector({required this.period, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          _segment(context, context.tr('today'), _Period.today),
          _segment(context, context.tr('last_7_days'), _Period.week),
          _segment(context, context.tr('this_month'), _Period.month),
        ],
      ),
    );
  }

  Widget _segment(BuildContext context, String label, _Period p) {
    final selected = period == p;
    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => onChanged(p),
          borderRadius: BorderRadius.circular(10),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              gradient: selected ? AppColors.primaryGradient : null,
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: Text(
              label,
              style: TextStyle(
                color: selected ? Colors.black : context.textSecondaryColor,
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Header card
// ---------------------------------------------------------------------------

class _ReportHeaderCard extends StatelessWidget {
  final String periodLabel;
  const _ReportHeaderCard({required this.periodLabel});

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('EEEE, d MMM yyyy').format(DateTime.now());
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary.withValues(alpha: 0.18),
            AppColors.secondary.withValues(alpha: 0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.assignment_rounded,
                color: Colors.black, size: 26),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr('fleet_summary_report'),
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  dateStr,
                  style: TextStyle(
                    color: context.textSecondaryColor,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  periodLabel,
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
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

// ---------------------------------------------------------------------------
// Reusable section card
// ---------------------------------------------------------------------------

class _SectionCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final Widget child;
  const _SectionCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.child,
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 17),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Fleet health score card
// ---------------------------------------------------------------------------

class _FleetScoreCard extends StatelessWidget {
  final int score;
  final String grade;
  final Color color;
  final int overdueCount;
  final int infractionsCount;
  final double utilizationRate;

  const _FleetScoreCard({
    required this.score,
    required this.grade,
    required this.color,
    required this.overdueCount,
    required this.infractionsCount,
    required this.utilizationRate,
  });

  String _gradeDescription(BuildContext context) {
    if (score >= 90) return context.tr('fleet_grade_excellent');
    if (score >= 75) return context.tr('fleet_grade_good');
    if (score >= 60) return context.tr('fleet_grade_fair');
    if (score >= 45) return context.tr('fleet_grade_poor');
    return context.tr('fleet_grade_critical');
  }

  @override
  Widget build(BuildContext context) {
    final pct = score / 100;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withValues(alpha: 0.18),
            color.withValues(alpha: 0.06),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          // Score ring + grade
          SizedBox(
            width: 84,
            height: 84,
            child: Stack(
              alignment: Alignment.center,
              children: [
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: pct),
                  duration: const Duration(milliseconds: 1200),
                  curve: Curves.easeOutCubic,
                  builder: (_, v, __) {
                    return CircularProgressIndicator(
                      value: v,
                      strokeWidth: 8,
                      backgroundColor: color.withValues(alpha: 0.15),
                      valueColor: AlwaysStoppedAnimation(color),
                    );
                  },
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: score.toDouble()),
                      duration: const Duration(milliseconds: 1000),
                      curve: Curves.easeOutCubic,
                      builder: (_, v, __) => Text(
                        '${v.toInt()}',
                        style: TextStyle(
                          color: color,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          height: 1,
                        ),
                      ),
                    ),
                    Text(
                      grade,
                      style: TextStyle(
                        color: color.withValues(alpha: 0.8),
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr('fleet_health_score'),
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _gradeDescription(context),
                  style: TextStyle(
                    color: color,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                // Score factors
                _ScoreFactor(
                  label: context.tr('overdue_maintenance'),
                  value: overdueCount,
                  icon: Icons.build_rounded,
                  isGood: overdueCount == 0,
                ),
                const SizedBox(height: 6),
                _ScoreFactor(
                  label: context.tr('infractions'),
                  value: infractionsCount,
                  icon: Icons.receipt_long_rounded,
                  isGood: infractionsCount == 0,
                ),
                const SizedBox(height: 6),
                _ScoreFactor(
                  label: context.tr('utilization_rate'),
                  value: (utilizationRate * 100).round(),
                  unit: '%',
                  icon: Icons.pie_chart_rounded,
                  isGood: utilizationRate >= 0.5,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ScoreFactor extends StatelessWidget {
  final String label;
  final int value;
  final String unit;
  final IconData icon;
  final bool isGood;

  const _ScoreFactor({
    required this.label,
    required this.value,
    required this.icon,
    required this.isGood,
    this.unit = '',
  });

  @override
  Widget build(BuildContext context) {
    final color = isGood ? AppColors.primary : AppColors.warning;
    return Row(
      children: [
        Icon(icon, color: color, size: 13),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            label,
            style: TextStyle(color: context.textMutedColor, fontSize: 11),
          ),
        ),
        Text(
          '$value$unit',
          style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Fleet status section
// ---------------------------------------------------------------------------

class _FleetStatusSection extends StatelessWidget {
  final HealthSummary summary;
  const _FleetStatusSection({required this.summary});

  @override
  Widget build(BuildContext context) {
    final total = summary.total == 0 ? 1 : summary.total;
    return _SectionCard(
      icon: Icons.directions_car_rounded,
      iconColor: AppColors.primary,
      title: context.tr('fleet_status'),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _KeyMetric(
                  label: context.tr('total'),
                  value: '${summary.total}',
                  color: AppColors.primary,
                ),
              ),
              Expanded(
                child: _KeyMetric(
                  label: context.tr('moving'),
                  value: '${summary.moving}',
                  color: AppColors.statusMoving,
                ),
              ),
              Expanded(
                child: _KeyMetric(
                  label: context.tr('idle'),
                  value: '${summary.idle}',
                  color: AppColors.statusIdle,
                ),
              ),
              Expanded(
                child: _KeyMetric(
                  label: context.tr('stopped'),
                  value: '${summary.stopped}',
                  color: AppColors.statusStopped,
                ),
              ),
              Expanded(
                child: _KeyMetric(
                  label: context.tr('offline'),
                  value: '${summary.offline}',
                  color: AppColors.statusOffline,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _StatusBar(
            label: context.tr('moving'),
            color: AppColors.statusMoving,
            fraction: summary.moving / total,
          ),
          const SizedBox(height: 6),
          _StatusBar(
            label: context.tr('idle'),
            color: AppColors.statusIdle,
            fraction: summary.idle / total,
          ),
          const SizedBox(height: 6),
          _StatusBar(
            label: context.tr('stopped'),
            color: AppColors.statusStopped,
            fraction: summary.stopped / total,
          ),
          const SizedBox(height: 6),
          _StatusBar(
            label: context.tr('offline'),
            color: AppColors.statusOffline,
            fraction: summary.offline / total,
          ),
        ],
      ),
    );
  }
}

class _StatusBar extends StatelessWidget {
  final String label;
  final Color color;
  final double fraction;
  const _StatusBar({
    required this.label,
    required this.color,
    required this.fraction,
  });

  @override
  Widget build(BuildContext context) {
    final pct = (fraction.clamp(0.0, 1.0) * 100).toStringAsFixed(0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: context.textSecondaryColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Text(
              '$pct%',
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            minHeight: 6,
            value: fraction.clamp(0.0, 1.0),
            backgroundColor: context.cardElevatedColor,
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }
}

class _KeyMetric extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _KeyMetric({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 18,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(color: context.textMutedColor, fontSize: 10.5),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Performance section
// ---------------------------------------------------------------------------

class _PerformanceSection extends StatelessWidget {
  final double avgSpeed;
  final double estDistance;
  final double utilizationRate;
  final int activeCount;
  const _PerformanceSection({
    required this.avgSpeed,
    required this.estDistance,
    required this.utilizationRate,
    required this.activeCount,
  });

  @override
  Widget build(BuildContext context) {
    final utilPct = (utilizationRate * 100).toStringAsFixed(0);
    return _SectionCard(
      icon: Icons.speed_rounded,
      iconColor: AppColors.secondary,
      title: context.tr('performance'),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _InfoTile(
                  icon: Icons.show_chart_rounded,
                  color: AppColors.secondary,
                  label: context.tr('avg_fleet_speed'),
                  value: '${avgSpeed.toStringAsFixed(1)} km/h',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _InfoTile(
                  icon: Icons.route_rounded,
                  color: AppColors.primary,
                  label: context.tr('total_distance'),
                  value: '${estDistance.toStringAsFixed(0)} km',
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _InfoTile(
                  icon: Icons.directions_car_filled_rounded,
                  color: AppColors.accent,
                  label: context.tr('active_vehicles'),
                  value: '$activeCount',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _InfoTile(
                  icon: Icons.pie_chart_rounded,
                  color: AppColors.warning,
                  label: context.tr('utilization_rate'),
                  value: '$utilPct%',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;
  const _InfoTile({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 10),
          Text(
            value,
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: context.textMutedColor, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Safety section
// ---------------------------------------------------------------------------

class _SafetySection extends StatelessWidget {
  final int count;
  final Map<String, int> breakdown;
  const _SafetySection({required this.count, required this.breakdown});

  String _typeLabel(BuildContext ctx, String key) {
    switch (key) {
      case 'speeding':
        return ctx.tr('speeding');
      case 'parking':
        return ctx.tr('parking');
      case 'signal':
        return ctx.tr('signal');
      case 'other':
        return ctx.tr('other');
      default:
        return key;
    }
  }

  Color _typeColor(BuildContext context, String key) {
    switch (key) {
      case 'speeding':
        return AppColors.error;
      case 'parking':
        return AppColors.secondary;
      case 'signal':
        return AppColors.warning;
      default:
        return context.textSecondaryColor;
    }
  }

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      icon: Icons.shield_rounded,
      iconColor: AppColors.error,
      title: context.tr('safety'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '$count',
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.8,
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  context.tr('total_infractions'),
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          if (breakdown.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final entry in breakdown.entries)
                  _TypeChip(
                    color: _typeColor(context, entry.key),
                    label: _typeLabel(context, entry.key),
                    count: entry.value,
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  final Color color;
  final String label;
  final int count;
  const _TypeChip({
    required this.color,
    required this.label,
    required this.count,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            '$count',
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Maintenance section
// ---------------------------------------------------------------------------

class _MaintenanceSection extends StatelessWidget {
  final int overdue;
  final int upcoming;
  const _MaintenanceSection({
    required this.overdue,
    required this.upcoming,
  });

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      icon: Icons.build_rounded,
      iconColor: AppColors.accent,
      title: context.tr('maintenance'),
      child: Row(
        children: [
          Expanded(
            child: _InfoTile(
              icon: Icons.report_problem_rounded,
              color: AppColors.error,
              label: context.tr('overdue_maintenance'),
              value: '$overdue',
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _InfoTile(
              icon: Icons.event_available_rounded,
              color: AppColors.warning,
              label: context.tr('upcoming_maintenance'),
              value: '$upcoming',
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Alerts section
// ---------------------------------------------------------------------------

class _AlertsSection extends StatelessWidget {
  final int count;
  final bool available;
  const _AlertsSection({required this.count, required this.available});

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      icon: Icons.notifications_active_rounded,
      iconColor: AppColors.warning,
      title: context.tr('alerts'),
      child: Row(
        children: [
          if (available)
            Expanded(
              child: _InfoTile(
                icon: Icons.notifications_rounded,
                color: AppColors.warning,
                label: context.tr('total_alerts'),
                value: '$count',
              ),
            )
          else
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: context.cardColor,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: context.dividerColor),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded,
                        color: AppColors.warning, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        context.tr('check_alerts_screen'),
                        style: TextStyle(
                          color: context.textSecondaryColor,
                          fontSize: 12.5,
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
