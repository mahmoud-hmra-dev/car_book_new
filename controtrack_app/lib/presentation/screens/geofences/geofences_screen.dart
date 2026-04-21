import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/haptic_service.dart';
import '../../../data/country_zones_data.dart';
import '../../../data/models/geofence_model.dart';
import '../../../data/repositories/geofence_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';
import '../../widgets/web/web_page_scaffold.dart';

class GeofencesScreen extends StatefulWidget {
  const GeofencesScreen({super.key});

  @override
  State<GeofencesScreen> createState() => _GeofencesScreenState();
}

class _GeofencesScreenState extends State<GeofencesScreen> {
  late Future<List<GeofenceModel>> _future;
  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';
  final Set<String> _expandedIds = <String>{};

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<List<GeofenceModel>> _load() =>
      context.read<GeofenceRepository>().getAll();

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  Future<void> _openEditor() async {
    await HapticService.light();
    if (!mounted) return;
    await context.push('/geofence-editor');
    if (mounted) _refresh();
  }

  Future<void> _openCountryPicker() async {
    await HapticService.light();
    if (!mounted) return;

    final repo = context.read<GeofenceRepository>();
    final msgCreated = context.tr('country_zone_created');
    final msgFailed = context.tr('create_failed');

    final country = await showModalBottomSheet<CountryZone>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _CountryPickerSheet(),
    );
    if (country == null || !mounted) return;

    try {
      await repo.create(
        name: country.nameAr,
        area: country.wktPolygon,
        description:
            '${country.flag} ${country.nameEn} — ${context.tr('approx_border')}',
      );
      if (!mounted) return;
      _refresh();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.primaryDark,
          content: Row(
            children: [
              Text(country.flag, style: const TextStyle(fontSize: 20)),
              const SizedBox(width: 10),
              Expanded(child: Text(msgCreated)),
            ],
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$msgFailed: $e'),
        ),
      );
    }
  }

  Future<void> _delete(GeofenceModel g) async {
    final repo = context.read<GeofenceRepository>();
    final msgDeleteFailed = context.tr('delete_failed');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.surfaceColor,
        title: Text(ctx.tr('confirm_delete')),
        content: Text('${ctx.tr('delete_geofence_msg')} "${g.name}"?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(ctx.tr('cancel'))),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(ctx.tr('delete'),
                style: const TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await repo.delete(g.id);
      _refresh();
    } catch (e) {
      await HapticService.error();
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('$msgDeleteFailed: $e')));
    }
  }

  /// Direct delete (no dialog) used when the user swipe-confirms.
  Future<void> _directDelete(GeofenceModel g) async {
    final repo = context.read<GeofenceRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final msgDeleteFailed = context.tr('delete_failed');
    try {
      await HapticService.medium();
      await repo.delete(g.id);
      if (!mounted) return;
      _refresh();
      messenger.showSnackBar(
        SnackBar(
          content: Text('"${g.name}" ${context.tr('deleted')}'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      await HapticService.error();
      if (!mounted) return;
      messenger.showSnackBar(
          SnackBar(content: Text('$msgDeleteFailed: $e')));
    }
  }

  List<GeofenceModel> _filter(List<GeofenceModel> list) {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return list;
    return list
        .where((g) =>
            g.name.toLowerCase().contains(q) ||
            (g.description?.toLowerCase().contains(q) ?? false))
        .toList();
  }

  void _toggleExpanded(String id) {
    setState(() {
      if (_expandedIds.contains(id)) {
        _expandedIds.remove(id);
      } else {
        _expandedIds.add(id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;
    final scaffold = Scaffold(
      appBar: isWide
          ? null
          : AppBar(
              title: Text(context.tr('geofences')),
              leading: IconButton(
                  icon: const Icon(Icons.arrow_back_rounded),
                  onPressed: () => context.pop()),
            ),
      floatingActionButton: isWide
          ? null
          : Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                // Country zone mini FAB
                FloatingActionButton.small(
                  heroTag: 'fab_country',
                  onPressed: _openCountryPicker,
                  backgroundColor: AppColors.accent,
                  foregroundColor: Colors.black,
                  tooltip: context.tr('country_zone'),
                  child: const Icon(Icons.public_rounded),
                ),
                const SizedBox(height: 12),
                // Draw geofence main FAB
                FloatingActionButton.extended(
                  heroTag: 'fab_draw',
                  onPressed: _openEditor,
                  icon: const Icon(Icons.add_rounded),
                  label: Text(context.tr('draw_geofence')),
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.black,
                ),
              ],
            ),
      body: FutureBuilder<List<GeofenceModel>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const ShimmerList();
          }
          if (snap.hasError) {
            return AppError(message: snap.error.toString(), onRetry: _refresh);
          }
          final list = snap.data ?? [];
          if (list.isEmpty) {
            return EmptyState(
              title: context.tr('no_geofences'),
              subtitle: context.tr('no_geofences_subtitle'),
              icon: Icons.layers_outlined,
            );
          }
          final circleCount = list
              .where((g) =>
                  g.area.trim().toUpperCase().startsWith('CIRCLE'))
              .length;
          final polygonCount = list
              .where((g) =>
                  g.area.trim().toUpperCase().startsWith('POLYGON'))
              .length;
          final filtered = _filter(list);
          if (isWide) {
            return _WebGeofencesLayout(
              all: list,
              filtered: filtered,
              circles: circleCount,
              polygons: polygonCount,
              searchController: _searchCtrl,
              query: _query,
              onQueryChanged: (v) => setState(() => _query = v),
              onClearQuery: () {
                _searchCtrl.clear();
                setState(() => _query = '');
              },
              expandedIds: _expandedIds,
              onToggleExpanded: _toggleExpanded,
              onDelete: _delete,
              onRefresh: _refresh,
            );
          }
          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _refresh,
            child: Column(
              children: [
                _StatsRow(
                  total: list.length,
                  circles: circleCount,
                  polygons: polygonCount,
                ),
                _SearchField(
                  controller: _searchCtrl,
                  query: _query,
                  onChanged: (v) => setState(() => _query = v),
                  onClear: () {
                    _searchCtrl.clear();
                    setState(() => _query = '');
                  },
                ),
                Expanded(
                  child: filtered.isEmpty
                      ? Center(
                          child: Text(
                            context.tr('no_zones_match'),
                            style: TextStyle(
                                color: context.textSecondaryColor),
                          ),
                        )
                      : ListView.separated(
                          padding:
                              const EdgeInsets.fromLTRB(16, 4, 16, 90),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (_, i) {
                            final g = filtered[i];
                            return Dismissible(
                              key: ValueKey('geo_${g.id}'),
                              direction: DismissDirection.endToStart,
                              confirmDismiss: (_) async {
                                return await showDialog<bool>(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    backgroundColor: ctx.surfaceColor,
                                    title: Text(ctx.tr('confirm_delete')),
                                    content: Text(
                                        '${ctx.tr('delete_geofence_msg')} "${g.name}"?'),
                                    actions: [
                                      TextButton(
                                        onPressed: () =>
                                            Navigator.pop(ctx, false),
                                        child: Text(ctx.tr('cancel')),
                                      ),
                                      TextButton(
                                        onPressed: () =>
                                            Navigator.pop(ctx, true),
                                        child: Text(ctx.tr('delete'),
                                            style: const TextStyle(
                                                color: AppColors.error)),
                                      ),
                                    ],
                                  ),
                                );
                              },
                              onDismissed: (_) => _directDelete(g),
                              // Swipe-left secondary background: red delete
                              background: Container(
                                margin: const EdgeInsets.symmetric(
                                    vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.error
                                      .withValues(alpha: 0.15),
                                  borderRadius:
                                      BorderRadius.circular(16),
                                  border: Border.all(
                                      color: AppColors.error
                                          .withValues(alpha: 0.4)),
                                ),
                                alignment: AlignmentDirectional.centerEnd,
                                padding: const EdgeInsets.only(right: 20),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    Text(
                                      context.tr('delete'),
                                      style: const TextStyle(
                                        color: AppColors.error,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Icon(Icons.delete_rounded,
                                        color: AppColors.error, size: 24),
                                  ],
                                ),
                              ),
                              child: _GeofenceTile(
                                geofence: g,
                                expanded: _expandedIds.contains(g.id),
                                onToggleExpanded: () =>
                                    _toggleExpanded(g.id),
                                onDelete: () => _delete(g),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );

    if (!isWide) return scaffold;

    return WebPageScaffoldScrollable(
      title: context.tr('geofences'),
      subtitle: 'Virtual zones & boundaries',
      actions: [
        ElevatedButton.icon(
          icon: const Icon(Icons.add_location_alt_rounded),
          label: const Text('New Geofence'),
          onPressed: () => context.push('/geofence-editor').then((_) {
            if (mounted) _refresh();
          }),
        ),
      ],
      child: scaffold,
    );
  }
}

class _StatsRow extends StatelessWidget {
  final int total;
  final int circles;
  final int polygons;
  const _StatsRow({
    required this.total,
    required this.circles,
    required this.polygons,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          gradient: context.cardGradientColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: context.dividerColor),
        ),
        child: Row(
          children: [
            _StatChip(
              label: context.tr('total'),
              value: total.toString(),
              color: context.textPrimaryColor,
              iconColor: context.textSecondaryColor,
              icon: Icons.layers_rounded,
            ),
            _Dot(color: context.dividerColor),
            _StatChip(
              label: context.tr('circle'),
              value: circles.toString(),
              color: AppColors.primary,
              iconColor: AppColors.primary,
              icon: Icons.radio_button_unchecked_rounded,
            ),
            _Dot(color: context.dividerColor),
            _StatChip(
              label: context.tr('polygon'),
              value: polygons.toString(),
              color: AppColors.accent,
              iconColor: AppColors.accent,
              icon: Icons.hexagon_outlined,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final Color iconColor;
  final IconData icon;
  const _StatChip({
    required this.label,
    required this.value,
    required this.color,
    required this.iconColor,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: iconColor),
          const SizedBox(width: 6),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 14,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: context.textSecondaryColor,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  final Color color;
  const _Dot({required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 4,
      height: 4,
      margin: const EdgeInsets.symmetric(horizontal: 6),
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final String query;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;

  const _SearchField({
    required this.controller,
    required this.query,
    required this.onChanged,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
      child: TextField(
        controller: controller,
        style: TextStyle(color: context.textPrimaryColor),
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: context.tr('search_zones'),
          hintStyle: TextStyle(color: context.textMutedColor),
          prefixIcon:
              Icon(Icons.search_rounded, color: context.textMutedColor),
          suffixIcon: query.isEmpty
              ? null
              : IconButton(
                  icon: Icon(Icons.clear_rounded,
                      color: context.textMutedColor),
                  onPressed: onClear,
                ),
          filled: true,
          fillColor: context.cardColor,
          isDense: true,
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
    );
  }
}

class _GeofenceTile extends StatelessWidget {
  final GeofenceModel geofence;
  final bool expanded;
  final VoidCallback onToggleExpanded;
  final VoidCallback onDelete;
  const _GeofenceTile({
    required this.geofence,
    required this.expanded,
    required this.onToggleExpanded,
    required this.onDelete,
  });

  void _openAutoCommands(BuildContext context) {
    context.push(
      '/auto-commands?geofenceId=${Uri.encodeQueryComponent(geofence.id)}'
      '&name=${Uri.encodeQueryComponent(geofence.name)}',
    );
  }

  @override
  Widget build(BuildContext context) {
    final type = _typeFor(geofence.area);
    final linkedCount = geofence.linkedCarIds.length;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onToggleExpanded,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.fromLTRB(14, 12, 8, 10),
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: expanded
                  ? type.color.withValues(alpha: 0.5)
                  : context.dividerColor,
              width: expanded ? 1.3 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: type.color.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(type.icon, color: type.color),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(geofence.name,
                            style: TextStyle(
                              color: context.textPrimaryColor,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            )),
                        if (geofence.description != null &&
                            geofence.description!.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(
                            geofence.description!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                color: context.textSecondaryColor,
                                fontSize: 12),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: type.color.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: type.color.withValues(alpha: 0.35),
                                ),
                              ),
                              child: Text(
                                type.label,
                                style: TextStyle(
                                  color: type.color,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            if (geofence.radius != null) ...[
                              const SizedBox(width: 6),
                              Text(
                                '${geofence.radius!.toStringAsFixed(0)} m',
                                style: TextStyle(
                                  color: context.textMutedColor,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                            const SizedBox(width: 6),
                            Icon(Icons.directions_car_filled_rounded,
                                size: 11,
                                color: context.textMutedColor),
                            const SizedBox(width: 2),
                            Text(
                              '$linkedCount',
                              style: TextStyle(
                                color: context.textMutedColor,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline,
                        color: AppColors.error),
                    tooltip: context.tr('delete'),
                    onPressed: onDelete,
                  ),
                  AnimatedRotation(
                    duration: const Duration(milliseconds: 180),
                    turns: expanded ? 0.25 : 0,
                    child: Icon(Icons.chevron_right_rounded,
                        color: context.textMutedColor),
                  ),
                ],
              ),
              AnimatedCrossFade(
                duration: const Duration(milliseconds: 180),
                crossFadeState: expanded
                    ? CrossFadeState.showSecond
                    : CrossFadeState.showFirst,
                firstChild: const SizedBox(width: double.infinity),
                secondChild: Padding(
                  padding: const EdgeInsets.fromLTRB(0, 10, 6, 2),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Divider(
                          color: context.dividerColor, height: 1),
                      const SizedBox(height: 10),
                      if (geofence.centerLat != null &&
                          geofence.centerLng != null) ...[
                        Row(
                          children: [
                            Icon(Icons.my_location_rounded,
                                size: 13,
                                color: context.textMutedColor),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                '${geofence.centerLat!.toStringAsFixed(5)}, ${geofence.centerLng!.toStringAsFixed(5)}',
                                style: TextStyle(
                                  color: context.textSecondaryColor,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                      ],
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _ActionChip(
                            icon: Icons.bolt_rounded,
                            label: context.tr('auto_commands'),
                            color: AppColors.primary,
                            onTap: () => _openAutoCommands(context),
                          ),
                        ],
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
}

class _ActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
            border:
                Border.all(color: color.withValues(alpha: 0.35)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: color,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GeofenceTypeStyle {
  final String label;
  final IconData icon;
  final Color color;
  const _GeofenceTypeStyle({
    required this.label,
    required this.icon,
    required this.color,
  });
}

_GeofenceTypeStyle _typeFor(String area) {
  final upper = area.trim().toUpperCase();
  if (upper.startsWith('CIRCLE')) {
    return const _GeofenceTypeStyle(
      label: 'CIRCLE',
      icon: Icons.radio_button_unchecked_rounded,
      color: AppColors.primary,
    );
  }
  if (upper.startsWith('POLYGON')) {
    return const _GeofenceTypeStyle(
      label: 'POLYGON',
      icon: Icons.hexagon_outlined,
      color: AppColors.accent,
    );
  }
  return const _GeofenceTypeStyle(
    label: 'ZONE',
    icon: Icons.place_rounded,
    color: AppColors.secondary,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Country Zone Picker sheet
// ─────────────────────────────────────────────────────────────────────────────

class _CountryPickerSheet extends StatefulWidget {
  const _CountryPickerSheet();

  @override
  State<_CountryPickerSheet> createState() => _CountryPickerSheetState();
}

class _CountryPickerSheetState extends State<_CountryPickerSheet> {
  final _ctrl = TextEditingController();
  String _query = '';

  static const _regionOrder = [
    'levant',
    'gulf',
    'middle_east',
    'north_africa',
  ];

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final results = CountryZone.search(_query);

    // Group by region in defined order
    final Map<String, List<CountryZone>> grouped = {};
    for (final r in _regionOrder) {
      final items = results.where((c) => c.region == r).toList();
      if (items.isNotEmpty) grouped[r] = items;
    }
    // Catch any region not in _regionOrder
    for (final c in results) {
      if (!_regionOrder.contains(c.region)) {
        grouped[c.region] ??= [];
        grouped[c.region]!.add(c);
      }
    }

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollController) => Column(
        children: [
          // ── Header ─────────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle
                Center(
                  child: Container(
                    width: 44,
                    height: 4,
                    decoration: BoxDecoration(
                      color: context.textMutedColor,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.accent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.public_rounded,
                          color: AppColors.accent, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.tr('select_country'),
                            style: TextStyle(
                              color: context.textPrimaryColor,
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            context.tr('country_zone_info'),
                            style: TextStyle(
                              color: context.textMutedColor,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                // Search field
                TextField(
                  controller: _ctrl,
                  autofocus: false,
                  style: TextStyle(color: context.textPrimaryColor),
                  onChanged: (v) => setState(() => _query = v),
                  decoration: InputDecoration(
                    hintText: context.tr('search_country'),
                    hintStyle: TextStyle(color: context.textMutedColor),
                    prefixIcon: Icon(Icons.search_rounded,
                        color: context.textMutedColor, size: 20),
                    suffixIcon: _query.isEmpty
                        ? null
                        : IconButton(
                            icon: Icon(Icons.clear_rounded,
                                color: context.textMutedColor, size: 18),
                            onPressed: () {
                              _ctrl.clear();
                              setState(() => _query = '');
                            },
                          ),
                    isDense: true,
                    filled: true,
                    fillColor: context.cardColor,
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
                      borderSide: const BorderSide(
                          color: AppColors.accent, width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 4),
              ],
            ),
          ),

          Divider(height: 1, color: context.dividerColor),

          // ── Country list ───────────────────────────────────────────────────
          Expanded(
            child: grouped.isEmpty
                ? Center(
                    child: Text(
                      context.tr('no_countries_found'),
                      style: TextStyle(color: context.textSecondaryColor),
                    ),
                  )
                : ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                    children: [
                      for (final region in grouped.keys) ...[
                        // Region header
                        Padding(
                          padding:
                              const EdgeInsets.only(top: 14, bottom: 6),
                          child: Row(
                            children: [
                              Container(
                                width: 3,
                                height: 14,
                                decoration: BoxDecoration(
                                  color: AppColors.accent,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                context.tr('region_$region'),
                                style: TextStyle(
                                  color: AppColors.accent,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.8,
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Country cards grid
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 10,
                            crossAxisSpacing: 10,
                            childAspectRatio: 2.2,
                          ),
                          itemCount: grouped[region]!.length,
                          itemBuilder: (_, i) {
                            final country = grouped[region]![i];
                            return _CountryCard(
                              country: country,
                              onTap: () =>
                                  Navigator.pop(context, country),
                            );
                          },
                        ),
                      ],
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _CountryCard extends StatelessWidget {
  final CountryZone country;
  final VoidCallback onTap;

  const _CountryCard({required this.country, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: context.dividerColor),
          ),
          child: Row(
            children: [
              // Flag
              Text(country.flag, style: const TextStyle(fontSize: 26)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      country.nameAr,
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Text(
                          country.nameEn,
                          style: TextStyle(
                            color: context.textMutedColor,
                            fontSize: 10,
                          ),
                        ),
                        if (country.isBbox) ...[
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppColors.warning.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              context.tr('approx_border'),
                              style: const TextStyle(
                                color: AppColors.warning,
                                fontSize: 8,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Web layout (two-column: list on left, stats on right)
// ─────────────────────────────────────────────────────────────────────────────

class _WebGeofencesLayout extends StatelessWidget {
  final List<GeofenceModel> all;
  final List<GeofenceModel> filtered;
  final int circles;
  final int polygons;
  final TextEditingController searchController;
  final String query;
  final ValueChanged<String> onQueryChanged;
  final VoidCallback onClearQuery;
  final Set<String> expandedIds;
  final void Function(String) onToggleExpanded;
  final Future<void> Function(GeofenceModel) onDelete;
  final Future<void> Function() onRefresh;

  const _WebGeofencesLayout({
    required this.all,
    required this.filtered,
    required this.circles,
    required this.polygons,
    required this.searchController,
    required this.query,
    required this.onQueryChanged,
    required this.onClearQuery,
    required this.expandedIds,
    required this.onToggleExpanded,
    required this.onDelete,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final total = all.length;
    final otherCount = total - circles - polygons;
    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 20, 28, 28),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Left column: list (55%) ────────────────────────────────────────
          Expanded(
            flex: 55,
            child: Container(
              decoration: BoxDecoration(
                color: context.cardColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: context.dividerColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 8),
                    child: Row(
                      children: [
                        Icon(Icons.layers_rounded,
                            color: AppColors.primary, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Geofences',
                          style: TextStyle(
                            color: context.textPrimaryColor,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '$total',
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  _SearchField(
                    controller: searchController,
                    query: query,
                    onChanged: onQueryChanged,
                    onClear: onClearQuery,
                  ),
                  Expanded(
                    child: filtered.isEmpty
                        ? Center(
                            child: Text(
                              context.tr('no_zones_match'),
                              style: TextStyle(
                                  color: context.textSecondaryColor),
                            ),
                          )
                        : RefreshIndicator(
                            color: AppColors.primary,
                            onRefresh: onRefresh,
                            child: ListView.separated(
                              padding: const EdgeInsets.fromLTRB(
                                  16, 4, 16, 20),
                              itemCount: filtered.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 12),
                              itemBuilder: (_, i) {
                                final g = filtered[i];
                                return _WebGeofenceCard(
                                  geofence: g,
                                  expanded: expandedIds.contains(g.id),
                                  onToggleExpanded: () =>
                                      onToggleExpanded(g.id),
                                  onDelete: () => onDelete(g),
                                );
                              },
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 20),
          // ── Right column: stats (45%) ──────────────────────────────────────
          Expanded(
            flex: 45,
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _WebStatCard(
                    icon: Icons.layers_rounded,
                    iconColor: AppColors.primary,
                    label: 'Total Geofences',
                    value: '$total',
                    hint: 'All virtual zones configured',
                  ),
                  const SizedBox(height: 14),
                  _WebStatCard(
                    icon: Icons.notifications_active_rounded,
                    iconColor: AppColors.warning,
                    label: 'Active Alerts',
                    value: '${all.where((g) => g.linkedCarIds.isNotEmpty).length}',
                    hint: 'Zones with linked vehicles',
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: context.cardColor,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: context.dividerColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.pie_chart_rounded,
                                size: 18,
                                color: context.textSecondaryColor),
                            const SizedBox(width: 8),
                            Text(
                              'Zone Types',
                              style: TextStyle(
                                color: context.textPrimaryColor,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        _ZoneTypeRow(
                          label: 'Circle',
                          count: circles,
                          total: total,
                          color: AppColors.primary,
                          icon: Icons.radio_button_unchecked_rounded,
                        ),
                        const SizedBox(height: 10),
                        _ZoneTypeRow(
                          label: 'Polygon',
                          count: polygons,
                          total: total,
                          color: AppColors.accent,
                          icon: Icons.hexagon_outlined,
                        ),
                        if (otherCount > 0) ...[
                          const SizedBox(height: 10),
                          _ZoneTypeRow(
                            label: 'Other',
                            count: otherCount,
                            total: total,
                            color: AppColors.secondary,
                            icon: Icons.place_rounded,
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WebStatCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final String hint;

  const _WebStatCard({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    required this.hint,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: context.textSecondaryColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  hint,
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 11,
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

class _ZoneTypeRow extends StatelessWidget {
  final String label;
  final int count;
  final int total;
  final Color color;
  final IconData icon;

  const _ZoneTypeRow({
    required this.label,
    required this.count,
    required this.total,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final pct = total == 0 ? 0.0 : count / total;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Text(
              '$count',
              style: TextStyle(
                color: color,
                fontSize: 13,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            minHeight: 6,
            backgroundColor: color.withValues(alpha: 0.12),
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }
}

class _WebGeofenceCard extends StatelessWidget {
  final GeofenceModel geofence;
  final bool expanded;
  final VoidCallback onToggleExpanded;
  final VoidCallback onDelete;

  const _WebGeofenceCard({
    required this.geofence,
    required this.expanded,
    required this.onToggleExpanded,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final type = _typeFor(geofence.area);
    final linkedCount = geofence.linkedCarIds.length;
    final hasCoords =
        geofence.centerLat != null && geofence.centerLng != null;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onToggleExpanded,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: context.surfaceColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: expanded
                  ? type.color.withValues(alpha: 0.5)
                  : context.dividerColor,
              width: expanded ? 1.3 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: type.color.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(type.icon, color: type.color, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          geofence.name,
                          style: TextStyle(
                            color: context.textPrimaryColor,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (geofence.description != null &&
                            geofence.description!.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(
                            geofence.description!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                color: context.textSecondaryColor,
                                fontSize: 12),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: type.color.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: type.color.withValues(alpha: 0.4),
                      ),
                    ),
                    child: Text(
                      type.label,
                      style: TextStyle(
                        color: type.color,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  IconButton(
                    icon: const Icon(Icons.delete_outline,
                        color: AppColors.error, size: 20),
                    tooltip: context.tr('delete'),
                    onPressed: onDelete,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 16,
                runSpacing: 8,
                children: [
                  if (hasCoords)
                    _WebInfoItem(
                      icon: Icons.my_location_rounded,
                      label: '${geofence.centerLat!.toStringAsFixed(5)}, '
                          '${geofence.centerLng!.toStringAsFixed(5)}',
                    ),
                  if (geofence.radius != null)
                    _WebInfoItem(
                      icon: Icons.straighten_rounded,
                      label: '${geofence.radius!.toStringAsFixed(0)} m',
                    ),
                  _WebInfoItem(
                    icon: Icons.directions_car_filled_rounded,
                    label: '$linkedCount linked',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WebInfoItem extends StatelessWidget {
  final IconData icon;
  final String label;
  const _WebInfoItem({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: context.textMutedColor),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            color: context.textSecondaryColor,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
