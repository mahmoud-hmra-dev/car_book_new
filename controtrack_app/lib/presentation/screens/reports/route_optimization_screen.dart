import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../blocs/fleet/fleet_state.dart';

class RouteOptimizationScreen extends StatefulWidget {
  const RouteOptimizationScreen({super.key});

  @override
  State<RouteOptimizationScreen> createState() =>
      _RouteOptimizationScreenState();
}

class _RouteOptimizationScreenState extends State<RouteOptimizationScreen> {
  String? _selectedId;

  // Rough liter/hour idle burn for a light fleet vehicle.
  static const double _idleLitersPerHour = 0.5;
  static const double _fuelPricePerLiter = 2.2;

  int _efficiencyScore(FleetItem item) {
    // Composite score from three sub-metrics.
    // (1) Movement ratio: moving is best, idle worst when engine on.
    int movement;
    switch (item.movementStatus) {
      case 'moving':
        movement = 90;
        break;
      case 'stopped':
        movement = 70;
        break;
      case 'idle':
        movement = 45;
        break;
      case 'stale':
        movement = 40;
        break;
      case 'offline':
        movement = 30;
        break;
      default:
        movement = 35;
    }

    // (2) Speed consistency — punish extreme speeds either way while moving.
    int speedScore;
    if (item.movementStatus == 'moving') {
      final s = item.speedKmh;
      if (s < 10) {
        speedScore = 55; // crawling / possible traffic
      } else if (s > 100) {
        speedScore = 50; // too fast
      } else {
        speedScore = 90;
      }
    } else {
      speedScore = 70;
    }

    // (3) Recency of updates.
    int recency = 60;
    final last = item.lastPositionAt;
    if (last != null) {
      final mins = DateTime.now().difference(last).inMinutes;
      if (mins < 5) {
        recency = 95;
      } else if (mins < 30) {
        recency = 75;
      } else if (mins < 120) {
        recency = 55;
      } else {
        recency = 30;
      }
    }

    final composite = (movement * 0.5 + speedScore * 0.3 + recency * 0.2);
    return composite.round().clamp(0, 100);
  }

  Color _scoreColor(int score) {
    if (score >= 80) return AppColors.primary;
    if (score >= 60) return AppColors.warning;
    if (score >= 40) return const Color(0xFFFF8C00);
    return AppColors.error;
  }

  List<_Suggestion> _buildSuggestions(BuildContext context, FleetItem item) {
    final out = <_Suggestion>[];
    final now = DateTime.now();
    final last = item.lastPositionAt;

    // Idle
    if (item.movementStatus == 'idle' && last != null) {
      final mins = now.difference(last).inMinutes;
      if (mins >= 30) {
        out.add(_Suggestion(
          icon: Icons.local_fire_department_rounded,
          color: AppColors.warning,
          title: 'Reduce idle time',
          body:
              'Engine has been idle for $mins minutes. Consider shutting off the engine to save fuel.',
        ));
      }
    }

    // Low speed — traffic
    if (item.movementStatus == 'moving' && item.speedKmh > 0 && item.speedKmh < 10) {
      out.add(_Suggestion(
        icon: Icons.traffic_rounded,
        color: AppColors.statusStale,
        title: 'Possible congestion',
        body:
            'Current speed is only ${item.speedKmh.toStringAsFixed(1)} km/h. Consider rerouting to avoid traffic.',
      ));
    }

    // Offline
    if (item.movementStatus == 'offline') {
      final ago = last != null
          ? _humanizeAgo(now.difference(last))
          : 'unknown time';
      out.add(_Suggestion(
        icon: Icons.wifi_off_rounded,
        color: AppColors.error,
        title: 'Vehicle offline',
        body:
            'Device last seen $ago. Check connectivity, power supply, or GPS antenna.',
      ));
    }

    // Battery
    final batt = item.batteryLevel;
    if (batt != null && batt <= 25) {
      out.add(_Suggestion(
        icon: Icons.battery_alert_rounded,
        color: AppColors.error,
        title: 'Low battery alert',
        body:
            'Device battery at ${batt.toStringAsFixed(0)}%. Schedule a charge or inspect wiring.',
      ));
    }

    // Moving — positive
    if (item.movementStatus == 'moving' && item.speedKmh >= 10) {
      out.add(_Suggestion(
        icon: Icons.route_rounded,
        color: AppColors.primary,
        title: 'Route active',
        body:
            'Vehicle is moving at ${item.speedKmh.toStringAsFixed(1)} km/h. No optimization needed currently.',
      ));
    }

    // Always add OSRM hint
    out.add(_Suggestion(
      icon: Icons.alt_route_rounded,
      color: AppColors.secondary,
      title: 'Enable road snapping',
      body:
          'Enable OSRM road snapping in Route History for more accurate route analysis and distance tracking.',
    ));

    return out;
  }

  String _humanizeAgo(Duration d) {
    if (d.inMinutes < 1) return 'just now';
    if (d.inMinutes < 60) return '${d.inMinutes} min ago';
    if (d.inHours < 24) return '${d.inHours} h ago';
    return '${d.inDays} d ago';
  }

  double _estimateMonthlyIdleLiters(FleetItem item) {
    // Very rough monthly projection from a single-snapshot idle minute count.
    // If vehicle idle now and has lastPositionAt we estimate current idle
    // minutes × 30 as a coarse monthly proxy.
    if (item.movementStatus != 'idle') return 0;
    final last = item.lastPositionAt;
    if (last == null) return 0;
    final mins = DateTime.now().difference(last).inMinutes.toDouble();
    final monthlyIdleMins = mins * 30;
    final litersSaved = (monthlyIdleMins / 60.0) * _idleLitersPerHour * 0.5;
    return litersSaved;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(context.tr('route_optimization')),
      ),
      body: BlocBuilder<FleetCubit, FleetState>(
        builder: (context, state) {
          final items = state.items;
          if (items.isEmpty) {
            return Center(
              child: Text(
                context.tr('no_vehicles'),
                style: TextStyle(color: context.textMutedColor),
              ),
            );
          }

          final selectedId = _selectedId ?? items.first.carId;
          final item = items.firstWhere(
            (e) => e.carId == selectedId,
            orElse: () => items.first,
          );
          final score = _efficiencyScore(item);
          final scoreColor = _scoreColor(score);
          final suggestions = _buildSuggestions(context, item);
          final savedLiters = _estimateMonthlyIdleLiters(item);
          final savedCost = savedLiters * _fuelPricePerLiter;

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
            children: [
              _VehicleDropdown(
                items: items,
                value: selectedId,
                onChanged: (id) => setState(() => _selectedId = id),
              ).animate().fadeIn(duration: 280.ms),
              const SizedBox(height: 16),
              _EfficiencyScoreCard(score: score, color: scoreColor)
                  .animate(delay: 80.ms)
                  .fadeIn(duration: 320.ms)
                  .slideY(begin: 0.04, end: 0),
              const SizedBox(height: 18),
              _SectionTitle(title: context.tr('suggestions'))
                  .animate(delay: 140.ms)
                  .fadeIn(duration: 280.ms),
              const SizedBox(height: 10),
              ...List.generate(suggestions.length, (i) {
                final s = suggestions[i];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _SuggestionCard(suggestion: s)
                      .animate(delay: (180 + i * 40).ms)
                      .fadeIn(duration: 260.ms)
                      .slideX(begin: -0.05, end: 0),
                );
              }),
              const SizedBox(height: 12),
              _FuelSavingsCard(
                liters: savedLiters,
                cost: savedCost,
              )
                  .animate(delay: 260.ms)
                  .fadeIn(duration: 320.ms)
                  .slideY(begin: 0.04, end: 0),
              const SizedBox(height: 18),
              _SectionTitle(title: 'Best Routes')
                  .animate(delay: 320.ms)
                  .fadeIn(duration: 280.ms),
              const SizedBox(height: 10),
              _PlaceholderRouteCard(
                title: 'Corridor A',
                subtitle: 'Connect to route history to see most-used corridors',
              )
                  .animate(delay: 360.ms)
                  .fadeIn(duration: 280.ms)
                  .slideX(begin: -0.05, end: 0),
              const SizedBox(height: 10),
              _PlaceholderRouteCard(
                title: 'Corridor B',
                subtitle: 'Connect to route history to see most-used corridors',
              )
                  .animate(delay: 400.ms)
                  .fadeIn(duration: 280.ms)
                  .slideX(begin: -0.05, end: 0),
            ],
          );
        },
      ),
    );
  }
}

class _Suggestion {
  final IconData icon;
  final Color color;
  final String title;
  final String body;
  _Suggestion({
    required this.icon,
    required this.color,
    required this.title,
    required this.body,
  });
}

class _VehicleDropdown extends StatelessWidget {
  final List<FleetItem> items;
  final String? value;
  final ValueChanged<String?> onChanged;
  const _VehicleDropdown({
    required this.items,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Icon(Icons.directions_car_rounded,
              color: AppColors.secondary, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                isExpanded: true,
                value: value,
                dropdownColor: context.cardColor,
                style: TextStyle(color: context.textPrimaryColor, fontSize: 14),
                onChanged: onChanged,
                items: items
                    .map((it) => DropdownMenuItem(
                          value: it.carId,
                          child: Text(
                            it.carName.isEmpty
                                ? context.tr('unnamed_vehicle')
                                : it.carName,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ))
                    .toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EfficiencyScoreCard extends StatelessWidget {
  final int score;
  final Color color;
  const _EfficiencyScoreCard({required this.score, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 120,
            height: 120,
            child: CustomPaint(
              painter: _ScoreRingPainter(
                score: score,
                color: color,
                track: context.dividerColor,
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$score',
                      style: TextStyle(
                        color: color,
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -1,
                      ),
                    ),
                    Text(
                      '/100',
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
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr('efficiency_score'),
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _rating(score),
                  style: TextStyle(
                    color: color,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Based on movement, speed, and update recency.',
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _rating(int s) {
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Good';
    if (s >= 40) return 'Needs improvement';
    return 'Poor';
  }
}

class _ScoreRingPainter extends CustomPainter {
  final int score;
  final Color color;
  final Color track;
  _ScoreRingPainter({
    required this.score,
    required this.color,
    required this.track,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 8;

    final trackPaint = Paint()
      ..color = track
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10;
    canvas.drawCircle(center, radius, trackPaint);

    final sweep = 2 * math.pi * (score / 100.0);
    final arcPaint = Paint()
      ..shader = SweepGradient(
        colors: [color.withValues(alpha: 0.8), color],
        startAngle: -math.pi / 2,
        endAngle: -math.pi / 2 + sweep,
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      sweep,
      false,
      arcPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _ScoreRingPainter old) =>
      old.score != score || old.color != color || old.track != track;
}

class _SuggestionCard extends StatelessWidget {
  final _Suggestion suggestion;
  const _SuggestionCard({required this.suggestion});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: suggestion.color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              suggestion.icon,
              color: suggestion.color,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  suggestion.title,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  suggestion.body,
                  style: TextStyle(
                    color: context.textSecondaryColor,
                    fontSize: 12.5,
                    height: 1.4,
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

class _FuelSavingsCard extends StatelessWidget {
  final double liters;
  final double cost;
  const _FuelSavingsCard({required this.liters, required this.cost});

  @override
  Widget build(BuildContext context) {
    final hasSavings = liters > 0.01;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: hasSavings
              ? AppColors.primary.withValues(alpha: 0.4)
              : context.dividerColor,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.local_gas_station_rounded,
                  color: AppColors.primary, size: 18),
              const SizedBox(width: 8),
              Text(
                context.tr('fuel_savings'),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (hasSavings)
            Text.rich(
              TextSpan(
                style: TextStyle(
                  color: context.textSecondaryColor,
                  fontSize: 13,
                  height: 1.4,
                ),
                children: [
                  const TextSpan(text: 'Reducing idle by 50% could save ~'),
                  TextSpan(
                    text: '${liters.toStringAsFixed(1)} L',
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const TextSpan(text: '/month ('),
                  TextSpan(
                    text: '\$${cost.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const TextSpan(text: ').'),
                ],
              ),
            )
          else
            Text(
              'No significant idle consumption detected right now.',
              style: TextStyle(
                color: context.textSecondaryColor,
                fontSize: 13,
                height: 1.4,
              ),
            ),
        ],
      ),
    );
  }
}

class _PlaceholderRouteCard extends StatelessWidget {
  final String title;
  final String subtitle;
  const _PlaceholderRouteCard(
      {required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: context.textMutedColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.map_rounded,
                color: context.textMutedColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 12,
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

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle({required this.title});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(left: 6),
        child: Text(
          title.toUpperCase(),
          style: TextStyle(
            color: context.textMutedColor,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.4,
          ),
        ),
      );
}
