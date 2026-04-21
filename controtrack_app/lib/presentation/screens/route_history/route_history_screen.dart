import 'dart:math' as math;
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../data/models/position_model.dart';
import '../../../data/repositories/fleet_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';

class RouteHistoryScreen extends StatefulWidget {
  const RouteHistoryScreen({super.key});

  @override
  State<RouteHistoryScreen> createState() => _RouteHistoryScreenState();
}

/// Speed categories used for color-coded polyline segments.
enum _SpeedBand { slow, medium, fast, veryFast }

class _Stop {
  final LatLng position;
  final DateTime start;
  final DateTime end;
  Duration get duration => end.difference(start);
  const _Stop({required this.position, required this.start, required this.end});
}

class _RouteHistoryScreenState extends State<RouteHistoryScreen> {
  FleetItem? _selected;
  DateTime _from = DateTime.now().subtract(const Duration(days: 1));
  DateTime _to = DateTime.now();
  List<PositionModel>? _route;
  List<LatLng> _snappedPoints = [];
  List<_Stop> _stops = const [];
  bool _loading = false;
  bool _snapping = false;
  String? _error;
  GoogleMapController? _mapController;

  @override
  void initState() {
    super.initState();
    final items = context.read<FleetCubit>().state.items;
    if (items.isNotEmpty) _selected = items.first;
  }

  Future<void> _pickDate(bool isFrom) async {
    final initial = isFrom ? _from : _to;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
      builder: (ctx, child) {
        if (!ctx.isDarkMode) return child!;
        return Theme(
          data: Theme.of(ctx).copyWith(
            colorScheme: ColorScheme.dark(
              primary: AppColors.primary,
              surface: ctx.surfaceColor,
              onPrimary: Colors.black,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked == null) return;
    if (!mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    final combined = DateTime(
      picked.year,
      picked.month,
      picked.day,
      time?.hour ?? 0,
      time?.minute ?? 0,
    );
    setState(() {
      if (isFrom) {
        _from = combined;
      } else {
        _to = combined;
      }
    });
  }

  void _applyPreset(Duration lookback, {bool untilNow = true}) {
    final now = DateTime.now();
    setState(() {
      _to = untilNow ? now : _to;
      _from = now.subtract(lookback);
    });
    _fetchRoute();
  }

  void _applyToday() {
    final now = DateTime.now();
    setState(() {
      _from = DateTime(now.year, now.month, now.day);
      _to = now;
    });
    _fetchRoute();
  }

  void _applyYesterday() {
    final now = DateTime.now();
    final yesterday = now.subtract(const Duration(days: 1));
    setState(() {
      _from = DateTime(yesterday.year, yesterday.month, yesterday.day);
      _to = DateTime(
        yesterday.year,
        yesterday.month,
        yesterday.day,
        23,
        59,
        59,
      );
    });
    _fetchRoute();
  }

  Future<void> _fetchRoute() async {
    if (_selected == null) return;
    setState(() {
      _loading = true;
      _error = null;
      _route = null;
      _snappedPoints = [];
      _stops = const [];
    });
    try {
      final r = await context
          .read<FleetRepository>()
          .getRoute(_selected!.carId, _from, _to);
      if (!mounted) return;
      setState(() {
        _route = r;
        _stops = _detectStops(r);
        _loading = false;
        _snapping = true;
      });
      final snapped = await _snapToRoads(r);
      if (!mounted) return;
      setState(() {
        _snappedPoints = snapped;
        _snapping = false;
      });
      await Future.delayed(const Duration(milliseconds: 300));
      _fitBounds();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _snapping = false;
        _error = e.toString();
      });
    }
  }

  // ──────────────────────────────────────────────────── OSRM road snapping

  Future<List<LatLng>> _snapToRoads(List<PositionModel> positions) async {
    if (positions.isEmpty) return [];

    final List<PositionModel> sampled =
        _samplePositions(positions, maxPoints: 100);

    final coords =
        sampled.map((p) => '${p.longitude},${p.latitude}').join(';');

    try {
      final dio = Dio();
      final resp = await dio.get(
        'https://router.project-osrm.org/match/v1/driving/$coords',
        queryParameters: {
          'overview': 'full',
          'geometries': 'geojson',
          'tidy': 'true',
        },
      );
      final data = resp.data as Map<String, dynamic>;
      final matchings = data['matchings'] as List?;
      if (matchings == null || matchings.isEmpty) return _rawPoints(positions);

      final List<LatLng> result = [];
      for (final m in matchings) {
        final geom = m['geometry'];
        final coordList = geom['coordinates'] as List;
        for (final c in coordList) {
          result.add(
              LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()));
        }
      }
      return result.isEmpty ? _rawPoints(positions) : result;
    } catch (_) {
      return _rawPoints(positions);
    }
  }

  List<PositionModel> _samplePositions(
    List<PositionModel> positions, {
    required int maxPoints,
  }) {
    if (positions.length <= maxPoints) return positions;
    final step = positions.length / maxPoints;
    return List.generate(maxPoints, (i) => positions[(i * step).floor()]);
  }

  List<LatLng> _rawPoints(List<PositionModel> positions) =>
      positions.map((p) => LatLng(p.latitude, p.longitude)).toList();

  // ─────────────────────────────────────────────────────────── Speed bands

  _SpeedBand _bandFor(double kmh) {
    if (kmh < 40) return _SpeedBand.slow;
    if (kmh < 80) return _SpeedBand.medium;
    if (kmh <= 120) return _SpeedBand.fast;
    return _SpeedBand.veryFast;
  }

  Color _bandColor(_SpeedBand band) {
    switch (band) {
      case _SpeedBand.slow:
        return AppColors.secondary;
      case _SpeedBand.medium:
        return AppColors.statusMoving;
      case _SpeedBand.fast:
        return AppColors.warning;
      case _SpeedBand.veryFast:
        return AppColors.error;
    }
  }

  String _bandLabel(BuildContext context, _SpeedBand band) {
    switch (band) {
      case _SpeedBand.slow:
        return context.tr('speed_slow');
      case _SpeedBand.medium:
        return context.tr('speed_medium');
      case _SpeedBand.fast:
        return context.tr('speed_fast');
      case _SpeedBand.veryFast:
        return context.tr('speed_very_fast');
    }
  }

  /// Splits the route into contiguous segments by speed band and returns one
  /// polyline per segment, consecutive segments share a joining vertex so the
  /// colors meet seamlessly.
  Set<Polyline> _buildSpeedSegments() {
    if (_route == null || _route!.length < 2) return <Polyline>{};

    final points = _route!;
    final polylines = <Polyline>{};
    int segIndex = 0;
    int start = 0;
    _SpeedBand currentBand = _bandFor(points[0].speedKmh);

    for (int i = 1; i < points.length; i++) {
      final band = _bandFor(points[i].speedKmh);
      if (band != currentBand) {
        polylines.add(
          Polyline(
            polylineId: PolylineId('seg_$segIndex'),
            color: _bandColor(currentBand),
            width: 5,
            points: [
              for (int k = start; k <= i; k++)
                LatLng(points[k].latitude, points[k].longitude),
            ],
          ),
        );
        segIndex++;
        start = i;
        currentBand = band;
      }
    }
    // Final segment.
    polylines.add(
      Polyline(
        polylineId: PolylineId('seg_$segIndex'),
        color: _bandColor(currentBand),
        width: 5,
        points: [
          for (int k = start; k < points.length; k++)
            LatLng(points[k].latitude, points[k].longitude),
        ],
      ),
    );
    return polylines;
  }

  // ────────────────────────────────────────────────────────── Stop detection

  List<_Stop> _detectStops(List<PositionModel> positions) {
    if (positions.length < 2) return const [];
    const slowThresholdKmh = 2.0;
    const minStopDuration = Duration(minutes: 2);

    final stops = <_Stop>[];
    int? runStart;
    for (int i = 0; i < positions.length; i++) {
      final isSlow = positions[i].speedKmh < slowThresholdKmh;
      if (isSlow) {
        runStart ??= i;
      } else {
        if (runStart != null) {
          _maybeAddStop(stops, positions, runStart, i - 1, minStopDuration);
          runStart = null;
        }
      }
    }
    if (runStart != null) {
      _maybeAddStop(
          stops, positions, runStart, positions.length - 1, minStopDuration);
    }
    return stops;
  }

  void _maybeAddStop(
    List<_Stop> stops,
    List<PositionModel> positions,
    int startIdx,
    int endIdx,
    Duration minDuration,
  ) {
    final startTime =
        positions[startIdx].fixTime ?? positions[startIdx].deviceTime;
    final endTime = positions[endIdx].fixTime ?? positions[endIdx].deviceTime;
    if (startTime == null || endTime == null) return;
    if (endTime.difference(startTime) < minDuration) return;
    // Use midpoint position for the marker to avoid jitter at boundaries.
    final midIdx = (startIdx + endIdx) ~/ 2;
    stops.add(_Stop(
      position: LatLng(
        positions[midIdx].latitude,
        positions[midIdx].longitude,
      ),
      start: startTime,
      end: endTime,
    ));
  }

  Duration get _totalStopDuration =>
      _stops.fold(Duration.zero, (acc, s) => acc + s.duration);

  // ────────────────────────────────────────────────────────────── Bounds

  void _fitBounds() {
    if (_route == null || _route!.isEmpty || _mapController == null) return;
    double minLat = _route!.first.latitude, maxLat = _route!.first.latitude;
    double minLng = _route!.first.longitude, maxLng = _route!.first.longitude;
    for (final p in _route!) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    _mapController!.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(minLat, minLng),
          northeast: LatLng(maxLat, maxLng),
        ),
        60,
      ),
    );
  }

  double _distanceKm() {
    if (_route == null || _route!.length < 2) return 0;
    double total = 0;
    for (int i = 1; i < _route!.length; i++) {
      total += _haversine(
        _route![i - 1].latitude,
        _route![i - 1].longitude,
        _route![i].latitude,
        _route![i].longitude,
      );
    }
    return total;
  }

  double _haversine(double lat1, double lon1, double lat2, double lon2) {
    const r = 6371.0;
    final dLat = _deg2rad(lat2 - lat1);
    final dLon = _deg2rad(lon2 - lon1);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_deg2rad(lat1)) *
            math.cos(_deg2rad(lat2)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return r * c;
  }

  double _deg2rad(double d) => d * math.pi / 180;

  int _durationSec() {
    if (_route == null || _route!.length < 2) return 0;
    final start = _route!.first.fixTime ?? _route!.first.deviceTime;
    final end = _route!.last.fixTime ?? _route!.last.deviceTime;
    if (start == null || end == null) return 0;
    return end.difference(start).inSeconds;
  }

  double _maxSpeed() {
    if (_route == null) return 0;
    double mx = 0;
    for (final p in _route!) {
      if (p.speedKmh > mx) mx = p.speedKmh;
    }
    return mx;
  }

  double _avgSpeed() {
    if (_route == null || _route!.isEmpty) return 0;
    double total = 0;
    for (final p in _route!) {
      total += p.speedKmh;
    }
    return total / _route!.length;
  }

  @override
  Widget build(BuildContext context) {
    final fleetItems = context.watch<FleetCubit>().state.items;

    final Set<Polyline> polylines;
    if (_route != null && _route!.length >= 2) {
      // Prefer colored per-band raw segments; fall back to snapped single line
      // only when we have snapped points but no raw data to segment.
      polylines = _buildSpeedSegments();
    } else if (_snappedPoints.isNotEmpty) {
      polylines = {
        Polyline(
          polylineId: const PolylineId('seg_0'),
          color: AppColors.primary,
          width: 5,
          points: _snappedPoints,
        ),
      };
    } else {
      polylines = const <Polyline>{};
    }

    final markers = <Marker>{};
    if (_route != null && _route!.isNotEmpty) {
      markers.add(Marker(
        markerId: const MarkerId('start'),
        position: LatLng(_route!.first.latitude, _route!.first.longitude),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: InfoWindow(title: context.tr('start')),
      ));
      markers.add(Marker(
        markerId: const MarkerId('end'),
        position: LatLng(_route!.last.latitude, _route!.last.longitude),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: InfoWindow(title: context.tr('end_point')),
      ));
      for (int i = 0; i < _stops.length; i++) {
        final s = _stops[i];
        markers.add(Marker(
          markerId: MarkerId('stop_$i'),
          position: s.position,
          icon:
              BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueViolet),
          infoWindow: InfoWindow(
            title: '${context.tr('stops')} #${i + 1}',
            snippet: _fmtDuration(s.duration.inSeconds),
          ),
        ));
      }
    }

    final hasRoute = _route != null && _route!.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('route_history')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                DropdownButtonFormField<String>(
                  value: _selected?.carId,
                  style: TextStyle(color: context.textPrimaryColor, fontSize: 15),
                  decoration: InputDecoration(
                    labelText: context.tr('vehicle'),
                    prefixIcon: const Icon(Icons.directions_car_rounded),
                  ),
                  dropdownColor: context.cardColor,
                  items: fleetItems
                      .map((e) => DropdownMenuItem(
                            value: e.carId,
                            child: Text('${e.carName} • ${e.licensePlate}'),
                          ))
                      .toList(),
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() {
                      _selected = fleetItems.firstWhere((e) => e.carId == v);
                    });
                  },
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 36,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _PresetChip(
                        label: context.tr('last_hour'),
                        icon: Icons.timer_rounded,
                        onTap: () =>
                            _applyPreset(const Duration(hours: 1)),
                      ),
                      _PresetChip(
                        label: context.tr('today'),
                        icon: Icons.today_rounded,
                        onTap: _applyToday,
                      ),
                      _PresetChip(
                        label: context.tr('yesterday'),
                        icon: Icons.history_rounded,
                        onTap: _applyYesterday,
                      ),
                      _PresetChip(
                        label: context.tr('last_7_days'),
                        icon: Icons.date_range_rounded,
                        onTap: () =>
                            _applyPreset(const Duration(days: 7)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _DatePickerCard(
                        label: context.tr('from'),
                        date: _from,
                        onTap: () => _pickDate(true),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _DatePickerCard(
                        label: context.tr('to'),
                        date: _to,
                        onTap: () => _pickDate(false),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: (_loading || _snapping) ? null : _fetchRoute,
                    icon: const Icon(Icons.search_rounded),
                    label: Text(
                      context.tr(
                        _loading || _snapping ? 'loading' : 'load_route',
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Stack(
              children: [
                GoogleMap(
                  initialCameraPosition: const CameraPosition(
                    target: LatLng(24.7136, 46.6753),
                    zoom: 10,
                  ),
                  polylines: polylines,
                  markers: markers,
                  style: context.isDarkMode ? AppConstants.darkMapStyle : null,
                  zoomControlsEnabled: false,
                  myLocationButtonEnabled: false,
                  onMapCreated: (c) => _mapController = c,
                ),
                if (hasRoute && !_loading)
                  Positioned(
                    top: 12,
                    left: 12,
                    child: _SpeedLegend(
                      labels: {
                        for (final b in _SpeedBand.values)
                          b: _bandLabel(context, b),
                      },
                      colors: {
                        for (final b in _SpeedBand.values) b: _bandColor(b),
                      },
                    ),
                  ),
                if (_loading)
                  Container(
                    color: Colors.black.withValues(alpha: 0.5),
                    child: AppLoading(message: context.tr('loading_route')),
                  ),
                if (_snapping && !_loading)
                  Positioned(
                    top: 12,
                    left: 12,
                    right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: context.surfaceColor.withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: context.dividerColor),
                      ),
                      child: Row(
                        children: [
                          const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              context.tr('snapping_roads'),
                              style: TextStyle(
                                color: context.textPrimaryColor,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                if (_error != null)
                  AppError(message: _error!, onRetry: _fetchRoute),
                if (hasRoute && !_loading)
                  Positioned(
                    left: 12,
                    right: 12,
                    bottom: 12,
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: context.surfaceColor.withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: context.dividerColor),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              _StatMini(
                                icon: Icons.route_rounded,
                                label: context.tr('distance'),
                                value:
                                    '${_distanceKm().toStringAsFixed(1)} km',
                                color: AppColors.primary,
                              ),
                              _StatMini(
                                icon: Icons.access_time_rounded,
                                label: context.tr('duration'),
                                value: _fmtDuration(_durationSec()),
                                color: AppColors.secondary,
                              ),
                              _StatMini(
                                icon: Icons.speed_rounded,
                                label: context.tr('max_speed'),
                                value:
                                    '${_maxSpeed().toStringAsFixed(0)} km/h',
                                color: AppColors.statusStopped,
                              ),
                              _StatMini(
                                icon: Icons.show_chart_rounded,
                                label: context.tr('avg_speed'),
                                value:
                                    '${_avgSpeed().toStringAsFixed(0)} km/h',
                                color: AppColors.warning,
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Divider(height: 1, color: context.dividerColor),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              if (_stops.isNotEmpty) ...[
                                _StopsBadge(count: _stops.length),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    '${context.tr('total_stops_duration')}: '
                                    '${_fmtDuration(_totalStopDuration.inSeconds)}',
                                    style: TextStyle(
                                      color: context.textSecondaryColor,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ] else
                                const Spacer(),
                              TextButton.icon(
                                onPressed: _exportStats,
                                icon: const Icon(Icons.copy_rounded, size: 14),
                                label: Text(context.tr('copy_stats')),
                                style: TextButton.styleFrom(
                                  foregroundColor: AppColors.primary,
                                  textStyle: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 6),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _fmtDuration(int seconds) {
    final d = Duration(seconds: seconds);
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    if (h > 0) return '${h}h ${m}m';
    return '${m}m';
  }

  Future<void> _exportStats() async {
    if (_route == null || _route!.isEmpty) return;
    final messenger = ScaffoldMessenger.of(context);
    final msgCopied = context.tr('route_stats_copied');
    final vehicle = _selected?.carName ?? 'Unknown';
    final plate = _selected?.licensePlate ?? '';
    final fromStr = DateFormat('dd MMM yyyy HH:mm').format(_from);
    final toStr = DateFormat('dd MMM yyyy HH:mm').format(_to);
    final distance = _distanceKm().toStringAsFixed(1);
    final duration = _fmtDuration(_durationSec());
    final maxSpd = _maxSpeed().toStringAsFixed(0);
    final avgSpd = _avgSpeed().toStringAsFixed(0);
    final stopsCount = _stops.length;
    final stopsDur = _fmtDuration(_totalStopDuration.inSeconds);

    final report = '''
🚗 ROUTE HISTORY REPORT
Vehicle: $vehicle${plate.isNotEmpty ? ' ($plate)' : ''}
Period: $fromStr → $toStr

📊 Statistics:
• Distance: $distance km
• Duration: $duration
• Max Speed: $maxSpd km/h
• Avg Speed: $avgSpd km/h
• Stops: $stopsCount (total $stopsDur)

Generated by ControTrack
'''.trim();

    await Clipboard.setData(ClipboardData(text: report));
    if (!mounted) return;
    messenger.showSnackBar(
      SnackBar(
        backgroundColor: AppColors.primaryDark,
        content: Text(msgCopied),
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () {},
        ),
      ),
    );
  }
}

class _PresetChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  const _PresetChip({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.only(end: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(999),
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                color: AppColors.primary.withValues(alpha: 0.4),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 14, color: AppColors.primary),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SpeedLegend extends StatelessWidget {
  final Map<_SpeedBand, String> labels;
  final Map<_SpeedBand, Color> colors;
  const _SpeedLegend({required this.labels, required this.colors});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: context.surfaceColor.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final band in _SpeedBand.values)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: colors[band],
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    labels[band] ?? '',
                    style: TextStyle(
                      color: context.textPrimaryColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
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

class _StopsBadge extends StatelessWidget {
  final int count;
  const _StopsBadge({required this.count});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.statusNoGps.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: AppColors.statusNoGps.withValues(alpha: 0.5),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.pause_circle_rounded,
            color: AppColors.statusNoGps,
            size: 14,
          ),
          const SizedBox(width: 5),
          Text(
            '$count ${context.tr('stops').toLowerCase()}',
            style: const TextStyle(
              color: AppColors.statusNoGps,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _DatePickerCard extends StatelessWidget {
  final String label;
  final DateTime date;
  final VoidCallback onTap;
  const _DatePickerCard(
      {required this.label, required this.date, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: context.dividerColor),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_today_rounded,
                color: AppColors.primary, size: 16),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(
                          color: context.textMutedColor, fontSize: 10)),
                  const SizedBox(height: 2),
                  Text(
                    DateFormat('MMM d, HH:mm').format(date),
                    style: TextStyle(
                      color: context.textPrimaryColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
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
}

class _StatMini extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _StatMini({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 4),
          Text(value,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 13,
                fontWeight: FontWeight.w800,
              )),
          Text(label,
              style: TextStyle(color: context.textMutedColor, fontSize: 10)),
        ],
      ),
    );
  }
}
