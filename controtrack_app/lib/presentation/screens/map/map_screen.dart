import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../blocs/fleet/fleet_state.dart';
import '../../widgets/common/app_loading.dart';
import '../../widgets/map/fleet_map.dart';
import '../../widgets/map/map_type_selector.dart';

/// Launches Google Maps Street View at the given coordinates. Returns `true`
/// if the URL was launched, `false` otherwise.
Future<bool> launchStreetView(double lat, double lng) async {
  final uri = Uri.parse(
    'https://www.google.com/maps?q=&layer=c&cbll=$lat,$lng',
  );
  if (await canLaunchUrl(uri)) {
    return launchUrl(uri, mode: LaunchMode.externalApplication);
  }
  return false;
}

/// Fullscreen map with:
/// - Frosted floating search bar (top).
/// - Status summary pill (top right): "N vehicles · M moving".
/// - Status filter chips row under the search bar.
/// - Action FAB cluster (refresh / fit all / my location / map type).
/// - Vehicle marker tap → smooth bottom sheet with actions.
/// - Initial loading overlay while the fleet is first fetching.
class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final GlobalKey<FleetMapState> _mapKey = GlobalKey();
  final TextEditingController _searchCtrl = TextEditingController();
  final FocusNode _searchFocus = FocusNode();
  MapType _mapType = MapType.normal;

  @override
  void initState() {
    super.initState();
    final cubit = context.read<FleetCubit>();
    if (cubit.state.status == FleetStatus.initial) cubit.load();
    _searchCtrl.text = cubit.state.query;
    loadSavedMapType().then((t) {
      if (!mounted) return;
      setState(() => _mapType = t);
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  Future<void> _goToMyLocation() async {
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.deniedForever ||
          perm == LocationPermission.denied) {
        return;
      }
      final pos = await Geolocator.getCurrentPosition();
      await _mapKey.currentState
          ?.animateTo(LatLng(pos.latitude, pos.longitude), zoom: 14);
    } catch (_) {}
  }

  void _showVehicleSheet(FleetItem item) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      barrierColor: Colors.black.withValues(alpha: 0.35),
      builder: (ctx) => _AnimatedVehicleSheet(item: item),
    );
  }

  Future<void> _openPanicPicker() async {
    final items = context.read<FleetCubit>().state.items;
    if (items.isEmpty) return;
    final selected = await showModalBottomSheet<FleetItem>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      barrierColor: Colors.black.withValues(alpha: 0.35),
      builder: (ctx) => _VehiclePickerSheet(items: items),
    );
    if (!mounted || selected == null) return;
    context.push('/vehicles/${selected.carId}/panic');
  }

  void _cycleMapType() async {
    const order = [
      MapType.normal,
      MapType.satellite,
      MapType.hybrid,
      MapType.terrain,
    ];
    final next =
        order[(order.indexOf(_mapType) + 1) % order.length];
    setState(() => _mapType = next);
    await saveMapType(next);
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;
    return Scaffold(
      body: BlocBuilder<FleetCubit, FleetState>(
        builder: (context, state) {
          final isInitialLoading =
              state.status == FleetStatus.loading && state.items.isEmpty;

          return Stack(
            children: [
              // ===== Base map =====
              Positioned.fill(
                child: FleetMap(
                  key: _mapKey,
                  items: state.filtered,
                  mapType: _mapType,
                  onMarkerTap: _showVehicleSheet,
                ),
              ),

              // ===== Top overlays: search + summary + filters =====
              Positioned(
                top: topPadding + 12,
                left: 12,
                right: 12,
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _FrostedSearchBar(
                            controller: _searchCtrl,
                            focusNode: _searchFocus,
                            onChanged: (v) =>
                                context.read<FleetCubit>().setQuery(v),
                            onClear: () {
                              _searchCtrl.clear();
                              context.read<FleetCubit>().setQuery('');
                              setState(() {});
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        _FrostedSummaryPill(
                          total: state.filtered.length,
                          moving: state.filtered
                              .where((e) => e.movementStatus == 'moving')
                              .length,
                        ),
                      ],
                    )
                        .animate()
                        .fadeIn(duration: 320.ms)
                        .slideY(begin: -0.4, end: 0, curve: Curves.easeOutCubic),
                    const SizedBox(height: 10),
                    // Filter chips row
                    SizedBox(
                      height: 40,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        children: [
                          _Chip(
                            label: context.tr('all'),
                            color: AppColors.primary,
                            selected: state.statusFilter == null,
                            onTap: () => context
                                .read<FleetCubit>()
                                .setStatusFilter(null),
                          ),
                          _Chip(
                            label: context.tr('moving'),
                            color: AppColors.statusMoving,
                            selected: state.statusFilter == 'moving',
                            onTap: () => context
                                .read<FleetCubit>()
                                .setStatusFilter('moving'),
                          ),
                          _Chip(
                            label: context.tr('idle'),
                            color: AppColors.statusIdle,
                            selected: state.statusFilter == 'idle',
                            onTap: () => context
                                .read<FleetCubit>()
                                .setStatusFilter('idle'),
                          ),
                          _Chip(
                            label: context.tr('stopped'),
                            color: AppColors.statusStopped,
                            selected: state.statusFilter == 'stopped',
                            onTap: () => context
                                .read<FleetCubit>()
                                .setStatusFilter('stopped'),
                          ),
                          _Chip(
                            label: context.tr('offline'),
                            color: AppColors.statusOffline,
                            selected: state.statusFilter == 'offline',
                            onTap: () => context
                                .read<FleetCubit>()
                                .setStatusFilter('offline'),
                          ),
                        ],
                      ),
                    )
                        .animate()
                        .fadeIn(delay: 120.ms, duration: 320.ms)
                        .slideY(
                          begin: -0.4,
                          end: 0,
                          delay: 120.ms,
                          curve: Curves.easeOutCubic,
                        ),
                  ],
                ),
              ),

              // ===== Bottom-right FAB cluster =====
              Positioned(
                right: 12,
                bottom: 24,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _MapFab(
                      icon: Icons.refresh_rounded,
                      tooltip: context.tr('retry'),
                      onTap: () =>
                          context.read<FleetCubit>().load(refreshing: true),
                    ),
                    const SizedBox(height: 10),
                    _MapFab(
                      icon: Icons.layers_rounded,
                      tooltip: context.tr('map_type'),
                      onTap: _cycleMapType,
                    ),
                    const SizedBox(height: 10),
                    _MapFab(
                      icon: Icons.fit_screen_rounded,
                      tooltip: context.tr('center_on_fleet'),
                      onTap: () => _mapKey.currentState?.fitToItems(),
                    ),
                    const SizedBox(height: 10),
                    _MapFab(
                      icon: Icons.my_location_rounded,
                      tooltip: context.tr('my_location'),
                      isPrimary: true,
                      onTap: _goToMyLocation,
                    ),
                  ],
                )
                    .animate()
                    .fadeIn(delay: 200.ms, duration: 300.ms)
                    .slideX(begin: 0.3, end: 0, curve: Curves.easeOutCubic),
              ),

              // ===== Bottom-left panic + map type selector =====
              Positioned(
                left: 12,
                bottom: 24,
                child: MapTypeSelector(
                  current: _mapType,
                  onChanged: (t) async {
                    setState(() => _mapType = t);
                    await saveMapType(t);
                  },
                ),
              ),
              Positioned(
                left: 12,
                bottom: 92,
                child: Semantics(
                  button: true,
                  label: context.tr('panic_button'),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: _openPanicPicker,
                      borderRadius: BorderRadius.circular(26),
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppColors.error,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color:
                                  AppColors.error.withValues(alpha: 0.5),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.sos_rounded,
                          color: Colors.white,
                          size: 22,
                        ),
                      ),
                    )
                        .animate(onPlay: (c) => c.repeat(reverse: true))
                        .scaleXY(
                          begin: 1.0,
                          end: 1.08,
                          duration: 900.ms,
                          curve: Curves.easeInOut,
                        ),
                  ),
                ),
              ),

              // ===== Initial loading overlay =====
              if (isInitialLoading)
                Positioned.fill(
                  child: ColoredBox(
                    color: context.bgColor.withValues(alpha: 0.85),
                    child: AppLoading(message: context.tr('loading_fleet')),
                  ).animate().fadeIn(duration: 200.ms),
                ),
            ],
          );
        },
      ),
    );
  }
}

// =============================================================================
// Frosted glass search bar (top)
// =============================================================================

class _FrostedSearchBar extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;

  const _FrostedSearchBar({
    required this.controller,
    required this.focusNode,
    required this.onChanged,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          height: 46,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: context.surfaceColor.withValues(
              alpha: context.isDarkMode ? 0.65 : 0.8,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: context.dividerColor.withValues(alpha: 0.6),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(
                    alpha: context.isDarkMode ? 0.28 : 0.08),
                blurRadius: 14,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Icon(
                Icons.search_rounded,
                size: 20,
                color: context.textMutedColor,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  onChanged: onChanged,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                  decoration: InputDecoration(
                    border: InputBorder.none,
                    isCollapsed: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    hintText: context.tr('search_vehicles'),
                    hintStyle: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
              if (controller.text.isNotEmpty)
                GestureDetector(
                  onTap: onClear,
                  child: Icon(
                    Icons.cancel_rounded,
                    size: 18,
                    color: context.textMutedColor,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Frosted summary pill (top right)
// =============================================================================

class _FrostedSummaryPill extends StatelessWidget {
  final int total;
  final int moving;
  const _FrostedSummaryPill({required this.total, required this.moving});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          height: 46,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: context.surfaceColor.withValues(
              alpha: context.isDarkMode ? 0.65 : 0.8,
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: context.dividerColor.withValues(alpha: 0.6),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: AppColors.statusMoving,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color:
                          AppColors.statusMoving.withValues(alpha: 0.6),
                      blurRadius: 6,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '$total',
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 2),
              Text(
                '·',
                style: TextStyle(color: context.textMutedColor),
              ),
              const SizedBox(width: 4),
              Text(
                '$moving',
                style: const TextStyle(
                  color: AppColors.statusMoving,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Map FAB
// =============================================================================

class _MapFab extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final bool isPrimary;
  final VoidCallback onTap;

  const _MapFab({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.isPrimary = false,
  });

  @override
  Widget build(BuildContext context) {
    final bg = isPrimary ? AppColors.primary : context.surfaceColor;
    final fg = isPrimary ? Colors.black : AppColors.primary;
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(26),
          child: Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: bg,
              shape: BoxShape.circle,
              border: Border.all(
                color: isPrimary
                    ? AppColors.primary
                    : context.dividerColor,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(
                      alpha: context.isDarkMode ? 0.3 : 0.08),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
                if (isPrimary)
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.35),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
              ],
            ),
            child: Icon(icon, color: fg, size: 20),
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Filter chip (map overlay)
// =============================================================================

class _Chip extends StatelessWidget {
  final String label;
  final Color color;
  final bool selected;
  final VoidCallback onTap;
  const _Chip({
    required this.label,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: selected
                      ? color.withValues(alpha: 0.22)
                      : context.surfaceColor.withValues(
                          alpha: context.isDarkMode ? 0.6 : 0.75,
                        ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color:
                        selected ? color : context.dividerColor,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      label,
                      style: TextStyle(
                        color: selected ? color : context.textSecondaryColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Vehicle bottom sheet (opens on marker tap)
// =============================================================================

class _AnimatedVehicleSheet extends StatelessWidget {
  final FleetItem item;
  const _AnimatedVehicleSheet({required this.item});

  @override
  Widget build(BuildContext context) {
    final c = AppColors.statusColor(item.movementStatus);
    return DraggableScrollableSheet(
      initialChildSize: 0.44,
      minChildSize: 0.3,
      maxChildSize: 0.88,
      expand: false,
      builder: (ctx, scrollController) {
        return Container(
          decoration: BoxDecoration(
            gradient: ctx.cardGradientColor,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(28)),
            border: Border.all(color: ctx.dividerColor),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(
                    alpha: ctx.isDarkMode ? 0.4 : 0.12),
                blurRadius: 22,
                offset: const Offset(0, -6),
              ),
            ],
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
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
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    decoration: BoxDecoration(
                      color: c.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: c.withValues(alpha: 0.4)),
                    ),
                    child: Icon(
                      Icons.directions_car_rounded,
                      color: c,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.carName.isEmpty
                              ? ctx.tr('unnamed_vehicle')
                              : item.carName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: ctx.textPrimaryColor,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.licensePlate.isEmpty ? '—' : item.licensePlate,
                          style: TextStyle(
                            color: ctx.textSecondaryColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusPill(status: item.movementStatus, color: c),
                ],
              ).animate().fadeIn(duration: 300.ms).slideY(
                    begin: 0.15,
                    end: 0,
                    duration: 320.ms,
                    curve: Curves.easeOutCubic,
                  ),
              const SizedBox(height: 18),
              Row(
                children: [
                  _InfoBox(
                    icon: Icons.speed_rounded,
                    color: AppColors.secondary,
                    label: ctx.tr('speed'),
                    value: '${item.speedKmh.toStringAsFixed(0)} km/h',
                  ),
                  const SizedBox(width: 8),
                  _InfoBox(
                    icon: item.ignition == true
                        ? Icons.power_settings_new_rounded
                        : Icons.power_off_rounded,
                    color: item.ignition == true
                        ? AppColors.statusMoving
                        : AppColors.statusOffline,
                    label: ctx.tr('ignition'),
                    value: item.ignition == true
                        ? ctx.tr('on')
                        : ctx.tr('off'),
                  ),
                  const SizedBox(width: 8),
                  _InfoBox(
                    icon: Icons.battery_charging_full_rounded,
                    color: AppColors.warning,
                    label: ctx.tr('battery'),
                    value: item.batteryLevel != null
                        ? '${item.batteryLevel!.toStringAsFixed(0)}%'
                        : '—',
                  ),
                ],
              ).animate().fadeIn(delay: 80.ms, duration: 300.ms).slideY(
                    begin: 0.2,
                    end: 0,
                    delay: 80.ms,
                    duration: 320.ms,
                    curve: Curves.easeOutCubic,
                  ),
              if (item.address != null) ...[
                const SizedBox(height: 14),
                Row(
                  children: [
                    Icon(
                      Icons.location_on_outlined,
                      color: ctx.textMutedColor,
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        item.address!,
                        style: TextStyle(
                          color: ctx.textSecondaryColor,
                          fontSize: 12.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 20),
              // Primary action: detail
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.info_outline_rounded),
                  label: Text(ctx.tr('view_details')),
                  onPressed: () {
                    Navigator.pop(ctx);
                    ctx.push('/vehicles/${item.carId}');
                  },
                ),
              ).animate().fadeIn(delay: 160.ms, duration: 300.ms),
              const SizedBox(height: 10),
              // Secondary row: commands / street view / panic
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(
                        Icons.settings_remote_rounded,
                        size: 18,
                      ),
                      label: Text(ctx.tr('commands')),
                      onPressed: () {
                        Navigator.pop(ctx);
                        ctx.push('/vehicles/${item.carId}/commands');
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(
                        Icons.streetview_rounded,
                        size: 18,
                      ),
                      label: Text(ctx.tr('street_view')),
                      onPressed: item.position == null
                          ? null
                          : () async {
                              final messenger =
                                  ScaffoldMessenger.of(ctx);
                              final unavailableMsg =
                                  ctx.tr('street_view_unavailable');
                              final pos = item.position!;
                              final ok = await launchStreetView(
                                pos.latitude,
                                pos.longitude,
                              );
                              if (!ok) {
                                messenger.showSnackBar(
                                  SnackBar(
                                    backgroundColor: AppColors.error,
                                    content: Text(unavailableMsg),
                                  ),
                                );
                              }
                            },
                    ),
                  ),
                ],
              ).animate().fadeIn(delay: 220.ms, duration: 300.ms),
            ],
          ),
        );
      },
    );
  }
}

class _VehiclePickerSheet extends StatelessWidget {
  final List<FleetItem> items;
  const _VehiclePickerSheet({required this.items});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      expand: false,
      builder: (ctx, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: ctx.surfaceColor,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border.all(color: ctx.dividerColor),
          ),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: ctx.textMutedColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 14),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    const Icon(
                      Icons.sos_rounded,
                      color: AppColors.error,
                      size: 22,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      ctx.tr('select_vehicle'),
                      style: TextStyle(
                        color: ctx.textPrimaryColor,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Expanded(
                child: ListView.separated(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(16, 6, 16, 24),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final it = items[i];
                    final color = AppColors.statusColor(it.movementStatus);
                    return Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => Navigator.pop(ctx, it),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: ctx.cardColor,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: ctx.dividerColor),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.18),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(
                                  Icons.directions_car_rounded,
                                  color: color,
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      it.carName.isEmpty
                                          ? ctx.tr('unnamed_vehicle')
                                          : it.carName,
                                      style: TextStyle(
                                        color: ctx.textPrimaryColor,
                                        fontWeight: FontWeight.w700,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if (it.licensePlate.isNotEmpty)
                                      Text(
                                        it.licensePlate,
                                        style: TextStyle(
                                          color: ctx.textSecondaryColor,
                                          fontSize: 12,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              Icon(
                                Icons.chevron_right_rounded,
                                color: ctx.textMutedColor,
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _StatusPill extends StatelessWidget {
  final String status;
  final Color color;
  const _StatusPill({required this.status, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.45)),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}

class _InfoBox extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;
  const _InfoBox({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: context.dividerColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 14),
            ),
            const SizedBox(height: 10),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 14,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
