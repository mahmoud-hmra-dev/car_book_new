import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';
import '../../widgets/web/web_page_scaffold.dart';

class DriverBehaviorScreen extends StatefulWidget {
  final String driverId;
  final String driverName;
  const DriverBehaviorScreen({
    super.key,
    required this.driverId,
    required this.driverName,
  });

  @override
  State<DriverBehaviorScreen> createState() => _DriverBehaviorScreenState();
}

enum _Range { today, week, month }

class _DriverBehaviorScreenState extends State<DriverBehaviorScreen> {
  _Range _range = _Range.week;
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  (DateTime, DateTime) _bounds() {
    final now = DateTime.now();
    switch (_range) {
      case _Range.today:
        return (DateTime(now.year, now.month, now.day), now);
      case _Range.week:
        return (now.subtract(const Duration(days: 7)), now);
      case _Range.month:
        return (now.subtract(const Duration(days: 30)), now);
    }
  }

  Future<List<Map<String, dynamic>>> _load() async {
    final client = context.read<DioClient>();
    final b = _bounds();
    final resp = await client.get(
      '/api/tracking/events',
      queryParameters: {
        'driverId': widget.driverId,
        'from': b.$1.toUtc().toIso8601String(),
        'to': b.$2.toUtc().toIso8601String(),
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

  void _selectRange(_Range r) {
    if (r == _range) return;
    setState(() {
      _range = r;
      _future = _load();
    });
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  int _calculateScore(List<Map<String, dynamic>> events) {
    int score = 100;
    for (final e in events) {
      final type = (e['type'] ?? '').toString().toLowerCase();
      if (type.contains('hardbraking') || type.contains('hard_braking')) {
        score -= 10;
      } else if (type.contains('hardacceleration') ||
          type.contains('hard_acceleration')) {
        score -= 8;
      } else if (type.contains('hardcornering') ||
          type.contains('hard_cornering')) {
        score -= 5;
      } else if (type.contains('overspeed')) {
        score -= 3;
      } else if (type.contains('idling')) {
        score -= 2;
      }
    }
    return score.clamp(0, 100);
  }

  Color _colorForScore(int score) {
    if (score >= 80) return AppColors.success;
    if (score >= 60) return const Color(0xFFFFD54F);
    if (score >= 40) return AppColors.warning;
    return AppColors.error;
  }

  Map<String, int> _countByType(List<Map<String, dynamic>> events) {
    final out = <String, int>{
      'hardBraking': 0,
      'hardAcceleration': 0,
      'hardCornering': 0,
      'overspeed': 0,
      'idling': 0,
    };
    for (final e in events) {
      final type = (e['type'] ?? '').toString().toLowerCase();
      if (type.contains('hardbraking') || type.contains('hard_braking')) {
        out['hardBraking'] = out['hardBraking']! + 1;
      } else if (type.contains('hardacceleration') ||
          type.contains('hard_acceleration')) {
        out['hardAcceleration'] = out['hardAcceleration']! + 1;
      } else if (type.contains('hardcornering') ||
          type.contains('hard_cornering')) {
        out['hardCornering'] = out['hardCornering']! + 1;
      } else if (type.contains('overspeed')) {
        out['overspeed'] = out['overspeed']! + 1;
      } else if (type.contains('idling')) {
        out['idling'] = out['idling']! + 1;
      }
    }
    return out;
  }

  DateTime? _timeOf(Map<String, dynamic> e) {
    final v = e['eventTime'] ?? e['serverTime'] ?? e['deviceTime'] ?? e['time'];
    if (v == null) return null;
    if (v is DateTime) return v;
    return DateTime.tryParse(v.toString());
  }

  IconData _iconForType(String type) {
    final t = type.toLowerCase();
    if (t.contains('hardbraking') || t.contains('hard_braking')) {
      return Icons.do_not_step_rounded;
    }
    if (t.contains('hardacceleration') || t.contains('hard_acceleration')) {
      return Icons.rocket_launch_rounded;
    }
    if (t.contains('hardcornering') || t.contains('hard_cornering')) {
      return Icons.turn_sharp_right_rounded;
    }
    if (t.contains('overspeed')) return Icons.speed_rounded;
    if (t.contains('idling')) return Icons.hourglass_bottom_rounded;
    return Icons.event_rounded;
  }

  Color _iconColor(String type) {
    final t = type.toLowerCase();
    if (t.contains('hardbraking') || t.contains('hard_braking')) {
      return AppColors.error;
    }
    if (t.contains('hardacceleration') || t.contains('hard_acceleration')) {
      return AppColors.warning;
    }
    if (t.contains('hardcornering') || t.contains('hard_cornering')) {
      return AppColors.accent;
    }
    if (t.contains('overspeed')) return AppColors.error;
    if (t.contains('idling')) return AppColors.statusIdle;
    return AppColors.secondary;
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    final scaffold = Scaffold(
      appBar: isWide
          ? null
          : AppBar(
              title: Text(widget.driverName),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () => context.pop(),
              ),
            ),
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(isWide ? 0 : 16, 12, isWide ? 0 : 16, 8),
            child: _RangeSelector(
              current: _range,
              onSelected: _selectRange,
            ),
          ),
          Expanded(
            child: FutureBuilder<List<Map<String, dynamic>>>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const AppLoading();
                }
                if (snap.hasError) {
                  return AppError(
                    message: snap.error.toString(),
                    onRetry: _refresh,
                  );
                }
                final events = snap.data ?? const [];
                final score = _calculateScore(events);
                final color = _colorForScore(score);
                final counts = _countByType(events);

                if (isWide) {
                  return RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: _refresh,
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(0, 8, 0, 24),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Left column: Score + summary + driver info
                          Expanded(
                            flex: 35,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _ScoreCard(
                                  score: score,
                                  color: color,
                                  label: context.tr('behavior_score'),
                                ),
                                const SizedBox(height: 16),
                                _SummaryStatsCard(
                                  counts: counts,
                                  events: events,
                                ),
                                const SizedBox(height: 16),
                                _DriverInfoCard(
                                  name: widget.driverName,
                                  driverId: widget.driverId,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          // Right column: Charts + events
                          Expanded(
                            flex: 65,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _ChartContainer(
                                  title: context.tr('event_breakdown'),
                                  height: 280,
                                  child: _EventsBarChart(counts: counts),
                                ),
                                const SizedBox(height: 16),
                                _ChartContainer(
                                  title: context.tr('score_trend'),
                                  height: 280,
                                  child: _ScoreTrendChart(score: score),
                                ),
                                const SizedBox(height: 16),
                                Container(
                                  padding: const EdgeInsets.all(18),
                                  decoration: BoxDecoration(
                                    gradient: context.cardGradientColor,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                        color: context.dividerColor),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        context.tr('events'),
                                        style: TextStyle(
                                          color: context.textPrimaryColor,
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 12),
                                      if (events.isEmpty)
                                        Padding(
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 24),
                                          child: Center(
                                            child: Text(
                                              context.tr('no_data'),
                                              style: TextStyle(
                                                color:
                                                    context.textMutedColor,
                                              ),
                                            ),
                                          ),
                                        )
                                      else
                                        ...events.map((e) {
                                          final type =
                                              (e['type'] ?? '').toString();
                                          final t = _timeOf(e);
                                          return Padding(
                                            padding: const EdgeInsets.only(
                                                bottom: 8),
                                            child: _EventTile(
                                              icon: _iconForType(type),
                                              color: _iconColor(type),
                                              type: type.isEmpty
                                                  ? 'event'
                                                  : type,
                                              time: t,
                                            ),
                                          );
                                        }),
                                    ],
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

                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: _refresh,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    children: [
                      const SizedBox(height: 8),
                      Center(
                        child: Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: color.withValues(alpha: 0.15),
                            border: Border.all(color: color, width: 4),
                          ),
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  '$score',
                                  style: TextStyle(
                                    color: color,
                                    fontSize: 34,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                Text(
                                  '/ 100',
                                  style: TextStyle(
                                    color: color,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Center(
                        child: Text(
                          context.tr('behavior_score'),
                          style: TextStyle(
                            color: context.textSecondaryColor,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      _EventCountsRow(counts: counts),
                      const SizedBox(height: 20),
                      if (events.isEmpty)
                        EmptyState(
                          title: context.tr('no_data'),
                          icon: Icons.event_busy_rounded,
                        )
                      else
                        ...events.map((e) {
                          final type = (e['type'] ?? '').toString();
                          final t = _timeOf(e);
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: _EventTile(
                              icon: _iconForType(type),
                              color: _iconColor(type),
                              type: type.isEmpty ? 'event' : type,
                              time: t,
                            ),
                          );
                        }),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );

    if (!isWide) return scaffold;

    return WebPageScaffoldScrollable(
      title: context.tr('driver_behavior'),
      subtitle: 'Safety & performance analytics',
      child: scaffold,
    );
  }
}

// ============================================================================
// Web-only widgets
// ============================================================================

class _ScoreCard extends StatelessWidget {
  final int score;
  final Color color;
  final String label;
  const _ScoreCard(
      {required this.score, required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            label,
            style: TextStyle(
              color: context.textSecondaryColor,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          Container(
            width: 140,
            height: 140,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withValues(alpha: 0.12),
              border: Border.all(color: color, width: 5),
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '$score',
                    style: TextStyle(
                      color: color,
                      fontSize: 44,
                      fontWeight: FontWeight.w900,
                      height: 1,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '/ 100',
                    style: TextStyle(
                      color: color,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: color.withValues(alpha: 0.5)),
            ),
            child: Text(
              _grade(score),
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _grade(int s) {
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Good';
    if (s >= 40) return 'Fair';
    return 'Needs improvement';
  }
}

class _SummaryStatsCard extends StatelessWidget {
  final Map<String, int> counts;
  final List<Map<String, dynamic>> events;
  const _SummaryStatsCard({required this.counts, required this.events});

  @override
  Widget build(BuildContext context) {
    final totalViolations = counts.values.fold<int>(0, (a, b) => a + b);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Summary',
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          _StatRow(
            icon: Icons.event_rounded,
            color: AppColors.primary,
            label: 'Total events',
            value: '${events.length}',
          ),
          const SizedBox(height: 10),
          _StatRow(
            icon: Icons.warning_amber_rounded,
            color: AppColors.warning,
            label: 'Violations',
            value: '$totalViolations',
          ),
          const SizedBox(height: 10),
          _StatRow(
            icon: Icons.speed_rounded,
            color: AppColors.error,
            label: 'Overspeed',
            value: '${counts['overspeed'] ?? 0}',
          ),
          const SizedBox(height: 10),
          _StatRow(
            icon: Icons.hourglass_bottom_rounded,
            color: AppColors.statusIdle,
            label: 'Idling',
            value: '${counts['idling'] ?? 0}',
          ),
        ],
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;
  const _StatRow({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: color),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              color: context.textSecondaryColor,
              fontSize: 13,
            ),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: context.textPrimaryColor,
            fontSize: 14,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _DriverInfoCard extends StatelessWidget {
  final String name;
  final String driverId;
  const _DriverInfoCard({required this.name, required this.driverId});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                (name.isNotEmpty ? name[0] : 'D').toUpperCase(),
                style: const TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.w800,
                  fontSize: 20,
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
                  name.isEmpty ? '—' : name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'ID: $driverId',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 11,
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

class _ChartContainer extends StatelessWidget {
  final String title;
  final double height;
  final Widget child;
  const _ChartContainer({
    required this.title,
    required this.height,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(height: height, child: child),
        ],
      ),
    );
  }
}

class _EventsBarChart extends StatelessWidget {
  final Map<String, int> counts;
  const _EventsBarChart({required this.counts});

  @override
  Widget build(BuildContext context) {
    final entries = [
      ('Brake', counts['hardBraking'] ?? 0, AppColors.error),
      ('Accel', counts['hardAcceleration'] ?? 0, AppColors.warning),
      ('Corner', counts['hardCornering'] ?? 0, AppColors.accent),
      ('Speed', counts['overspeed'] ?? 0, AppColors.error),
      ('Idle', counts['idling'] ?? 0, AppColors.statusIdle),
    ];
    final maxVal =
        entries.map((e) => e.$2).fold<int>(0, (a, b) => a > b ? a : b);
    final maxHeight = maxVal == 0 ? 1 : maxVal;

    return LayoutBuilder(
      builder: (context, constraints) {
        return Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            for (final e in entries)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        '${e.$2}',
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TweenAnimationBuilder<double>(
                        tween: Tween(begin: 0, end: e.$2 / maxHeight),
                        duration: const Duration(milliseconds: 800),
                        curve: Curves.easeOutCubic,
                        builder: (_, v, __) {
                          final barH =
                              (constraints.maxHeight - 60).clamp(20.0, 999.0) *
                                  v;
                          return Container(
                            height: barH,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.bottomCenter,
                                end: Alignment.topCenter,
                                colors: [
                                  e.$3.withValues(alpha: 0.85),
                                  e.$3.withValues(alpha: 0.45),
                                ],
                              ),
                              borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(6),
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 6),
                      Text(
                        e.$1,
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
          ],
        );
      },
    );
  }
}

class _ScoreTrendChart extends StatelessWidget {
  final int score;
  const _ScoreTrendChart({required this.score});

  @override
  Widget build(BuildContext context) {
    final color = score >= 80
        ? AppColors.success
        : (score >= 60 ? AppColors.warning : AppColors.error);
    // Synthetic trend based on current score
    final points = <double>[
      (score - 8).clamp(0, 100).toDouble(),
      (score - 3).clamp(0, 100).toDouble(),
      (score - 5).clamp(0, 100).toDouble(),
      (score + 2).clamp(0, 100).toDouble(),
      (score - 1).clamp(0, 100).toDouble(),
      score.toDouble(),
      score.toDouble(),
    ];
    return CustomPaint(
      painter: _LineChartPainter(
        points: points,
        color: color,
        gridColor: context.dividerColor,
        textColor: context.textMutedColor,
      ),
      child: const SizedBox.expand(),
    );
  }
}

class _LineChartPainter extends CustomPainter {
  final List<double> points;
  final Color color;
  final Color gridColor;
  final Color textColor;

  _LineChartPainter({
    required this.points,
    required this.color,
    required this.gridColor,
    required this.textColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    const topPad = 8.0;
    const bottomPad = 24.0;
    const leftPad = 28.0;
    const rightPad = 8.0;
    final chartW = size.width - leftPad - rightPad;
    final chartH = size.height - topPad - bottomPad;

    final gridPaint = Paint()
      ..color = gridColor
      ..strokeWidth = 1;

    // Horizontal gridlines (0, 25, 50, 75, 100)
    for (int i = 0; i <= 4; i++) {
      final y = topPad + chartH * (i / 4);
      canvas.drawLine(
          Offset(leftPad, y), Offset(size.width - rightPad, y), gridPaint);
      final label = '${100 - i * 25}';
      final tp = TextPainter(
        text: TextSpan(
          text: label,
          style: TextStyle(color: textColor, fontSize: 10),
        ),
        textDirection: ui.TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(0, y - tp.height / 2));
    }

    if (points.isEmpty) return;

    final linePaint = Paint()
      ..color = color
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          color.withValues(alpha: 0.35),
          color.withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromLTWH(leftPad, topPad, chartW, chartH));

    final path = Path();
    final fillPath = Path();
    for (int i = 0; i < points.length; i++) {
      final x = leftPad +
          (points.length == 1 ? chartW / 2 : chartW * i / (points.length - 1));
      final y = topPad + chartH * (1 - (points[i] / 100));
      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, topPad + chartH);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }
      // Dot
      canvas.drawCircle(
        Offset(x, y),
        3.5,
        Paint()..color = color,
      );
    }
    final lastX = leftPad +
        (points.length == 1
            ? chartW / 2
            : chartW * (points.length - 1) / (points.length - 1));
    fillPath.lineTo(lastX, topPad + chartH);
    fillPath.close();

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, linePaint);
  }

  @override
  bool shouldRepaint(covariant _LineChartPainter old) {
    return old.points != points || old.color != color;
  }
}

class _RangeSelector extends StatelessWidget {
  final _Range current;
  final ValueChanged<_Range> onSelected;
  const _RangeSelector({required this.current, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          for (final r in _Range.values)
            Expanded(
              child: InkWell(
                onTap: () => onSelected(r),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: current == r
                        ? AppColors.primary.withValues(alpha: 0.18)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: current == r
                          ? AppColors.primary
                          : Colors.transparent,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      _label(context, r),
                      style: TextStyle(
                        color: current == r
                            ? AppColors.primary
                            : context.textSecondaryColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
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

  String _label(BuildContext context, _Range r) {
    switch (r) {
      case _Range.today:
        return context.tr('today');
      case _Range.week:
        return context.tr('this_week');
      case _Range.month:
        return context.tr('this_month');
    }
  }
}

class _EventCountsRow extends StatelessWidget {
  final Map<String, int> counts;
  const _EventCountsRow({required this.counts});

  @override
  Widget build(BuildContext context) {
    final items = [
      ('hardBraking', Icons.do_not_step_rounded, AppColors.error, 'Brake'),
      ('hardAcceleration', Icons.rocket_launch_rounded, AppColors.warning, 'Accel'),
      ('hardCornering', Icons.turn_sharp_right_rounded, AppColors.accent, 'Corner'),
      ('overspeed', Icons.speed_rounded, AppColors.error, 'Speed'),
      ('idling', Icons.hourglass_bottom_rounded, AppColors.statusIdle, 'Idle'),
    ];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          for (final it in items)
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(it.$2, color: it.$3, size: 18),
                  const SizedBox(height: 4),
                  Text(
                    '${counts[it.$1] ?? 0}',
                    style: TextStyle(
                      color: context.textPrimaryColor,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    it.$4,
                    style: TextStyle(color: context.textMutedColor, fontSize: 10),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _EventTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String type;
  final DateTime? time;

  const _EventTile({
    required this.icon,
    required this.color,
    required this.type,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  type,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (time != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    DateFormat('MMM d, HH:mm').format(time!),
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 11,
                    ),
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
