import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../config/app_config.dart';
import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/auth/auth_cubit.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../blocs/fleet/fleet_state.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  String _initialsFor(String name) {
    final parts =
        name.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
    if (parts.isEmpty) return 'A';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }

  Future<void> _confirmSignOut(BuildContext context) async {
    final auth = context.read<AuthCubit>();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.surfaceColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.logout_rounded,
                  color: AppColors.error, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(ctx.tr('sign_out'))),
          ],
        ),
        content: Text(
          'Are you sure you want to sign out?',
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
            icon: const Icon(Icons.logout_rounded, size: 18),
            label: Text(ctx.tr('sign_out')),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await auth.signOut();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthCubit>().state.user;
    final displayName =
        user?.fullName.isNotEmpty == true ? user!.fullName : 'Admin';
    final role = (user?.type ?? 'admin').toUpperCase();
    final initials = _initialsFor(displayName);

    final sections = <_MenuSectionSpec>[
      _MenuSectionSpec(
        title: context.tr('fleet_management'),
        items: [
          _MenuItemSpec(
            icon: Icons.timeline_rounded,
            color: AppColors.primary,
            label: context.tr('route_history'),
            subtitle: 'Replay past trips and stops',
            route: '/route-history',
          ),
          _MenuItemSpec(
            icon: Icons.layers_rounded,
            color: AppColors.accent,
            label: context.tr('geofences'),
            subtitle: 'Virtual zones and boundaries',
            route: '/geofences',
          ),
          _MenuItemSpec(
            icon: Icons.bar_chart_rounded,
            color: AppColors.warning,
            label: context.tr('reports'),
            subtitle: 'Performance and analytics',
            route: '/reports',
          ),
          _MenuItemSpec(
            icon: Icons.speed_rounded,
            color: AppColors.error,
            label: context.tr('speed_violations'),
            subtitle: 'Overspeed incidents log',
            route: '/reports/speed-violations',
          ),
          _MenuItemSpec(
            icon: Icons.receipt_long_rounded,
            color: AppColors.statusStale,
            label: context.tr('traffic_infractions'),
            subtitle: 'Fines and violations records',
            route: '/infractions',
          ),
          _MenuItemSpec(
            icon: Icons.query_stats_rounded,
            color: AppColors.success,
            label: context.tr('cost_analytics'),
            subtitle: 'Fleet-wide cost overview',
            route: '/analytics/costs',
          ),
          _MenuItemSpec(
            icon: Icons.alt_route_rounded,
            color: AppColors.secondary,
            label: context.tr('route_optimization'),
            subtitle: 'Efficiency suggestions per vehicle',
            route: '/reports/route-optimization',
          ),
          _MenuItemSpec(
            icon: Icons.leaderboard_rounded,
            color: AppColors.primary,
            label: context.tr('benchmarking'),
            subtitle: 'Compare and rank vehicles',
            route: '/analytics/benchmarking',
          ),
          _MenuItemSpec(
            icon: Icons.inventory_2_rounded,
            color: AppColors.secondary,
            label: context.tr('cargo_assets'),
            subtitle: 'Track cargo loads and asset assignments',
            route: '/cargo',
          ),
          _MenuItemSpec(
            icon: Icons.history_toggle_off_rounded,
            color: AppColors.accent,
            label: 'Fleet Timeline',
            subtitle: 'Chronological activity feed across all vehicles',
            route: '/fleet/timeline',
          ),
          _MenuItemSpec(
            icon: Icons.social_distance_rounded,
            color: AppColors.primary,
            label: 'Mileage Tracker',
            subtitle: 'Monthly and total km per vehicle',
            route: '/fleet/mileage',
          ),
          _MenuItemSpec(
            icon: Icons.timer_off_rounded,
            color: AppColors.warning,
            label: 'Idle Time Reports',
            subtitle: 'Wasted hours and fuel cost estimates',
            route: '/fleet/idle',
          ),
          _MenuItemSpec(
            icon: Icons.share_location_rounded,
            color: AppColors.secondary,
            label: 'Vehicle Sharing',
            subtitle: 'Temporary access for external drivers',
            route: '/fleet/sharing',
          ),
          _MenuItemSpec(
            icon: Icons.local_gas_station_rounded,
            color: AppColors.error,
            label: 'Fuel Theft Detection',
            subtitle: 'Suspicious fuel drops and theft alerts',
            route: '/fleet/fuel-theft',
          ),
        ],
      ),
      _MenuSectionSpec(
        title: 'People',
        items: [
          _MenuItemSpec(
            icon: Icons.badge_rounded,
            color: AppColors.secondary,
            label: context.tr('drivers'),
            subtitle: 'Manage drivers and licenses',
            route: '/drivers',
          ),
          _MenuItemSpec(
            icon: Icons.nfc_rounded,
            color: AppColors.primary,
            label: context.tr('driver_checkin'),
            subtitle: 'NFC/QR identification and check-in log',
            route: '/drivers/checkin',
          ),
          _MenuItemSpec(
            icon: Icons.emoji_events_rounded,
            color: AppColors.warning,
            label: 'Driver Scorecards',
            subtitle: 'Monthly performance ranking and scores',
            route: '/drivers/scorecards',
          ),
          _MenuItemSpec(
            icon: Icons.build_rounded,
            color: AppColors.accent,
            label: context.tr('maintenance'),
            subtitle: 'Service schedules and history',
            route: '/maintenance',
          ),
        ],
      ),
      _MenuSectionSpec(
        title: context.tr('alerts'),
        items: [
          _MenuItemSpec(
            icon: Icons.notifications_active_rounded,
            color: AppColors.primary,
            label: context.tr('notification_rules'),
            subtitle: 'Event triggers and channels',
            route: '/notifications',
          ),
          _MenuItemSpec(
            icon: Icons.auto_awesome_rounded,
            color: AppColors.accent,
            label: 'Smart Alert Rules',
            subtitle: 'AI-powered rule builder with conditions',
            route: '/alerts/smart',
          ),
          _MenuItemSpec(
            icon: Icons.sms_rounded,
            color: AppColors.warning,
            label: context.tr('sms_alerts'),
            subtitle: 'Text message notifications',
            route: '/settings/sms-alerts',
          ),
        ],
      ),
      _MenuSectionSpec(
        title: 'Analytics',
        items: [
          _MenuItemSpec(
            icon: Icons.analytics_rounded,
            color: AppColors.primary,
            label: 'Executive Summary',
            subtitle: 'High-level KPIs and fleet performance report',
            route: '/fleet/executive',
          ),
        ],
      ),
      _MenuSectionSpec(
        title: 'Account',
        items: [
          _MenuItemSpec(
            icon: Icons.sos_rounded,
            color: AppColors.error,
            label: 'Emergency Contacts',
            subtitle: 'SOS contacts for panic/alert triggers',
            route: '/settings/emergency-contacts',
          ),
          _MenuItemSpec(
            icon: Icons.settings_rounded,
            color: context.textSecondaryColor,
            label: context.tr('settings'),
            subtitle: 'App preferences and about',
            route: '/settings',
          ),
          _MenuItemSpec(
            icon: Icons.logout_rounded,
            color: AppColors.error,
            label: context.tr('sign_out'),
            subtitle: 'End your current session',
            destructive: true,
            onTap: () => _confirmSignOut(context),
          ),
        ],
      ),
    ];

    // Flatten sections into staggered widgets
    final children = <Widget>[];
    children.add(
      _HeaderCard(
        name: displayName,
        email: user?.email ?? '',
        initials: initials,
        role: role,
      ).animate().fadeIn(duration: 350.ms).slideY(begin: -0.05, end: 0),
    );
    children.add(const SizedBox(height: 14));
    children.add(
      BlocBuilder<FleetCubit, FleetState>(
        buildWhen: (a, b) => a.items.length != b.items.length ||
            a.items.map((e) => e.movementStatus).join() !=
                b.items.map((e) => e.movementStatus).join(),
        builder: (context, state) => _FleetQuickStats(items: state.items),
      ).animate(delay: 80.ms).fadeIn(duration: 320.ms).slideY(begin: 0.06, end: 0),
    );
    children.add(const SizedBox(height: 16));

    int step = 0;
    for (final sec in sections) {
      children.add(
        _SectionHeader(title: sec.title).animate(delay: (80 + step * 40).ms).fadeIn(duration: 300.ms),
      );
      step++;
      children.add(const SizedBox(height: 8));
      children.add(
        _MenuGroup(
          children: [
            for (final it in sec.items)
              _MenuTile(
                icon: it.icon,
                color: it.color,
                label: it.label,
                subtitle: it.subtitle,
                destructive: it.destructive,
                onTap: it.onTap ?? () => context.push(it.route!),
              ),
          ],
        )
            .animate(delay: (100 + step * 40).ms)
            .fadeIn(duration: 350.ms)
            .slideX(begin: -0.06, end: 0),
      );
      step++;
      children.add(const SizedBox(height: 18));
    }

    children.add(const SizedBox(height: 8));
    children.add(
      Center(
        child: Text(
          '${AppConfig.appName} • v${AppConfig.appVersion}',
          style: TextStyle(color: context.textMutedColor, fontSize: 12),
        ),
      ),
    );
    children.add(const SizedBox(height: 100));

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(context.tr('more')),
        actions: [
          IconButton(
            tooltip: context.tr('search'),
            icon: const Icon(Icons.search_rounded),
            onPressed: () => context.push('/search'),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          children: children,
        ),
      ),
    );
  }
}

class _MenuSectionSpec {
  final String title;
  final List<_MenuItemSpec> items;
  const _MenuSectionSpec({required this.title, required this.items});
}

class _MenuItemSpec {
  final IconData icon;
  final Color color;
  final String label;
  final String subtitle;
  final String? route;
  final VoidCallback? onTap;
  final bool destructive;
  const _MenuItemSpec({
    required this.icon,
    required this.color,
    required this.label,
    required this.subtitle,
    this.route,
    this.onTap,
    this.destructive = false,
  });
}

// ============================================================================
// Fleet Quick Stats row — shows in More screen below header card
// ============================================================================

class _FleetQuickStats extends StatelessWidget {
  final List items;
  const _FleetQuickStats({required this.items});

  @override
  Widget build(BuildContext context) {
    final total = items.length;
    if (total == 0) return const SizedBox.shrink();

    final moving = items.where((e) => (e as dynamic).movementStatus == 'moving').length;
    final idle = items.where((e) => (e as dynamic).movementStatus == 'idle').length;
    final offline = items.where((e) =>
        (e as dynamic).movementStatus == 'offline' ||
        (e as dynamic).movementStatus == 'stale').length;

    return Row(
      children: [
        _QuickStat(
          label: 'Moving',
          value: moving.toString(),
          color: AppColors.statusMoving,
          icon: Icons.directions_car_rounded,
          total: total,
        ),
        const SizedBox(width: 8),
        _QuickStat(
          label: 'Idle',
          value: idle.toString(),
          color: AppColors.statusIdle,
          icon: Icons.pause_circle_rounded,
          total: total,
        ),
        const SizedBox(width: 8),
        _QuickStat(
          label: 'Offline',
          value: offline.toString(),
          color: AppColors.statusOffline,
          icon: Icons.signal_wifi_off_rounded,
          total: total,
        ),
        const SizedBox(width: 8),
        _QuickStat(
          label: 'Total',
          value: total.toString(),
          color: AppColors.primary,
          icon: Icons.directions_car_filled_rounded,
          total: total,
        ),
      ],
    );
  }
}

class _QuickStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;
  final int total;

  const _QuickStat({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 18,
                fontWeight: FontWeight.w900,
                height: 1,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
            ),
          ],
        ),
      ),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  final String name;
  final String email;
  final String initials;
  final String role;

  const _HeaderCard({
    required this.name,
    required this.email,
    required this.initials,
    required this.role,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.35),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Center(
              child: Text(
                initials,
                style: const TextStyle(
                  color: Colors.black,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.3,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        AppConfig.appName,
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.2,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Text(
                        'v${AppConfig.appVersion}',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  name,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (email.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    email,
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 12,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 4),
                Text(
                  role,
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
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

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(left: 6),
        child: Text(
          title.toUpperCase(),
          style: TextStyle(
            color: context.textMutedColor,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.4,
          ),
        ),
      );
}

class _MenuGroup extends StatelessWidget {
  final List<Widget> children;
  const _MenuGroup({required this.children});
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        children: [
          for (int i = 0; i < children.length; i++) ...[
            children[i],
            if (i < children.length - 1)
              Divider(height: 1, indent: 62, color: context.dividerColor),
          ],
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String subtitle;
  final VoidCallback onTap;
  final bool destructive;

  const _MenuTile({
    required this.icon,
    required this.color,
    required this.label,
    required this.subtitle,
    required this.onTap,
    this.destructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final titleColor = destructive ? AppColors.error : context.textPrimaryColor;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        color: titleColor,
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: context.textMutedColor,
                        fontSize: 12,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: destructive
                    ? AppColors.error.withValues(alpha: 0.6)
                    : context.textMutedColor,
                size: 22,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
