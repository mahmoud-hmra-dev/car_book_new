import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/theme/app_colors.dart';
import '../../../data/models/event_model.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../data/models/maintenance_model.dart';
import '../../../data/repositories/fleet_repository.dart';
import '../../../data/repositories/tracking_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/auth/auth_cubit.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../blocs/fleet/fleet_state.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';

/// Premium, modern dashboard for ControTrack.
///
/// Sections (top → bottom):
///   1. Gradient greeting header with time-aware title + date + avatar
///   2. Horizontal scroll of 5 status stat cards (Total / Moving / Idle /
///      Stopped / Offline) — each tap filters the fleet cubit.
///   3. Fleet Health card with an animated progress bar (% online).
///   4. Quick Actions 2×2 grid (Map / Reports / Alerts / Drivers).
///   5. Recent Activity list (top 5 vehicles by most recent update).
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    final cubit = context.read<FleetCubit>();
    if (cubit.state.status == FleetStatus.initial) cubit.load();
    cubit.startAutoRefresh();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthCubit>().state.user;
    return Scaffold(
      backgroundColor: context.bgColor,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () => context.read<FleetCubit>().load(refreshing: true),
          child: BlocBuilder<FleetCubit, FleetState>(
            builder: (context, state) {
              if (state.status == FleetStatus.loading && state.items.isEmpty) {
                return const ShimmerList();
              }
              if (state.status == FleetStatus.error && state.items.isEmpty) {
                return AppError(
                  message: state.errorMessage ?? context.tr('failed_to_load'),
                  onRetry: () => context.read<FleetCubit>().load(),
                );
              }

              final summary = state.summary;
              // Online = moving + idle (vehicle is reporting + has ignition/GPS).
              // Treat stopped as online too (still communicating); offline/stale
              // are the non-reporting categories.
              final online = summary.moving + summary.idle + summary.stopped;
              final onlinePct = summary.total == 0
                  ? 0.0
                  : (online / summary.total).clamp(0.0, 1.0);

              // Most recently updated vehicles for "Recent Activity".
              final recent = [...state.items]..sort((a, b) {
                  final da = a.lastPositionAt;
                  final db = b.lastPositionAt;
                  if (da == null && db == null) return 0;
                  if (da == null) return 1;
                  if (db == null) return -1;
                  return db.compareTo(da);
                });
              final recentTop = recent.take(5).toList();

              return CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // ===== 1. Gradient greeting header =====
                  SliverToBoxAdapter(
                    child: _GreetingHeader(
                      userName: user?.fullName ?? '',
                      onSearch: () => context.push('/search'),
                      onNotifications: () => context.push('/alerts'),
                      onRefresh: () =>
                          context.read<FleetCubit>().load(refreshing: true),
                    ),
                  ),

                  // ===== 1b. Crash Detection Alert Banner =====
                  const SliverToBoxAdapter(
                    child: _CrashDetectionBanner(),
                  ),

                  // ===== 2. Horizontal stat cards =====
                  SliverToBoxAdapter(
                    child: _StatCardsRow(
                      summary: summary,
                      activeFilter: state.statusFilter,
                      onFilter: (f) =>
                          context.read<FleetCubit>().setStatusFilter(f),
                    ),
                  ),

                  // ===== 3. Fleet Health progress =====
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                    sliver: SliverToBoxAdapter(
                      child: _FleetHealthCard(
                        percent: onlinePct,
                        online: online,
                        total: summary.total,
                        lastUpdated: state.lastUpdated,
                      )
                          .animate()
                          .fadeIn(delay: 150.ms, duration: 500.ms)
                          .slideY(
                            begin: 0.1,
                            end: 0,
                            delay: 150.ms,
                            duration: 420.ms,
                            curve: Curves.easeOutCubic,
                          ),
                    ),
                  ),

                  // ===== 3b. Today's Overview quick stats =====
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                    sliver: SliverToBoxAdapter(
                      child: _TodayStatsSection(
                        summary: summary,
                        items: state.items,
                      )
                          .animate()
                          .fadeIn(delay: 200.ms, duration: 500.ms)
                          .slideY(
                            begin: 0.1,
                            end: 0,
                            delay: 200.ms,
                            duration: 420.ms,
                            curve: Curves.easeOutCubic,
                          ),
                    ),
                  ),

                  // ===== 4. Quick Actions =====
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                    sliver: SliverToBoxAdapter(
                      child: Text(
                        context.tr('quick_actions'),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    sliver: SliverGrid(
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 2.8,
                      ),
                      delegate: SliverChildListDelegate([
                        _QuickActionTile(
                          index: 0,
                          label: context.tr('map'),
                          icon: Icons.map_rounded,
                          color: AppColors.secondary,
                          onTap: () => context.go('/map'),
                        ),
                        _QuickActionTile(
                          index: 1,
                          label: context.tr('reports'),
                          icon: Icons.bar_chart_rounded,
                          color: AppColors.warning,
                          onTap: () => context.push('/reports'),
                        ),
                        _QuickActionTile(
                          index: 2,
                          label: context.tr('alerts'),
                          icon: Icons.notifications_active_rounded,
                          color: AppColors.error,
                          onTap: () => context.push('/alerts'),
                        ),
                        _QuickActionTile(
                          index: 3,
                          label: context.tr('maintenance'),
                          icon: Icons.build_rounded,
                          color: AppColors.accent,
                          onTap: () => context.push('/maintenance'),
                        ),
                      ]),
                    ),
                  ),

                  // ===== Maintenance Reminder banner =====
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                    sliver: SliverToBoxAdapter(
                      child: _MaintenanceBanner(
                        onTap: () => context.push('/maintenance'),
                      ).animate().fadeIn(delay: 350.ms, duration: 450.ms),
                    ),
                  ),

                  // ===== 5. Recent Activity =====
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 28, 20, 12),
                    sliver: SliverToBoxAdapter(
                      child: Row(
                        children: [
                          Text(
                            context.tr('recent_activity'),
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const Spacer(),
                          TextButton(
                            onPressed: () => context.go('/vehicles'),
                            child: Text(context.tr('view_all')),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 96),
                    sliver: recentTop.isEmpty
                        ? SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 24),
                              child: EmptyState(
                                title: context.tr('no_recent_activity'),
                                icon: Icons.history_toggle_off_rounded,
                              ),
                            ),
                          )
                        : SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (_, i) {
                                final item = recentTop[i];
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: _RecentActivityTile(
                                    item: item,
                                    onTap: () => context
                                        .push('/vehicles/${item.carId}'),
                                  )
                                      .animate(delay: (i * 70).ms)
                                      .fadeIn(duration: 400.ms)
                                      .slideX(
                                        begin: -0.06,
                                        end: 0,
                                        curve: Curves.easeOutCubic,
                                      ),
                                );
                              },
                              childCount: recentTop.length,
                            ),
                          ),
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

// ============================================================================
// 1b. Crash Detection Alert Banner
// ============================================================================

class _CrashDetectionBanner extends StatefulWidget {
  const _CrashDetectionBanner();

  @override
  State<_CrashDetectionBanner> createState() => _CrashDetectionBannerState();
}

class _CrashDetectionBannerState extends State<_CrashDetectionBanner> {
  static const _kDismissedKey = 'crash_banner_dismissed_at';
  static const _kCrashTypes = {
    'deviceOverspeed', 'geofenceEnter', 'geofenceExit',
    'alarm', 'sos', 'panic', 'crash', 'hardBraking',
    'hardAcceleration', 'accident',
  };

  EventModel? _event;
  bool _dismissed = false;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _loadEvent();
  }

  Future<void> _loadEvent() async {
    // Capture repo before any await to avoid BuildContext-across-async-gap lint.
    final repo = context.read<FleetRepository>();
    final prefs = await SharedPreferences.getInstance();
    final dismissedAt = prefs.getInt(_kDismissedKey);
    if (dismissedAt != null) {
      final elapsed = DateTime.now()
          .difference(DateTime.fromMillisecondsSinceEpoch(dismissedAt));
      if (elapsed.inHours < 1) {
        if (mounted) setState(() { _dismissed = true; _loaded = true; });
        return;
      }
    }
    try {
      final events = await repo.getEvents(
        from: DateTime.now().subtract(const Duration(hours: 2)),
        to: DateTime.now(),
        limit: 20,
      );
      final critical = events.where((e) {
        final t = e.type.toLowerCase();
        return _kCrashTypes.any((k) => t.contains(k));
      }).toList();
      if (mounted) {
        setState(() {
          _event = critical.isNotEmpty ? critical.first : null;
          _loaded = true;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loaded = true);
    }
  }

  Future<void> _dismiss() async {
    setState(() => _dismissed = true);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kDismissedKey, DateTime.now().millisecondsSinceEpoch);
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded || _dismissed || _event == null) return const SizedBox.shrink();

    final vehicleName = _event!.carName ?? _event!.carId ?? '—';
    final eventTime = _event!.eventTime ?? DateTime.now();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: GestureDetector(
        onTap: () => context.push('/alerts'),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                AppColors.error.withValues(alpha: 0.22),
                AppColors.error.withValues(alpha: 0.08),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.error.withValues(alpha: 0.55)),
            boxShadow: [
              BoxShadow(
                color: AppColors.error.withValues(alpha: 0.25),
                blurRadius: 18,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              // Pulsing crash icon
              Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                  )
                      .animate(onPlay: (c) => c.repeat(reverse: true))
                      .scaleXY(
                        begin: 0.85,
                        end: 1.15,
                        duration: 900.ms,
                        curve: Curves.easeInOut,
                      )
                      .fade(begin: 0.4, end: 0.9, duration: 900.ms),
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.25),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.car_crash_rounded,
                      color: AppColors.error,
                      size: 22,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.error.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                                color: AppColors.error.withValues(alpha: 0.5)),
                          ),
                          child: const Text(
                            'ALERT',
                            style: TextStyle(
                              color: AppColors.error,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          context.tr('crash_detection'),
                          style: const TextStyle(
                            color: AppColors.error,
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$vehicleName · ${timeago.format(eventTime, locale: context.isRtl ? 'ar' : 'en_short')}',
                      style: TextStyle(
                        color: context.textSecondaryColor,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      context.tr('crash_detection_subtitle'),
                      style: TextStyle(
                        color: context.textMutedColor,
                        fontSize: 11,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  GestureDetector(
                    onTap: _dismiss,
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.close_rounded,
                          color: AppColors.error, size: 16),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Icon(Icons.chevron_right_rounded,
                      color: AppColors.error.withValues(alpha: 0.7), size: 20),
                ],
              ),
            ],
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(delay: 100.ms, duration: 450.ms)
        .slideY(begin: -0.1, end: 0, delay: 100.ms, duration: 380.ms, curve: Curves.easeOutCubic);
  }
}

// ============================================================================
// 1. Gradient greeting header
// ============================================================================

class _GreetingHeader extends StatelessWidget {
  final String userName;
  final VoidCallback onNotifications;
  final VoidCallback onRefresh;
  final VoidCallback? onSearch;

  const _GreetingHeader({
    required this.userName,
    required this.onNotifications,
    required this.onRefresh,
    this.onSearch,
  });

  String _greetingKey() {
    final h = DateTime.now().hour;
    if (h < 12) return 'good_morning';
    if (h < 18) return 'good_afternoon';
    return 'good_evening';
  }

  String _formattedDate(BuildContext context) {
    final now = DateTime.now();
    // Simple, locale-light "EEE, d MMM yyyy" style formatter.
    const monthsEn = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const daysEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monthsAr = [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ];
    const daysAr = [
      'الإثنين',
      'الثلاثاء',
      'الأربعاء',
      'الخميس',
      'الجمعة',
      'السبت',
      'الأحد',
    ];
    final isRtl = context.isRtl;
    final d = daysEn[now.weekday - 1];
    final m = monthsEn[now.month - 1];
    final dAr = daysAr[now.weekday - 1];
    final mAr = monthsAr[now.month - 1];
    return isRtl
        ? '$dAr، ${now.day} $mAr ${now.year}'
        : '$d, ${now.day} $m ${now.year}';
  }

  @override
  Widget build(BuildContext context) {
    final initial = userName.isNotEmpty ? userName[0].toUpperCase() : 'A';
    final displayName =
        userName.isNotEmpty ? userName : context.tr('fleet_manager');

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      padding: const EdgeInsets.fromLTRB(20, 20, 16, 22),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: context.isDarkMode
              ? [const Color(0xFF003B2E), const Color(0xFF0E1B3A)]
              : [
                  LightColors.primary.withValues(alpha: 0.10),
                  LightColors.secondary.withValues(alpha: 0.10),
                ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.18),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Avatar
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.4),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    initial,
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              )
                  .animate()
                  .fadeIn(duration: 400.ms)
                  .scale(begin: const Offset(0.7, 0.7), curve: Curves.easeOutBack),
              const SizedBox(width: 14),
              // Greeting + name
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${context.tr(_greetingKey())},',
                      style: TextStyle(
                        color: context.textSecondaryColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 0.3,
                      ),
                    )
                        .animate()
                        .fadeIn(delay: 80.ms, duration: 420.ms)
                        .slideX(begin: -0.08, end: 0),
                    const SizedBox(height: 2),
                    Text(
                      displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        height: 1.1,
                        letterSpacing: -0.3,
                      ),
                    )
                        .animate()
                        .fadeIn(delay: 140.ms, duration: 420.ms)
                        .slideX(begin: -0.08, end: 0),
                  ],
                ),
              ),
              // Action buttons (frosted dark circles)
              _HeaderIconButton(
                icon: Icons.search_rounded,
                onTap: onSearch ?? () {},
              )
                  .animate()
                  .fadeIn(delay: 180.ms, duration: 400.ms)
                  .scale(begin: const Offset(0.7, 0.7)),
              const SizedBox(width: 8),
              _HeaderIconButton(
                icon: Icons.notifications_none_rounded,
                onTap: onNotifications,
              )
                  .animate()
                  .fadeIn(delay: 220.ms, duration: 400.ms)
                  .scale(begin: const Offset(0.7, 0.7)),
              const SizedBox(width: 8),
              _HeaderIconButton(
                icon: Icons.refresh_rounded,
                iconColor: AppColors.primary,
                onTap: onRefresh,
              )
                  .animate()
                  .fadeIn(delay: 260.ms, duration: 400.ms)
                  .scale(begin: const Offset(0.7, 0.7)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(
                Icons.calendar_today_rounded,
                size: 13,
                color: Colors.white.withValues(alpha: 0.7),
              ),
              const SizedBox(width: 6),
              Text(
                _formattedDate(context),
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.78),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              const _LiveBadge(),
            ],
          )
              .animate()
              .fadeIn(delay: 300.ms, duration: 400.ms)
              .slideY(begin: 0.15, end: 0),
        ],
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color? iconColor;
  const _HeaderIconButton({
    required this.icon,
    required this.onTap,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
          ),
          child: Icon(
            icon,
            size: 20,
            color: iconColor ?? Colors.white,
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// Live badge used by the header
// ============================================================================

class _LiveBadge extends StatelessWidget {
  const _LiveBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.statusMoving.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.statusMoving.withValues(alpha: 0.45),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: const BoxDecoration(
              color: AppColors.statusMoving,
              shape: BoxShape.circle,
            ),
          )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scaleXY(begin: 0.6, end: 1.0, duration: 800.ms),
          const SizedBox(width: 5),
          const Text(
            'LIVE',
            style: TextStyle(
              color: AppColors.statusMoving,
              fontSize: 9,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// 2. Horizontal stat cards row
// ============================================================================

class _StatCardsRow extends StatelessWidget {
  final HealthSummary summary;
  final String? activeFilter;
  final ValueChanged<String?> onFilter;

  const _StatCardsRow({
    required this.summary,
    required this.activeFilter,
    required this.onFilter,
  });

  @override
  Widget build(BuildContext context) {
    final cards = <Widget>[
      _StatChipCard(
        index: 0,
        label: context.tr('total'),
        count: summary.total,
        icon: Icons.directions_car_rounded,
        color: AppColors.secondary,
        selected: activeFilter == null,
        onTap: () => onFilter(null),
      ),
      _StatChipCard(
        index: 1,
        label: context.tr('moving'),
        count: summary.moving,
        icon: Icons.navigation_rounded,
        color: AppColors.statusMoving,
        selected: activeFilter == 'moving',
        onTap: () => onFilter('moving'),
      ),
      _StatChipCard(
        index: 2,
        label: context.tr('idle'),
        count: summary.idle,
        icon: Icons.pause_circle_outline_rounded,
        color: AppColors.secondary,
        selected: activeFilter == 'idle',
        onTap: () => onFilter('idle'),
      ),
      _StatChipCard(
        index: 3,
        label: context.tr('stopped'),
        count: summary.stopped,
        icon: Icons.stop_circle_outlined,
        color: AppColors.warning,
        selected: activeFilter == 'stopped',
        onTap: () => onFilter('stopped'),
      ),
      _StatChipCard(
        index: 4,
        label: context.tr('offline'),
        count: summary.offline,
        icon: Icons.cloud_off_rounded,
        color: AppColors.statusOffline,
        selected: activeFilter == 'offline',
        onTap: () => onFilter('offline'),
      ),
    ];

    return SizedBox(
      height: 120,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: cards.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (_, i) => cards[i],
      ),
    );
  }
}

class _StatChipCard extends StatelessWidget {
  final int index;
  final String label;
  final int count;
  final IconData icon;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const _StatChipCard({
    required this.index,
    required this.label,
    required this.count,
    required this.icon,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final card = Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          width: 132,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: selected
                ? LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      color.withValues(alpha: 0.28),
                      color.withValues(alpha: 0.08),
                    ],
                  )
                : context.cardGradientColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected ? color : context.dividerColor,
              width: selected ? 1.5 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: selected
                    ? color.withValues(alpha: 0.30)
                    : Colors.black.withValues(
                        alpha: context.isDarkMode ? 0.25 : 0.05),
                blurRadius: selected ? 18 : 8,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, color: color, size: 18),
                  ),
                  const Spacer(),
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: color.withValues(alpha: 0.7),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: count.toDouble()),
                duration: const Duration(milliseconds: 700),
                curve: Curves.easeOutCubic,
                builder: (_, v, __) => Text(
                  '${v.toInt()}',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: context.textPrimaryColor,
                    letterSpacing: -0.5,
                    height: 1,
                  ),
                ),
              ),
              const SizedBox(height: 3),
              Text(
                label,
                style: TextStyle(
                  color: context.textSecondaryColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.2,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );

    return card
        .animate()
        .fadeIn(delay: (index * 70).ms, duration: 420.ms)
        .slideX(
          begin: 0.2,
          end: 0,
          delay: (index * 70).ms,
          duration: 420.ms,
          curve: Curves.easeOutCubic,
        );
  }
}

// ============================================================================
// 3. Fleet Health card with animated progress bar
// ============================================================================

class _FleetHealthCard extends StatelessWidget {
  final double percent; // 0..1
  final int online;
  final int total;
  final DateTime? lastUpdated;

  const _FleetHealthCard({
    required this.percent,
    required this.online,
    required this.total,
    required this.lastUpdated,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: context.dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(
                alpha: context.isDarkMode ? 0.25 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.health_and_safety_rounded,
                  color: AppColors.primary,
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                context.tr('fleet_health'),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              if (lastUpdated != null)
                Text(
                  TimeOfDay.fromDateTime(lastUpdated!).format(context),
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: percent * 100),
                duration: const Duration(milliseconds: 900),
                curve: Curves.easeOutCubic,
                builder: (_, v, __) => Text(
                  '${v.toInt()}%',
                  style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                    color: context.textPrimaryColor,
                    letterSpacing: -1,
                    height: 1,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  context.tr('fleet_online'),
                  style: TextStyle(
                    color: context.textSecondaryColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.statusMoving.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: AppColors.statusMoving.withValues(alpha: 0.4),
                  ),
                ),
                child: Text(
                  '$online / $total',
                  style: const TextStyle(
                    color: AppColors.statusMoving,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Progress bar — animated fill
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: percent),
            duration: const Duration(milliseconds: 900),
            curve: Curves.easeOutCubic,
            builder: (_, v, __) {
              return Container(
                height: 10,
                decoration: BoxDecoration(
                  color: context.dividerColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: FractionallySizedBox(
                  alignment: AlignmentDirectional.centerStart,
                  widthFactor: v,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [
                          AppColors.statusMoving,
                          AppColors.secondary,
                        ],
                      ),
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color:
                              AppColors.statusMoving.withValues(alpha: 0.35),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// 4. Quick Action tile (2x2 grid)
// ============================================================================

class _QuickActionTile extends StatefulWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final int index;

  const _QuickActionTile({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
    required this.index,
  });

  @override
  State<_QuickActionTile> createState() => _QuickActionTileState();
}

class _QuickActionTileState extends State<_QuickActionTile> {
  bool _pressed = false;
  void _press(bool v) {
    if (_pressed != v) setState(() => _pressed = v);
  }

  @override
  Widget build(BuildContext context) {
    final tile = GestureDetector(
      onTapDown: (_) => _press(true),
      onTapUp: (_) => _press(false),
      onTapCancel: () => _press(false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _pressed ? 0.96 : 1.0,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: context.dividerColor),
            boxShadow: _pressed
                ? [
                    BoxShadow(
                      color: widget.color.withValues(alpha: 0.3),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withValues(
                          alpha: context.isDarkMode ? 0.2 : 0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: widget.color.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(widget.icon, color: widget.color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  widget.label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
              ),
              Icon(
                Icons.arrow_forward_rounded,
                color: context.textMutedColor,
                size: 16,
              ),
            ],
          ),
        ),
      ),
    );

    final delay = (200 + widget.index * 60).ms;
    return tile
        .animate()
        .fadeIn(delay: delay, duration: 420.ms)
        .slideY(begin: 0.15, end: 0, delay: delay, curve: Curves.easeOutCubic);
  }
}

// ============================================================================
// Maintenance reminder banner
// ============================================================================

class _MaintenanceBanner extends StatefulWidget {
  final VoidCallback onTap;
  const _MaintenanceBanner({required this.onTap});

  @override
  State<_MaintenanceBanner> createState() => _MaintenanceBannerState();
}

class _MaintenanceBannerState extends State<_MaintenanceBanner> {
  List<MaintenanceModel> _dueItems = [];
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final repo = context.read<TrackingRepository>();
      final all = await repo.getMaintenance();
      final now = DateTime.now();
      final soon = now.add(const Duration(days: 7));
      final due = all.where((m) {
        final end = m.endDate;
        return end != null && end.isBefore(soon);
      }).toList();
      if (mounted) setState(() { _dueItems = due; _loaded = true; });
    } catch (_) {
      if (mounted) setState(() => _loaded = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded || _dueItems.isEmpty) return const SizedBox.shrink();

    final names = _dueItems
        .take(2)
        .map((m) => m.carName ?? m.carId ?? '—')
        .join(' · ');
    final count = _dueItems.length;

    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppColors.warning.withValues(alpha: 0.18),
              AppColors.error.withValues(alpha: 0.10),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.warning.withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.build_circle_rounded,
                  color: AppColors.warning, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.tr('maintenance_banner_title'),
                    style: TextStyle(
                      color: context.textPrimaryColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    count > 2 ? '$names +${count - 2}' : names,
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 11,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(Icons.chevron_right_rounded,
                color: context.textMutedColor, size: 20),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// 3b. Today's Overview — quick stats section
// ============================================================================

class _TodayStatsSection extends StatelessWidget {
  final HealthSummary summary;
  final List<FleetItem> items;

  const _TodayStatsSection({
    required this.summary,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    // Active now = moving + idle
    final activeNow = summary.moving + summary.idle;

    // Average speed of currently moving vehicles
    final movingItems =
        items.where((v) => v.movementStatus == 'moving').toList();
    final avgSpeedKmh = movingItems.isEmpty
        ? 0.0
        : movingItems.fold<double>(0, (s, v) => s + v.speedKmh) /
            movingItems.length;

    // Vehicles that reported a position in the last 24 hours
    final now = DateTime.now();
    final updatedToday = items.where((v) {
      final t = v.lastPositionAt;
      return t != null && now.difference(t).inHours < 24;
    }).length;

    // Coverage % = updated-today / total
    final coveragePct = summary.total == 0
        ? 0
        : ((updatedToday / summary.total) * 100).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.tr('today_stats'),
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _MiniStatCard(
                icon: Icons.sensors_rounded,
                label: context.tr('active_now'),
                value: '$activeNow',
                color: AppColors.statusMoving,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _MiniStatCard(
                icon: Icons.speed_rounded,
                label: context.tr('avg_speed'),
                value: '${avgSpeedKmh.toStringAsFixed(0)} km/h',
                color: AppColors.secondary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _MiniStatCard(
                icon: Icons.wifi_tethering_rounded,
                label: context.tr('updated_today'),
                value: '$updatedToday',
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _MiniStatCard(
                icon: Icons.pie_chart_outline_rounded,
                label: context.tr('coverage'),
                value: '$coveragePct%',
                color: AppColors.accent,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _MiniStatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _MiniStatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black
                .withValues(alpha: context.isDarkMode ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// 5. Recent Activity tile
// ============================================================================

class _RecentActivityTile extends StatelessWidget {
  final FleetItem item;
  final VoidCallback onTap;

  const _RecentActivityTile({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final color = AppColors.statusColor(item.movementStatus);
    final lastUpd = item.lastPositionAt;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: context.dividerColor),
          ),
          child: Row(
            children: [
              // Status dot with subtle halo
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.18),
                  shape: BoxShape.circle,
                  border: Border.all(color: color.withValues(alpha: 0.45)),
                ),
                child: Icon(
                  Icons.directions_car_rounded,
                  color: color,
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.carName.isEmpty
                          ? context.tr('unnamed_vehicle')
                          : item.carName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            item.movementStatus.toUpperCase(),
                            style: TextStyle(
                              color: color,
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        if (lastUpd != null)
                          Flexible(
                            child: Text(
                              timeago.format(
                                lastUpd,
                                locale: context.isRtl ? 'ar' : 'en_short',
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: context.textMutedColor,
                                fontSize: 11,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: context.textMutedColor,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
