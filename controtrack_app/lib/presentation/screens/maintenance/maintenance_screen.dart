import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/maintenance_model.dart';
import '../../../data/repositories/tracking_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';

class MaintenanceScreen extends StatefulWidget {
  const MaintenanceScreen({super.key});

  @override
  State<MaintenanceScreen> createState() => _MaintenanceScreenState();
}

class _MaintenanceScreenState extends State<MaintenanceScreen> {
  late Future<List<MaintenanceModel>> _future;
  final _searchCtrl = TextEditingController();
  _DueStatus? _statusFilter;

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

  List<MaintenanceModel> _applyFilters(List<MaintenanceModel> all) {
    final q = _searchCtrl.text.trim().toLowerCase();
    return all.where((m) {
      final matchQuery = q.isEmpty ||
          m.type.toLowerCase().contains(q) ||
          (m.carName ?? '').toLowerCase().contains(q) ||
          (m.notes ?? '').toLowerCase().contains(q);
      final matchStatus =
          _statusFilter == null || _dueStatus(m.endDate) == _statusFilter;
      return matchQuery && matchStatus;
    }).toList();
  }

  Future<List<MaintenanceModel>> _load() =>
      context.read<TrackingRepository>().getMaintenance();

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  Future<void> _edit(MaintenanceModel? existing) async {
    final repo = context.read<TrackingRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final msgFailed = context.tr('failed');
    final result = await showModalBottomSheet<MaintenanceModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _MaintenanceForm(existing: existing),
    );
    if (result == null) return;
    try {
      if (existing == null) {
        await repo.createMaintenance(result);
      } else {
        await repo.updateMaintenance(existing.id, result);
      }
      if (!mounted) return;
      _refresh();
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('$msgFailed: $e')));
    }
  }

  Future<void> _delete(MaintenanceModel m) async {
    final repo2 = context.read<TrackingRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final msgFailed = context.tr('failed');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.surfaceColor,
        title: Text(ctx.tr('confirm_delete')),
        content: Text('${ctx.tr('delete_geofence_msg')} ${m.type}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(ctx.tr('cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              ctx.tr('delete'),
              style: const TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await repo2.deleteMaintenance(m.id);
      if (!mounted) return;
      _refresh();
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('$msgFailed: $e')));
    }
  }

  /// Direct delete without dialog — used by swipe-to-dismiss after user confirms
  /// via the [confirmDismiss] callback.
  Future<void> _directDelete(MaintenanceModel m) async {
    final repo2 = context.read<TrackingRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final msgDeleted = context.tr('deleted');
    final msgFailed = context.tr('failed');
    try {
      await repo2.deleteMaintenance(m.id);
      if (!mounted) return;
      _refresh();
      messenger.showSnackBar(
        SnackBar(
          content: Text(msgDeleted),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('$msgFailed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('maintenance')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _edit(null),
        icon: const Icon(Icons.add_rounded),
        label: Text(context.tr('add')),
      ),
      body: FutureBuilder<List<MaintenanceModel>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return Column(
              children: const [
                _SummaryBarSkeleton(),
                Expanded(child: ShimmerList()),
              ],
            );
          }
          if (snap.hasError) {
            return AppError(message: snap.error.toString(), onRetry: _refresh);
          }
          final all = snap.data ?? [];
          final list = _applyFilters(all);
          final stats = _MaintenanceStats.from(all);
          return Column(
            children: [
              _SummaryBar(stats: stats),
              // Search bar
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: TextField(
                  controller: _searchCtrl,
                  onChanged: (_) => setState(() {}),
                  style: TextStyle(
                      color: context.textPrimaryColor, fontSize: 14),
                  decoration: InputDecoration(
                    prefixIcon: Icon(Icons.search_rounded,
                        color: context.textMutedColor, size: 20),
                    hintText: 'Search by type, vehicle…',
                    hintStyle:
                        TextStyle(color: context.textMutedColor, fontSize: 14),
                    filled: true,
                    fillColor: context.cardColor,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: context.dividerColor),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: context.dividerColor),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(
                          color: AppColors.primary, width: 1.5),
                    ),
                    suffixIcon: _searchCtrl.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, size: 18),
                            onPressed: () {
                              _searchCtrl.clear();
                              setState(() {});
                            },
                          )
                        : null,
                  ),
                ),
              ),
              // Status filter chips
              SizedBox(
                height: 44,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 6),
                  children: [
                    _StatusFilterChip(
                      label: context.tr('all'),
                      selected: _statusFilter == null,
                      color: AppColors.primary,
                      onTap: () => setState(() => _statusFilter = null),
                    ),
                    const SizedBox(width: 6),
                    _StatusFilterChip(
                      label: context.tr('overdue'),
                      selected: _statusFilter == _DueStatus.overdue,
                      color: AppColors.error,
                      onTap: () => setState(() => _statusFilter =
                          _statusFilter == _DueStatus.overdue
                              ? null
                              : _DueStatus.overdue),
                    ),
                    const SizedBox(width: 6),
                    _StatusFilterChip(
                      label: context.tr('due_soon'),
                      selected: _statusFilter == _DueStatus.dueSoon,
                      color: AppColors.warning,
                      onTap: () => setState(() => _statusFilter =
                          _statusFilter == _DueStatus.dueSoon
                              ? null
                              : _DueStatus.dueSoon),
                    ),
                    const SizedBox(width: 6),
                    _StatusFilterChip(
                      label: 'On Schedule',
                      selected: _statusFilter == _DueStatus.ok,
                      color: AppColors.statusMoving,
                      onTap: () => setState(() => _statusFilter =
                          _statusFilter == _DueStatus.ok
                              ? null
                              : _DueStatus.ok),
                    ),
                  ],
                ),
              ),
              if (all.isEmpty)
                Expanded(
                  child: EmptyState(
                    title: context.tr('no_maintenance'),
                    subtitle: context.tr('no_maintenance_subtitle'),
                    icon: Icons.build_outlined,
                  ),
                )
              else if (list.isEmpty)
                Expanded(
                  child: EmptyState(
                    title: context.tr('no_results'),
                    subtitle: 'Try adjusting your filters',
                    icon: Icons.search_off_rounded,
                  ),
                )
              else
                Expanded(
                  child: RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: _refresh,
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 90),
                      itemCount: list.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) {
                        final m = list[i];
                        return Dismissible(
                          key: ValueKey('maint_${m.id}'),
                          direction: DismissDirection.horizontal,
                          // Swipe right → edit (returns false so item stays)
                          // Swipe left  → confirm delete
                          confirmDismiss: (dir) async {
                            if (dir == DismissDirection.startToEnd) {
                              await _edit(m);
                              return false;
                            }
                            // endToStart → delete
                            return await showDialog<bool>(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                backgroundColor: ctx.surfaceColor,
                                title: Text(ctx.tr('confirm_delete')),
                                content: Text(
                                    '${ctx.tr('delete_geofence_msg')} ${m.type}?'),
                                actions: [
                                  TextButton(
                                    onPressed: () =>
                                        Navigator.pop(ctx, false),
                                    child: Text(ctx.tr('cancel')),
                                  ),
                                  TextButton(
                                    onPressed: () =>
                                        Navigator.pop(ctx, true),
                                    child: Text(
                                      ctx.tr('delete'),
                                      style: const TextStyle(
                                          color: AppColors.error),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                          onDismissed: (dir) {
                            if (dir == DismissDirection.endToStart) {
                              _directDelete(m);
                            }
                          },
                          // Swipe-right background: blue edit
                          background: Container(
                            margin:
                                const EdgeInsets.symmetric(vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                  color: AppColors.primary
                                      .withValues(alpha: 0.4)),
                            ),
                            alignment: AlignmentDirectional.centerStart,
                            padding: const EdgeInsets.only(left: 20),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.edit_rounded,
                                    color: AppColors.primary, size: 24),
                                const SizedBox(width: 8),
                                Text(
                                  context.tr('edit'),
                                  style: const TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Swipe-left secondary background: red delete
                          secondaryBackground: Container(
                            margin:
                                const EdgeInsets.symmetric(vertical: 2),
                            decoration: BoxDecoration(
                              color:
                                  AppColors.error.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(16),
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
                          child: _Tile(
                            item: m,
                            onEdit: () => _edit(m),
                            onDelete: () => _delete(m),
                          ),
                        );
                      },
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

enum _DueStatus { overdue, dueSoon, ok, unknown }

class _MaintenanceStats {
  final int total;
  final int overdue;
  final int dueSoon;

  const _MaintenanceStats({
    required this.total,
    required this.overdue,
    required this.dueSoon,
  });

  factory _MaintenanceStats.from(List<MaintenanceModel> items) {
    int overdue = 0;
    int dueSoon = 0;
    for (final m in items) {
      switch (_dueStatus(m.endDate)) {
        case _DueStatus.overdue:
          overdue++;
          break;
        case _DueStatus.dueSoon:
          dueSoon++;
          break;
        case _DueStatus.ok:
        case _DueStatus.unknown:
          break;
      }
    }
    return _MaintenanceStats(
      total: items.length,
      overdue: overdue,
      dueSoon: dueSoon,
    );
  }
}

_DueStatus _dueStatus(DateTime? nextDue) {
  if (nextDue == null) return _DueStatus.unknown;
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final due = DateTime(nextDue.year, nextDue.month, nextDue.day);
  final diff = due.difference(today).inDays;
  if (diff < 0) return _DueStatus.overdue;
  if (diff <= 7) return _DueStatus.dueSoon;
  return _DueStatus.ok;
}

Color _statusColor(BuildContext context, _DueStatus status) {
  switch (status) {
    case _DueStatus.overdue:
      return AppColors.error;
    case _DueStatus.dueSoon:
      return AppColors.warning;
    case _DueStatus.ok:
      return AppColors.success;
    case _DueStatus.unknown:
      return context.textMutedColor;
  }
}

(IconData, Color) _serviceIconFor(String type) {
  final t = type.toLowerCase();
  if (t.contains('oil')) return (Icons.opacity_rounded, Colors.amber);
  if (t.contains('tire') || t.contains('tyre')) {
    return (Icons.trip_origin_rounded, Colors.blue);
  }
  if (t.contains('brake')) return (Icons.disc_full_rounded, Colors.red);
  if (t.contains('battery')) return (Icons.battery_full_rounded, Colors.green);
  return (Icons.build_rounded, Colors.grey);
}

String _serviceTypeLabel(BuildContext context, String type) {
  final t = type.toLowerCase();
  if (t.contains('oil')) return context.tr('oil_change');
  if (t.contains('tire') || t.contains('tyre')) {
    return context.tr('tire_rotation');
  }
  if (t.contains('brake')) return context.tr('brake_service');
  if (t.contains('battery')) return context.tr('battery_check');
  if (t.contains('general')) return context.tr('general_service');
  return type;
}

class _SummaryBar extends StatelessWidget {
  final _MaintenanceStats stats;
  const _SummaryBar({required this.stats});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
      child: Row(
        children: [
          Expanded(
            child: _StatPill(
              label: context.tr('total'),
              value: stats.total,
              color: AppColors.primary,
              icon: Icons.build_rounded,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _StatPill(
              label: context.tr('overdue'),
              value: stats.overdue,
              color: AppColors.error,
              icon: Icons.error_outline_rounded,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _StatPill(
              label: context.tr('due_soon'),
              value: stats.dueSoon,
              color: AppColors.warning,
              icon: Icons.schedule_rounded,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  final IconData icon;
  const _StatPill({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$value',
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  label,
                  style: TextStyle(
                    color: context.textSecondaryColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
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

class _SummaryBarSkeleton extends StatelessWidget {
  const _SummaryBarSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
      child: Row(
        children: List.generate(
          3,
          (_) => Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 5),
              child: Container(
                height: 52,
                decoration: BoxDecoration(
                  color: context.cardElevatedColor,
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  final MaintenanceModel item;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  const _Tile({
    required this.item,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final status = _dueStatus(item.endDate);
    final statusColor = _statusColor(context, status);
    final (icon, iconColor) = _serviceIconFor(item.type);
    final typeLabel = _serviceTypeLabel(context, item.type);

    return InkWell(
      onTap: onEdit,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          gradient: context.cardGradientColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: context.dividerColor),
          // Left colored border via a Border object is uniform; use a Stack
          // overlay through a BoxDecoration trick: paint a leading bar.
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Left colored border (4px, rounded matches card)
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: statusColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top row: icon + name + status badge
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: iconColor.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(icon, color: iconColor, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            typeLabel,
                            style: TextStyle(
                              color: context.textPrimaryColor,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (status == _DueStatus.overdue ||
                            status == _DueStatus.dueSoon) ...[
                          const SizedBox(width: 8),
                          _StatusBadge(
                            label: status == _DueStatus.overdue
                                ? context.tr('overdue').toUpperCase()
                                : context.tr('due_soon').toUpperCase(),
                            color: statusColor,
                          ),
                        ],
                        IconButton(
                          icon: const Icon(Icons.edit_outlined, size: 20),
                          color: AppColors.primary,
                          onPressed: onEdit,
                          tooltip: context.tr('edit'),
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(
                            minWidth: 36,
                            minHeight: 36,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    // Middle row: vehicle + last service
                    Row(
                      children: [
                        if (item.carName != null) ...[
                          Icon(
                            Icons.directions_car_rounded,
                            size: 14,
                            color: context.textMutedColor,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              item.carName!,
                              style: TextStyle(
                                color: context.textSecondaryColor,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 10),
                        ],
                        if (item.startDate != null) ...[
                          Icon(
                            Icons.history_rounded,
                            size: 14,
                            color: context.textMutedColor,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              '${context.tr('last_service')}: '
                              '${DateFormat('MMM d, yyyy').format(item.startDate!)}',
                              style: TextStyle(
                                color: context.textMutedColor,
                                fontSize: 11,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),
                    // Bottom row: next due + countdown
                    if (item.endDate != null) ...[
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(
                            Icons.event_rounded,
                            size: 14,
                            color: statusColor,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${context.tr('next_due')}: '
                            '${DateFormat('MMM d, yyyy').format(item.endDate!)}',
                            style: TextStyle(
                              color: context.textSecondaryColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 8),
                          _CountdownChip(
                            nextDue: item.endDate!,
                            color: statusColor,
                          ),
                          const Spacer(),
                          IconButton(
                            icon: const Icon(
                              Icons.delete_outline,
                              color: AppColors.error,
                              size: 20,
                            ),
                            onPressed: onDelete,
                            visualDensity: VisualDensity.compact,
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(
                              minWidth: 32,
                              minHeight: 32,
                            ),
                          ),
                        ],
                      ),
                    ] else ...[
                      const SizedBox(height: 6),
                      Align(
                        alignment: AlignmentDirectional.centerEnd,
                        child: IconButton(
                          icon: const Icon(
                            Icons.delete_outline,
                            color: AppColors.error,
                            size: 20,
                          ),
                          onPressed: onDelete,
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(
                            minWidth: 32,
                            minHeight: 32,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String label;
  final Color color;
  const _StatusBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

class _CountdownChip extends StatelessWidget {
  final DateTime nextDue;
  final Color color;
  const _CountdownChip({required this.nextDue, required this.color});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final due = DateTime(nextDue.year, nextDue.month, nextDue.day);
    final diff = due.difference(today).inDays;
    final String text;
    if (diff < 0) {
      text = '${-diff} ${context.tr('days_ago')}';
    } else if (diff == 0) {
      text = context.tr('due_soon');
    } else {
      text = context.tr('in_days').replaceAll('{n}', '$diff');
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _MaintenanceForm extends StatefulWidget {
  final MaintenanceModel? existing;
  const _MaintenanceForm({this.existing});

  @override
  State<_MaintenanceForm> createState() => _MaintenanceFormState();
}

class _MaintenanceFormState extends State<_MaintenanceForm> {
  static const _serviceTypes = <String>[
    'oil_change',
    'tire_rotation',
    'brake_service',
    'battery_check',
    'general_service',
  ];

  late final TextEditingController _period;
  late final TextEditingController _notes;
  String? _serviceType;
  DateTime? _start;
  DateTime? _nextDue;
  String? _carId;

  @override
  void initState() {
    super.initState();
    _period = TextEditingController(text: widget.existing?.period ?? '');
    _notes = TextEditingController(text: widget.existing?.notes ?? '');
    _start = widget.existing?.startDate ?? DateTime.now();
    _nextDue = widget.existing?.endDate;
    _carId = widget.existing?.carId;
    _serviceType = _matchServiceType(widget.existing?.type);
  }

  String? _matchServiceType(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    final t = raw.toLowerCase();
    if (t.contains('oil')) return 'oil_change';
    if (t.contains('tire') || t.contains('tyre')) return 'tire_rotation';
    if (t.contains('brake')) return 'brake_service';
    if (t.contains('battery')) return 'battery_check';
    if (t.contains('general')) return 'general_service';
    // Custom / unknown — fall back to null so dropdown shows placeholder,
    // but we still keep the raw value when saving by preferring _serviceType
    // if set, else the existing type.
    return null;
  }

  @override
  void dispose() {
    _period.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickStart() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _start ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 2)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _start = picked);
  }

  Future<void> _pickNextDue() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _nextDue ?? DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
    );
    if (picked != null) setState(() => _nextDue = picked);
  }

  @override
  Widget build(BuildContext context) {
    final items = context.read<FleetCubit>().state.items;
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
            const SizedBox(height: 18),
            Text(
              widget.existing == null
                  ? context.tr('new_maintenance')
                  : context.tr('edit'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _carId,
              style: TextStyle(color: context.textPrimaryColor, fontSize: 15),
              decoration: InputDecoration(
                labelText: context.tr('vehicle'),
                prefixIcon: const Icon(Icons.directions_car_rounded),
              ),
              dropdownColor: context.cardColor,
              items: items
                  .map(
                    (e) => DropdownMenuItem(
                      value: e.carId,
                      child: Text('${e.carName} • ${e.licensePlate}'),
                    ),
                  )
                  .toList(),
              onChanged: (v) => setState(() => _carId = v),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _serviceType,
              style: TextStyle(color: context.textPrimaryColor, fontSize: 15),
              decoration: InputDecoration(
                labelText: context.tr('service_type'),
                prefixIcon: const Icon(Icons.build_rounded),
              ),
              dropdownColor: context.cardColor,
              items: _serviceTypes
                  .map(
                    (t) => DropdownMenuItem(
                      value: t,
                      child: Row(
                        children: [
                          Icon(
                            _serviceIconFor(t).$1,
                            size: 18,
                            color: _serviceIconFor(t).$2,
                          ),
                          const SizedBox(width: 10),
                          Text(_serviceTypeLabel(context, t)),
                        ],
                      ),
                    ),
                  )
                  .toList(),
              onChanged: (v) => setState(() => _serviceType = v),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _period,
              decoration: InputDecoration(
                labelText: context.tr('period'),
                prefixIcon: const Icon(Icons.timelapse_rounded),
              ),
            ),
            const SizedBox(height: 12),
            _DateField(
              label: context.tr('last_service'),
              icon: Icons.history_rounded,
              date: _start,
              onTap: _pickStart,
            ),
            const SizedBox(height: 12),
            _DateField(
              label: context.tr('next_due'),
              icon: Icons.event_rounded,
              date: _nextDue,
              onTap: _pickNextDue,
              accent: AppColors.warning,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notes,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: context.tr('description'),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  final type = _serviceType ?? widget.existing?.type ?? '';
                  if (type.trim().isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(context.tr('name_required'))),
                    );
                    return;
                  }
                  Navigator.pop(
                    context,
                    MaintenanceModel(
                      id: widget.existing?.id ?? '',
                      carId: _carId,
                      type: type,
                      period: _period.text.trim().isEmpty
                          ? null
                          : _period.text.trim(),
                      startDate: _start,
                      endDate: _nextDue,
                      notes:
                          _notes.text.trim().isEmpty ? null : _notes.text.trim(),
                    ),
                  );
                },
                icon: const Icon(Icons.check_rounded),
                label: Text(context.tr('save')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  final String label;
  final IconData icon;
  final DateTime? date;
  final VoidCallback onTap;
  final Color? accent;

  const _DateField({
    required this.label,
    required this.icon,
    required this.date,
    required this.onTap,
    this.accent,
  });

  @override
  Widget build(BuildContext context) {
    final color = accent ?? AppColors.primary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: context.dividerColor),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    date == null
                        ? context.tr('pick_date')
                        : DateFormat('MMM d, yyyy').format(date!),
                    style: TextStyle(
                      color: context.textPrimaryColor,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.calendar_today_rounded,
              color: context.textMutedColor,
              size: 18,
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Status filter chip for maintenance screen
// ============================================================================

class _StatusFilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _StatusFilterChip({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? color : color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(30),
          border: Border.all(
            color: selected ? color : color.withValues(alpha: 0.3),
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : color,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
