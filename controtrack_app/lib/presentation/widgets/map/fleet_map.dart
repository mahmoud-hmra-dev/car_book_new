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

  /// Builds a pin-style marker:
  /// - Rounded rectangle badge filled with [color]
  /// - MaterialIcons car icon rendered via TextPainter (no manual paths)
  /// - Teardrop tip at the bottom pointing to the exact vehicle position
  Future<BitmapDescriptor> _buildMarkerIcon(Color color) async {
    const double badgeW = 56.0;
    const double badgeH = 52.0;
    const double tipH   = 14.0;
    const double radius = 14.0;
    const double totalH = badgeH + tipH;
    const double iconSz = 28.0;

    final recorder = ui.PictureRecorder();
    final canvas   = Canvas(recorder);

    // 1. Drop shadow
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(4, 6, badgeW - 8, badgeH),
        const Radius.circular(radius),
      ),
      Paint()
        ..color = Colors.black.withValues(alpha: 0.30)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8),
    );

    // 2. Badge background with subtle vertical gradient
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 0, badgeW, badgeH),
        const Radius.circular(radius),
      ),
      Paint()
        ..shader = ui.Gradient.linear(
          Offset.zero,
          Offset(0, badgeH),
          [
            Color.fromARGB(
              255,
              (color.r * 255 + 40).clamp(0, 255).toInt(),
              (color.g * 255 + 40).clamp(0, 255).toInt(),
              (color.b * 255 + 40).clamp(0, 255).toInt(),
            ),
            color,
          ],
        ),
    );

    // 3. Teardrop tip
    canvas.drawPath(
      Path()
        ..moveTo(badgeW / 2 - 10, badgeH - 1)
        ..lineTo(badgeW / 2 + 10, badgeH - 1)
        ..lineTo(badgeW / 2,      totalH)
        ..close(),
      Paint()..color = color,
    );

    // 4. Thin white border around badge
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(1, 1, badgeW - 2, badgeH - 2),
        const Radius.circular(radius - 1),
      ),
      Paint()
        ..color = Colors.white.withValues(alpha: 0.25)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
    );

    // 5. Car icon via Flutter's own TextPainter + MaterialIcons font
    final tp = TextPainter(textDirection: TextDirection.ltr)
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
      Offset((badgeW - tp.width) / 2, (badgeH - tp.height) / 2),
    );

    final picture = recorder.endRecording();
    final img   = await picture.toImage(badgeW.toInt(), totalH.toInt());
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
          anchor: const Offset(0.5, 1.0),
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
