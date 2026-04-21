import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/auth/auth_cubit.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../blocs/fleet/fleet_state.dart';

const _kBreakpoint = 900.0;

// ─── Tab model (mobile bottom nav) ───────────────────────────────────────────
class _Tab {
  final String path;
  final IconData icon;
  final IconData activeIcon;
  final String labelKey;
  const _Tab(this.path, this.icon, this.activeIcon, this.labelKey);
}

// ─── Sidebar nav item model (web) ────────────────────────────────────────────
class _NavItem {
  final IconData icon;
  final String labelKey;
  final String path;
  final Color? accent;
  const _NavItem(this.icon, this.labelKey, this.path, {this.accent});
}

class _NavSection {
  final String? titleKey;
  final List<_NavItem> items;
  const _NavSection(this.titleKey, this.items);
}

// ─────────────────────────────────────────────────────────────────────────────
class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  static const _mobileTabs = <_Tab>[
    _Tab('/dashboard', Icons.grid_view_rounded,         Icons.grid_view_rounded,      'home'),
    _Tab('/map',       Icons.map_outlined,               Icons.map_rounded,            'map'),
    _Tab('/vehicles',  Icons.directions_car_outlined,    Icons.directions_car_rounded, 'fleet'),
    _Tab('/alerts',    Icons.notifications_none_rounded, Icons.notifications_rounded,  'alerts'),
    _Tab('/more',      Icons.menu_rounded,               Icons.menu_rounded,           'more'),
  ];

  static const _webSections = <_NavSection>[
    _NavSection(null, [
      _NavItem(Icons.grid_view_rounded,      'home',    '/dashboard', accent: AppColors.primary),
      _NavItem(Icons.map_rounded,            'map',     '/map',       accent: AppColors.secondary),
    ]),
    _NavSection('fleet', [
      _NavItem(Icons.directions_car_rounded, 'fleet',       '/vehicles',       accent: AppColors.primary),
      _NavItem(Icons.notifications_rounded,  'alerts',      '/alerts',         accent: AppColors.error),
      _NavItem(Icons.timeline_rounded,       'route_history', '/route-history', accent: AppColors.secondary),
    ]),
    _NavSection('manage', [
      _NavItem(Icons.bar_chart_rounded,      'reports',     '/reports',     accent: AppColors.warning),
      _NavItem(Icons.badge_rounded,          'drivers',     '/drivers',     accent: AppColors.secondary),
      _NavItem(Icons.layers_rounded,         'geofences',   '/geofences',   accent: AppColors.accent),
      _NavItem(Icons.build_rounded,          'maintenance', '/maintenance', accent: AppColors.accent),
      _NavItem(Icons.notifications_active_rounded, 'notification_rules', '/notifications', accent: AppColors.primary),
    ]),
    _NavSection('settings', [
      _NavItem(Icons.settings_rounded, 'settings', '/settings', accent: AppColors.primary),
    ]),
  ];

  int _activeMobileIndex(String path) {
    for (var i = 0; i < _mobileTabs.length; i++) {
      if (path.startsWith(_mobileTabs[i].path)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final path = GoRouterState.of(context).uri.path;
    final width = MediaQuery.sizeOf(context).width;
    final isWide = width >= _kBreakpoint;

    return BlocBuilder<FleetCubit, FleetState>(
      buildWhen: (a, b) => a.unreadAlertsCount != b.unreadAlertsCount || a.summary != b.summary,
      builder: (context, fleetState) {
        if (isWide) {
          return _WebLayout(
            sections: _webSections,
            activePath: path,
            fleetState: fleetState,
            child: child,
          );
        }

        final idx = _activeMobileIndex(path);
        return Scaffold(
          backgroundColor: context.bgColor,
          extendBody: true,
          body: child,
          bottomNavigationBar: _FloatingNav(
            tabs: _mobileTabs,
            activeIndex: idx,
            badgeCount: fleetState.unreadAlertsCount,
            onTap: (i) {
              if (i == idx) return;
              if (!kIsWeb) HapticFeedback.selectionClick();
              context.go(_mobileTabs[i].path);
            },
          ),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  WEB LAYOUT — sidebar + content
// ─────────────────────────────────────────────────────────────────────────────
class _WebLayout extends StatelessWidget {
  final List<_NavSection> sections;
  final String activePath;
  final FleetState fleetState;
  final Widget child;

  const _WebLayout({
    required this.sections,
    required this.activePath,
    required this.fleetState,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;
    return Scaffold(
      backgroundColor: context.bgColor,
      body: Row(
        children: [
          _Sidebar(
            sections: sections,
            activePath: activePath,
            fleetState: fleetState,
          ),
          // Thin divider
          Container(width: 1, color: isDark ? AppColors.divider : LightColors.divider),
          // Content
          Expanded(child: child),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────
class _Sidebar extends StatelessWidget {
  final List<_NavSection> sections;
  final String activePath;
  final FleetState fleetState;

  const _Sidebar({
    required this.sections,
    required this.activePath,
    required this.fleetState,
  });

  bool _isActive(String path) {
    if (path == '/dashboard') return activePath == '/dashboard' || activePath == '/';
    return activePath.startsWith(path);
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
    if (parts.isEmpty) return 'A';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;
    final user = context.watch<AuthCubit>().state.user;
    final displayName = user?.fullName.isNotEmpty == true ? user!.fullName : 'Admin';
    final initials = _initials(displayName);
    final sidebarBg = isDark ? const Color(0xFF12131A) : Colors.white;

    return Container(
      width: 260,
      color: sidebarBg,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Logo ────────────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [context.primaryColor, context.primaryLightColor],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(11),
                      boxShadow: [
                        BoxShadow(
                          color: context.primaryColor.withValues(alpha: 0.4),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.location_on_rounded, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'ControTrack',
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          letterSpacing: -0.3,
                        ),
                      ),
                      Text(
                        'Fleet Management',
                        style: TextStyle(
                          color: context.textMutedColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // ── Fleet Status mini-widget ─────────────────────────────────────
            _FleetStatusPill(summary: fleetState.summary),

            const SizedBox(height: 8),

            // ── Nav sections ────────────────────────────────────────────────
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                children: sections.map((section) {
                  return _NavSectionWidget(
                    section: section,
                    activePath: activePath,
                    isActiveFn: _isActive,
                    badgeCount: fleetState.unreadAlertsCount,
                  );
                }).toList(),
              ),
            ),

            // ── User profile ────────────────────────────────────────────────
            _UserProfileTile(
              displayName: displayName,
              initials: initials,
              role: (user?.type ?? 'admin').toUpperCase(),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Fleet status pills ───────────────────────────────────────────────────────
class _FleetStatusPill extends StatelessWidget {
  final HealthSummary summary;
  const _FleetStatusPill({required this.summary});

  @override
  Widget build(BuildContext context) {
    if (summary.total == 0) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: context.primaryColor.withValues(alpha: context.isDarkMode ? 0.12 : 0.07),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: context.primaryColor.withValues(alpha: 0.18),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _StatusDot(count: summary.moving,  color: AppColors.statusMoving,  label: 'Moving'),
            _StatusDot(count: summary.idle,    color: AppColors.warning,        label: 'Idle'),
            _StatusDot(count: summary.stopped, color: AppColors.secondary,      label: 'Stopped'),
            _StatusDot(count: summary.offline + summary.stale, color: AppColors.statusOffline, label: 'Offline'),
          ],
        ),
      ),
    );
  }
}

class _StatusDot extends StatelessWidget {
  final int count;
  final Color color;
  final String label;
  const _StatusDot({required this.count, required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 4),
            Text(
              '$count',
              style: TextStyle(
                color: context.textPrimaryColor,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(color: context.textMutedColor, fontSize: 9, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}

// ─── Nav section widget ───────────────────────────────────────────────────────
class _NavSectionWidget extends StatelessWidget {
  final _NavSection section;
  final String activePath;
  final bool Function(String) isActiveFn;
  final int badgeCount;
  const _NavSectionWidget({
    required this.section,
    required this.activePath,
    required this.isActiveFn,
    required this.badgeCount,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (section.titleKey != null) ...[
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 0, 8, 4),
            child: Text(
              context.tr(section.titleKey!).toUpperCase(),
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.0,
              ),
            ),
          ),
        ] else
          const SizedBox(height: 4),
        ...section.items.map((item) => _SidebarNavItem(
          item: item,
          isActive: isActiveFn(item.path),
          badge: item.path == '/alerts' && badgeCount > 0 ? badgeCount : 0,
        )),
      ],
    );
  }
}

// ─── Single sidebar nav item ──────────────────────────────────────────────────
class _SidebarNavItem extends StatelessWidget {
  final _NavItem item;
  final bool isActive;
  final int badge;
  const _SidebarNavItem({required this.item, required this.isActive, required this.badge});

  @override
  Widget build(BuildContext context) {
    final color = item.accent ?? context.primaryColor;
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          onTap: () => context.go(item.path),
          borderRadius: BorderRadius.circular(10),
          hoverColor: color.withValues(alpha: 0.08),
          splashColor: color.withValues(alpha: 0.12),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: isActive ? color.withValues(alpha: context.isDarkMode ? 0.18 : 0.10) : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              border: isActive
                  ? Border.all(color: color.withValues(alpha: context.isDarkMode ? 0.35 : 0.25))
                  : null,
            ),
            child: Row(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: isActive ? color.withValues(alpha: 0.15) : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    item.icon,
                    size: 18,
                    color: isActive ? color : context.textMutedColor,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    context.tr(item.labelKey),
                    style: TextStyle(
                      color: isActive ? color : context.textSecondaryColor,
                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                      fontSize: 13.5,
                    ),
                  ),
                ),
                if (badge > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.error,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      badge > 99 ? '99+' : '$badge',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
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

// ─── User profile tile at bottom ─────────────────────────────────────────────
class _UserProfileTile extends StatelessWidget {
  final String displayName;
  final String initials;
  final String role;
  const _UserProfileTile({required this.displayName, required this.initials, required this.role});

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;
    return Container(
      margin: const EdgeInsets.fromLTRB(10, 4, 10, 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [context.primaryColor, context.primaryLightColor],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: Text(
              initials,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  role,
                  style: TextStyle(color: context.textMutedColor, fontSize: 10, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
          // Settings shortcut
          IconButton(
            onPressed: () => context.push('/settings'),
            icon: Icon(Icons.settings_outlined, color: context.textMutedColor, size: 18),
            splashRadius: 18,
            tooltip: context.tr('settings'),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
          ),
          // Logout
          IconButton(
            onPressed: () async => context.read<AuthCubit>().signOut(),
            icon: Icon(Icons.logout_rounded, color: AppColors.error.withValues(alpha: 0.7), size: 18),
            splashRadius: 18,
            tooltip: context.tr('sign_out'),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MOBILE — Floating pill bottom nav (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
class _FloatingNav extends StatelessWidget {
  final List<_Tab> tabs;
  final int activeIndex;
  final int badgeCount;
  final ValueChanged<int> onTap;

  const _FloatingNav({
    required this.tabs,
    required this.activeIndex,
    required this.badgeCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark      = context.isDarkMode;
    final isRtl       = Directionality.of(context) == TextDirection.rtl;
    final navBg       = isDark ? AppColors.surface : Colors.white;
    final borderColor = isDark ? AppColors.divider : LightColors.divider;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Container(
          height: 64,
          decoration: BoxDecoration(
            color: navBg,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: borderColor),
            boxShadow: [
              BoxShadow(
                color: context.primaryColor.withValues(alpha: isDark ? 0.20 : 0.14),
                blurRadius: 20,
                offset: const Offset(0, 6),
              ),
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.40 : 0.07),
                blurRadius: 12,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final itemW = constraints.maxWidth / tabs.length;
              final pillOffset = isRtl
                  ? itemW * (tabs.length - 1 - activeIndex) + 10
                  : itemW * activeIndex + 10;
              return Stack(
                alignment: Alignment.center,
                children: [
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 280),
                    curve: Curves.easeInOutCubic,
                    left:   isRtl ? null : pillOffset,
                    right:  isRtl ? pillOffset : null,
                    top: 8, bottom: 8,
                    width: itemW - 20,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [context.primaryColor, context.primaryLightColor],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: context.primaryColor.withValues(alpha: 0.45),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Row(
                    children: List.generate(tabs.length, (i) {
                      final isActive  = i == activeIndex;
                      final showBadge = tabs[i].path == '/alerts' && badgeCount > 0;
                      return SizedBox(
                        width: itemW,
                        child: _MobileNavItem(
                          tab: tabs[i],
                          isActive: isActive,
                          badgeCount: showBadge ? badgeCount : 0,
                          onTap: () => onTap(i),
                        ),
                      );
                    }),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _MobileNavItem extends StatelessWidget {
  final _Tab tab;
  final bool isActive;
  final int badgeCount;
  final VoidCallback onTap;
  const _MobileNavItem({required this.tab, required this.isActive, required this.badgeCount, required this.onTap});

  @override
  Widget build(BuildContext context) {
    const activeColor   = Colors.white;
    final inactiveColor = context.textMutedColor;
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedScale(
        scale: isActive ? 1.06 : 1.0,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutBack,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  transitionBuilder: (child, anim) => ScaleTransition(scale: anim, child: child),
                  child: Icon(
                    key: ValueKey(isActive),
                    isActive ? tab.activeIcon : tab.icon,
                    size: 22,
                    color: isActive ? activeColor : inactiveColor,
                  ),
                ),
                if (badgeCount > 0)
                  Positioned(
                    top: -5, right: -8,
                    child: Container(
                      constraints: const BoxConstraints(minWidth: 16),
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: context.errorColor,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: context.isDarkMode ? AppColors.surface : Colors.white,
                          width: 1.5,
                        ),
                      ),
                      child: Text(
                        badgeCount > 99 ? '99+' : '$badgeCount',
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800, height: 1.2),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 3),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 200),
              style: TextStyle(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                color: isActive ? activeColor : inactiveColor,
                letterSpacing: 0.1,
              ),
              child: Text(context.tr(tab.labelKey), maxLines: 1, overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
      ),
    );
  }
}
