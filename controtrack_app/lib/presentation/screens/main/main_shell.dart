import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../blocs/fleet/fleet_state.dart';

// ─── breakpoint: wide layout (rail) vs. narrow layout (bottom nav) ───────────
const _kRailBreakpoint = 800.0;

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  static const _tabs = <_Tab>[
    _Tab('/dashboard', Icons.grid_view_rounded,         Icons.grid_view_rounded,         'home'),
    _Tab('/map',       Icons.map_outlined,               Icons.map_rounded,               'map'),
    _Tab('/vehicles',  Icons.directions_car_outlined,    Icons.directions_car_rounded,    'fleet'),
    _Tab('/alerts',    Icons.notifications_none_rounded, Icons.notifications_rounded,     'alerts'),
    _Tab('/more',      Icons.menu_rounded,               Icons.menu_rounded,              'more'),
  ];

  int _activeIndex(BuildContext context) {
    final path = GoRouterState.of(context).uri.path;
    for (var i = 0; i < _tabs.length; i++) {
      if (path.startsWith(_tabs[i].path)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final idx = _activeIndex(context);
    final width = MediaQuery.sizeOf(context).width;
    final isWide = width >= _kRailBreakpoint;

    return BlocBuilder<FleetCubit, FleetState>(
      buildWhen: (a, b) => a.unreadAlertsCount != b.unreadAlertsCount,
      builder: (context, state) {
        if (isWide) {
          return _WideShell(
            tabs: _tabs,
            activeIndex: idx,
            badgeCount: state.unreadAlertsCount,
            onTap: (i) => context.go(_tabs[i].path),
            child: child,
          );
        }
        return Scaffold(
          backgroundColor: context.bgColor,
          extendBody: true,
          body: child,
          bottomNavigationBar: _FloatingNav(
            tabs: _tabs,
            activeIndex: idx,
            badgeCount: state.unreadAlertsCount,
            onTap: (i) {
              if (i == idx) return;
              if (!kIsWeb) HapticFeedback.selectionClick();
              context.go(_tabs[i].path);
            },
          ),
        );
      },
    );
  }
}

class _Tab {
  final String path;
  final IconData icon;
  final IconData activeIcon;
  final String labelKey;
  const _Tab(this.path, this.icon, this.activeIcon, this.labelKey);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Wide layout — styled side navigation rail (desktop / large tablet / web)
// ─────────────────────────────────────────────────────────────────────────────
class _WideShell extends StatelessWidget {
  final List<_Tab> tabs;
  final int activeIndex;
  final int badgeCount;
  final ValueChanged<int> onTap;
  final Widget child;

  const _WideShell({
    required this.tabs,
    required this.activeIndex,
    required this.badgeCount,
    required this.onTap,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;
    final railBg = isDark ? AppColors.surface : Colors.white;
    final borderColor = isDark ? AppColors.divider : LightColors.divider;

    return Scaffold(
      backgroundColor: context.bgColor,
      body: Row(
        children: [
          // ── Side rail ──────────────────────────────────────────────────────
          Container(
            width: 220,
            decoration: BoxDecoration(
              color: railBg,
              border: Border(
                right: BorderSide(color: borderColor),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.30 : 0.06),
                  blurRadius: 12,
                  offset: const Offset(2, 0),
                ),
              ],
            ),
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Brand header
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                    child: Row(
                      children: [
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
                          child: const Icon(Icons.location_on_rounded, color: Colors.white, size: 20),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'ControTrack',
                          style: TextStyle(
                            color: context.textPrimaryColor,
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            letterSpacing: -0.3,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Navigation items
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      itemCount: tabs.length,
                      itemBuilder: (context, i) => _RailItem(
                        tab: tabs[i],
                        isActive: i == activeIndex,
                        badgeCount: tabs[i].path == '/alerts' && badgeCount > 0 ? badgeCount : 0,
                        onTap: () => onTap(i),
                      ),
                    ),
                  ),

                  // Version footer
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                    child: Text(
                      'v1.0.0',
                      style: TextStyle(
                        color: context.textMutedColor,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Page content ──────────────────────────────────────────────────
          Expanded(child: child),
        ],
      ),
    );
  }
}

// ── Single rail item ──────────────────────────────────────────────────────────
class _RailItem extends StatelessWidget {
  final _Tab tab;
  final bool isActive;
  final int badgeCount;
  final VoidCallback onTap;

  const _RailItem({
    required this.tab,
    required this.isActive,
    required this.badgeCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeInOut,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            decoration: BoxDecoration(
              gradient: isActive
                  ? LinearGradient(
                      colors: [
                        context.primaryColor.withValues(alpha: 0.18),
                        context.primaryLightColor.withValues(alpha: 0.10),
                      ],
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                    )
                  : null,
              borderRadius: BorderRadius.circular(12),
              border: isActive
                  ? Border.all(color: context.primaryColor.withValues(alpha: 0.35))
                  : null,
            ),
            child: Row(
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Icon(
                      isActive ? tab.activeIcon : tab.icon,
                      size: 20,
                      color: isActive ? context.primaryColor : context.textMutedColor,
                    ),
                    if (badgeCount > 0)
                      Positioned(
                        top: -5,
                        right: -8,
                        child: Container(
                          constraints: const BoxConstraints(minWidth: 16),
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            color: context.errorColor,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            badgeCount > 99 ? '99+' : '$badgeCount',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              height: 1.2,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 12),
                Text(
                  context.tr(tab.labelKey),
                  style: TextStyle(
                    color: isActive ? context.primaryColor : context.textSecondaryColor,
                    fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                    fontSize: 14,
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

// ─────────────────────────────────────────────────────────────────────────────
//  Floating pill nav bar — RTL-aware (mobile / narrow screens)
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
    final isDark     = context.isDarkMode;
    final isRtl      = Directionality.of(context) == TextDirection.rtl;
    final navBg      = isDark ? AppColors.surface : Colors.white;
    final borderColor = isDark
        ? AppColors.divider
        : LightColors.divider;

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
                    top: 8,
                    bottom: 8,
                    width: itemW - 20,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            context.primaryColor,
                            context.primaryLightColor,
                          ],
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
                        child: _NavItem(
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

// ─────────────────────────────────────────────────────────────────────────────
//  Single bottom nav item
// ─────────────────────────────────────────────────────────────────────────────
class _NavItem extends StatelessWidget {
  final _Tab tab;
  final bool isActive;
  final int badgeCount;
  final VoidCallback onTap;

  const _NavItem({
    required this.tab,
    required this.isActive,
    required this.badgeCount,
    required this.onTap,
  });

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
                  transitionBuilder: (child, anim) =>
                      ScaleTransition(scale: anim, child: child),
                  child: Icon(
                    key: ValueKey(isActive),
                    isActive ? tab.activeIcon : tab.icon,
                    size: 22,
                    color: isActive ? activeColor : inactiveColor,
                  ),
                ),
                if (badgeCount > 0)
                  Positioned(
                    top: -5,
                    right: -8,
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
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          height: 1.2,
                        ),
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
              child: Text(
                context.tr(tab.labelKey),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
