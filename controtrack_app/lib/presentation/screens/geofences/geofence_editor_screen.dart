import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/repositories/geofence_repository.dart';
import '../../../l10n/app_localizations.dart';

class GeofenceEditorScreen extends StatefulWidget {
  const GeofenceEditorScreen({super.key});

  @override
  State<GeofenceEditorScreen> createState() => _GeofenceEditorScreenState();
}

class _GeofenceEditorScreenState extends State<GeofenceEditorScreen> {
  String _mode = 'circle'; // 'circle' | 'polygon' | 'rectangle'

  // Circle
  LatLng? _center;
  double _radius = 200.0;

  // Polygon
  final List<LatLng> _polygonPoints = [];

  // Rectangle
  LatLng? _rectCorner1;
  LatLng? _rectCorner2;

  GoogleMapController? _mapController;
  bool _saving = false;
  bool _locating = false;

  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  static const LatLng _defaultCenter = LatLng(24.7136, 46.6753); // Riyadh

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _mapController?.dispose();
    super.dispose();
  }

  // ────────────────────────────────────────────────────────────── Mode / Tap

  void _setMode(String mode) {
    if (_mode == mode) return;
    setState(() {
      _mode = mode;
      // Reset geometry state when switching modes for clarity.
      _center = null;
      _polygonPoints.clear();
      _rectCorner1 = null;
      _rectCorner2 = null;
    });
  }

  void _handleMapTap(LatLng point) {
    setState(() {
      switch (_mode) {
        case 'circle':
          _center = point;
          break;
        case 'polygon':
          _polygonPoints.add(point);
          break;
        case 'rectangle':
          if (_rectCorner1 == null) {
            _rectCorner1 = point;
          } else if (_rectCorner2 == null) {
            _rectCorner2 = point;
          } else {
            // Start a new rectangle.
            _rectCorner1 = point;
            _rectCorner2 = null;
          }
          break;
      }
    });
  }

  void _undoLastPoint() {
    if (_polygonPoints.isEmpty) return;
    setState(() => _polygonPoints.removeLast());
  }

  // ────────────────────────────────────────────────────────────── Map overlays

  Set<Circle> _buildCircles() {
    if (_mode != 'circle' || _center == null) return const {};
    return {
      Circle(
        circleId: const CircleId('geofence'),
        center: _center!,
        radius: _radius,
        fillColor: AppColors.primary.withValues(alpha: 0.2),
        strokeColor: AppColors.primary,
        strokeWidth: 2,
      ),
    };
  }

  Set<Polygon> _buildPolygons() {
    if (_mode == 'polygon' && _polygonPoints.length >= 3) {
      return {
        Polygon(
          polygonId: const PolygonId('geo'),
          points: _polygonPoints,
          fillColor: AppColors.accent.withValues(alpha: 0.2),
          strokeColor: AppColors.accent,
          strokeWidth: 2,
        ),
      };
    }
    if (_mode == 'rectangle' &&
        _rectCorner1 != null &&
        _rectCorner2 != null) {
      final pts = [
        LatLng(_rectCorner1!.latitude, _rectCorner1!.longitude),
        LatLng(_rectCorner1!.latitude, _rectCorner2!.longitude),
        LatLng(_rectCorner2!.latitude, _rectCorner2!.longitude),
        LatLng(_rectCorner2!.latitude, _rectCorner1!.longitude),
      ];
      return {
        Polygon(
          polygonId: const PolygonId('geo'),
          points: pts,
          fillColor: AppColors.secondary.withValues(alpha: 0.2),
          strokeColor: AppColors.secondary,
          strokeWidth: 2,
        ),
      };
    }

    // Draw an unfilled outline when polygon has 1-2 points so the user can
    // see a line between placed vertices.
    if (_mode == 'polygon' && _polygonPoints.length == 2) {
      return {
        Polygon(
          polygonId: const PolygonId('geo_line'),
          points: _polygonPoints,
          fillColor: Colors.transparent,
          strokeColor: AppColors.accent,
          strokeWidth: 2,
        ),
      };
    }

    return const {};
  }

  Set<Marker> _buildMarkers() {
    final markers = <Marker>{};
    if (_mode == 'circle' && _center != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('center'),
          position: _center!,
          icon: BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueGreen,
          ),
          infoWindow: const InfoWindow(title: 'Center'),
        ),
      );
    }
    if (_mode == 'polygon') {
      for (int i = 0; i < _polygonPoints.length; i++) {
        markers.add(
          Marker(
            markerId: MarkerId('p$i'),
            position: _polygonPoints[i],
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueViolet,
            ),
            infoWindow: InfoWindow(title: 'Point ${i + 1}'),
          ),
        );
      }
    }
    if (_mode == 'rectangle') {
      if (_rectCorner1 != null) {
        markers.add(
          Marker(
            markerId: const MarkerId('r1'),
            position: _rectCorner1!,
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueBlue,
            ),
            infoWindow: const InfoWindow(title: 'Corner 1'),
          ),
        );
      }
      if (_rectCorner2 != null) {
        markers.add(
          Marker(
            markerId: const MarkerId('r2'),
            position: _rectCorner2!,
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueBlue,
            ),
            infoWindow: const InfoWindow(title: 'Corner 2'),
          ),
        );
      }
    }
    return markers;
  }

  // ────────────────────────────────────────────────────────────── WKT

  String _buildWKT() {
    if (_mode == 'circle') {
      return 'CIRCLE (${_center!.longitude} ${_center!.latitude}, '
          '${_radius.toStringAsFixed(1)})';
    }
    if (_mode == 'polygon') {
      final pts = [..._polygonPoints, _polygonPoints.first];
      final coords = pts.map((p) => '${p.longitude} ${p.latitude}').join(', ');
      return 'POLYGON (($coords))';
    }
    // rectangle
    final lat1 = _rectCorner1!.latitude;
    final lng1 = _rectCorner1!.longitude;
    final lat2 = _rectCorner2!.latitude;
    final lng2 = _rectCorner2!.longitude;
    return 'POLYGON (($lng1 $lat1, $lng2 $lat1, $lng2 $lat2, '
        '$lng1 $lat2, $lng1 $lat1))';
  }

  // ────────────────────────────────────────────────────────────── Validation

  String? _validate() {
    if (_nameCtrl.text.trim().isEmpty) return context.tr('name_required');
    switch (_mode) {
      case 'circle':
        if (_center == null) return context.tr('geofence_set_circle_center');
        break;
      case 'polygon':
        if (_polygonPoints.length < 3) {
          return context.tr('geofence_add_3_points');
        }
        break;
      case 'rectangle':
        if (_rectCorner1 == null || _rectCorner2 == null) {
          return context.tr('geofence_set_rect_corners');
        }
        break;
    }
    return null;
  }

  // ────────────────────────────────────────────────────────────── Save

  Future<void> _save() async {
    final err = _validate();
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text(err),
        ),
      );
      return;
    }
    final repo = context.read<GeofenceRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final msgCreated = context.tr('geofence_created');
    final msgCreateFailed = context.tr('create_failed');
    setState(() => _saving = true);
    try {
      final desc = _descCtrl.text.trim();
      await repo.create(
            name: _nameCtrl.text.trim(),
            area: _buildWKT(),
            description: desc.isEmpty ? null : desc,
          );
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.primaryDark,
          content: Text(msgCreated),
        ),
      );
      context.pop();
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$msgCreateFailed: $e'),
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  // ────────────────────────────────────────────────────────────── Location

  Future<void> _goToCurrentLocation() async {
    final messenger = ScaffoldMessenger.of(context);
    final msgLocationError = context.tr('location_error');
    setState(() => _locating = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception('Location services are disabled');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception('Location permission denied');
      }
      final pos = await Geolocator.getCurrentPosition();
      await _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(LatLng(pos.latitude, pos.longitude), 15),
      );
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$msgLocationError: $e'),
        ),
      );
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  // ────────────────────────────────────────────────────────────── Build

  @override
  Widget build(BuildContext context) {
    final canUndo = _mode == 'polygon' && _polygonPoints.isNotEmpty;

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.surfaceColor,
        title: Text(context.tr('draw_geofence')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        actions: [
          if (canUndo)
            IconButton(
              icon: const Icon(Icons.undo_rounded),
              tooltip: context.tr('undo_point'),
              onPressed: _undoLastPoint,
            ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 14),
              ),
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.black,
                      ),
                    )
                  : const Icon(Icons.check_rounded, size: 18),
              label: Text(
                context.tr('save'),
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          _ModeSelector(mode: _mode, onChanged: _setMode),
          Expanded(
            child: Stack(
              children: [
                GoogleMap(
                  onMapCreated: (c) => _mapController = c,
                  initialCameraPosition: const CameraPosition(
                    target: _defaultCenter,
                    zoom: 13,
                  ),
                  onTap: _handleMapTap,
                  circles: _buildCircles(),
                  polygons: _buildPolygons(),
                  markers: _buildMarkers(),
                  style: context.isDarkMode ? AppConstants.darkMapStyle : null,
                  myLocationEnabled: true,
                  myLocationButtonEnabled: false,
                  zoomControlsEnabled: false,
                  compassEnabled: true,
                ),
                Positioned(
                  right: 12,
                  bottom: 12,
                  child: FloatingActionButton.small(
                    heroTag: 'gf_editor_loc',
                    backgroundColor: context.surfaceColor,
                    foregroundColor: AppColors.primary,
                    onPressed: _locating ? null : _goToCurrentLocation,
                    child: _locating
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.primary,
                            ),
                          )
                        : const Icon(Icons.my_location_rounded),
                  ),
                ),
              ],
            ),
          ),
          _BottomPanel(
            mode: _mode,
            nameCtrl: _nameCtrl,
            descCtrl: _descCtrl,
            radius: _radius,
            onRadiusChanged: (v) => setState(() => _radius = v),
            instruction: _instructionText(context),
          ),
        ],
      ),
    );
  }

  String _instructionText(BuildContext context) {
    switch (_mode) {
      case 'circle':
        return _center == null
            ? context.tr('geo_tap_center')
            : context.tr('geo_circle_placed');
      case 'polygon':
        final n = _polygonPoints.length;
        if (n == 0) return context.tr('geo_tap_vertices');
        if (n < 3) return context.trN('geo_add_n_points', 3 - n);
        return context.trN('geo_n_points_placed', n);
      case 'rectangle':
        if (_rectCorner1 == null) return context.tr('geo_tap_first_corner');
        if (_rectCorner2 == null) return context.tr('geo_tap_opposite_corner');
        return context.tr('geo_rectangle_set');
    }
    return '';
  }
}

// ───────────────────────────────────────────────────────── Mode selector

class _ModeSelector extends StatelessWidget {
  final String mode;
  final ValueChanged<String> onChanged;

  const _ModeSelector({required this.mode, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: context.surfaceColor,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          Expanded(
            child: _ModeChip(
              label: context.tr('circle'),
              icon: Icons.radio_button_unchecked_rounded,
              selected: mode == 'circle',
              color: AppColors.primary,
              onTap: () => onChanged('circle'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _ModeChip(
              label: context.tr('polygon'),
              icon: Icons.hexagon_outlined,
              selected: mode == 'polygon',
              color: AppColors.accent,
              onTap: () => onChanged('polygon'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _ModeChip(
              label: context.tr('rectangle'),
              icon: Icons.rectangle_outlined,
              selected: mode == 'rectangle',
              color: AppColors.secondary,
              onTap: () => onChanged('rectangle'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _ModeChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          decoration: BoxDecoration(
            color: selected
                ? color.withValues(alpha: 0.18)
                : context.cardColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? color : context.dividerColor,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 16,
                color: selected ? color : context.textSecondaryColor,
              ),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: selected ? color : context.textSecondaryColor,
                    fontWeight:
                        selected ? FontWeight.w700 : FontWeight.w500,
                    fontSize: 12,
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

// ───────────────────────────────────────────────────────── Bottom panel

class _BottomPanel extends StatelessWidget {
  final String mode;
  final TextEditingController nameCtrl;
  final TextEditingController descCtrl;
  final double radius;
  final ValueChanged<double> onRadiusChanged;
  final String instruction;

  const _BottomPanel({
    required this.mode,
    required this.nameCtrl,
    required this.descCtrl,
    required this.radius,
    required this.onRadiusChanged,
    required this.instruction,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.surfaceColor,
        border: Border(
          top: BorderSide(color: context.dividerColor),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 12,
            bottom: MediaQuery.of(context).viewInsets.bottom + 12,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.info_outline_rounded,
                    size: 14,
                    color: context.textMutedColor,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      instruction,
                      style: TextStyle(
                        color: context.textSecondaryColor,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                controller: nameCtrl,
                style: TextStyle(color: context.textPrimaryColor),
                decoration: _dec(context, context.tr('name'),
                    hint: 'e.g. Warehouse, Home'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: descCtrl,
                style: TextStyle(color: context.textPrimaryColor),
                decoration: _dec(context, context.tr('description'),
                    hint: 'Optional'),
              ),
              if (mode == 'circle') ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    Text(
                      context.tr('radius'),
                      style: TextStyle(color: context.textSecondaryColor),
                    ),
                    const Spacer(),
                    Text(
                      '${radius.toStringAsFixed(0)} m',
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                SliderTheme(
                  data: SliderThemeData(
                    activeTrackColor: AppColors.primary,
                    inactiveTrackColor: context.dividerColor,
                    thumbColor: AppColors.primary,
                    overlayColor: AppColors.primary.withValues(alpha: 0.2),
                    trackHeight: 3,
                  ),
                  child: Slider(
                    value: radius.clamp(50.0, 10000.0),
                    min: 50,
                    max: 10000,
                    divisions: 199,
                    onChanged: onRadiusChanged,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _dec(BuildContext context, String label, {String? hint}) =>
      InputDecoration(
        labelText: label,
        hintText: hint,
        isDense: true,
        labelStyle: TextStyle(color: context.textSecondaryColor),
        hintStyle: TextStyle(color: context.textMutedColor),
        filled: true,
        fillColor: context.cardColor,
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
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      );
}
