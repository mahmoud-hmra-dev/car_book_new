import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../widgets/common/app_error.dart';

class SensorsScreen extends StatefulWidget {
  final String carId;
  const SensorsScreen({super.key, required this.carId});

  @override
  State<SensorsScreen> createState() => _SensorsScreenState();
}

class _SensorsScreenState extends State<SensorsScreen> {
  double? _fuel;
  double? _temp1;
  double? _batteryLevel;
  double? _rpm;
  double? _hours;
  DateTime? _lastUpdated;
  bool _loading = true;
  String? _error;

  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final client = context.read<DioClient>();
    try {
      final resp = await client.get('/api/tracking/fleet');
      final data = resp.data;
      List<dynamic> list = const [];
      if (data is List) {
        list = data;
      } else if (data is Map<String, dynamic>) {
        for (final k in ['data', 'items', 'fleet', 'results']) {
          if (data[k] is List) {
            list = data[k] as List;
            break;
          }
        }
      }
      Map<String, dynamic>? match;
      for (final raw in list) {
        if (raw is! Map) continue;
        final m = Map<String, dynamic>.from(raw);
        final carId = (m['carId'] ??
                (m['car'] is Map
                    ? (m['car']['_id'] ?? m['car']['id'])
                    : null) ??
                m['_id'] ??
                m['id'] ??
                '')
            .toString();
        if (carId == widget.carId) {
          match = m;
          break;
        }
      }
      if (match == null) {
        try {
          final posResp =
              await client.get(ApiConstants.latestPosition(widget.carId));
          final d = posResp.data;
          Map<String, dynamic>? pos;
          if (d is Map<String, dynamic>) {
            pos = d;
          } else if (d is List && d.isNotEmpty && d.first is Map) {
            pos = Map<String, dynamic>.from(d.first as Map);
          }
          if (pos != null) {
            match = {'position': pos};
          }
        } catch (_) {
          // ignore
        }
      }

      if (match == null) {
        if (!mounted) return;
        setState(() {
          _loading = false;
          _fuel = null;
          _temp1 = null;
          _batteryLevel = null;
          _rpm = null;
          _hours = null;
          _lastUpdated = DateTime.now();
        });
        return;
      }
      final pos = match['position'];
      Map<String, dynamic>? attrs;
      DateTime? time;
      if (pos is Map) {
        final p = Map<String, dynamic>.from(pos);
        final a = p['attributes'];
        if (a is Map) attrs = Map<String, dynamic>.from(a);
        final rawT = p['fixTime'] ?? p['deviceTime'] ?? p['serverTime'];
        if (rawT != null) time = DateTime.tryParse(rawT.toString());
      }
      if (!mounted) return;
      setState(() {
        _fuel = _num(attrs?['fuel']);
        _temp1 = _num(attrs?['temp1'] ?? attrs?['temperature']);
        _batteryLevel = _num(attrs?['batteryLevel']);
        _rpm = _num(attrs?['rpm']);
        _hours = _num(attrs?['hours'] ?? attrs?['engineHours']);
        _lastUpdated = time ?? DateTime.now();
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _refresh() async {
    if (!mounted) return;
    setState(() {});
    await _load();
  }

  double? _num(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }

  Color _colorForFuel(double v) {
    if (v > 50) return AppColors.success;
    if (v > 20) return const Color(0xFFFFD54F);
    return AppColors.error;
  }

  Color _colorForTemp(double v) {
    if (v < 0) return AppColors.secondary;
    if (v < 25) return AppColors.success;
    if (v < 40) return AppColors.warning;
    return AppColors.error;
  }

  Color _colorForBattery(double v) {
    if (v > 60) return AppColors.success;
    if (v > 25) return AppColors.warning;
    return AppColors.error;
  }

  @override
  Widget build(BuildContext context) {
    final allNull = _fuel == null &&
        _temp1 == null &&
        _batteryLevel == null &&
        _rpm == null &&
        _hours == null;

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(context.tr('sensors')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _refresh,
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : _error != null
              ? AppError(message: _error!, onRetry: _refresh)
              : allNull
                  ? EmptyState(
                      title: context.tr('no_sensors'),
                      subtitle: 'No sensor data configured',
                      icon: Icons.sensors_off_rounded,
                    )
                  : RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: _refresh,
                      child: _buildGrid(context),
                    ),
    );
  }

  Widget _buildGrid(BuildContext context) {
    final cards = <Widget>[];
    int idx = 0;

    Widget wrap(Widget w) {
      final anim = w
          .animate(delay: (idx * 60).ms)
          .fadeIn(duration: 350.ms)
          .slideY(begin: 0.1, end: 0);
      idx++;
      return anim;
    }

    if (_fuel != null) {
      cards.add(wrap(_FuelGaugeCard(
        value: _fuel!,
        color: _colorForFuel(_fuel!),
      )));
    }
    if (_temp1 != null) {
      cards.add(wrap(_TemperatureCard(
        value: _temp1!,
        color: _colorForTemp(_temp1!),
      )));
    }
    if (_batteryLevel != null) {
      cards.add(wrap(_BatteryCard(
        value: _batteryLevel!,
        color: _colorForBattery(_batteryLevel!),
      )));
    }
    if (_rpm != null) {
      cards.add(wrap(_GenericSensorCard(
        icon: Icons.speed_rounded,
        label: 'RPM',
        value: NumberFormat.decimalPattern().format(_rpm!),
        color: AppColors.secondary,
      )));
    }
    if (_hours != null) {
      cards.add(wrap(_GenericSensorCard(
        icon: Icons.timer_rounded,
        label: context.tr('engine_hours'),
        value: '${_hours!.toStringAsFixed(1)} hrs',
        color: AppColors.accent,
      )));
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      children: [
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.88,
          children: cards,
        ),
        const SizedBox(height: 20),
        if (_lastUpdated != null)
          Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.schedule_rounded,
                    size: 12, color: context.textMutedColor),
                const SizedBox(width: 4),
                Text(
                  '${context.tr('last_update')}: ${DateFormat('MMM d, HH:mm:ss').format(_lastUpdated!)}',
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _CardShell extends StatelessWidget {
  final Widget child;
  final Color accent;
  const _CardShell({required this.child, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: child,
    );
  }
}

class _FuelGaugeCard extends StatelessWidget {
  final double value;
  final Color color;
  const _FuelGaugeCard({required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    final pct = value.clamp(0, 100) / 100.0;
    return _CardShell(
      accent: color,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SensorHeader(
            icon: Icons.local_gas_station_rounded,
            label: context.tr('fuel_level'),
            color: color,
          ),
          const SizedBox(height: 8),
          Expanded(
            child: Center(
              child: SizedBox(
                width: 96,
                height: 96,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 96,
                      height: 96,
                      child: CircularProgressIndicator(
                        value: pct.toDouble(),
                        strokeWidth: 9,
                        backgroundColor: context.cardElevatedColor,
                        valueColor: AlwaysStoppedAnimation<Color>(color),
                        strokeCap: StrokeCap.round,
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          value.toStringAsFixed(0),
                          style: TextStyle(
                            color: color,
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          '%',
                          style: TextStyle(
                            color: color,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value > 50
                ? 'Good'
                : value > 20
                    ? 'Low'
                    : 'Critical',
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _TemperatureCard extends StatelessWidget {
  final double value;
  final Color color;
  const _TemperatureCard({required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    // Normalize -20..120 => 0..1 for thermometer bar
    const minT = -20.0;
    const maxT = 120.0;
    final norm = ((value - minT) / (maxT - minT)).clamp(0.0, 1.0);

    return _CardShell(
      accent: color,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SensorHeader(
            icon: Icons.thermostat_rounded,
            label: context.tr('temperature'),
            color: color,
          ),
          const SizedBox(height: 8),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Thermometer bar
                Container(
                  width: 18,
                  margin: const EdgeInsets.symmetric(vertical: 6),
                  decoration: BoxDecoration(
                    color: context.cardElevatedColor,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: context.dividerColor),
                  ),
                  child: LayoutBuilder(
                    builder: (_, c) {
                      final h = (c.maxHeight - 4) * norm;
                      return Stack(
                        alignment: Alignment.bottomCenter,
                        children: [
                          Container(
                            height: math.max(4.0, h),
                            margin: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  color,
                                  color.withValues(alpha: 0.6),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${value.toStringAsFixed(1)}°',
                        style: TextStyle(
                          color: color,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        'Celsius',
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
          ),
        ],
      ),
    );
  }
}

class _BatteryCard extends StatelessWidget {
  final double value;
  final Color color;
  const _BatteryCard({required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    final pct = value.clamp(0, 100) / 100.0;
    final segments = 10;
    final filledSegments = (pct * segments).round();

    return _CardShell(
      accent: color,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SensorHeader(
            icon: Icons.battery_charging_full_rounded,
            label: context.tr('battery'),
            color: color,
          ),
          const SizedBox(height: 8),
          Text(
            '${value.toStringAsFixed(0)}%',
            style: TextStyle(
              color: color,
              fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
          const Spacer(),
          // Segmented battery bar
          SizedBox(
            height: 26,
            child: Row(
              children: [
                for (int i = 0; i < segments; i++) ...[
                  Expanded(
                    child: AnimatedContainer(
                      duration: Duration(milliseconds: 200 + i * 30),
                      decoration: BoxDecoration(
                        color: i < filledSegments
                            ? color
                            : context.cardElevatedColor,
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(
                          color: context.dividerColor,
                        ),
                      ),
                    ),
                  ),
                  if (i < segments - 1) const SizedBox(width: 2),
                ],
              ],
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value > 60
                ? 'Healthy'
                : value > 25
                    ? 'Moderate'
                    : 'Low',
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _GenericSensorCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _GenericSensorCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      accent: color,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SensorHeader(icon: icon, label: label, color: color),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ],
      ),
    );
  }
}

class _SensorHeader extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _SensorHeader({
    required this.icon,
    required this.label,
    required this.color,
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
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 18),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              color: context.textSecondaryColor,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
