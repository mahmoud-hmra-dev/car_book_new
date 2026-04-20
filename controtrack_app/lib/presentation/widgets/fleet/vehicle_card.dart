import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../l10n/app_localizations.dart';

/// Spectacular fleet vehicle card.
///
/// Features:
/// - Animated pulsing ring around the status dot for moving vehicles
/// - Color-coded speed progress bar (fraction of 200 km/h)
/// - Battery indicator with icon + % (green / orange / red)
/// - Compact info grid: speed, ignition, battery, address
/// - Subtle swipe-hint chevron on the trailing edge
/// - Entrance slide + fade using flutter_animate (honors [animationDelay])
/// - Press feedback via InkWell scale/highlight
class VehicleCard extends StatelessWidget {
  final FleetItem item;
  final VoidCallback? onTap;
  final Duration animationDelay;

  const VehicleCard({
    super.key,
    required this.item,
    this.onTap,
    this.animationDelay = Duration.zero,
  });

  static const double _maxReferenceSpeed = 200.0;

  @override
  Widget build(BuildContext context) {
    final statusColor = AppColors.statusColor(item.movementStatus);
    final lastUpd = item.lastPositionAt;
    final isMoving = item.movementStatus == 'moving';

    final speedPct = (item.speedKmh / _maxReferenceSpeed).clamp(0.0, 1.0);
    final Color speedColor = speedPct > 0.8
        ? AppColors.error
        : speedPct > 0.5
            ? AppColors.warning
            : AppColors.statusMoving;

    final card = Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        splashColor: statusColor.withValues(alpha: 0.12),
        highlightColor: statusColor.withValues(alpha: 0.06),
        child: Ink(
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: context.dividerColor, width: 1),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 10, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header row: status avatar + name/plate + status pill + chevron
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    _StatusAvatar(color: statusColor, isMoving: isMoving),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.carName.isEmpty
                                ? context.tr('unnamed_vehicle')
                                : item.carName,
                            style: TextStyle(
                              color: context.textPrimaryColor,
                              fontSize: 15.5,
                              fontWeight: FontWeight.w700,
                              height: 1.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Icon(Icons.credit_card,
                                  size: 12, color: context.textMutedColor),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  item.licensePlate.isEmpty
                                      ? '—'
                                      : item.licensePlate,
                                  style: TextStyle(
                                    color: context.textSecondaryColor,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    letterSpacing: 0.3,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    _StatusPill(status: item.movementStatus, color: statusColor),
                    // Swipe hint
                    Padding(
                      padding: EdgeInsetsDirectional.only(start: 4),
                      child: Icon(
                        Icons.chevron_right_rounded,
                        size: 20,
                        color: context.textMutedColor,
                      )
                          .animate(
                            onPlay: (c) => c.repeat(reverse: true),
                          )
                          .moveX(
                            begin: 0,
                            end: 4,
                            duration: 900.ms,
                            curve: Curves.easeInOut,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Divider(
                  height: 1,
                  thickness: 1,
                  color: context.dividerColor.withValues(alpha: 0.6),
                ),
                const SizedBox(height: 10),
                // Info grid: speed, ignition, battery, address
                Row(
                  children: [
                    _InfoTile(
                      icon: Icons.speed_rounded,
                      iconColor: speedColor,
                      label: '${item.speedKmh.toStringAsFixed(0)} km/h',
                    ),
                    const SizedBox(width: 10),
                    _InfoTile(
                      icon: item.ignition == true
                          ? Icons.vpn_key_rounded
                          : Icons.vpn_key_off_rounded,
                      iconColor: item.ignition == true
                          ? AppColors.statusMoving
                          : context.textMutedColor,
                      label: item.ignition == true
                          ? context.tr('on')
                          : context.tr('off'),
                    ),
                    const SizedBox(width: 10),
                    if (item.batteryLevel != null)
                      _BatteryTile(level: item.batteryLevel!)
                    else
                      Icon(Icons.battery_unknown,
                          size: 14, color: context.textMutedColor),
                  ],
                ),
                const SizedBox(height: 8),
                // Speed bar
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: speedPct,
                    backgroundColor: context.dividerColor,
                    color: speedColor,
                    minHeight: 3,
                  ),
                ),
                const SizedBox(height: 10),
                // Footer: address + time ago
                Row(
                  children: [
                    Icon(Icons.location_on_outlined,
                        size: 13, color: context.textMutedColor),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        item.address ?? context.tr('no_location'),
                        style: TextStyle(
                          color: context.textMutedColor,
                          fontSize: 11.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (lastUpd != null) ...[
                      const SizedBox(width: 8),
                      Icon(Icons.schedule,
                          size: 11, color: context.textMutedColor),
                      const SizedBox(width: 3),
                      Text(
                        timeago.format(
                          lastUpd,
                          locale: context.isRtl ? 'ar' : 'en_short',
                        ),
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
        ),
      ),
    );

    return card
        .animate(delay: animationDelay)
        .fadeIn(duration: 280.ms, curve: Curves.easeOut)
        .slideY(
          begin: 0.12,
          end: 0,
          duration: 320.ms,
          curve: Curves.easeOutCubic,
        );
  }
}

/// Avatar with an optional pulsing ring for moving vehicles.
class _StatusAvatar extends StatelessWidget {
  final Color color;
  final bool isMoving;
  const _StatusAvatar({required this.color, required this.isMoving});

  @override
  Widget build(BuildContext context) {
    final iconContainer = Container(
      width: 46,
      height: 46,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        shape: BoxShape.circle,
        border: Border.all(color: color.withValues(alpha: 0.55), width: 1.2),
      ),
      child: Icon(Icons.directions_car_rounded, color: color, size: 24),
    );

    if (!isMoving) return iconContainer;

    return SizedBox(
      width: 56,
      height: 56,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Outer pulse
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.22),
              shape: BoxShape.circle,
            ),
          )
              .animate(onPlay: (c) => c.repeat())
              .scaleXY(
                begin: 1.0,
                end: 1.35,
                duration: 1200.ms,
                curve: Curves.easeOut,
              )
              .fadeOut(begin: 0.55, duration: 1200.ms),
          // Inner soft pulse (delayed for richer effect)
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              shape: BoxShape.circle,
            ),
          )
              .animate(onPlay: (c) => c.repeat())
              .scaleXY(
                begin: 1.0,
                end: 1.2,
                duration: 1200.ms,
                delay: 400.ms,
                curve: Curves.easeOut,
              )
              .fadeOut(begin: 0.5, duration: 1200.ms, delay: 400.ms),
          iconContainer,
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  const _InfoTile({
    required this.icon,
    required this.iconColor,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: iconColor),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            color: context.textSecondaryColor,
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _BatteryTile extends StatelessWidget {
  final double level;
  const _BatteryTile({required this.level});

  @override
  Widget build(BuildContext context) {
    final pct = (level / 100).clamp(0.0, 1.0);
    final Color color = pct > 0.5
        ? AppColors.statusMoving
        : pct > 0.2
            ? AppColors.warning
            : AppColors.error;
    final IconData icon = pct > 0.8
        ? Icons.battery_full
        : pct > 0.5
            ? Icons.battery_5_bar
            : pct > 0.2
                ? Icons.battery_4_bar
                : Icons.battery_1_bar;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 3),
        Text(
          '${level.toStringAsFixed(0)}%',
          style: TextStyle(
            color: color,
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 9,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
