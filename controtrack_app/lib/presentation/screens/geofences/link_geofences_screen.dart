import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/models/geofence_model.dart';
import '../../../data/repositories/geofence_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';

class LinkGeofencesScreen extends StatefulWidget {
  final String carId;
  final String carName;

  const LinkGeofencesScreen({
    super.key,
    required this.carId,
    required this.carName,
  });

  @override
  State<LinkGeofencesScreen> createState() => _LinkGeofencesScreenState();
}

class _LinkGeofencesScreenState extends State<LinkGeofencesScreen> {
  List<GeofenceModel> _all = const [];
  Set<String> _linkedIds = {};
  Set<String> _selectedIds = {};
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String _query = '';

  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = context.read<GeofenceRepository>();
      final results = await Future.wait([
        repo.getAll(),
        repo.getForCar(widget.carId),
      ]);
      final all = results[0];
      final linked = results[1];
      final linkedIds = linked.map((g) => g.id).toSet();
      if (!mounted) return;
      setState(() {
        _all = all;
        _linkedIds = linkedIds;
        _selectedIds = {...linkedIds};
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  List<GeofenceModel> get _filtered {
    if (_query.trim().isEmpty) return _all;
    final q = _query.trim().toLowerCase();
    return _all
        .where((g) =>
            g.name.toLowerCase().contains(q) ||
            (g.description?.toLowerCase().contains(q) ?? false))
        .toList();
  }

  bool get _hasChanges {
    if (_selectedIds.length != _linkedIds.length) return true;
    for (final id in _selectedIds) {
      if (!_linkedIds.contains(id)) return true;
    }
    return false;
  }

  void _toggle(String id) {
    setState(() {
      if (_selectedIds.contains(id)) {
        _selectedIds.remove(id);
      } else {
        _selectedIds.add(id);
      }
    });
  }

  Future<void> _save() async {
    if (!_hasChanges) {
      context.pop(false);
      return;
    }
    setState(() => _saving = true);
    final messenger = ScaffoldMessenger.of(context);
    final msgSaveFailed = context.tr('save_failed');
    try {
      final repo = context.read<GeofenceRepository>();
      final toLink = _selectedIds.difference(_linkedIds);
      final toUnlink = _linkedIds.difference(_selectedIds);
      final ops = <Future<void>>[
        ...toLink.map((id) => repo.link(widget.carId, id)),
        ...toUnlink.map((id) => repo.unlink(widget.carId, id)),
      ];
      await Future.wait(ops);
      if (!mounted) return;
      final linkedCount = toLink.length;
      final unlinkedCount = toUnlink.length;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.primaryDark,
          content: Text(
            _buildResultMessage(linkedCount, unlinkedCount),
          ),
        ),
      );
      context.pop(true);
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$msgSaveFailed: $e'),
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _buildResultMessage(int linked, int unlinked) {
    final parts = <String>[];
    if (linked > 0) parts.add('$linked linked');
    if (unlinked > 0) parts.add('$unlinked unlinked');
    return parts.isEmpty ? 'No changes' : parts.join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    final carLabel = widget.carName.trim().isEmpty ? 'vehicle' : widget.carName;
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        title: Text('${context.tr('zones_for')} $carLabel'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              onPressed: (_saving || _loading) ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.black,
                      ),
                    )
                  : Text(
                      context.tr('done'),
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
            ),
          ),
        ],
      ),
      body: _buildBody(),
      bottomNavigationBar: _loading || _error != null
          ? null
          : _buildBottomBar(),
    );
  }

  Widget _buildBody() {
    if (_loading) return const ShimmerList();
    if (_error != null) {
      return AppError(message: _error!, onRetry: _load);
    }
    if (_all.isEmpty) {
      return EmptyState(
        title: context.tr('no_geofences'),
        subtitle: context.tr('no_geofences_subtitle'),
        icon: Icons.layers_outlined,
      );
    }
    final list = _filtered;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            controller: _searchCtrl,
            style: TextStyle(color: context.textPrimaryColor),
            onChanged: (v) => setState(() => _query = v),
            decoration: InputDecoration(
              hintText: context.tr('search_zones'),
              hintStyle: TextStyle(color: context.textMutedColor),
              prefixIcon: Icon(
                Icons.search_rounded,
                color: context.textMutedColor,
              ),
              suffixIcon: _query.isEmpty
                  ? null
                  : IconButton(
                      icon: Icon(
                        Icons.clear_rounded,
                        color: context.textMutedColor,
                      ),
                      onPressed: () {
                        _searchCtrl.clear();
                        setState(() => _query = '');
                      },
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
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Text(
                '${context.tr('all_zones')} (${list.length})',
                style: TextStyle(
                  color: context.textSecondaryColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              Text(
                '${_selectedIds.length} ${context.tr('n_selected')}',
                style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: list.isEmpty
              ? Center(
                  child: Text(
                    context.tr('no_zones_match'),
                    style: TextStyle(color: context.textSecondaryColor),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final g = list[i];
                    final selected = _selectedIds.contains(g.id);
                    final wasLinked = _linkedIds.contains(g.id);
                    return _GeofenceLinkTile(
                      geofence: g,
                      selected: selected,
                      wasLinked: wasLinked,
                      onTap: () => _toggle(g.id),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildBottomBar() {
    final toLink = _selectedIds.difference(_linkedIds).length;
    final toUnlink = _linkedIds.difference(_selectedIds).length;
    final hasChanges = _hasChanges;

    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        decoration: BoxDecoration(
          color: context.surfaceColor,
          border: Border(top: BorderSide(color: context.dividerColor)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                hasChanges
                    ? 'Changes: +$toLink linked · -$toUnlink unlinked'
                    : 'No changes to save',
                style: TextStyle(
                  color: hasChanges
                      ? context.textPrimaryColor
                      : context.textMutedColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            SizedBox(
              height: 40,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.black,
                  disabledBackgroundColor:
                      AppColors.primary.withValues(alpha: 0.4),
                ),
                onPressed: (_saving || !hasChanges) ? null : _save,
                icon: _saving
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.black,
                        ),
                      )
                    : const Icon(Icons.save_rounded, size: 16),
                label: Text(context.tr('save')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GeofenceLinkTile extends StatelessWidget {
  final GeofenceModel geofence;
  final bool selected;
  final bool wasLinked;
  final VoidCallback onTap;

  const _GeofenceLinkTile({
    required this.geofence,
    required this.selected,
    required this.wasLinked,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final type = _geofenceType(geofence.area);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: selected
                ? AppColors.primary.withValues(alpha: 0.08)
                : context.cardColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? AppColors.primary : context.dividerColor,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: type.color.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(type.icon, color: type.color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      geofence.name.isEmpty ? geofence.id : geofence.name,
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
                          type.label,
                          style: TextStyle(
                            color: type.color,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (geofence.radius != null) ...[
                          Text(
                            ' · ',
                            style:
                                TextStyle(color: context.textMutedColor),
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
              if (wasLinked)
                Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.4),
                    ),
                  ),
                  child: const Text(
                    'Linked',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              _Checkbox(checked: selected),
            ],
          ),
        ),
      ),
    );
  }
}

class _Checkbox extends StatelessWidget {
  final bool checked;
  const _Checkbox({required this.checked});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        color: checked ? AppColors.primary : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: checked ? AppColors.primary : context.textMutedColor,
          width: 1.5,
        ),
      ),
      child: checked
          ? const Icon(Icons.check_rounded, size: 16, color: Colors.black)
          : null,
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

_GeofenceTypeStyle _geofenceType(String area) {
  final upper = area.trim().toUpperCase();
  if (upper.startsWith('CIRCLE')) {
    return const _GeofenceTypeStyle(
      label: 'Circle',
      icon: Icons.radio_button_unchecked_rounded,
      color: AppColors.primary,
    );
  }
  if (upper.startsWith('POLYGON')) {
    return const _GeofenceTypeStyle(
      label: 'Polygon',
      icon: Icons.hexagon_outlined,
      color: AppColors.accent,
    );
  }
  return const _GeofenceTypeStyle(
    label: 'Rectangle',
    icon: Icons.rectangle_outlined,
    color: AppColors.secondary,
  );
}
