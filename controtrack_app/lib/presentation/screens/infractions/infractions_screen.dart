import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../widgets/common/app_error.dart';

class InfractionModel {
  final String id;
  final String vehicleId;
  final String vehicleName;
  final String driverName;
  final String type; // speeding/parking/signal/other
  final String description;
  final DateTime date;
  final double amount;
  final String status; // pending/paid/contested

  const InfractionModel({
    required this.id,
    required this.vehicleId,
    required this.vehicleName,
    required this.driverName,
    required this.type,
    required this.description,
    required this.date,
    required this.amount,
    required this.status,
  });

  factory InfractionModel.fromJson(Map<String, dynamic> j) {
    return InfractionModel(
      id: (j['id'] ?? '').toString(),
      vehicleId: (j['vehicleId'] ?? '').toString(),
      vehicleName: (j['vehicleName'] ?? '').toString(),
      driverName: (j['driverName'] ?? '').toString(),
      type: (j['type'] ?? 'other').toString(),
      description: (j['description'] ?? '').toString(),
      date: DateTime.tryParse(j['date']?.toString() ?? '') ?? DateTime.now(),
      amount: (j['amount'] is num) ? (j['amount'] as num).toDouble() : 0,
      status: (j['status'] ?? 'pending').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'vehicleId': vehicleId,
        'vehicleName': vehicleName,
        'driverName': driverName,
        'type': type,
        'description': description,
        'date': date.toIso8601String(),
        'amount': amount,
        'status': status,
      };
}

const _kInfractionsKey = 'infractions_list';

class InfractionsScreen extends StatefulWidget {
  const InfractionsScreen({super.key});

  @override
  State<InfractionsScreen> createState() => _InfractionsScreenState();
}

class _InfractionsScreenState extends State<InfractionsScreen>
    with SingleTickerProviderStateMixin {
  List<InfractionModel> _items = const [];
  bool _loading = true;
  late final TabController _tab;

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
    super.dispose();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kInfractionsKey);
    final List<InfractionModel> list = [];
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = json.decode(raw);
        if (decoded is List) {
          for (final e in decoded) {
            if (e is Map) {
              list.add(InfractionModel.fromJson(Map<String, dynamic>.from(e)));
            }
          }
        }
      } catch (_) {
        // ignore malformed
      }
    }
    if (!mounted) return;
    setState(() {
      _items = list;
      _loading = false;
    });
  }

  Future<void> _save(List<InfractionModel> list) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = json.encode(list.map((e) => e.toJson()).toList());
    await prefs.setString(_kInfractionsKey, encoded);
  }

  Future<void> _addOrEdit({InfractionModel? existing}) async {
    final result = await showModalBottomSheet<InfractionModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _InfractionForm(existing: existing),
    );
    if (result == null) return;
    final list = [..._items];
    if (existing == null) {
      list.add(result);
    } else {
      final idx = list.indexWhere((e) => e.id == existing.id);
      if (idx >= 0) list[idx] = result;
    }
    await _save(list);
    if (!mounted) return;
    setState(() => _items = list);
  }

  Future<void> _delete(InfractionModel m) async {
    final list = _items.where((e) => e.id != m.id).toList();
    await _save(list);
    if (!mounted) return;
    setState(() => _items = list);
  }

  List<InfractionModel> _filtered() {
    switch (_tab.index) {
      case 1:
        return _items.where((e) => e.status == 'pending').toList();
      case 2:
        return _items.where((e) => e.status == 'paid').toList();
      case 3:
        return _items.where((e) => e.status == 'contested').toList();
      default:
        return _items;
    }
  }

  double get _totalAmount => _items.fold(0.0, (sum, e) => sum + e.amount);
  int get _pendingCount =>
      _items.where((e) => e.status == 'pending').length;
  int get _speedingCount => _items.where((e) => e.type == 'speeding').length;
  int get _parkingCount => _items.where((e) => e.type == 'parking').length;
  int get _signalCount => _items.where((e) => e.type == 'signal').length;
  int get _otherCount => _items.where((e) => e.type == 'other').length;

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered();
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(context.tr('traffic_infractions')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        bottom: TabBar(
          controller: _tab,
          isScrollable: true,
          labelColor: AppColors.primary,
          unselectedLabelColor: context.textSecondaryColor,
          indicatorColor: AppColors.primary,
          tabs: [
            Tab(text: context.tr('all')),
            Tab(text: context.tr('pending')),
            Tab(text: context.tr('paid')),
            Tab(text: context.tr('contested')),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _addOrEdit(),
        icon: const Icon(Icons.add_rounded),
        label: Text(context.tr('new_infraction')),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: _SummaryCard(
                    total: _totalAmount,
                    pending: _pendingCount,
                    speeding: _speedingCount,
                    parking: _parkingCount,
                    signal: _signalCount,
                    other: _otherCount,
                  ),
                ),
                Expanded(
                  child: filtered.isEmpty
                      ? EmptyState(
                          title: context.tr('no_infractions'),
                          subtitle: context.tr('no_infractions_subtitle'),
                          icon: Icons.receipt_long_rounded,
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (_, i) => _InfractionTile(
                            model: filtered[i],
                            onEdit: () => _addOrEdit(existing: filtered[i]),
                            onDelete: () => _delete(filtered[i]),
                          ),
                        ),
                ),
              ],
            ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final double total;
  final int pending;
  final int speeding;
  final int parking;
  final int signal;
  final int other;
  const _SummaryCard({
    required this.total,
    required this.pending,
    required this.speeding,
    required this.parking,
    required this.signal,
    required this.other,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.error.withValues(alpha: 0.15),
            AppColors.warning.withValues(alpha: 0.08),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.receipt_long_rounded,
                    color: AppColors.error, size: 18),
              ),
              const SizedBox(width: 10),
              Text(
                context.tr('total_fines').toUpperCase(),
                style: TextStyle(
                  color: context.textMutedColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            total.toStringAsFixed(2),
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 36,
              fontWeight: FontWeight.w900,
              letterSpacing: -1,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: AppColors.warning.withValues(alpha: 0.45)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.schedule_rounded,
                        color: AppColors.warning, size: 12),
                    const SizedBox(width: 4),
                    Text(
                      '$pending ${context.tr('pending_count').toLowerCase()}',
                      style: const TextStyle(
                        color: AppColors.warning,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Type breakdown row
          Row(
            children: [
              _TypeChip(
                label: context.tr('speeding'),
                count: speeding,
                color: AppColors.error,
                icon: Icons.speed_rounded,
              ),
              const SizedBox(width: 8),
              _TypeChip(
                label: context.tr('parking'),
                count: parking,
                color: AppColors.secondary,
                icon: Icons.local_parking_rounded,
              ),
              const SizedBox(width: 8),
              _TypeChip(
                label: context.tr('signal'),
                count: signal,
                color: AppColors.warning,
                icon: Icons.traffic_rounded,
              ),
              const SizedBox(width: 8),
              _TypeChip(
                label: context.tr('other'),
                count: other,
                color: AppColors.accent,
                icon: Icons.more_horiz_rounded,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  final IconData icon;

  const _TypeChip({
    required this.label,
    required this.count,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(height: 4),
            Text(
              '$count',
              style: TextStyle(
                color: color,
                fontSize: 16,
                fontWeight: FontWeight.w900,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                color: color.withValues(alpha: 0.8),
                fontSize: 9,
                fontWeight: FontWeight.w700,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _InfractionTile extends StatelessWidget {
  final InfractionModel model;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _InfractionTile({
    required this.model,
    required this.onEdit,
    required this.onDelete,
  });

  Color get _typeColor {
    switch (model.type) {
      case 'speeding':
        return AppColors.error;
      case 'parking':
        return AppColors.secondary;
      case 'signal':
        return AppColors.warning;
      default:
        return AppColors.accent;
    }
  }

  Color get _statusColor {
    switch (model.status) {
      case 'paid':
        return AppColors.success;
      case 'contested':
        return AppColors.secondary;
      default:
        return AppColors.warning;
    }
  }

  String _typeLabel(BuildContext context) {
    switch (model.type) {
      case 'speeding':
        return context.tr('speeding');
      case 'parking':
        return context.tr('parking');
      case 'signal':
        return context.tr('signal');
      default:
        return context.tr('other');
    }
  }

  String _statusLabel(BuildContext context) {
    switch (model.status) {
      case 'paid':
        return context.tr('paid');
      case 'contested':
        return context.tr('contested');
      default:
        return context.tr('pending');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onEdit,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: context.dividerColor),
          ),
          child: IntrinsicHeight(
            child: Row(
              children: [
                // Colored left border by status
                Container(
                  width: 4,
                  decoration: BoxDecoration(
                    color: _statusColor,
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
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: _typeColor.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                    color: _typeColor.withValues(alpha: 0.5)),
                              ),
                              child: Text(
                                _typeLabel(context),
                                style: TextStyle(
                                  color: _typeColor,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: _statusColor.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                    color:
                                        _statusColor.withValues(alpha: 0.5)),
                              ),
                              child: Text(
                                _statusLabel(context),
                                style: TextStyle(
                                  color: _statusColor,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline,
                                  color: AppColors.error),
                              onPressed: onDelete,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          model.vehicleName.isEmpty ? '—' : model.vehicleName,
                          style: TextStyle(
                            color: context.textPrimaryColor,
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${context.tr('driver')}: ${model.driverName.isEmpty ? "—" : model.driverName}',
                          style: TextStyle(
                              color: context.textSecondaryColor,
                              fontSize: 12),
                        ),
                        if (model.description.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            model.description,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                color: context.textSecondaryColor,
                                fontSize: 12),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Icon(Icons.calendar_today_rounded,
                                size: 13, color: context.textMutedColor),
                            const SizedBox(width: 4),
                            Text(
                              DateFormat('MMM d, yyyy').format(model.date),
                              style: TextStyle(
                                  color: context.textMutedColor, fontSize: 11),
                            ),
                            const Spacer(),
                            Text(
                              model.amount.toStringAsFixed(2),
                              style: TextStyle(
                                color: context.textPrimaryColor,
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                              ),
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
      ),
    );
  }
}

class _InfractionForm extends StatefulWidget {
  final InfractionModel? existing;
  const _InfractionForm({this.existing});

  @override
  State<_InfractionForm> createState() => _InfractionFormState();
}

class _InfractionFormState extends State<_InfractionForm> {
  late final TextEditingController _vehicleName;
  late final TextEditingController _driverName;
  late final TextEditingController _description;
  late final TextEditingController _amount;
  String _type = 'speeding';
  String _status = 'pending';
  late DateTime _date;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _vehicleName = TextEditingController(text: e?.vehicleName ?? '');
    _driverName = TextEditingController(text: e?.driverName ?? '');
    _description = TextEditingController(text: e?.description ?? '');
    _amount = TextEditingController(
        text: e?.amount != null ? e!.amount.toString() : '');
    _type = e?.type ?? 'speeding';
    _status = e?.status ?? 'pending';
    _date = e?.date ?? DateTime.now();
  }

  @override
  void dispose() {
    _vehicleName.dispose();
    _driverName.dispose();
    _description.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 5)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() => _date = picked);
  }

  @override
  Widget build(BuildContext context) {
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
                  ? context.tr('new_infraction')
                  : context.tr('edit_infraction'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _vehicleName,
              decoration: InputDecoration(labelText: context.tr('vehicle')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _driverName,
              decoration: InputDecoration(labelText: context.tr('driver')),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              value: _type,
              decoration:
                  InputDecoration(labelText: context.tr('infraction_type')),
              dropdownColor: context.cardColor,
              items: [
                DropdownMenuItem(
                    value: 'speeding', child: Text(context.tr('speeding'))),
                DropdownMenuItem(
                    value: 'parking', child: Text(context.tr('parking'))),
                DropdownMenuItem(
                    value: 'signal', child: Text(context.tr('signal'))),
                DropdownMenuItem(
                    value: 'other', child: Text(context.tr('other'))),
              ],
              onChanged: (v) {
                if (v != null) setState(() => _type = v);
              },
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _description,
              maxLines: 2,
              decoration: InputDecoration(labelText: context.tr('description')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _amount,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(labelText: context.tr('fine_amount')),
            ),
            const SizedBox(height: 10),
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: context.dividerColor),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_today_rounded,
                        color: AppColors.primary, size: 16),
                    const SizedBox(width: 10),
                    Text(
                      DateFormat('MMM d, yyyy').format(_date),
                      style: TextStyle(color: context.textPrimaryColor),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              value: _status,
              decoration: InputDecoration(labelText: context.tr('status')),
              dropdownColor: context.cardColor,
              items: [
                DropdownMenuItem(
                    value: 'pending', child: Text(context.tr('pending'))),
                DropdownMenuItem(
                    value: 'paid', child: Text(context.tr('paid'))),
                DropdownMenuItem(
                    value: 'contested', child: Text(context.tr('contested'))),
              ],
              onChanged: (v) {
                if (v != null) setState(() => _status = v);
              },
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  final amount = double.tryParse(_amount.text.trim()) ?? 0;
                  final id = widget.existing?.id ??
                      DateTime.now().microsecondsSinceEpoch.toString();
                  Navigator.pop(
                    context,
                    InfractionModel(
                      id: id,
                      vehicleId: widget.existing?.vehicleId ?? '',
                      vehicleName: _vehicleName.text.trim(),
                      driverName: _driverName.text.trim(),
                      type: _type,
                      description: _description.text.trim(),
                      date: _date,
                      amount: amount,
                      status: _status,
                    ),
                  );
                },
                child: Text(context.tr('save')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
