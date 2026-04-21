import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;
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

enum _SpeedBand { slow, medium, fast, veryFast }

class _Stop {
  final LatLng position;
  final DateTime start;
  final DateTime end;
  Duration get duration => end.difference(start);
  const _Stop({required this.position, required this.start, required this.end});
}

class _RouteHistoryScreenState extends State<RouteHistoryScreen> {
  // ── Route fetch state ────────────────────────────────────────
  FleetItem? _selected;
  DateTime _from = DateTime.now().subtract(const Duration(days: 1));
  DateTime _to   = DateTime.now();
  List<PositionModel>? _route;
  List<LatLng> _snappedPoints = [];
  List<_Stop>  _stops = const [];
  bool   _loading  = false;
  bool   _snapping = false;
  String? _error;
  GoogleMapController? _mapController;

  // ── Playback state ───────────────────────────────────────────
  bool   _isPlaying     = false;
  int    _playbackSpeed = 2;   // steps advanced per tick (≙ speed multiplier)
  int    _playbackIndex = 0;
  bool   _followCamera  = true;
  Timer? _playbackTimer;

  // Custom playback marker icon
  BitmapDescriptor? _playbackIcon;

  // Each tick fires every 50 ms.  At speed ×N we advance N indices per tick,
  // giving: ×2 → 40 pts/s, ×4 → 80 pts/s, ×8 → 160 pts/s.
  static const _kTickMs = 50;

  @override
  void initState() {
    super.initState();
    final items = context.read<FleetCubit>().state.items;
    if (items.isNotEmpty) _selected = items.first;
    _buildPlaybackIcon().then((v) {
      if (mounted) setState(() => _playbackIcon = v);
    });
  }

  @override
  void dispose() {
    _playbackTimer?.cancel();
    super.dispose();
  }

  // ── Custom marker icon (canvas drawn) ────────────────────────

  /// Builds a circular playback marker with a white border ring and a
  /// centered white car icon drawn using the MaterialIcons font. Sized at
  /// 56×56 logical px to match the [FleetMap] marker visual language.
  Future<BitmapDescriptor> _buildPlaybackIcon() async {
    const double size   = 56.0;
    const double iconSz = 28.0;
    const double border = 3.0;

    final recorder = ui.PictureRecorder();
    final canvas   = Canvas(recorder);

    // 1. Drop shadow
    canvas.drawCircle(
      const Offset(size / 2, size / 2 + 2),
      size / 2 - 4,
      Paint()
        ..color = Colors.black.withValues(alpha: 0.30)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8),
    );

    // 2. White border ring
    canvas.drawCircle(
      const Offset(size / 2, size / 2),
      size / 2 - 2,
      Paint()..color = Colors.white,
    );

    // 3. Filled inner circle in primary violet
    canvas.drawCircle(
      const Offset(size / 2, size / 2),
      size / 2 - 2 - border,
      Paint()..color = AppColors.primary,
    );

    // 4. Car icon via TextPainter + MaterialIcons font
    final tp = TextPainter(textDirection: ui.TextDirection.ltr)
      ..text = TextSpan(
        text: String.fromCharCode(Icons.directions_car_rounded.codePoint),
        style: const TextStyle(
          fontSize: iconSz,
          fontFamily: 'MaterialIcons',
          color: Colors.white,
        ),
      )
      ..layout();
    tp.paint(
      canvas,
      Offset((size - tp.width) / 2, (size - tp.height) / 2),
    );

    final picture = recorder.endRecording();
    final img   = await picture.toImage(size.toInt(), size.toInt());
    final bytes = await img.toByteData(format: ui.ImageByteFormat.png);
    return BitmapDescriptor.bytes(bytes!.buffer.asUint8List());
  }

  // ── Playback controls ────────────────────────────────────────

  void _startPlayback() {
    if (_route == null || _route!.isEmpty) return;
    if (_playbackIndex >= _route!.length - 1) _playbackIndex = 0;
    setState(() => _isPlaying = true);
    _playbackTimer = Timer.periodic(
      Duration(milliseconds: _kTickMs),
      _onTick,
    );
  }

  void _onTick(Timer timer) {
    if (!mounted) { timer.cancel(); return; }
    final next = (_playbackIndex + _playbackSpeed).clamp(0, _route!.length - 1);
    setState(() => _playbackIndex = next);
    if (_followCamera) {
      final p = _snappedPlaybackPos;
      _mapController?.animateCamera(CameraUpdate.newLatLng(p));
    }
    if (next >= _route!.length - 1) {
      timer.cancel();
      if (mounted) setState(() => _isPlaying = false);
    }
  }

  void _pausePlayback() {
    _playbackTimer?.cancel();
    _playbackTimer = null;
    setState(() => _isPlaying = false);
  }

  void _togglePlay() {
    HapticFeedback.selectionClick();
    _isPlaying ? _pausePlayback() : _startPlayback();
  }

  void _seekTo(int index) {
    _pausePlayback();
    final clamped = index.clamp(0, (_route?.length ?? 1) - 1);
    setState(() => _playbackIndex = clamped);
    if (_followCamera && _route != null) {
      _mapController?.animateCamera(CameraUpdate.newLatLng(_snappedPlaybackPos));
    }
  }

  void _jumpToStart() => _seekTo(0);
  void _jumpToEnd()   => _seekTo((_route?.length ?? 1) - 1);

  void _setSpeed(int speed) {
    setState(() => _playbackSpeed = speed);
    // Restart timer at new speed if currently playing.
    if (_isPlaying) {
      _playbackTimer?.cancel();
      _playbackTimer = Timer.periodic(
        Duration(milliseconds: _kTickMs),
        _onTick,
      );
    }
  }

  // ── Snapped playback position ────────────────────────────────

  /// Returns the nearest point from [_snappedPoints] to the raw GPS sample
  /// at [_playbackIndex]. This keeps the moving marker visually aligned
  /// with the on-road polyline even when the raw track drifts.
  LatLng get _snappedPlaybackPos {
    if (_route == null || _route!.isEmpty) return const LatLng(0, 0);
    final raw = LatLng(_route![_playbackIndex].latitude, _route![_playbackIndex].longitude);
    if (_snappedPoints.isEmpty) return raw;
    LatLng best = _snappedPoints.first;
    double minD = double.infinity;
    for (final p in _snappedPoints) {
      final d = (p.latitude - raw.latitude) * (p.latitude - raw.latitude) +
                (p.longitude - raw.longitude) * (p.longitude - raw.longitude);
      if (d < minD) { minD = d; best = p; }
    }
    return best;
  }

  // ── Date pickers ─────────────────────────────────────────────

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
              onPrimary: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    final combined = DateTime(
      picked.year, picked.month, picked.day,
      time?.hour ?? 0, time?.minute ?? 0,
    );
    setState(() => isFrom ? _from = combined : _to = combined);
  }

  void _applyPreset(Duration lookback) {
    final now = DateTime.now();
    setState(() { _to = now; _from = now.subtract(lookback); });
    _fetchRoute();
  }

  void _applyToday() {
    final now = DateTime.now();
    setState(() {
      _from = DateTime(now.year, now.month, now.day);
      _to   = now;
    });
    _fetchRoute();
  }

  void _applyYesterday() {
    final now       = DateTime.now();
    final yesterday = now.subtract(const Duration(days: 1));
    setState(() {
      _from = DateTime(yesterday.year, yesterday.month, yesterday.day);
      _to   = DateTime(yesterday.year, yesterday.month, yesterday.day, 23, 59, 59);
    });
    _fetchRoute();
  }

  // ── Route fetching ───────────────────────────────────────────

  Future<void> _fetchRoute() async {
    if (_selected == null) return;
    _pausePlayback();
    setState(() {
      _loading  = true;
      _error    = null;
      _route    = null;
      _snappedPoints = [];
      _stops    = const [];
      _playbackIndex = 0;
    });
    try {
      final r = await context
          .read<FleetRepository>()
          .getRoute(_selected!.carId, _from, _to);
      if (!mounted) return;
      setState(() {
        _route   = r;
        _stops   = _detectStops(r);
        _loading = false;
        _snapping = true;
      });
      final snapped = await _snapToRoads(r);
      if (!mounted) return;
      setState(() { _snappedPoints = snapped; _snapping = false; });
      await Future.delayed(const Duration(milliseconds: 300));
      _fitBounds();
    } catch (e) {
      if (!mounted) return;
      setState(() { _loading = false; _snapping = false; _error = e.toString(); });
    }
  }

  // ── Road snapping ─────────────────────────────────────────────

  Future<List<LatLng>> _snapToRoads(List<PositionModel> positions) async {
    if (positions.isEmpty) return [];
    final sampled = _samplePositions(positions, maxPoints: 100);
    final coords  = sampled.map((p) => '${p.longitude},${p.latitude}').join(';');
    try {
      final dio  = Dio();
      final resp = await dio.get(
        'https://router.project-osrm.org/match/v1/driving/$coords',
        queryParameters: {'overview': 'full', 'geometries': 'geojson', 'tidy': 'true'},
      );
      final data     = resp.data as Map<String, dynamic>;
      final matchings = data['matchings'] as List?;
      if (matchings == null || matchings.isEmpty) return _rawPoints(positions);
      final result = <LatLng>[];
      for (final m in matchings) {
        for (final c in (m['geometry']['coordinates'] as List)) {
          result.add(LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()));
        }
      }
      return result.isEmpty ? _rawPoints(positions) : result;
    } catch (_) {
      return _rawPoints(positions);
    }
  }

  List<PositionModel> _samplePositions(List<PositionModel> p, {required int maxPoints}) {
    if (p.length <= maxPoints) return p;
    final step = p.length / maxPoints;
    return List.generate(maxPoints, (i) => p[(i * step).floor()]);
  }

  List<LatLng> _rawPoints(List<PositionModel> p) =>
      p.map((e) => LatLng(e.latitude, e.longitude)).toList();

  // ── Speed bands ───────────────────────────────────────────────

  _SpeedBand _bandFor(double kmh) {
    if (kmh < 40)   return _SpeedBand.slow;
    if (kmh < 80)   return _SpeedBand.medium;
    if (kmh <= 120) return _SpeedBand.fast;
    return _SpeedBand.veryFast;
  }

  Color _bandColor(_SpeedBand b) => switch (b) {
    _SpeedBand.slow     => AppColors.secondary,
    _SpeedBand.medium   => AppColors.statusMoving,
    _SpeedBand.fast     => AppColors.warning,
    _SpeedBand.veryFast => AppColors.error,
  };

  String _bandLabel(BuildContext ctx, _SpeedBand b) => switch (b) {
    _SpeedBand.slow     => ctx.tr('speed_slow'),
    _SpeedBand.medium   => ctx.tr('speed_medium'),
    _SpeedBand.fast     => ctx.tr('speed_fast'),
    _SpeedBand.veryFast => ctx.tr('speed_very_fast'),
  };

  /// Builds speed-colored segment polylines from the raw GPS track.
  /// [alpha] lets the caller render this as a translucent overlay on top of
  /// the primary snapped polyline.
  Set<Polyline> _buildSpeedSegments({int alpha = 255}) {
    if (_route == null || _route!.length < 2) return {};
    final polylines = <Polyline>{};
    int segIdx = 0, start = 0;
    var currentBand = _bandFor(_route![0].speedKmh);
    for (int i = 1; i < _route!.length; i++) {
      final band = _bandFor(_route![i].speedKmh);
      if (band != currentBand) {
        polylines.add(Polyline(
          polylineId: PolylineId('seg_$segIdx'),
          color: _bandColor(currentBand).withAlpha(alpha),
          width: 5,
          points: [for (int k = start; k <= i; k++) LatLng(_route![k].latitude, _route![k].longitude)],
        ));
        segIdx++;
        start       = i;
        currentBand = band;
      }
    }
    polylines.add(Polyline(
      polylineId: PolylineId('seg_$segIdx'),
      color: _bandColor(currentBand).withAlpha(alpha),
      width: 5,
      points: [for (int k = start; k < _route!.length; k++) LatLng(_route![k].latitude, _route![k].longitude)],
    ));
    return polylines;
  }

  // ── Stop detection ───────────────────────────────────────────

  List<_Stop> _detectStops(List<PositionModel> positions) {
    if (positions.length < 2) return const [];
    const slowKmh = 2.0;
    const minDur  = Duration(minutes: 2);
    final stops   = <_Stop>[];
    int? runStart;
    for (int i = 0; i < positions.length; i++) {
      if (positions[i].speedKmh < slowKmh) {
        runStart ??= i;
      } else if (runStart != null) {
        _maybeAddStop(stops, positions, runStart, i - 1, minDur);
        runStart = null;
      }
    }
    if (runStart != null) {
      _maybeAddStop(stops, positions, runStart, positions.length - 1, minDur);
    }
    return stops;
  }

  void _maybeAddStop(List<_Stop> stops, List<PositionModel> pos,
      int s, int e, Duration minDur) {
    final st = pos[s].fixTime ?? pos[s].deviceTime;
    final et = pos[e].fixTime ?? pos[e].deviceTime;
    if (st == null || et == null || et.difference(st) < minDur) return;
    final mid = (s + e) ~/ 2;
    stops.add(_Stop(
      position: LatLng(pos[mid].latitude, pos[mid].longitude),
      start: st, end: et,
    ));
  }

  Duration get _totalStopDuration =>
      _stops.fold(Duration.zero, (a, s) => a + s.duration);

  // ── Bounds / stats ───────────────────────────────────────────

  void _fitBounds() {
    if (_route == null || _route!.isEmpty || _mapController == null) return;
    double minLat = _route!.first.latitude, maxLat = _route!.first.latitude;
    double minLng = _route!.first.longitude, maxLng = _route!.first.longitude;
    for (final p in _route!) {
      if (p.latitude  < minLat) minLat = p.latitude;
      if (p.latitude  > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    _mapController!.animateCamera(CameraUpdate.newLatLngBounds(
      LatLngBounds(
        southwest: LatLng(minLat, minLng),
        northeast: LatLng(maxLat, maxLng),
      ),
      60,
    ));
  }

  double _distanceKm() {
    if (_route == null || _route!.length < 2) return 0;
    double total = 0;
    for (int i = 1; i < _route!.length; i++) {
      total += _haversine(
        _route![i - 1].latitude, _route![i - 1].longitude,
        _route![i].latitude,     _route![i].longitude,
      );
    }
    return total;
  }

  double _haversine(double lat1, double lon1, double lat2, double lon2) {
    const r = 6371.0;
    final dLat = _deg2rad(lat2 - lat1);
    final dLon = _deg2rad(lon2 - lon1);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_deg2rad(lat1)) * math.cos(_deg2rad(lat2)) *
        math.sin(dLon / 2) * math.sin(dLon / 2);
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  }

  double _deg2rad(double d) => d * math.pi / 180;

  int _durationSec() {
    if (_route == null || _route!.length < 2) return 0;
    final s = _route!.first.fixTime ?? _route!.first.deviceTime;
    final e = _route!.last.fixTime  ?? _route!.last.deviceTime;
    return (s == null || e == null) ? 0 : e.difference(s).inSeconds;
  }

  double _maxSpeed() {
    if (_route == null) return 0;
    return _route!.fold(0.0, (m, p) => p.speedKmh > m ? p.speedKmh : m);
  }

  double _avgSpeed() {
    if (_route == null || _route!.isEmpty) return 0;
    return _route!.fold(0.0, (s, p) => s + p.speedKmh) / _route!.length;
  }

  String _fmtDuration(int seconds) {
    final d = Duration(seconds: seconds);
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    final s = d.inSeconds.remainder(60);
    if (h > 0) return '${h}h ${m}m';
    if (m > 0) return '${m}m ${s}s';
    return '${s}s';
  }

  // Current playback position time string
  String get _currentTimeStr {
    if (_route == null || _route!.isEmpty) return '--:--';
    final t = _route![_playbackIndex].fixTime ?? _route![_playbackIndex].deviceTime;
    if (t == null) return '--:--';
    return DateFormat('HH:mm:ss').format(t);
  }

  String get _totalTimeStr {
    if (_route == null || _route!.isEmpty) return '--:--';
    final t = _route!.last.fixTime ?? _route!.last.deviceTime;
    if (t == null) return '--:--';
    return DateFormat('HH:mm:ss').format(t);
  }

  // ── Build ─────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final fleetItems = context.watch<FleetCubit>().state.items;
    final hasRoute   = _route != null && _route!.isNotEmpty;

    // ── Polylines
    // Strategy:
    //  - If snapped points are available, draw the snapped road polyline as
    //    the primary visible line (fully opaque, primary color).
    //  - Always overlay the speed-colored raw segments at ~70% opacity so
    //    the driver can still see speed bands without losing road alignment.
    final Set<Polyline> polylines = {};
    if (_snappedPoints.isNotEmpty) {
      polylines.add(Polyline(
        polylineId: const PolylineId('snapped_route'),
        color: AppColors.primary,
        width: 5,
        points: _snappedPoints,
      ));
      polylines.addAll(_buildSpeedSegments(alpha: 180));
    } else if (_route != null && _route!.length >= 2) {
      polylines.addAll(_buildSpeedSegments());
    }

    // ── Markers
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
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueViolet),
          infoWindow: InfoWindow(
            title: '${context.tr('stops')} #${i + 1}',
            snippet: _fmtDuration(s.duration.inSeconds),
          ),
        ));
      }
      // Playback car marker — snapped to road, oriented by course.
      if (_playbackIndex > 0) {
        final cur = _route![_playbackIndex];
        markers.add(Marker(
          markerId: const MarkerId('playback_car'),
          position: _snappedPlaybackPos,
          icon: _playbackIcon ??
              BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          anchor: const Offset(0.5, 0.5),
          infoWindow: InfoWindow(
            title: '${cur.speedKmh.toStringAsFixed(0)} km/h',
            snippet: _currentTimeStr,
          ),
          flat: true,
          rotation: cur.course,
        ));
      }
    }

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
          // ── Filter panel ─────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
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
                const SizedBox(height: 10),
                // Preset chips
                SizedBox(
                  height: 34,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _PresetChip(label: context.tr('last_hour'),  icon: Icons.timer_rounded,      onTap: () => _applyPreset(const Duration(hours: 1))),
                      _PresetChip(label: context.tr('today'),      icon: Icons.today_rounded,       onTap: _applyToday),
                      _PresetChip(label: context.tr('yesterday'),  icon: Icons.history_rounded,     onTap: _applyYesterday),
                      _PresetChip(label: context.tr('last_7_days'),icon: Icons.date_range_rounded,  onTap: () => _applyPreset(const Duration(days: 7))),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(child: _DatePickerCard(label: context.tr('from'), date: _from, onTap: () => _pickDate(true))),
                    const SizedBox(width: 10),
                    Expanded(child: _DatePickerCard(label: context.tr('to'),   date: _to,   onTap: () => _pickDate(false))),
                  ],
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: (_loading || _snapping) ? null : _fetchRoute,
                    icon: const Icon(Icons.search_rounded),
                    label: Text(context.tr(_loading || _snapping ? 'loading' : 'load_route')),
                  ),
                ),
                const SizedBox(height: 4),
              ],
            ),
          ),

          // ── Map + overlays ────────────────────────────────────
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

                // Speed legend (top-left)
                if (hasRoute && !_loading)
                  Positioned(
                    top: 12, left: 12,
                    child: _SpeedLegend(
                      labels: {for (final b in _SpeedBand.values) b: _bandLabel(context, b)},
                      colors: {for (final b in _SpeedBand.values) b: _bandColor(b)},
                    ),
                  ),

                // Follow-camera toggle (top-right)
                if (hasRoute && !_loading)
                  Positioned(
                    top: 12, right: 12,
                    child: _FrostedIconButton(
                      icon: _followCamera ? Icons.gps_fixed_rounded : Icons.gps_not_fixed_rounded,
                      active: _followCamera,
                      tooltip: 'Follow camera',
                      onTap: () => setState(() => _followCamera = !_followCamera),
                    ),
                  ),

                // Loading overlay
                if (_loading)
                  Container(
                    color: Colors.black.withValues(alpha: 0.5),
                    child: AppLoading(message: context.tr('loading_route')),
                  ),

                // Snapping banner
                if (_snapping && !_loading)
                  Positioned(
                    top: 12, left: 12, right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: context.surfaceColor.withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: context.dividerColor),
                      ),
                      child: Row(
                        children: [
                          const SizedBox(
                            width: 16, height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              context.tr('snapping_roads'),
                              style: TextStyle(color: context.textPrimaryColor, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                // ── Live playback info overlay ───────────────────
                if (hasRoute && !_loading && _playbackIndex > 0)
                  Positioned(
                    left: 12, right: 12, bottom: 12,
                    child: _PlaybackInfoCard(position: _route![_playbackIndex]),
                  ),

                if (_error != null)
                  AppError(message: _error!, onRetry: _fetchRoute),
              ],
            ),
          ),

          // ── Playback & stats panel (shown when route is loaded) ──
          if (hasRoute && !_loading)
            SafeArea(
              top: false,
              child: _ReplayPanel(
                route:          _route!,
                playbackIndex:  _playbackIndex,
                isPlaying:      _isPlaying,
                playbackSpeed:  _playbackSpeed,
                currentTimeStr: _currentTimeStr,
                totalTimeStr:   _totalTimeStr,
                onTogglePlay:   _togglePlay,
                onSeek:         _seekTo,
                onJumpStart:    _jumpToStart,
                onJumpEnd:      _jumpToEnd,
                onSetSpeed:     _setSpeed,
                distanceKm:     _distanceKm(),
                durationSec:    _durationSec(),
                maxSpeedKmh:    _maxSpeed(),
                avgSpeedKmh:    _avgSpeed(),
                stops:          _stops,
                totalStopDur:   _totalStopDuration,
                onCopyStats:    _exportStats,
                fmtDuration:    _fmtDuration,
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _exportStats() async {
    if (_route == null || _route!.isEmpty) return;
    final messenger = ScaffoldMessenger.of(context);
    final msgCopied = context.tr('route_stats_copied');
    final vehicle  = _selected?.carName ?? 'Unknown';
    final plate    = _selected?.licensePlate ?? '';
    final fromStr  = DateFormat('dd MMM yyyy HH:mm').format(_from);
    final toStr    = DateFormat('dd MMM yyyy HH:mm').format(_to);
    final report   = '''
ROUTE HISTORY REPORT
Vehicle: $vehicle${plate.isNotEmpty ? ' ($plate)' : ''}
Period: $fromStr -> $toStr

Statistics:
- Distance: ${_distanceKm().toStringAsFixed(1)} km
- Duration: ${_fmtDuration(_durationSec())}
- Max Speed: ${_maxSpeed().toStringAsFixed(0)} km/h
- Avg Speed: ${_avgSpeed().toStringAsFixed(0)} km/h
- Stops: ${_stops.length} (total ${_fmtDuration(_totalStopDuration.inSeconds)})

Generated by ControTrack
'''.trim();
    await Clipboard.setData(ClipboardData(text: report));
    if (!mounted) return;
    messenger.showSnackBar(SnackBar(
      backgroundColor: AppColors.primaryDark,
      content: Text(msgCopied),
      action: SnackBarAction(label: 'OK', textColor: Colors.white, onPressed: () {}),
    ));
  }
}

// =============================================================================
//  Live playback info overlay — compact horizontal frosted card showing the
//  vehicle's live state (speed, heading, altitude, ignition, time) at the
//  currently scrubbed position.
// =============================================================================

class _PlaybackInfoCard extends StatelessWidget {
  final PositionModel position;
  const _PlaybackInfoCard({required this.position});

  static const _compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  String _compassFor(double deg) {
    final normalized = ((deg % 360) + 360) % 360;
    final idx = ((normalized + 22.5) / 45).floor() % 8;
    return _compass[idx];
  }

  @override
  Widget build(BuildContext context) {
    final cur = position;
    final ignitionOn = cur.attributes.ignition == true;
    final time = cur.fixTime ?? cur.deviceTime ?? DateTime.now();
    final heading = '${_compassFor(cur.course)} ${cur.course.toStringAsFixed(0)}°';

    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: context.surfaceColor.withValues(alpha: 0.90),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: context.dividerColor),
          ),
          child: Row(
            children: [
              _InfoChip(
                icon: Icons.speed_rounded,
                label: '${cur.speedKmh.toStringAsFixed(0)} km/h',
                color: context.primaryColor,
              ),
              _InfoChip(
                icon: Icons.explore_rounded,
                label: heading,
                color: context.textSecondaryColor,
              ),
              if (cur.altitude != null)
                _InfoChip(
                  icon: Icons.terrain_rounded,
                  label: '${cur.altitude!.toStringAsFixed(0)}m',
                  color: context.textSecondaryColor,
                ),
              _InfoChip(
                icon: Icons.power_settings_new_rounded,
                label: ignitionOn ? 'ON' : 'OFF',
                color: ignitionOn ? AppColors.statusMoving : context.textMutedColor,
              ),
              _InfoChip(
                icon: Icons.access_time_rounded,
                label: DateFormat('HH:mm:ss').format(time),
                color: context.textSecondaryColor,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String   label;
  final Color    color;
  const _InfoChip({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(height: 2),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                label,
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
//  Replay panel — scrubber + controls + stats
// =============================================================================

class _ReplayPanel extends StatelessWidget {
  final List<PositionModel> route;
  final int    playbackIndex;
  final bool   isPlaying;
  final int    playbackSpeed;
  final String currentTimeStr;
  final String totalTimeStr;
  final VoidCallback    onTogglePlay;
  final ValueChanged<int> onSeek;
  final VoidCallback    onJumpStart;
  final VoidCallback    onJumpEnd;
  final ValueChanged<int> onSetSpeed;
  final double distanceKm;
  final int    durationSec;
  final double maxSpeedKmh;
  final double avgSpeedKmh;
  final List<_Stop>   stops;
  final Duration      totalStopDur;
  final VoidCallback  onCopyStats;
  final String Function(int) fmtDuration;

  const _ReplayPanel({
    required this.route,
    required this.playbackIndex,
    required this.isPlaying,
    required this.playbackSpeed,
    required this.currentTimeStr,
    required this.totalTimeStr,
    required this.onTogglePlay,
    required this.onSeek,
    required this.onJumpStart,
    required this.onJumpEnd,
    required this.onSetSpeed,
    required this.distanceKm,
    required this.durationSec,
    required this.maxSpeedKmh,
    required this.avgSpeedKmh,
    required this.stops,
    required this.totalStopDur,
    required this.onCopyStats,
    required this.fmtDuration,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.surfaceColor,
        border: Border(top: BorderSide(color: context.dividerColor)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Stats row ────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 6),
            child: Row(
              children: [
                _StatMini(icon: Icons.route_rounded,       label: 'km',    value: distanceKm.toStringAsFixed(1),   color: AppColors.primary),
                _StatMini(icon: Icons.access_time_rounded, label: 'time',  value: fmtDuration(durationSec),         color: AppColors.secondary),
                _StatMini(icon: Icons.speed_rounded,       label: 'max',   value: '${maxSpeedKmh.toStringAsFixed(0)} km/h', color: AppColors.error),
                _StatMini(icon: Icons.show_chart_rounded,  label: 'avg',   value: '${avgSpeedKmh.toStringAsFixed(0)} km/h', color: AppColors.warning),
              ],
            ),
          ),

          Divider(height: 1, color: context.dividerColor),

          // ── Scrubber ─────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
            child: Column(
              children: [
                // Time labels
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      currentTimeStr,
                      style: TextStyle(
                        color: context.primaryColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    Text(
                      totalTimeStr,
                      style: TextStyle(color: context.textMutedColor, fontSize: 11),
                    ),
                  ],
                ),
                // Slider
                SliderTheme(
                  data: SliderThemeData(
                    trackHeight: 4,
                    activeTrackColor: context.primaryColor,
                    inactiveTrackColor: context.dividerColor,
                    thumbColor: context.primaryColor,
                    overlayColor: context.primaryColor.withValues(alpha: 0.15),
                    valueIndicatorColor: context.primaryColor,
                    valueIndicatorTextStyle: const TextStyle(color: Colors.white, fontSize: 11),
                    showValueIndicator: ShowValueIndicator.always,
                  ),
                  child: Slider(
                    min: 0,
                    max: (route.length - 1).toDouble(),
                    value: playbackIndex.toDouble().clamp(0, (route.length - 1).toDouble()),
                    label: currentTimeStr,
                    onChanged: (v) => onSeek(v.round()),
                  ),
                ),
              ],
            ),
          ),

          // ── Controls row ──────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 0, 8, 10),
            child: Row(
              children: [
                // Jump to start
                IconButton(
                  icon: const Icon(Icons.skip_previous_rounded),
                  iconSize: 26,
                  color: context.textSecondaryColor,
                  tooltip: 'Jump to start',
                  onPressed: onJumpStart,
                ),
                // Play / Pause
                GestureDetector(
                  onTap: onTogglePlay,
                  child: Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [context.primaryColor, context.primaryLightColor],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: context.primaryColor.withValues(alpha: 0.40),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Icon(
                      isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                      color: Colors.white,
                      size: 26,
                    ),
                  ),
                ),
                // Jump to end
                IconButton(
                  icon: const Icon(Icons.skip_next_rounded),
                  iconSize: 26,
                  color: context.textSecondaryColor,
                  tooltip: 'Jump to end',
                  onPressed: onJumpEnd,
                ),

                const Spacer(),

                // Speed buttons
                Text(
                  'Speed',
                  style: TextStyle(color: context.textMutedColor, fontSize: 11, fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 6),
                for (final sp in [2, 4, 8])
                  Padding(
                    padding: const EdgeInsets.only(left: 4),
                    child: _SpeedChip(
                      label: '×$sp',
                      active: playbackSpeed == sp,
                      onTap: () => onSetSpeed(sp),
                    ),
                  ),
                const SizedBox(width: 4),
                // Copy stats
                IconButton(
                  icon: const Icon(Icons.copy_rounded),
                  iconSize: 18,
                  color: context.textMutedColor,
                  tooltip: 'Copy stats',
                  onPressed: onCopyStats,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
//  Speed chip button
// =============================================================================

class _SpeedChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _SpeedChip({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active
              ? context.primaryColor
              : context.cardElevatedColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: active ? context.primaryColor : context.dividerColor,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: active ? Colors.white : context.textSecondaryColor,
            fontSize: 12,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

// =============================================================================
//  Frosted icon button (map overlay)
// =============================================================================

class _FrostedIconButton extends StatelessWidget {
  final IconData icon;
  final bool active;
  final String tooltip;
  final VoidCallback onTap;
  const _FrostedIconButton({
    required this.icon,
    required this.active,
    required this.tooltip,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: active
                ? context.primaryColor
                : context.surfaceColor.withValues(alpha: 0.90),
            shape: BoxShape.circle,
            border: Border.all(
              color: active ? context.primaryColor : context.dividerColor,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: context.isDarkMode ? 0.28 : 0.08),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Icon(
            icon,
            color: active ? Colors.white : context.textSecondaryColor,
            size: 18,
          ),
        ),
      ),
    );
  }
}

// =============================================================================
//  Reusable sub-widgets
// =============================================================================

class _PresetChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  const _PresetChip({required this.label, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.only(end: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.4)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 13, color: AppColors.primary),
              const SizedBox(width: 5),
              Text(label, style: const TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      ),
    );
  }
}

class _SpeedLegend extends StatelessWidget {
  final Map<_SpeedBand, String> labels;
  final Map<_SpeedBand, Color>  colors;
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
                    width: 10, height: 10,
                    decoration: BoxDecoration(color: colors[band], shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    labels[band] ?? '',
                    style: TextStyle(color: context.textPrimaryColor, fontSize: 11, fontWeight: FontWeight.w700),
                  ),
                ],
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
  const _DatePickerCard({required this.label, required this.date, required this.onTap});

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
            const Icon(Icons.calendar_today_rounded, color: AppColors.primary, size: 16),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: TextStyle(color: context.textMutedColor, fontSize: 10)),
                  const SizedBox(height: 2),
                  Text(
                    DateFormat('MMM d, HH:mm').format(date),
                    style: TextStyle(color: context.textPrimaryColor, fontWeight: FontWeight.w700, fontSize: 13),
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
  final String   label;
  final String   value;
  final Color    color;
  const _StatMini({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(height: 3),
          Text(value, style: TextStyle(color: context.textPrimaryColor, fontSize: 12, fontWeight: FontWeight.w800)),
          Text(label,  style: TextStyle(color: context.textMutedColor,  fontSize: 10)),
        ],
      ),
    );
  }
}
