import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../blocs/fleet/fleet_state.dart';

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  static const _tabs = <_TabDef>[
    _TabDef('/dashboard', Icons.dashboard_rounded, 'home'),
    _TabDef('/map', Icons.map_rounded, 'map'),
    _TabDef('/vehicles', Icons.directions_car_rounded, 'fleet'),
    _TabDef('/alerts', Icons.notifications_rounded, 'alerts'),
    _TabDef('/more', Icons.menu_rounded, 'more'),
  ];

  int _currentIndex(BuildContext context) {
    final loc = GoRouterState.of(context).uri.path;
    for (int i = 0; i < _tabs.length; i++) {
      if (loc.startsWith(_tabs[i].path)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final idx = _currentIndex(context);
    return BlocBuilder<FleetCubit, FleetState>(
      buildWhen: (prev, curr) =>
          prev.unreadAlertsCount != curr.unreadAlertsCount,
      builder: (context, fleetState) {
        return Scaffold(
          body: child,
          bottomNavigationBar: _AnimatedBottomNav(
            tabs: _tabs,
            currentIndex: idx,
            alertsBadgeCount: fleetState.unreadAlertsCount,
            onTap: (i) {
              if (i == idx) return;
              HapticFeedback.selectionClick();
              context.go(_tabs[i].path);
            },
          ),
        );
      },
    );
  }
}

class _TabDef {
  final String path;
  final IconData icon;

  /// Translation key passed to [BuildContext.tr].
  final String labelKey;
  const _TabDef(this.path, this.icon, this.labelKey);
}

class _AnimatedBottomNav extends StatelessWidget {
  final List<_TabDef> tabs;
  final int currentIndex;
  final int alertsBadgeCount;
  final ValueChanged<int> onTap;

  const _AnimatedBottomNav({
    required this.tabs,
    required this.currentIndex,
    required this.alertsBadgeCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const horizontalPadding = 12.0;
    const verticalPadding = 10.0;
    const pillVerticalInset = 6.0;

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          top: BorderSide(color: Theme.of(context).dividerColor),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.18),
            blurRadius: 14,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final innerWidth = constraints.maxWidth - (horizontalPadding * 2);
            final tabWidth = innerWidth / tabs.length;
            return Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: horizontalPadding,
                vertical: verticalPadding,
              ),
              child: SizedBox(
                height: 60,
                child: Stack(
                  children: [
                    // Sliding pill indicator.
                    AnimatedPositioned(
                      duration: const Duration(milliseconds: 280),
                      curve: Curves.easeOutCubic,
                      left: tabWidth * currentIndex + 6,
                      top: pillVerticalInset,
                      bottom: pillVerticalInset,
                      width: tabWidth - 12,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppColors.primary.withValues(alpha: 0.22),
                              AppColors.secondary.withValues(alpha: 0.18),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: AppColors.primary.withValues(alpha: 0.35),
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color:
                                  AppColors.primary.withValues(alpha: 0.25),
                              blurRadius: 16,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Tab row (on top of pill).
                    Row(
                      children: [
                        for (int i = 0; i < tabs.length; i++)
                          SizedBox(
                            width: tabWidth,
                            child: _NavItem(
                              tab: tabs[i],
                              selected: i == currentIndex,
                              badgeCount: tabs[i].path == '/alerts'
                                  ? alertsBadgeCount
                                  : 0,
                              onTap: () => onTap(i),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final _TabDef tab;
  final bool selected;
  final int badgeCount;
  final VoidCallback onTap;

  const _NavItem({
    required this.tab,
    required this.selected,
    required this.badgeCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final activeColor = AppColors.primary;
    final inactiveColor = context.textMutedColor;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        splashColor: AppColors.primary.withValues(alpha: 0.18),
        highlightColor: AppColors.primary.withValues(alpha: 0.08),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Icon with spring scale on selection + optional badge.
              TweenAnimationBuilder<double>(
                tween: Tween(
                  begin: selected ? 1.0 : 1.15,
                  end: selected ? 1.15 : 1.0,
                ),
                duration: const Duration(milliseconds: 280),
                curve: Curves.elasticOut,
                builder: (context, scale, child) {
                  return Transform.scale(scale: scale, child: child);
                },
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 180),
                      child: Icon(
                        tab.icon,
                        key: ValueKey(selected),
                        color: selected ? activeColor : inactiveColor,
                        size: 24,
                      ),
                    ),
                    if (badgeCount > 0)
                      Positioned(
                        top: -4,
                        right: -6,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppColors.error,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          constraints: const BoxConstraints(minWidth: 16),
                          child: Text(
                            badgeCount > 99 ? '99+' : badgeCount.toString(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              height: 1.2,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 2),
              // Label fades (and softly slides) with selection.
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOut,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight:
                      selected ? FontWeight.w700 : FontWeight.w600,
                  color: selected ? activeColor : inactiveColor,
                  letterSpacing: 0.1,
                ),
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 220),
                  opacity: selected ? 1.0 : 0.75,
                  child: Text(
                    context.tr(tab.labelKey),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
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
