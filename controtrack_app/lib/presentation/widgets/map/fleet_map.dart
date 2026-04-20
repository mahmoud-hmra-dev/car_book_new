import 'dart:async';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';

typedef MarkerTapCallback = void Function(FleetItem item);

class FleetMap extends StatefulWidget {
  final List<FleetItem> items;
  final MarkerTapCallback? onMarkerTap;
  final LatLng? initialTarget;
  final double initialZoom;
  final bool showMyLocation;
  final MapType mapType;

  const FleetMap({
    super.key,
    required this.items,
    this.onMarkerTap,
    this.initialTarget,
    this.initialZoom = 11,
    this.showMyLocation = false,
    this.mapType = MapType.normal,
  });

  @override
  State<FleetMap> createState() => FleetMapState();
}

class FleetMapState extends State<FleetMap> {
  GoogleMapController? _controller;
  final Map<String, BitmapDescriptor> _iconCache = {};
  Set<Marker> _markers = {};

  @override
  void initState() {
    super.initState();
    _rebuildMarkers();
  }

  @override
  void didUpdateWidget(covariant FleetMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.items != widget.items) {
      _rebuildMarkers();
    }
  }

  Future<BitmapDescriptor> _getIcon(String status) async {
    if (_iconCache.containsKey(status)) return _iconCache[status]!;
    final color = AppColors.statusColor(status);
    final icon = await _buildMarkerIcon(color);
    _iconCache[status] = icon;
    return icon;
  }

  Future<BitmapDescriptor> _buildMarkerIcon(Color color) async {
    const size = 96.0;
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);

    // Outer glow
    final glow = Paint()
      ..color = color.withValues(alpha: 0.35)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12);
    canvas.drawCircle(const Offset(size / 2, size / 2), size / 2.2, glow);

    // Outer ring
    final ring = Paint()
      ..color = Colors.white.withValues(alpha: 0.9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;
    canvas.drawCircle(const Offset(size / 2, size / 2), size / 2.8, ring);

    // Fill circle
    final fill = Paint()..color = color;
    canvas.drawCircle(const Offset(size / 2, size / 2), size / 2.8 - 2, fill);

    // Inner dot
    final inner = Paint()..color = Colors.white;
    canvas.drawCircle(const Offset(size / 2, size / 2), 10, inner);

    // Car icon (simple triangle arrow)
    final arrow = Path();
    arrow.moveTo(size / 2, size / 2 - 8);
    arrow.lineTo(size / 2 - 6, size / 2 + 6);
    arrow.lineTo(size / 2 + 6, size / 2 + 6);
    arrow.close();
    final arrowPaint = Paint()..color = color;
    canvas.drawPath(arrow, arrowPaint);

    final picture = recorder.endRecording();
    final img = await picture.toImage(size.toInt(), size.toInt());
    final bytes = await img.toByteData(format: ui.ImageByteFormat.png);
    return BitmapDescriptor.bytes(bytes!.buffer.asUint8List());
  }

  Future<void> _rebuildMarkers() async {
    final markers = <Marker>{};
    for (final it in widget.items) {
      final pos = it.position;
      if (pos == null) continue;
      if (pos.latitude == 0 && pos.longitude == 0) continue;
      final icon = await _getIcon(it.movementStatus);
      markers.add(
        Marker(
          markerId: MarkerId(it.carId),
          position: LatLng(pos.latitude, pos.longitude),
          icon: icon,
          rotation: pos.course,
          flat: true,
          anchor: const Offset(0.5, 0.5),
          onTap: widget.onMarkerTap == null ? null : () => widget.onMarkerTap!(it),
        ),
      );
    }
    if (mounted) setState(() => _markers = markers);
  }

  LatLng _initialTarget() {
    if (widget.initialTarget != null) return widget.initialTarget!;
    for (final it in widget.items) {
      final p = it.position;
      if (p != null && !(p.latitude == 0 && p.longitude == 0)) {
        return LatLng(p.latitude, p.longitude);
      }
    }
    return const LatLng(24.7136, 46.6753); // default Riyadh
  }

  Future<void> fitToItems() async {
    if (_controller == null || widget.items.isEmpty) return;
    final points = widget.items
        .where((e) => e.position != null && !(e.position!.latitude == 0 && e.position!.longitude == 0))
        .map((e) => LatLng(e.position!.latitude, e.position!.longitude))
        .toList();
    if (points.isEmpty) return;
    if (points.length == 1) {
      await _controller!.animateCamera(CameraUpdate.newLatLngZoom(points.first, 14));
      return;
    }
    double minLat = points.first.latitude, maxLat = points.first.latitude;
    double minLng = points.first.longitude, maxLng = points.first.longitude;
    for (final p in points) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    await _controller!.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(minLat, minLng),
          northeast: LatLng(maxLat, maxLng),
        ),
        60,
      ),
    );
  }

  Future<void> animateTo(LatLng pos, {double zoom = 15}) async {
    await _controller?.animateCamera(CameraUpdate.newLatLngZoom(pos, zoom));
  }

  @override
  Widget build(BuildContext context) {
    // Only apply the dark map styling when the base map is plain (normal or
    // terrain) AND the app is in dark mode. Satellite/Hybrid look terrible
    // with a custom style, and light mode should leave Google's own styling
    // untouched.
    final bool wantsDarkStyle = Theme.of(context).brightness == Brightness.dark
        && (widget.mapType == MapType.normal || widget.mapType == MapType.terrain);
    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: _initialTarget(),
        zoom: widget.initialZoom,
      ),
      markers: _markers,
      mapType: widget.mapType,
      myLocationEnabled: widget.showMyLocation,
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
      compassEnabled: false,
      style: wantsDarkStyle ? AppConstants.darkMapStyle : null,
      onMapCreated: (c) async {
        _controller = c;
        await Future.delayed(const Duration(milliseconds: 400));
        await fitToItems();
      },
    );
  }
}
