import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../data/repositories/fleet_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../blocs/fleet/fleet_state.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';

/// A full-screen dramatic red panic button for emergency situations. Sends an
/// `alarm` command to the vehicle and surfaces an "emergency services
/// notified" confirmation to the user.
class PanicButtonScreen extends StatefulWidget {
  final String carId;
  const PanicButtonScreen({super.key, required this.carId});

  @override
  State<PanicButtonScreen> createState() => _PanicButtonScreenState();
}

class _PanicButtonScreenState extends State<PanicButtonScreen> {
  bool _sending = false;
  bool _triggered = false;

  Future<void> _onPressed() async {
    final repo = context.read<FleetRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final alarmSent = context.tr('alarm_sent');
    final alarmFailed = context.tr('alarm_failed');
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.surfaceColor,
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded,
                color: AppColors.error, size: 22),
            const SizedBox(width: 8),
            Expanded(child: Text(ctx.tr('confirm_panic'))),
          ],
        ),
        content: Text(
          ctx.tr('confirm_panic_msg'),
          style: TextStyle(color: ctx.textSecondaryColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(ctx.tr('cancel')),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(Icons.sos_rounded, size: 18),
            label: Text(ctx.tr('trigger_alarm')),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    if (!mounted) return;
    setState(() => _sending = true);
    try {
      await repo.sendCommand(widget.carId, {'type': 'alarm'});
      if (!mounted) return;
      setState(() {
        _sending = false;
        _triggered = true;
      });
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text(alarmSent),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$alarmFailed: $e'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
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
          final pos = item.position;
          return Stack(
            fit: StackFit.expand,
            children: [
              // Dramatic red gradient backdrop with subtle pulse.
              Container(
                decoration: const BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment.center,
                    radius: 1.1,
                    colors: [
                      Color(0xFF7A0012),
                      Color(0xFF3A000A),
                      Colors.black,
                    ],
                  ),
                ),
              )
                  .animate(onPlay: (c) => c.repeat(reverse: true))
                  .fadeIn(duration: 1500.ms, begin: 0.7),
              SafeArea(
                child: Column(
                  children: [
                    // Custom app bar
                    Padding(
                      padding:
                          const EdgeInsets.fromLTRB(8, 8, 16, 0),
                      child: Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.arrow_back_rounded,
                                color: Colors.white),
                            onPressed: () => context.pop(),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Text(
                                  context.tr('panic_button'),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                                Text(
                                  item.carName.isEmpty
                                      ? item.licensePlate
                                      : item.carName,
                                  style: TextStyle(
                                    color: Colors.white
                                        .withValues(alpha: 0.7),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Location map preview
                    if (pos != null &&
                        !(pos.latitude == 0 && pos.longitude == 0))
                      Padding(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 20),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(18),
                          child: SizedBox(
                            height: 140,
                            child: GoogleMap(
                              initialCameraPosition: CameraPosition(
                                target: LatLng(
                                    pos.latitude, pos.longitude),
                                zoom: 14,
                              ),
                              markers: {
                                Marker(
                                  markerId: MarkerId(item.carId),
                                  position: LatLng(
                                      pos.latitude, pos.longitude),
                                  icon: BitmapDescriptor
                                      .defaultMarkerWithHue(
                                          BitmapDescriptor.hueRed),
                                ),
                              },
                              style: AppConstants.darkMapStyle,
                              zoomControlsEnabled: false,
                              myLocationButtonEnabled: false,
                              liteModeEnabled: true,
                            ),
                          ),
                        ),
                      )
                    else
                      Padding(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 20),
                        child: Container(
                          height: 140,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: Colors.white
                                  .withValues(alpha: 0.15),
                            ),
                          ),
                          child: const Center(
                            child: Icon(Icons.location_off_outlined,
                                color: Colors.white54, size: 36),
                          ),
                        ),
                      ),
                    const Spacer(),
                    // Large pulsing panic button
                    _PulsingPanicButton(
                      sending: _sending,
                      triggered: _triggered,
                      onPressed: _sending ? null : _onPressed,
                    ),
                    const SizedBox(height: 28),
                    Text(
                      _triggered
                          ? context.tr('emergency_services_notified')
                          : context.tr('press_for_emergency'),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: _triggered
                            ? AppColors.statusMoving
                            : Colors.white.withValues(alpha: 0.85),
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.3,
                      ),
                    ).animate(key: ValueKey(_triggered)).fadeIn(),
                    const Spacer(),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PulsingPanicButton extends StatelessWidget {
  final bool sending;
  final bool triggered;
  final VoidCallback? onPressed;

  const _PulsingPanicButton({
    required this.sending,
    required this.triggered,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final color = triggered ? AppColors.statusMoving : AppColors.error;
    final size = 220.0;
    final button = Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        customBorder: const CircleBorder(),
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: [
                color,
                color.withValues(alpha: 0.7),
              ],
            ),
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.6),
                blurRadius: 40,
                spreadRadius: 4,
              ),
            ],
          ),
          child: Center(
            child: sending
                ? const SizedBox(
                    width: 48,
                    height: 48,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 4,
                    ),
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        triggered
                            ? Icons.check_circle_rounded
                            : Icons.sos_rounded,
                        color: Colors.white,
                        size: 74,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        triggered
                            ? context.tr('emergency').toUpperCase()
                            : context.tr('panic').toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2,
                          fontSize: 18,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );

    if (sending || triggered) return button;
    return button
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .scaleXY(
          begin: 1.0,
          end: 1.06,
          duration: 800.ms,
          curve: Curves.easeInOut,
        );
  }
}
