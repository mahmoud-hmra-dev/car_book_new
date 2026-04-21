import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../blocs/fleet/fleet_state.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';
import '../../widgets/fleet/vehicle_card.dart';
import '../../widgets/web/web_page_scaffold.dart';

enum _SortBy { name, status, speed }

/// Vehicles list screen.
/// - Premium search bar with clear button and debounced filtering.
/// - Horizontal status filter chips with live counts.
/// - Animated vehicle cards with per-item stagger.
/// - Shimmer skeleton while loading, differentiated empty states.
class VehiclesScreen extends StatefulWidget {
  const VehiclesScreen({super.key});

  @override
  State<VehiclesScreen> createState() => _VehiclesScreenState();
}

class _VehiclesScreenState extends State<VehiclesScreen> {
  final _searchCtrl = TextEditingController();
  final _searchFocus = FocusNode();
  Timer? _debounce;
  _SortBy _sortBy = _SortBy.name;
  bool _gridView = false;

  @override
  void initState() {
    super.initState();
    final cubit = context.read<FleetCubit>();
    if (cubit.state.status == FleetStatus.initial) cubit.load();
    _searchCtrl.text = cubit.state.query;
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  void _onSearchChanged(String v) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 280), () {
      if (!mounted) return;
      context.read<FleetCubit>().setQuery(v);
    });
    setState(() {});
  }

  List<FleetItem> _sorted(List<FleetItem> items) {
    int statusRank(String s) {
      switch (s) {
        case 'moving':
          return 0;
        case 'idle':
          return 1;
        case 'stopped':
          return 2;
        case 'stale':
          return 3;
        case 'offline':
          return 4;
        default:
          return 5;
      }
    }

    final list = [...items];
    switch (_sortBy) {
      case _SortBy.name:
        list.sort(
          (a, b) => a.carName.toLowerCase().compareTo(b.carName.toLowerCase()),
        );
      case _SortBy.status:
        list.sort(
          (a, b) => statusRank(a.movementStatus)
              .compareTo(statusRank(b.movementStatus)),
        );
      case _SortBy.speed:
        list.sort((a, b) => b.speedKmh.compareTo(a.speedKmh));
    }
    return list;
  }

  String _sortLabel(BuildContext context, _SortBy sort) {
    switch (sort) {
      case _SortBy.name:
        return context.tr('name');
      case _SortBy.status:
        return context.tr('status');
      case _SortBy.speed:
        return context.tr('speed');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;
    final effectiveGridView = _gridView || isWide;
    return WebPageScaffoldScrollable(
      title: context.tr('fleet'),
      subtitle: 'Live vehicle status and tracking',
      actions: [
        IconButton(
          onPressed: () => context.push('/search'),
          icon: Icon(Icons.search_rounded, color: context.textSecondaryColor),
        ),
      ],
      child: Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        title: Text(context.tr('fleet')),
        actions: [
          PopupMenuButton<_SortBy>(
            tooltip: context.tr('name'),
            icon: const Icon(Icons.sort_rounded),
            initialValue: _sortBy,
            onSelected: (v) => setState(() => _sortBy = v),
            itemBuilder: (ctx) => [
              for (final s in _SortBy.values)
                PopupMenuItem<_SortBy>(
                  value: s,
                  child: Row(
                    children: [
                      Icon(
                        _sortBy == s
                            ? Icons.radio_button_checked
                            : Icons.radio_button_unchecked,
                        size: 16,
                        color: _sortBy == s
                            ? AppColors.primary
                            : context.textMutedColor,
                      ),
                      const SizedBox(width: 10),
                      Text(_sortLabel(ctx, s)),
                    ],
                  ),
                ),
            ],
          ),
          IconButton(
            icon: Icon(_gridView
                ? Icons.view_list_rounded
                : Icons.grid_view_rounded),
            tooltip: _gridView ? 'List view' : 'Grid view',
            onPressed: () => setState(() => _gridView = !_gridView),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () =>
                context.read<FleetCubit>().load(refreshing: true),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/map'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.black,
        icon: const Icon(Icons.map_rounded),
        label: Text(
          context.tr('map'),
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // ========== Search bar ==========
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: _PremiumSearchBar(
                controller: _searchCtrl,
                focusNode: _searchFocus,
                onChanged: _onSearchChanged,
                onClear: () {
                  _debounce?.cancel();
                  _searchCtrl.clear();
                  context.read<FleetCubit>().setQuery('');
                  setState(() {});
                },
              )
                  .animate()
                  .fadeIn(duration: 300.ms)
                  .slideY(begin: -0.2, end: 0, curve: Curves.easeOutCubic),
            ),
            // ========== Status filter chips ==========
            SizedBox(
              height: 44,
              child: BlocBuilder<FleetCubit, FleetState>(
                builder: (context, state) {
                  final q = state.query.trim().toLowerCase();
                  final searchBase = q.isEmpty
                      ? state.items
                      : state.items
                          .where((e) =>
                              e.carName.toLowerCase().contains(q) ||
                              e.licensePlate.toLowerCase().contains(q) ||
                              (e.address ?? '').toLowerCase().contains(q))
                          .toList();

                  const filters = <String?>[
                    null,
                    'moving',
                    'idle',
                    'stopped',
                    'offline',
                  ];
                  return ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: filters.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 6),
                    itemBuilder: (_, i) {
                      final f = filters[i];
                      final label = f == null
                          ? context.tr('all')
                          : context.tr(f);
                      final color = f == null
                          ? AppColors.primary
                          : AppColors.statusColor(f);
                      final count = f == null
                          ? searchBase.length
                          : searchBase
                              .where((e) => e.movementStatus == f)
                              .length;
                      return _AnimatedFilterChip(
                        label: label,
                        color: color,
                        selected: state.statusFilter == f,
                        count: count,
                        onTap: () =>
                            context.read<FleetCubit>().setStatusFilter(f),
                      );
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            // ========== Fleet Health Score ==========
            BlocBuilder<FleetCubit, FleetState>(
              buildWhen: (a, b) =>
                  a.items.length != b.items.length ||
                  a.items.map((e) => e.movementStatus).join() !=
                      b.items.map((e) => e.movementStatus).join(),
              builder: (context, state) {
                if (state.items.isEmpty) return const SizedBox.shrink();
                return _FleetHealthBanner(items: state.items)
                    .animate()
                    .fadeIn(delay: 120.ms, duration: 300.ms)
                    .slideY(begin: -0.1, end: 0);
              },
            ),
            // ========== Vehicle list ==========
            Expanded(
              child: BlocBuilder<FleetCubit, FleetState>(
                builder: (context, state) {
                  if (state.status == FleetStatus.loading &&
                      state.items.isEmpty) {
                    return const ShimmerList();
                  }
                  if (state.status == FleetStatus.error &&
                      state.items.isEmpty) {
                    return AppError(
                      message:
                          state.errorMessage ?? context.tr('failed_to_load'),
                      onRetry: () => context.read<FleetCubit>().load(),
                    );
                  }
                  final list = _sorted(state.filtered);
                  if (list.isEmpty) {
                    final hasAnyVehicles = state.items.isNotEmpty;
                    return EmptyState(
                      title: hasAnyVehicles
                          ? context.tr('no_data')
                          : context.tr('no_vehicles'),
                      subtitle: hasAnyVehicles
                          ? context.tr('search_vehicles')
                          : context.tr('no_vehicles'),
                      icon: hasAnyVehicles
                          ? Icons.search_off_rounded
                          : Icons.directions_car_outlined,
                    );
                  }
                  return RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: () =>
                        context.read<FleetCubit>().load(refreshing: true),
                    child: effectiveGridView
                        ? GridView.builder(
                            padding:
                                const EdgeInsets.fromLTRB(16, 4, 16, 96),
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: isWide ? 3 : 2,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                              childAspectRatio: 1.1,
                            ),
                            itemCount: list.length,
                            itemBuilder: (_, i) => _VehicleGridCard(
                              key: ValueKey('grid-${list[i].carId}'),
                              item: list[i],
                              index: i,
                              onTap: () =>
                                  context.push('/vehicles/${list[i].carId}'),
                            ),
                          )
                        : ListView.separated(
                            padding:
                                const EdgeInsets.fromLTRB(16, 4, 16, 96),
                            itemCount: list.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemBuilder: (_, i) => VehicleCard(
                              key: ValueKey(
                                  '${list[i].carId}-${state.statusFilter ?? 'all'}-$_sortBy'),
                              item: list[i],
                              animationDelay: Duration(
                                  milliseconds: (i.clamp(0, 10)) * 50),
                              onTap: () =>
                                  context.push('/vehicles/${list[i].carId}'),
                            ),
                          ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }
}

// ============================================================================
// Fleet Health Banner — overall score bar
// ============================================================================

class _FleetHealthBanner extends StatelessWidget {
  final List<FleetItem> items;
  const _FleetHealthBanner({required this.items});

  @override
  Widget build(BuildContext context) {
    final total = items.length;
    final moving = items.where((e) => e.movementStatus == 'moving').length;
    final idle = items.where((e) => e.movementStatus == 'idle').length;
    final offline = items
        .where((e) => e.movementStatus == 'offline' ||
            e.movementStatus == 'stale')
        .length;
    final online = total - offline;
    final healthScore = total == 0 ? 0 : ((online / total) * 100).round();

    Color scoreColor;
    String scoreLabel;
    if (healthScore >= 80) {
      scoreColor = AppColors.statusMoving;
      scoreLabel = 'Excellent';
    } else if (healthScore >= 60) {
      scoreColor = AppColors.warning;
      scoreLabel = 'Good';
    } else {
      scoreColor = AppColors.error;
      scoreLabel = 'Needs Attention';
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [
              scoreColor.withValues(alpha: 0.12),
              scoreColor.withValues(alpha: 0.04),
            ],
          ),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: scoreColor.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            // Score circle
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: scoreColor.withValues(alpha: 0.15),
                border: Border.all(color: scoreColor.withValues(alpha: 0.5)),
              ),
              child: Center(
                child: Text(
                  '$healthScore%',
                  style: TextStyle(
                    color: scoreColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'Fleet Health',
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: scoreColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          scoreLabel,
                          style: TextStyle(
                            color: scoreColor,
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: healthScore / 100,
                      backgroundColor: context.dividerColor,
                      valueColor:
                          AlwaysStoppedAnimation<Color>(scoreColor),
                      minHeight: 4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$moving moving · $idle idle · $offline offline',
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Grid card — compact tile for 2-column grid view
// ============================================================================

class _VehicleGridCard extends StatelessWidget {
  final FleetItem item;
  final int index;
  final VoidCallback onTap;

  const _VehicleGridCard({
    super.key,
    required this.item,
    required this.index,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = AppColors.statusColor(item.movementStatus);
    final isMoving = item.movementStatus == 'moving';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [context.cardColor, context.cardColor.withValues(alpha: 0.85)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: statusColor.withValues(alpha: 0.3),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: statusColor.withValues(alpha: 0.08),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Status dot + name row
              Row(
                children: [
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      if (isMoving)
                        Container(
                          width: 16,
                          height: 16,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: statusColor.withValues(alpha: 0.25),
                          ),
                        ),
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      item.carName,
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                item.licensePlate,
                style: TextStyle(
                  color: context.textMutedColor,
                  fontSize: 11,
                ),
              ),
              const Spacer(),
              // Speed badge
              Row(
                children: [
                  Icon(Icons.speed_rounded, size: 14, color: statusColor),
                  const SizedBox(width: 4),
                  Text(
                    '${item.speedKmh.toStringAsFixed(0)} km/h',
                    style: TextStyle(
                      color: context.textSecondaryColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              // Status label
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  item.movementStatus.toUpperCase(),
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ).animate(delay: Duration(milliseconds: (index.clamp(0, 12)) * 40))
      .fadeIn(duration: 350.ms)
      .scaleXY(begin: 0.92, end: 1.0, duration: 350.ms, curve: Curves.easeOutCubic);
  }
}

// ============================================================================
// Premium search bar with animated clear button
// ============================================================================

class _PremiumSearchBar extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;

  const _PremiumSearchBar({
    required this.controller,
    required this.focusNode,
    required this.onChanged,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    final hasText = controller.text.isNotEmpty;
    return AnimatedBuilder(
      animation: focusNode,
      builder: (_, __) {
        final focused = focusNode.hasFocus;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: focused
                  ? AppColors.primary.withValues(alpha: 0.6)
                  : context.dividerColor,
              width: focused ? 1.5 : 1,
            ),
            boxShadow: focused
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.18),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withValues(
                          alpha: context.isDarkMode ? 0.2 : 0.03),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Row(
            children: [
              const SizedBox(width: 14),
              Icon(
                Icons.search_rounded,
                size: 20,
                color: focused ? AppColors.primary : context.textMutedColor,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  onChanged: onChanged,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  decoration: InputDecoration(
                    border: InputBorder.none,
                    isCollapsed: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                    hintText: context.tr('search_vehicles'),
                    hintStyle: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 180),
                transitionBuilder: (c, a) =>
                    ScaleTransition(scale: a, child: c),
                child: hasText
                    ? IconButton(
                        key: const ValueKey('clear'),
                        icon: Icon(
                          Icons.cancel_rounded,
                          size: 18,
                          color: context.textMutedColor,
                        ),
                        onPressed: onClear,
                      )
                    : const SizedBox(
                        key: ValueKey('empty'), width: 8, height: 48),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ============================================================================
// Animated filter chip with live count
// ============================================================================

class _AnimatedFilterChip extends StatefulWidget {
  final String label;
  final Color color;
  final bool selected;
  final int count;
  final VoidCallback onTap;

  const _AnimatedFilterChip({
    required this.label,
    required this.color,
    required this.selected,
    required this.count,
    required this.onTap,
  });

  @override
  State<_AnimatedFilterChip> createState() => _AnimatedFilterChipState();
}

class _AnimatedFilterChipState extends State<_AnimatedFilterChip> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final selected = widget.selected;
    final bg = selected
        ? widget.color.withValues(alpha: 0.22)
        : context.cardColor;
    final border = selected ? widget.color : context.dividerColor;
    final textColor = selected ? widget.color : context.textSecondaryColor;

    return AnimatedScale(
      scale: _pressed ? 0.95 : 1.0,
      duration: const Duration(milliseconds: 120),
      curve: Curves.easeOut,
      child: GestureDetector(
        onTapDown: (_) => setState(() => _pressed = true),
        onTapCancel: () => setState(() => _pressed = false),
        onTapUp: (_) => setState(() => _pressed = false),
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: border, width: selected ? 1.4 : 1),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: widget.color.withValues(alpha: 0.25),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: widget.color,
                  shape: BoxShape.circle,
                  boxShadow: selected
                      ? [
                          BoxShadow(
                            color: widget.color.withValues(alpha: 0.6),
                            blurRadius: 6,
                          ),
                        ]
                      : null,
                ),
              ),
              const SizedBox(width: 8),
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 220),
                style: TextStyle(
                  color: textColor,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
                child: Text(widget.label),
              ),
              const SizedBox(width: 8),
              _CountBadge(
                count: widget.count,
                color: widget.color,
                selected: selected,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CountBadge extends StatelessWidget {
  final int count;
  final Color color;
  final bool selected;
  const _CountBadge({
    required this.count,
    required this.color,
    required this.selected,
  });

  @override
  Widget build(BuildContext context) {
    final bg = selected
        ? color.withValues(alpha: 0.32)
        : context.dividerColor.withValues(alpha: 0.6);
    final fg = selected ? color : context.textSecondaryColor;

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 220),
      transitionBuilder: (child, anim) => ScaleTransition(
        scale: anim,
        child: FadeTransition(opacity: anim, child: child),
      ),
      child: Container(
        key: ValueKey('$count-$selected'),
        constraints: const BoxConstraints(minWidth: 22),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
        ),
        alignment: Alignment.center,
        child: Text(
          '$count',
          style: TextStyle(
            color: fg,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}
