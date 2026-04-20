import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../widgets/common/app_error.dart';

const _kCargoKey = 'cargo_items';

class CargoItem {
  final String id;
  final String name;
  final String vehicleId;
  final String vehicleName;
  final String type; // cargo | equipment | asset
  final String status; // loading | in_transit | delivered | stored
  final double weight;
  final String description;
  final String trackingNumber;
  final DateTime? estimatedDelivery;
  final String notes;

  const CargoItem({
    required this.id,
    required this.name,
    required this.vehicleId,
    required this.vehicleName,
    required this.type,
    required this.status,
    required this.weight,
    required this.description,
    required this.trackingNumber,
    required this.estimatedDelivery,
    required this.notes,
  });

  factory CargoItem.fromJson(Map<String, dynamic> j) => CargoItem(
        id: (j['id'] ?? '').toString(),
        name: (j['name'] ?? '').toString(),
        vehicleId: (j['vehicleId'] ?? '').toString(),
        vehicleName: (j['vehicleName'] ?? '').toString(),
        type: (j['type'] ?? 'cargo').toString(),
        status: (j['status'] ?? 'loading').toString(),
        weight: (j['weight'] is num) ? (j['weight'] as num).toDouble() : 0,
        description: (j['description'] ?? '').toString(),
        trackingNumber: (j['trackingNumber'] ?? '').toString(),
        estimatedDelivery: j['estimatedDelivery'] != null
            ? DateTime.tryParse(j['estimatedDelivery'].toString())
            : null,
        notes: (j['notes'] ?? '').toString(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'vehicleId': vehicleId,
        'vehicleName': vehicleName,
        'type': type,
        'status': status,
        'weight': weight,
        'description': description,
        'trackingNumber': trackingNumber,
        'estimatedDelivery': estimatedDelivery?.toIso8601String(),
        'notes': notes,
      };

  CargoItem copyWith({
    String? name,
    String? vehicleId,
    String? vehicleName,
    String? type,
    String? status,
    double? weight,
    String? description,
    String? trackingNumber,
    DateTime? estimatedDelivery,
    bool clearEta = false,
    String? notes,
  }) =>
      CargoItem(
        id: id,
        name: name ?? this.name,
        vehicleId: vehicleId ?? this.vehicleId,
        vehicleName: vehicleName ?? this.vehicleName,
        type: type ?? this.type,
        status: status ?? this.status,
        weight: weight ?? this.weight,
        description: description ?? this.description,
        trackingNumber: trackingNumber ?? this.trackingNumber,
        estimatedDelivery: clearEta
            ? null
            : (estimatedDelivery ?? this.estimatedDelivery),
        notes: notes ?? this.notes,
      );
}

class CargoScreen extends StatefulWidget {
  const CargoScreen({super.key});

  @override
  State<CargoScreen> createState() => _CargoScreenState();
}

class _CargoScreenState extends State<CargoScreen>
    with SingleTickerProviderStateMixin {
  List<CargoItem> _items = const [];
  bool _loading = true;
  String? _error;
  late final TabController _tab;
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 4, vsync: this);
    _tab.addListener(() {
      if (!_tab.indexIsChanging) setState(() {});
    });
    _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kCargoKey);
      final list = <CargoItem>[];
      if (raw != null && raw.isNotEmpty) {
        final decoded = json.decode(raw);
        if (decoded is List) {
          for (final e in decoded) {
            if (e is Map<String, dynamic>) {
              list.add(CargoItem.fromJson(e));
            }
          }
        }
      }
      if (!mounted) return;
      setState(() {
        _items = list;
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

  Future<void> _persist(List<CargoItem> list) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _kCargoKey,
      json.encode(list.map((e) => e.toJson()).toList()),
    );
  }

  Future<void> _openForm({CargoItem? existing}) async {
    final vehicles = context.read<FleetCubit>().state.items;
    final result = await showModalBottomSheet<CargoItem>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _CargoForm(
        existing: existing,
        vehicles: vehicles,
      ),
    );
    if (result == null) return;
    final updated = <CargoItem>[..._items];
    final idx = updated.indexWhere((e) => e.id == result.id);
    if (idx == -1) {
      updated.insert(0, result);
    } else {
      updated[idx] = result;
    }
    await _persist(updated);
    if (!mounted) return;
    setState(() => _items = updated);
  }

  Future<void> _delete(CargoItem item) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.surfaceColor,
        title: Text(ctx.tr('confirm_delete')),
        content: Text('${ctx.tr('delete_geofence_msg')} "${item.name}"?'),
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
    final updated = _items.where((e) => e.id != item.id).toList();
    await _persist(updated);
    if (!mounted) return;
    setState(() => _items = updated);
  }

  List<CargoItem> get _filtered {
    final q = _searchCtrl.text.trim().toLowerCase();
    List<CargoItem> base;
    switch (_tab.index) {
      case 1:
        base = _items.where((e) => e.status == 'in_transit').toList();
        break;
      case 2:
        base = _items.where((e) => e.status == 'delivered').toList();
        break;
      case 3:
        base = _items.where((e) => e.status == 'stored').toList();
        break;
      default:
        base = _items;
    }
    if (q.isEmpty) return base;
    return base.where((e) {
      return e.name.toLowerCase().contains(q) ||
          e.vehicleName.toLowerCase().contains(q) ||
          e.trackingNumber.toLowerCase().contains(q) ||
          e.description.toLowerCase().contains(q);
    }).toList();
  }

  int _count(String status) =>
      _items.where((e) => e.status == status).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(context.tr('cargo_assets')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: TabBar(
            controller: _tab,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            indicatorColor: AppColors.primary,
            labelColor: context.textPrimaryColor,
            unselectedLabelColor: context.textMutedColor,
            tabs: [
              Tab(text: context.tr('all')),
              Tab(text: context.tr('in_transit')),
              Tab(text: context.tr('delivered')),
              Tab(text: context.tr('stored')),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.black,
        onPressed: () => _openForm(),
        icon: const Icon(Icons.add_rounded),
        label: Text(context.tr('add')),
      ),
      body: _loading
          ? const _CargoSkeleton()
          : _error != null
              ? AppError(message: _error!, onRetry: _load)
              : _buildBody(),
    );
  }

  Widget _buildBody() {
    final filtered = _filtered;
    return Column(
      children: [
        _SummaryRow(
          total: _items.length,
          inTransit: _count('in_transit'),
          delivered: _count('delivered'),
          stored: _count('stored'),
        ).animate().fadeIn(duration: 300.ms),
        // Search bar
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: TextField(
            controller: _searchCtrl,
            onChanged: (_) => setState(() {}),
            style: TextStyle(color: context.textPrimaryColor, fontSize: 14),
            decoration: InputDecoration(
              prefixIcon: Icon(Icons.search_rounded,
                  color: context.textMutedColor, size: 20),
              hintText: context.tr('cargo_search_hint'),
              hintStyle: TextStyle(color: context.textMutedColor, fontSize: 13),
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
                borderSide:
                    const BorderSide(color: AppColors.primary, width: 1.5),
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
        if (filtered.isEmpty)
          Expanded(
            child: EmptyState(
              title: context.tr('no_data'),
              subtitle: context.tr('no_cargo_subtitle'),
              icon: Icons.inventory_2_outlined,
            ),
          )
        else
          Expanded(
            child: RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _load,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
                itemCount: filtered.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) {
                  final item = filtered[i];
                  return Dismissible(
                    key: ValueKey('cargo_${item.id}'),
                    direction: DismissDirection.endToStart,
                    background: Container(
                      alignment: AlignmentDirectional.centerEnd,
                      padding: const EdgeInsets.only(right: 24),
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: 0.85),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(Icons.delete_outline,
                          color: Colors.white, size: 28),
                    ),
                    confirmDismiss: (_) async {
                      final ok = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: ctx.surfaceColor,
                          title: Text(ctx.tr('confirm_delete')),
                          content: Text(
                              '${ctx.tr('delete_geofence_msg')} "${item.name}"?'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx, false),
                              child: Text(ctx.tr('cancel')),
                            ),
                            TextButton(
                              onPressed: () => Navigator.pop(ctx, true),
                              child: Text(
                                ctx.tr('delete'),
                                style: const TextStyle(
                                    color: AppColors.error),
                              ),
                            ),
                          ],
                        ),
                      );
                      return ok == true;
                    },
                    onDismissed: (_) async {
                      final updated =
                          _items.where((e) => e.id != item.id).toList();
                      await _persist(updated);
                      if (!mounted) return;
                      setState(() => _items = updated);
                    },
                    child: _CargoCard(
                      item: item,
                      onEdit: () => _openForm(existing: item),
                      onDelete: () => _delete(item),
                    ),
                  )
                      .animate()
                      .fadeIn(
                        delay: (i * 40).ms,
                        duration: 300.ms,
                      )
                      .slideY(begin: 0.05, end: 0);
                },
              ),
            ),
          ),
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final int total;
  final int inTransit;
  final int delivered;
  final int stored;

  const _SummaryRow({
    required this.total,
    required this.inTransit,
    required this.delivered,
    required this.stored,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          Expanded(
            child: _SummaryTile(
              label: context.tr('total'),
              value: total.toString(),
              color: context.textPrimaryColor,
              icon: Icons.inventory_2_rounded,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _SummaryTile(
              label: context.tr('in_transit'),
              value: inTransit.toString(),
              color: AppColors.secondary,
              icon: Icons.local_shipping_rounded,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _SummaryTile(
              label: context.tr('delivered'),
              value: delivered.toString(),
              color: AppColors.success,
              icon: Icons.task_alt_rounded,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _SummaryTile(
              label: context.tr('stored'),
              value: stored.toString(),
              color: context.textMutedColor,
              icon: Icons.warehouse_rounded,
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryTile extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  const _SummaryTile({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 18,
              fontWeight: FontWeight.w800,
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
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _CargoCard extends StatelessWidget {
  final CargoItem item;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _CargoCard({
    required this.item,
    required this.onEdit,
    required this.onDelete,
  });

  Color _borderColor(BuildContext context) {
    switch (item.status) {
      case 'in_transit':
        return AppColors.secondary;
      case 'delivered':
        return AppColors.success;
      case 'loading':
        return AppColors.warning;
      case 'stored':
      default:
        return context.textMutedColor;
    }
  }

  IconData _typeIcon() {
    switch (item.type) {
      case 'equipment':
        return Icons.handyman_rounded;
      case 'asset':
        return Icons.business_center_rounded;
      case 'cargo':
      default:
        return Icons.inventory_2_rounded;
    }
  }

  String _statusLabel(BuildContext context) {
    switch (item.status) {
      case 'in_transit':
        return context.tr('in_transit');
      case 'delivered':
        return context.tr('delivered');
      case 'loading':
        return context.tr('loading_status');
      case 'stored':
      default:
        return context.tr('stored');
    }
  }

  String _typeLabel(BuildContext context) {
    switch (item.type) {
      case 'equipment':
        return context.tr('equipment');
      case 'asset':
        return context.tr('asset');
      case 'cargo':
      default:
        return context.tr('cargo');
    }
  }

  @override
  Widget build(BuildContext context) {
    final border = _borderColor(context);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onEdit,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(16),
            border: Border(
              left: BorderSide(color: border, width: 4),
              top: BorderSide(color: context.dividerColor),
              right: BorderSide(color: context.dividerColor),
              bottom: BorderSide(color: context.dividerColor),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: border.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(_typeIcon(), color: border, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.name.isEmpty ? '—' : item.name,
                          style: TextStyle(
                            color: context.textPrimaryColor,
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.accent.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                _typeLabel(context).toUpperCase(),
                                style: const TextStyle(
                                  color: AppColors.accent,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.6,
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: border.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                _statusLabel(context).toUpperCase(),
                                style: TextStyle(
                                  color: border,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.6,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (item.trackingNumber.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: context.cardElevatedColor,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: context.dividerColor),
                      ),
                      child: Text(
                        '#${item.trackingNumber}',
                        style: TextStyle(
                          color: context.textSecondaryColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.secondary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.directions_car_rounded,
                            color: AppColors.secondary, size: 14),
                        const SizedBox(width: 6),
                        ConstrainedBox(
                          constraints:
                              const BoxConstraints(maxWidth: 140),
                          child: Text(
                            item.vehicleName.isEmpty
                                ? context.tr('unassigned')
                                : item.vehicleName,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.secondary,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (item.weight > 0)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.scale_rounded,
                            size: 13, color: context.textMutedColor),
                        const SizedBox(width: 4),
                        Text(
                          '${item.weight.toStringAsFixed(0)} kg',
                          style: TextStyle(
                            color: context.textSecondaryColor,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
              if (item.estimatedDelivery != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.event_rounded,
                        size: 13, color: context.textMutedColor),
                    const SizedBox(width: 4),
                    Text(
                      '${context.tr('estimated_delivery')}: ${DateFormat('MMM d, y').format(item.estimatedDelivery!)}',
                      style: TextStyle(
                        color: context.textSecondaryColor,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    icon: Icon(Icons.edit_outlined,
                        size: 18, color: context.textSecondaryColor),
                    onPressed: onEdit,
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.delete_outline,
                        size: 18, color: AppColors.error),
                    onPressed: onDelete,
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

class _CargoForm extends StatefulWidget {
  final CargoItem? existing;
  final List<FleetItem> vehicles;

  const _CargoForm({
    required this.existing,
    required this.vehicles,
  });

  @override
  State<_CargoForm> createState() => _CargoFormState();
}

class _CargoFormState extends State<_CargoForm> {
  late final TextEditingController _name;
  late final TextEditingController _weight;
  late final TextEditingController _tracking;
  late final TextEditingController _description;
  late final TextEditingController _notes;

  late String _type;
  late String _status;
  String? _vehicleId;
  DateTime? _eta;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _name = TextEditingController(text: e?.name ?? '');
    _weight = TextEditingController(
        text: e != null && e.weight > 0 ? e.weight.toString() : '');
    _tracking = TextEditingController(text: e?.trackingNumber ?? '');
    _description = TextEditingController(text: e?.description ?? '');
    _notes = TextEditingController(text: e?.notes ?? '');
    _type = e?.type ?? 'cargo';
    _status = e?.status ?? 'loading';
    _vehicleId = e?.vehicleId.isEmpty == true ? null : e?.vehicleId;
    _eta = e?.estimatedDelivery;
  }

  @override
  void dispose() {
    _name.dispose();
    _weight.dispose();
    _tracking.dispose();
    _description.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _eta ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
    );
    if (picked != null) {
      setState(() => _eta = picked);
    }
  }

  void _submit() {
    final nav = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    if (_name.text.trim().isEmpty) {
      messenger.showSnackBar(
        SnackBar(content: Text(context.tr('name_required'))),
      );
      return;
    }
    FleetItem? selected;
    if (_vehicleId != null && _vehicleId!.isNotEmpty) {
      for (final v in widget.vehicles) {
        if (v.carId == _vehicleId) {
          selected = v;
          break;
        }
      }
    }
    final vehicleName = selected != null
        ? (selected.carName.isNotEmpty
            ? selected.carName
            : (selected.licensePlate.isNotEmpty
                ? selected.licensePlate
                : (_vehicleId ?? '')))
        : '';
    final weight =
        double.tryParse(_weight.text.trim().replaceAll(',', '.')) ?? 0;
    final id = widget.existing?.id ??
        DateTime.now().microsecondsSinceEpoch.toString();

    nav.pop(
      CargoItem(
        id: id,
        name: _name.text.trim(),
        vehicleId: _vehicleId ?? '',
        vehicleName: vehicleName,
        type: _type,
        status: _status,
        weight: weight,
        description: _description.text.trim(),
        trackingNumber: _tracking.text.trim(),
        estimatedDelivery: _eta,
        notes: _notes.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
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
                  ? context.tr('add')
                  : context.tr('edit'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _name,
              decoration: InputDecoration(labelText: context.tr('name')),
            ),
            const SizedBox(height: 14),
            Text(
              context.tr('type'),
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: [
                _TypeChip(
                  label: context.tr('cargo'),
                  selected: _type == 'cargo',
                  onTap: () => setState(() => _type = 'cargo'),
                ),
                _TypeChip(
                  label: context.tr('equipment'),
                  selected: _type == 'equipment',
                  onTap: () => setState(() => _type = 'equipment'),
                ),
                _TypeChip(
                  label: context.tr('asset'),
                  selected: _type == 'asset',
                  onTap: () => setState(() => _type = 'asset'),
                ),
              ],
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              value: _vehicleId,
              isExpanded: true,
              decoration: InputDecoration(
                labelText: context.tr('vehicle'),
              ),
              items: [
                DropdownMenuItem<String>(
                  value: null,
                  child: Text(
                    context.tr('unassigned'),
                    style: TextStyle(color: context.textMutedColor),
                  ),
                ),
                for (final v in widget.vehicles)
                  DropdownMenuItem<String>(
                    value: v.carId,
                    child: Text(
                      v.carName.isEmpty
                          ? (v.licensePlate.isEmpty
                              ? v.carId
                              : v.licensePlate)
                          : v.carName,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
              onChanged: (v) => setState(() => _vehicleId = v),
            ),
            const SizedBox(height: 14),
            Text(
              context.tr('status'),
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                _TypeChip(
                  label: context.tr('loading_status'),
                  selected: _status == 'loading',
                  color: AppColors.warning,
                  onTap: () => setState(() => _status = 'loading'),
                ),
                _TypeChip(
                  label: context.tr('in_transit'),
                  selected: _status == 'in_transit',
                  color: AppColors.secondary,
                  onTap: () => setState(() => _status = 'in_transit'),
                ),
                _TypeChip(
                  label: context.tr('delivered'),
                  selected: _status == 'delivered',
                  color: AppColors.success,
                  onTap: () => setState(() => _status = 'delivered'),
                ),
                _TypeChip(
                  label: context.tr('stored'),
                  selected: _status == 'stored',
                  color: context.textMutedColor,
                  onTap: () => setState(() => _status = 'stored'),
                ),
              ],
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _weight,
              keyboardType: const TextInputType.numberWithOptions(
                  decimal: true, signed: false),
              decoration: InputDecoration(
                labelText: context.tr('weight_kg'),
                suffixText: 'kg',
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _tracking,
              decoration:
                  InputDecoration(labelText: context.tr('tracking_number')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _description,
              maxLines: 2,
              decoration:
                  InputDecoration(labelText: context.tr('description')),
            ),
            const SizedBox(height: 10),
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(12),
              child: InputDecorator(
                decoration: InputDecoration(
                  labelText: context.tr('estimated_delivery'),
                  suffixIcon: const Icon(Icons.event_rounded),
                ),
                child: Text(
                  _eta != null
                      ? DateFormat('EEE, MMM d, y').format(_eta!)
                      : context.tr('pick_date'),
                  style: TextStyle(
                    color: _eta != null
                        ? context.textPrimaryColor
                        : context.textMutedColor,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _notes,
              maxLines: 2,
              decoration: InputDecoration(labelText: context.tr('notes')),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: _submit,
                icon: const Icon(Icons.save_rounded),
                label: Text(context.tr('save')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Color? color;

  const _TypeChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.primary;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? c.withValues(alpha: 0.18) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected
                  ? c
                  : context.dividerColor,
              width: selected ? 1.4 : 1,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? c : context.textSecondaryColor,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class _CargoSkeleton extends StatelessWidget {
  const _CargoSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, i) => Container(
        height: 110,
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: context.dividerColor),
        ),
      )
          .animate(onPlay: (c) => c.repeat(reverse: true))
          .fadeIn(duration: 500.ms, delay: (i * 80).ms)
          .then()
          .fadeOut(duration: 700.ms),
    );
  }
}
