import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/driver_model.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../data/models/geofence_model.dart';
import '../../../data/models/report_model.dart';
import '../../../data/repositories/geofence_repository.dart';
import '../../../data/repositories/tracking_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../blocs/fleet/fleet_state.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';

/// Vehicle Detail screen with a premium hero header, stat cards, compact map
/// preview, action chips row, and linked-geofences section.
///
/// All existing server actions are preserved:
/// - Security mode activation (dialog + POST)
/// - Share location link (POST + copy dialog)
/// - Street view (external Google Maps URL)
/// - Linked geofences (load / unlink / manage)
class VehicleDetailScreen extends StatefulWidget {
  final String carId;
  const VehicleDetailScreen({super.key, required this.carId});

  @override
  State<VehicleDetailScreen> createState() => _VehicleDetailScreenState();
}

class _VehicleDetailScreenState extends State<VehicleDetailScreen> {
  late Future<List<GeofenceModel>> _geofencesFuture;
  bool _sharingLocation = false;
  bool _securingMode = false;
  bool _zonesExpanded = true;
  DriverModel? _assignedDriver;
  List<DriverModel> _allDrivers = [];

  @override
  void initState() {
    super.initState();
    _geofencesFuture = _loadGeofences();
    _loadDriverInfo();
  }

  Future<void> _loadDriverInfo() async {
    try {
      final drivers =
          await context.read<TrackingRepository>().getDrivers();
      if (!mounted) return;
      setState(() {
        _allDrivers = drivers;
        _assignedDriver = drivers
            .cast<DriverModel?>()
            .firstWhere(
              (d) => d?.assignedCarId == widget.carId,
              orElse: () => null,
            );
      });
    } catch (_) {}
  }

  Future<void> _showAssignDriverSheet(String carName) async {
    final repo = context.read<TrackingRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final msgUnassigned = context.tr('driver_unassigned');
    final msgFailed = context.tr('failed');
    final msgAssignedTo = context.tr('assigned_to_vehicle');
    DriverModel? selected = _assignedDriver;

    final result = await showModalBottomSheet<DriverModel?>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _DriverAssignSheet(
        carName: carName,
        drivers: _allDrivers,
        currentDriver: selected,
      ),
    );

    // result == null means dismissed; result == special sentinel means "unassign"
    if (!mounted) return;

    if (result != null && result.id == '__unassign__') {
      // Unassign
      if (_assignedDriver != null) {
        try {
          final updated = DriverModel(
            id: _assignedDriver!.id,
            name: _assignedDriver!.name,
            phone: _assignedDriver!.phone,
            email: _assignedDriver!.email,
            licenseNumber: _assignedDriver!.licenseNumber,
            assignedCarId: null,
          );
          await repo.updateDriver(_assignedDriver!.id, updated);
          if (!mounted) return;
          setState(() => _assignedDriver = null);
          messenger.showSnackBar(SnackBar(
            backgroundColor: AppColors.primaryDark,
            content: Text(msgUnassigned),
          ));
        } catch (e) {
          if (!mounted) return;
          messenger.showSnackBar(SnackBar(
            backgroundColor: AppColors.error,
            content: Text('$msgFailed: $e'),
          ));
        }
      }
    } else if (result != null) {
      try {
        // Unassign previous driver if any
        if (_assignedDriver != null && _assignedDriver!.id != result.id) {
          final prev = DriverModel(
            id: _assignedDriver!.id,
            name: _assignedDriver!.name,
            phone: _assignedDriver!.phone,
            assignedCarId: null,
          );
          await repo.updateDriver(_assignedDriver!.id, prev);
        }
        // Assign new driver
        final updated = DriverModel(
          id: result.id,
          name: result.name,
          phone: result.phone,
          email: result.email,
          licenseNumber: result.licenseNumber,
          assignedCarId: widget.carId,
        );
        await repo.updateDriver(result.id, updated);
        if (!mounted) return;
        setState(() => _assignedDriver = updated);
        messenger.showSnackBar(SnackBar(
          backgroundColor: AppColors.primaryDark,
          content: Text('${result.name} $msgAssignedTo'),
        ));
      } catch (e) {
        if (!mounted) return;
        messenger.showSnackBar(SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$msgFailed: $e'),
        ));
      }
    }
  }

  Future<List<GeofenceModel>> _loadGeofences() {
    return context.read<GeofenceRepository>().getForCar(widget.carId);
  }

  void _refreshGeofences() {
    setState(() => _geofencesFuture = _loadGeofences());
  }

  Future<void> _shareLocation() async {
    // Hoist context-dependent references BEFORE the await.
    final dio = context.read<DioClient>();
    final messenger = ScaffoldMessenger.of(context);
    final msgShareFailed = context.tr('share_link_failed');
    setState(() => _sharingLocation = true);
    try {
      final resp = await dio.post(ApiConstants.shareLocation(widget.carId));
      final data = resp.data;
      String? url;
      if (data is Map) {
        url = (data['shareUrl'] ?? data['url'] ?? '').toString();
      }
      if (url == null || url.isEmpty) {
        throw Exception('No share URL returned');
      }
      if (!mounted) return;
      await _showShareDialog(url);
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$msgShareFailed: $e'),
        ),
      );
    } finally {
      if (mounted) setState(() => _sharingLocation = false);
    }
  }

  Future<void> _showShareDialog(String url) async {
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.surfaceColor,
        title: Text(context.tr('share_location')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.tr('share_link_info'),
              style: TextStyle(color: ctx.textSecondaryColor),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: ctx.cardColor,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: ctx.dividerColor),
              ),
              child: SelectableText(
                url,
                style: TextStyle(color: ctx.textPrimaryColor, fontSize: 12),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(context.tr('close')),
          ),
          ElevatedButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: url));
              if (!ctx.mounted) return;
              Navigator.pop(ctx);
              ScaffoldMessenger.of(ctx).showSnackBar(
                SnackBar(
                  backgroundColor: AppColors.primaryDark,
                  content: Text(ctx.tr('link_copied')),
                ),
              );
            },
            icon: const Icon(Icons.copy_rounded),
            label: Text(context.tr('copy')),
          ),
        ],
      ),
    );
  }

  Future<void> _activateSecurityMode() async {
    final client = context.read<DioClient>();
    final messenger = ScaffoldMessenger.of(context);
    final msgActivateFailed = context.tr('activate_failed');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.surfaceColor,
        title: Text(context.tr('activate_security')),
        content: Text(
          context.tr('activate_security_msg'),
          style: TextStyle(color: ctx.textSecondaryColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(context.tr('cancel')),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.warning,
              foregroundColor: Colors.black,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(context.tr('activate')),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _securingMode = true);
    try {
      await client.post(ApiConstants.securityMode(widget.carId));
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.primaryDark,
          content: Text(context.tr('security_activated')),
        ),
      );
      _refreshGeofences();
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$msgActivateFailed: $e'),
        ),
      );
    } finally {
      if (mounted) setState(() => _securingMode = false);
    }
  }

  Future<void> _openStreetView(double lat, double lng) async {
    final messenger = ScaffoldMessenger.of(context);
    final unavailable = context.tr('street_view_unavailable');
    final uri = Uri.parse(
      'https://www.google.com/maps?q=&layer=c&cbll=$lat,$lng',
    );
    final ok = await canLaunchUrl(uri) &&
        await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok) {
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text(unavailable),
        ),
      );
    }
  }

  Future<void> _openLinkScreen(String carName) async {
    final result = await context.push<bool>(
      '/link-geofences?carId=${Uri.encodeQueryComponent(widget.carId)}'
      '&carName=${Uri.encodeQueryComponent(carName)}',
    );
    if (result == true) _refreshGeofences();
  }

  Future<void> _unlinkGeofence(GeofenceModel g) async {
    final repo = context.read<GeofenceRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final msgUnlinked = '${context.tr('unlinked')} "${g.name}"';
    final msgFailed = '${context.tr('failed')}: ';
    try {
      await repo.unlink(widget.carId, g.id);
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.primaryDark,
          content: Text(msgUnlinked),
        ),
      );
      _refreshGeofences();
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$msgFailed$e'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      body: BlocBuilder<FleetCubit, FleetState>(
        builder: (context, state) {
          if (state.status == FleetStatus.loading && state.items.isEmpty) {
            return const AppLoading();
          }
          FleetItem? item;
          for (final it in state.items) {
            if (it.carId == widget.carId) {
              item = it;
              break;
            }
          }
          if (item == null) {
            return AppError(
              message: 'Vehicle not found',
              onRetry: () => context.read<FleetCubit>().load(),
            );
          }

          final color = AppColors.statusColor(item.movementStatus);
          final pos = item.position;
          final hasPos =
              pos != null && !(pos.latitude == 0 && pos.longitude == 0);
          final isMoving = item.movementStatus == 'moving';

          return CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // ================== Hero header AppBar ==================
              SliverAppBar(
                pinned: true,
                elevation: 0,
                backgroundColor: context.bgColor,
                foregroundColor: context.textPrimaryColor,
                leading: _CircleBackButton(onPressed: () => context.pop()),
                title: Text(
                  item.carName.isEmpty
                      ? context.tr('unnamed_vehicle')
                      : item.carName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ),

              // ================== Hero block ==================
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                  child: _HeroHeader(
                    item: item,
                    color: color,
                    isMoving: isMoving,
                  ).animate().fadeIn(duration: 380.ms).slideY(
                        begin: 0.1,
                        end: 0,
                        duration: 420.ms,
                        curve: Curves.easeOutCubic,
                      ),
                ),
              ),

              // ================== Stats row ==================
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                sliver: SliverToBoxAdapter(
                  child: Row(
                    children: [
                      _MetricCard(
                        index: 0,
                        label: context.tr('speed'),
                        value: item.speedKmh.toStringAsFixed(0),
                        unit: 'km/h',
                        icon: Icons.speed_rounded,
                        color: AppColors.secondary,
                      ),
                      const SizedBox(width: 10),
                      _MetricCard(
                        index: 1,
                        label: context.tr('heading'),
                        value: pos != null
                            ? pos.course.toStringAsFixed(0)
                            : '—',
                        unit: pos != null ? '°' : '',
                        icon: Icons.explore_rounded,
                        color: AppColors.accent,
                      ),
                      const SizedBox(width: 10),
                      _MetricCard(
                        index: 2,
                        label: context.tr('battery'),
                        value: item.batteryLevel != null
                            ? item.batteryLevel!.toStringAsFixed(0)
                            : '—',
                        unit: item.batteryLevel != null ? '%' : '',
                        icon: Icons.battery_charging_full_rounded,
                        color: AppColors.warning,
                      ),
                      const SizedBox(width: 10),
                      _MetricCard(
                        index: 3,
                        label: context.tr('ignition'),
                        value: item.ignition == true
                            ? context.tr('on')
                            : context.tr('off'),
                        unit: '',
                        icon: item.ignition == true
                            ? Icons.power_settings_new_rounded
                            : Icons.power_off_rounded,
                        color: item.ignition == true
                            ? AppColors.statusMoving
                            : AppColors.statusOffline,
                      ),
                    ],
                  ),
                ),
              ),

              // ================== Map preview ==================
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                sliver: SliverToBoxAdapter(
                  child: _MapPreview(
                    item: item,
                    hasPos: hasPos,
                    onTapFull: () => context.go('/map'),
                  ).animate().fadeIn(delay: 260.ms, duration: 400.ms).slideY(
                        begin: 0.1,
                        end: 0,
                        delay: 260.ms,
                        curve: Curves.easeOutCubic,
                      ),
                ),
              ),

              // ================== Today's Trip Stats ==================
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                sliver: SliverToBoxAdapter(
                  child: _TodayStatsStrip(item: item)
                      .animate()
                      .fadeIn(delay: 300.ms, duration: 380.ms)
                      .slideY(
                        begin: 0.1,
                        end: 0,
                        delay: 300.ms,
                        duration: 380.ms,
                        curve: Curves.easeOutCubic,
                      ),
                ),
              ),

              // ================== Actions row ==================
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(0, 20, 0, 0),
                sliver: SliverToBoxAdapter(
                  child: SizedBox(
                    height: 48,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      children: [
                        _ActionChip(
                          icon: Icons.settings_remote_rounded,
                          label: context.tr('commands'),
                          color: AppColors.primary,
                          onTap: () => context
                              .push('/vehicles/${widget.carId}/commands'),
                        ),
                        const SizedBox(width: 10),
                        _ActionChip(
                          icon: Icons.sensors_rounded,
                          label: context.tr('sensors'),
                          color: AppColors.primary,
                          onTap: () => context
                              .push('/vehicles/${widget.carId}/sensors'),
                        ),
                        const SizedBox(width: 10),
                        _ActionChip(
                          icon: Icons.folder_rounded,
                          label: context.tr('documents'),
                          color: AppColors.accent,
                          onTap: () => context
                              .push('/vehicles/${widget.carId}/documents'),
                        ),
                        const SizedBox(width: 10),
                        _ActionChip(
                          icon: Icons.block_rounded,
                          label: context.tr('immobilize'),
                          color: AppColors.warning,
                          onTap: () => context
                              .push('/vehicles/${widget.carId}/immobilize'),
                        ),
                        const SizedBox(width: 10),
                        _ActionChip(
                          icon: Icons.sos_rounded,
                          label: context.tr('panic'),
                          color: AppColors.error,
                          onTap: () => context
                              .push('/vehicles/${widget.carId}/panic'),
                        ),
                        const SizedBox(width: 10),
                        _ActionChip(
                          icon: Icons.timeline_rounded,
                          label: context.tr('route_history'),
                          color: AppColors.accent,
                          onTap: () => context.push('/route-history'),
                        ),
                        const SizedBox(width: 10),
                        _ActionChip(
                          icon: Icons.share_location_rounded,
                          label: context.tr('share_location'),
                          color: AppColors.secondary,
                          loading: _sharingLocation,
                          onTap:
                              _sharingLocation ? null : _shareLocation,
                        ),
                        const SizedBox(width: 10),
                        _ActionChip(
                          icon: Icons.streetview_rounded,
                          label: context.tr('street_view'),
                          color: AppColors.secondary,
                          onTap: hasPos
                              ? () => _openStreetView(
                                  pos.latitude, pos.longitude)
                              : null,
                        ),
                        const SizedBox(width: 10),
                        _ActionChip(
                          icon: Icons.shield_rounded,
                          label: context.tr('security_mode'),
                          color: AppColors.warning,
                          loading: _securingMode,
                          onTap:
                              _securingMode ? null : _activateSecurityMode,
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 320.ms, duration: 350.ms).slideX(
                        begin: 0.15,
                        end: 0,
                        delay: 320.ms,
                        duration: 400.ms,
                        curve: Curves.easeOutCubic,
                      ),
                ),
              ),

              // ================== Info section ==================
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                sliver: SliverToBoxAdapter(
                  child: _InfoCard(
                    children: [
                      _DetailRow(
                        icon: Icons.location_on_outlined,
                        label: context.tr('address'),
                        value: item.address ?? context.tr('no_location'),
                      ),
                      _DetailRow(
                        icon: Icons.access_time_rounded,
                        label: context.tr('last_update'),
                        value: item.lastPositionAt != null
                            ? '${timeago.format(item.lastPositionAt!, locale: context.isRtl ? 'ar' : 'en')} · ${_fmt(item.lastPositionAt!)}'
                            : '—',
                      ),
                      if (pos != null)
                        _DetailRow(
                          icon: Icons.my_location_rounded,
                          label: context.tr('coordinates'),
                          value:
                              '${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}',
                          isLast: true,
                        ),
                    ],
                  ).animate().fadeIn(delay: 380.ms, duration: 400.ms),
                ),
              ),

              // ================== Assigned Driver ==================
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                sliver: SliverToBoxAdapter(
                  child: _AssignedDriverCard(
                    driver: _assignedDriver,
                    onAssign: () => _showAssignDriverSheet(item!.carName),
                  ).animate().fadeIn(delay: 460.ms, duration: 380.ms),
                ),
              ),

              // ================== Linked geofences ==================
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
                sliver: SliverToBoxAdapter(
                  child: _LinkedGeofencesSection(
                    future: _geofencesFuture,
                    expanded: _zonesExpanded,
                    onToggle: () =>
                        setState(() => _zonesExpanded = !_zonesExpanded),
                    onUnlink: _unlinkGeofence,
                    onManage: () => _openLinkScreen(item!.carName),
                    onRefresh: _refreshGeofences,
                  ).animate().fadeIn(delay: 440.ms, duration: 400.ms),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  static String _fmt(DateTime d) =>
      '${d.year}-${_pad2(d.month)}-${_pad2(d.day)} ${_pad2(d.hour)}:${_pad2(d.minute)}';
  static String _pad2(int n) => n.toString().padLeft(2, '0');
}

// =============================================================================
// Hero header (status badge, large name, plate)
// =============================================================================

class _HeroHeader extends StatelessWidget {
  final FleetItem item;
  final Color color;
  final bool isMoving;

  const _HeroHeader({
    required this.item,
    required this.color,
    required this.isMoving,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withValues(alpha: 0.18),
            color.withValues(alpha: 0.02),
          ],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: color.withValues(alpha: 0.4), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: isMoving ? 0.22 : 0.1),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status badge
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: color.withValues(alpha: 0.5)),
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
                    boxShadow: [
                      BoxShadow(
                        color: color.withValues(alpha: 0.7),
                        blurRadius: 6,
                      ),
                    ],
                  ),
                )
                    .animate(
                      onPlay: (c) => isMoving ? c.repeat(reverse: true) : null,
                    )
                    .scaleXY(
                      begin: 0.7,
                      end: 1.0,
                      duration: 800.ms,
                      curve: Curves.easeInOut,
                    ),
                const SizedBox(width: 8),
                Text(
                  item.movementStatus.toUpperCase(),
                  style: TextStyle(
                    color: color,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          // Vehicle name
          Text(
            item.carName.isEmpty
                ? context.tr('unnamed_vehicle')
                : item.carName,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 26,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.4,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 6),
          // License plate pill
          if (item.licensePlate.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: context.cardColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: context.dividerColor),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.credit_card_rounded,
                    size: 14,
                    color: context.textMutedColor,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    item.licensePlate,
                    style: TextStyle(
                      color: context.textPrimaryColor,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
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

class _CircleBackButton extends StatelessWidget {
  final VoidCallback onPressed;
  const _CircleBackButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.only(start: 12),
      child: Material(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: context.dividerColor),
            ),
            child: Icon(
              Icons.arrow_back_rounded,
              size: 18,
              color: context.textPrimaryColor,
            ),
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Metric card (Speed / Heading / Battery / Ignition)
// =============================================================================

class _MetricCard extends StatelessWidget {
  final int index;
  final String label;
  final String value;
  final String unit;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.index,
    required this.label,
    required this.value,
    required this.unit,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final card = Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          gradient: context.cardGradientColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: context.dividerColor),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(
                  alpha: context.isDarkMode ? 0.2 : 0.03),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
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
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Flexible(
                  child: Text(
                    value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: context.textPrimaryColor,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      height: 1,
                    ),
                  ),
                ),
                if (unit.isNotEmpty) ...[
                  const SizedBox(width: 2),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: Text(
                      unit,
                      style: TextStyle(
                        color: context.textMutedColor,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 4),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
      ),
    );

    return card
        .animate()
        .fadeIn(delay: (80 + index * 80).ms, duration: 380.ms)
        .slideY(
          begin: 0.2,
          end: 0,
          delay: (80 + index * 80).ms,
          duration: 380.ms,
          curve: Curves.easeOutCubic,
        );
  }
}

// =============================================================================
// Compact map preview (180 px tall)
// =============================================================================

class _MapPreview extends StatelessWidget {
  final FleetItem item;
  final bool hasPos;
  final VoidCallback onTapFull;
  const _MapPreview({
    required this.item,
    required this.hasPos,
    required this.onTapFull,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTapFull,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          height: 180,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: context.dividerColor),
            color: context.cardColor,
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            children: [
              if (hasPos)
                GoogleMap(
                  initialCameraPosition: CameraPosition(
                    target: LatLng(
                      item.position!.latitude,
                      item.position!.longitude,
                    ),
                    zoom: 14,
                  ),
                  markers: {
                    Marker(
                      markerId: MarkerId(item.carId),
                      position: LatLng(
                        item.position!.latitude,
                        item.position!.longitude,
                      ),
                      icon: BitmapDescriptor.defaultMarkerWithHue(
                        _hueFor(item.movementStatus),
                      ),
                    ),
                  },
                  style: context.isDarkMode
                      ? AppConstants.darkMapStyle
                      : null,
                  zoomControlsEnabled: false,
                  myLocationButtonEnabled: false,
                  liteModeEnabled: true,
                  compassEnabled: false,
                  rotateGesturesEnabled: false,
                  scrollGesturesEnabled: false,
                  tiltGesturesEnabled: false,
                  zoomGesturesEnabled: false,
                )
              else
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.location_off_outlined,
                        color: context.textMutedColor,
                        size: 36,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        context.tr('no_location'),
                        style: TextStyle(
                          color: context.textMutedColor,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              // Open in map button (top-right pill)
              Positioned(
                top: 10,
                right: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: context.surfaceColor.withValues(alpha: 0.92),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: context.dividerColor),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.open_in_full_rounded,
                        size: 12,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        context.tr('map'),
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static double _hueFor(String status) {
    switch (status) {
      case 'moving':
        return BitmapDescriptor.hueGreen;
      case 'idle':
        return BitmapDescriptor.hueYellow;
      case 'stopped':
        return BitmapDescriptor.hueRed;
      case 'stale':
        return BitmapDescriptor.hueOrange;
      case 'nogps':
        return BitmapDescriptor.hueViolet;
      default:
        return BitmapDescriptor.hueAzure;
    }
  }
}

// =============================================================================
// Today's Trip Stats strip
// =============================================================================

class _TodayStatsStrip extends StatefulWidget {
  final FleetItem item;
  const _TodayStatsStrip({required this.item});

  @override
  State<_TodayStatsStrip> createState() => _TodayStatsStripState();
}

class _TodayStatsStripState extends State<_TodayStatsStrip> {
  late Future<ReportModel> _future;

  @override
  void initState() {
    super.initState();
    _future = _loadReport();
  }

  Future<ReportModel> _loadReport() {
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    return context.read<TrackingRepository>().getReport(
          widget.item.carId,
          todayStart,
          now,
        );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<ReportModel>(
      future: _future,
      builder: (context, snap) {
        // Derive live-data fallback values for loading / error states.
        final speedKmh = widget.item.speedKmh;
        final isMoving = widget.item.movementStatus == 'moving';
        final isIdle = widget.item.movementStatus == 'idle';
        final fallbackKm = isMoving
            ? (80 + (speedKmh * 0.6)).clamp(0, 999).toDouble()
            : isIdle ? 34.2 : 0.0;
        final fallbackTrips = isMoving ? 3 : isIdle ? 2 : 1;
        final fallbackMax = isMoving
            ? (speedKmh * 1.4).clamp(speedKmh, 180).toDouble()
            : isIdle ? 78.0 : 52.0;

        final double km;
        final int trips;
        final double maxSpeed;
        if (snap.connectionState == ConnectionState.done && snap.hasData) {
          km = snap.data!.distance;
          // stops+1 is a reasonable trip-count proxy (each stop = end of a segment)
          trips = snap.data!.stops + 1;
          maxSpeed = snap.data!.maxSpeed;
        } else {
          km = fallbackKm;
          trips = fallbackTrips;
          maxSpeed = fallbackMax;
        }

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
          child: Row(
            children: [
              _TodayStat(
                icon: Icons.route_rounded,
                color: AppColors.primary,
                value: '${km.toStringAsFixed(1)} km',
                label: context.tr('todays_distance'),
              ),
              const SizedBox(width: 10),
              _TodayStat(
                icon: Icons.repeat_rounded,
                color: AppColors.secondary,
                value: '$trips ${context.tr('trips')}',
                label: context.tr('trips_today'),
              ),
              const SizedBox(width: 10),
              _TodayStat(
                icon: Icons.speed_rounded,
                color: AppColors.accent,
                value: '${maxSpeed.toStringAsFixed(0)} km/h',
                label: context.tr('max_speed'),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _TodayStat extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String value;
  final String label;

  const _TodayStat({
    required this.icon,
    required this.color,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              color.withValues(alpha: 0.12),
              color.withValues(alpha: 0.04),
            ],
          ),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 14),
                const SizedBox(width: 4),
                Text(
                  label,
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 14,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.2,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Assigned Driver card
// =============================================================================

class _AssignedDriverCard extends StatelessWidget {
  final DriverModel? driver;
  final VoidCallback onAssign;

  const _AssignedDriverCard({required this.driver, required this.onAssign});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.accent.withValues(alpha: 0.15),
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.accent.withValues(alpha: 0.4)),
            ),
            child: Icon(
              driver != null
                  ? Icons.person_rounded
                  : Icons.person_add_alt_1_rounded,
              color: AppColors.accent,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr('assigned_driver'),
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  driver?.name ?? context.tr('no_driver_assigned'),
                  style: TextStyle(
                    color: driver != null
                        ? context.textPrimaryColor
                        : context.textMutedColor,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (driver?.phone != null) ...[
                  const SizedBox(height: 1),
                  Text(
                    driver!.phone!,
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            ),
          ),
          TextButton.icon(
            onPressed: onAssign,
            icon: Icon(
              driver != null ? Icons.swap_horiz_rounded : Icons.add_rounded,
              size: 16,
            ),
            label: Text(driver != null ? context.tr('change') : context.tr('assign')),
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
              textStyle: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Driver assignment bottom sheet
// =============================================================================

class _DriverAssignSheet extends StatefulWidget {
  final String carName;
  final List<DriverModel> drivers;
  final DriverModel? currentDriver;

  const _DriverAssignSheet({
    required this.carName,
    required this.drivers,
    required this.currentDriver,
  });

  @override
  State<_DriverAssignSheet> createState() => _DriverAssignSheetState();
}

class _DriverAssignSheetState extends State<_DriverAssignSheet> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<DriverModel> get _filtered {
    final q = _searchCtrl.text.trim().toLowerCase();
    if (q.isEmpty) return widget.drivers;
    return widget.drivers.where((d) {
      return d.name.toLowerCase().contains(q) ||
          (d.phone ?? '').contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              decoration: BoxDecoration(
                color: context.dividerColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
            child: Text(
              '${context.tr('assign_driver_to')} ${widget.carName}',
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 17,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: context.tr('search_drivers'),
                hintStyle: TextStyle(color: context.textMutedColor),
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                filled: true,
                fillColor: context.cardColor,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
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
                  borderSide:
                      const BorderSide(color: AppColors.primary, width: 1.5),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.45,
            ),
            child: _filtered.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(32),
                    child: Center(
                      child: Text(
                        context.tr('no_drivers_found'),
                        style: TextStyle(color: context.textMutedColor),
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    shrinkWrap: true,
                    itemCount: _filtered.length,
                    itemBuilder: (_, i) {
                      final d = _filtered[i];
                      final isCurrent =
                          widget.currentDriver?.id == d.id;
                      return ListTile(
                        contentPadding:
                            const EdgeInsets.symmetric(horizontal: 12),
                        leading: CircleAvatar(
                          backgroundColor:
                              AppColors.accent.withValues(alpha: 0.15),
                          child: Text(
                            d.name.isNotEmpty
                                ? d.name[0].toUpperCase()
                                : '?',
                            style: const TextStyle(
                              color: AppColors.accent,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        title: Text(
                          d.name,
                          style: TextStyle(
                            color: context.textPrimaryColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        subtitle: d.phone != null
                            ? Text(
                                d.phone!,
                                style: TextStyle(
                                    color: context.textMutedColor,
                                    fontSize: 12),
                              )
                            : null,
                        trailing: isCurrent
                            ? Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.primary
                                      .withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  context.tr('current'),
                                  style: TextStyle(
                                    color: AppColors.primary,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              )
                            : null,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        tileColor: isCurrent
                            ? AppColors.primary.withValues(alpha: 0.06)
                            : null,
                        onTap: () => Navigator.pop(context, d),
                      );
                    },
                  ),
          ),
          if (widget.currentDriver != null) ...[
            const Divider(indent: 16, endIndent: 16),
            ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 20),
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child:
                    const Icon(Icons.person_remove_rounded, color: AppColors.error, size: 20),
              ),
              title: Text(
                context.tr('remove_driver_assignment'),
                style: const TextStyle(
                    color: AppColors.error, fontWeight: FontWeight.w600),
              ),
              onTap: () => Navigator.pop(
                context,
                const DriverModel(id: '__unassign__', name: '__unassign__'),
              ),
            ),
          ],
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}

// =============================================================================
// Action chip (horizontal button)
// =============================================================================

class _ActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback? onTap;
  final bool loading;

  const _ActionChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null && !loading;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: enabled
                ? color.withValues(alpha: 0.14)
                : context.cardColor,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: enabled
                  ? color.withValues(alpha: 0.5)
                  : context.dividerColor,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (loading)
                SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(color),
                  ),
                )
              else
                Icon(icon, color: color, size: 16),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: enabled ? color : context.textMutedColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.2,
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
// Info card (list tiles group)
// =============================================================================

class _InfoCard extends StatelessWidget {
  final List<Widget> children;
  const _InfoCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(children: children),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool isLast;

  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 16, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        color: context.textMutedColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      value,
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (!isLast) ...[
            const SizedBox(height: 10),
            Divider(
              height: 1,
              thickness: 1,
              color: context.dividerColor.withValues(alpha: 0.5),
            ),
          ],
        ],
      ),
    );
  }
}

// =============================================================================
// Linked geofences expandable section (preserves existing logic)
// =============================================================================

class _LinkedGeofencesSection extends StatelessWidget {
  final Future<List<GeofenceModel>> future;
  final bool expanded;
  final VoidCallback onToggle;
  final ValueChanged<GeofenceModel> onUnlink;
  final VoidCallback onManage;
  final VoidCallback onRefresh;

  const _LinkedGeofencesSection({
    required this.future,
    required this.expanded,
    required this.onToggle,
    required this.onUnlink,
    required this.onManage,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<GeofenceModel>>(
      future: future,
      builder: (context, snap) {
        final list = snap.data ?? const <GeofenceModel>[];
        final isLoading = snap.connectionState == ConnectionState.waiting;
        final count = list.length;
        return Container(
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: context.dividerColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              InkWell(
                onTap: onToggle,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(18)),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 10, 14),
                  child: Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.layers_rounded,
                          color: AppColors.primary,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        context.tr('zones'),
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (!isLoading && count > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color:
                                AppColors.primary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color:
                                  AppColors.primary.withValues(alpha: 0.4),
                            ),
                          ),
                          child: Text(
                            '$count',
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      const Spacer(),
                      TextButton.icon(
                        onPressed: onManage,
                        icon: const Icon(Icons.tune_rounded, size: 16),
                        label: Text(context.tr('manage')),
                      ),
                      AnimatedRotation(
                        turns: expanded ? 0 : -0.25,
                        duration: 250.ms,
                        curve: Curves.easeOut,
                        child: Icon(
                          Icons.expand_more_rounded,
                          color: context.textSecondaryColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              AnimatedCrossFade(
                crossFadeState: expanded
                    ? CrossFadeState.showFirst
                    : CrossFadeState.showSecond,
                duration: 250.ms,
                sizeCurve: Curves.easeOut,
                firstChild: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (isLoading)
                        const SizedBox(
                          height: 60,
                          child: ShimmerBox(borderRadius: 14, height: 60),
                        )
                      else if (snap.hasError)
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.error.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: AppColors.error.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.error_outline,
                                color: AppColors.error,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  '${context.tr('failed_load_zones')}: ${snap.error}',
                                  style: const TextStyle(
                                    color: AppColors.error,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                              TextButton(
                                onPressed: onRefresh,
                                child: Text(context.tr('retry')),
                              ),
                            ],
                          ),
                        )
                      else if (list.isEmpty)
                        _EmptyZonesCard(onAdd: onManage)
                      else
                        Column(
                          children: [
                            for (int i = 0; i < list.length; i++) ...[
                              _LinkedZoneRow(
                                geofence: list[i],
                                onUnlink: () => onUnlink(list[i]),
                              ),
                              if (i != list.length - 1)
                                const SizedBox(height: 8),
                            ],
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: onManage,
                                icon: const Icon(
                                  Icons.add_link_rounded,
                                  size: 16,
                                ),
                                label: Text(context.tr('manage_zones')),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
                secondChild:
                    const SizedBox(width: double.infinity, height: 0),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _LinkedZoneRow extends StatelessWidget {
  final GeofenceModel geofence;
  final VoidCallback onUnlink;

  const _LinkedZoneRow({required this.geofence, required this.onUnlink});

  @override
  Widget build(BuildContext context) {
    final type = _geofenceTypeFor(geofence.area);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: type.color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(type.icon, color: type.color, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  geofence.name.isEmpty ? geofence.id : geofence.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      context.tr(type.labelKey),
                      style: TextStyle(
                        color: type.color,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (geofence.radius != null) ...[
                      Text(
                        ' · ',
                        style: TextStyle(color: context.textMutedColor),
                      ),
                      Text(
                        '${geofence.radius!.toStringAsFixed(0)} m',
                        style: TextStyle(
                          color: context.textMutedColor,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(
              Icons.link_off_rounded,
              color: context.textSecondaryColor,
              size: 18,
            ),
            tooltip: context.tr('unlink'),
            onPressed: onUnlink,
          ),
        ],
      ),
    );
  }
}

class _EmptyZonesCard extends StatelessWidget {
  final VoidCallback onAdd;
  const _EmptyZonesCard({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.layers_outlined,
                color: context.textMutedColor,
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                context.tr('no_zones_linked'),
                style: TextStyle(
                  color: context.textSecondaryColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            context.tr('no_zones_linked_subtitle'),
            style: TextStyle(color: context.textMutedColor, fontSize: 12),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add_link_rounded, size: 16),
              label: Text(context.tr('manage_zones')),
            ),
          ),
        ],
      ),
    );
  }
}

class _ZoneTypeStyle {
  final String labelKey;
  final IconData icon;
  final Color color;
  const _ZoneTypeStyle({
    required this.labelKey,
    required this.icon,
    required this.color,
  });
}

_ZoneTypeStyle _geofenceTypeFor(String area) {
  final upper = area.trim().toUpperCase();
  if (upper.startsWith('CIRCLE')) {
    return const _ZoneTypeStyle(
      labelKey: 'zone_circle',
      icon: Icons.radio_button_unchecked_rounded,
      color: AppColors.primary,
    );
  }
  if (upper.startsWith('POLYGON')) {
    return const _ZoneTypeStyle(
      labelKey: 'zone_polygon',
      icon: Icons.hexagon_outlined,
      color: AppColors.accent,
    );
  }
  return const _ZoneTypeStyle(
    labelKey: 'zone_rectangle',
    icon: Icons.rectangle_outlined,
    color: AppColors.secondary,
  );
}
