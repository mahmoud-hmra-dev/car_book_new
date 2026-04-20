import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../widgets/common/app_error.dart';

/// Vehicle documents screen with expiry tracking.
///
/// Data persisted locally in SharedPreferences under `'vehicle_docs_$carId'`.
class DocumentsScreen extends StatefulWidget {
  final String carId;
  const DocumentsScreen({super.key, required this.carId});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

const List<String> _kDocTypes = [
  'Registration',
  'Insurance',
  'Annual Inspection',
  'Driver License',
  'Road Tax',
  'Customs Declaration',
  'Other',
];

IconData _iconForDocType(String type) {
  switch (type) {
    case 'Registration':
      return Icons.article_rounded;
    case 'Insurance':
      return Icons.shield_rounded;
    case 'Annual Inspection':
      return Icons.fact_check_rounded;
    case 'Driver License':
      return Icons.badge_rounded;
    case 'Road Tax':
      return Icons.receipt_long_rounded;
    case 'Customs Declaration':
      return Icons.inventory_2_rounded;
    default:
      return Icons.description_rounded;
  }
}

class VehicleDocument {
  final String id;
  final String carId;
  final String type;
  final String number;
  final DateTime issueDate;
  final DateTime expiryDate;
  final String issuingAuthority;
  final String notes;

  const VehicleDocument({
    required this.id,
    required this.carId,
    required this.type,
    required this.number,
    required this.issueDate,
    required this.expiryDate,
    required this.issuingAuthority,
    required this.notes,
  });

  int get daysUntilExpiry {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final exp =
        DateTime(expiryDate.year, expiryDate.month, expiryDate.day);
    return exp.difference(today).inDays;
  }

  bool get isExpired => daysUntilExpiry < 0;
  bool get isExpiringSoon =>
      !isExpired && daysUntilExpiry <= 30;

  factory VehicleDocument.fromJson(Map<String, dynamic> j) {
    return VehicleDocument(
      id: (j['id'] ?? '').toString(),
      carId: (j['carId'] ?? '').toString(),
      type: (j['type'] ?? 'Other').toString(),
      number: (j['number'] ?? '').toString(),
      issueDate:
          DateTime.tryParse(j['issueDate']?.toString() ?? '') ?? DateTime.now(),
      expiryDate: DateTime.tryParse(j['expiryDate']?.toString() ?? '') ??
          DateTime.now(),
      issuingAuthority: (j['issuingAuthority'] ?? '').toString(),
      notes: (j['notes'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'carId': carId,
        'type': type,
        'number': number,
        'issueDate': issueDate.toIso8601String(),
        'expiryDate': expiryDate.toIso8601String(),
        'issuingAuthority': issuingAuthority,
        'notes': notes,
      };
}

String _prefsKey(String carId) => 'vehicle_docs_$carId';

class _DocumentsScreenState extends State<DocumentsScreen> {
  List<VehicleDocument> _docs = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey(widget.carId));
    final list = <VehicleDocument>[];
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = json.decode(raw);
        if (decoded is List) {
          for (final e in decoded) {
            if (e is Map) {
              list.add(
                VehicleDocument.fromJson(Map<String, dynamic>.from(e)),
              );
            }
          }
        }
      } catch (_) {
        // ignore malformed
      }
    }
    list.sort((a, b) => a.expiryDate.compareTo(b.expiryDate));
    if (!mounted) return;
    setState(() {
      _docs = list;
      _loading = false;
    });
  }

  Future<void> _save(List<VehicleDocument> list) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = json.encode(list.map((e) => e.toJson()).toList());
    await prefs.setString(_prefsKey(widget.carId), encoded);
  }

  Future<void> _addOrEdit({VehicleDocument? existing}) async {
    final result = await showModalBottomSheet<VehicleDocument>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _DocumentForm(
        carId: widget.carId,
        existing: existing,
      ),
    );
    if (result == null) return;
    final list = [..._docs];
    if (existing == null) {
      list.add(result);
    } else {
      final idx = list.indexWhere((e) => e.id == existing.id);
      if (idx >= 0) list[idx] = result;
    }
    list.sort((a, b) => a.expiryDate.compareTo(b.expiryDate));
    await _save(list);
    if (!mounted) return;
    setState(() => _docs = list);
  }

  Future<void> _delete(VehicleDocument doc) async {
    final messenger = ScaffoldMessenger.of(context);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.surfaceColor,
        title: Text(context.tr('confirm_delete')),
        content: Text(
          '${context.tr('delete')}: ${doc.type}?',
          style: TextStyle(color: ctx.textSecondaryColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(context.tr('cancel')),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(context.tr('delete')),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    final list = _docs.where((e) => e.id != doc.id).toList();
    await _save(list);
    if (!mounted) return;
    setState(() => _docs = list);
    messenger.showSnackBar(
      SnackBar(
        backgroundColor: AppColors.primaryDark,
        content: Text('${doc.type} ${context.tr('delete').toLowerCase()}d'),
      ),
    );
  }

  int get _expiredCount => _docs.where((d) => d.isExpired).length;
  int get _expiringSoonCount => _docs.where((d) => d.isExpiringSoon).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(context.tr('documents')),
            Text(
              widget.carId,
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _addOrEdit(),
        icon: const Icon(Icons.add_rounded),
        label: Text(context.tr('add')),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: _SummaryBar(
                    total: _docs.length,
                    expired: _expiredCount,
                    expiringSoon: _expiringSoonCount,
                  ),
                ),
                Expanded(
                  child: _docs.isEmpty
                      ? EmptyState(
                          title: context.tr('no_data'),
                          subtitle:
                              'Tap + to add a new document for this vehicle.',
                          icon: Icons.folder_open_rounded,
                        )
                      : ListView.separated(
                          padding:
                              const EdgeInsets.fromLTRB(16, 8, 16, 100),
                          itemCount: _docs.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (_, i) => Dismissible(
                            key: ValueKey(_docs[i].id),
                            direction: DismissDirection.endToStart,
                            background: Container(
                              alignment: Alignment.centerRight,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 20),
                              decoration: BoxDecoration(
                                color: AppColors.error.withValues(alpha: 0.8),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Icon(
                                Icons.delete_outline_rounded,
                                color: Colors.white,
                              ),
                            ),
                            confirmDismiss: (_) async {
                              final ctx = context;
                              final confirm = await showDialog<bool>(
                                context: ctx,
                                builder: (dCtx) => AlertDialog(
                                  backgroundColor: dCtx.surfaceColor,
                                  title: Text(ctx.tr('confirm_delete')),
                                  content: Text(
                                    '${ctx.tr('delete')}: ${_docs[i].type}?',
                                    style: TextStyle(
                                        color: dCtx.textSecondaryColor),
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () =>
                                          Navigator.pop(dCtx, false),
                                      child: Text(ctx.tr('cancel')),
                                    ),
                                    ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.error,
                                        foregroundColor: Colors.white,
                                      ),
                                      onPressed: () =>
                                          Navigator.pop(dCtx, true),
                                      child: Text(ctx.tr('delete')),
                                    ),
                                  ],
                                ),
                              );
                              return confirm == true;
                            },
                            onDismissed: (_) async {
                              final doc = _docs[i];
                              final list =
                                  _docs.where((e) => e.id != doc.id).toList();
                              await _save(list);
                              if (!mounted) return;
                              setState(() => _docs = list);
                            },
                            child: _DocumentCard(
                              doc: _docs[i],
                              onTap: () => _addOrEdit(existing: _docs[i]),
                              onDelete: () => _delete(_docs[i]),
                            ),
                          ),
                        ),
                ),
              ],
            ),
    );
  }
}

// =============================================================================
// Summary bar
// =============================================================================

class _SummaryBar extends StatelessWidget {
  final int total;
  final int expired;
  final int expiringSoon;

  const _SummaryBar({
    required this.total,
    required this.expired,
    required this.expiringSoon,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _SummaryTile(
          label: context.tr('total'),
          value: '$total',
          icon: Icons.folder_rounded,
          color: AppColors.primary,
        ),
        const SizedBox(width: 10),
        _SummaryTile(
          label: context.tr('expired'),
          value: '$expired',
          icon: Icons.error_outline_rounded,
          color: AppColors.error,
        ),
        const SizedBox(width: 10),
        _SummaryTile(
          label: context.tr('expiring_soon'),
          value: '$expiringSoon',
          icon: Icons.schedule_rounded,
          color: AppColors.warning,
        ),
      ],
    );
  }
}

class _SummaryTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _SummaryTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          gradient: context.cardGradientColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 14),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              value,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 22,
                fontWeight: FontWeight.w900,
                height: 1,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Document card
// =============================================================================

class _DocumentCard extends StatelessWidget {
  final VehicleDocument doc;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _DocumentCard({
    required this.doc,
    required this.onTap,
    required this.onDelete,
  });

  Color _borderColor() {
    if (doc.isExpired) return AppColors.error;
    if (doc.isExpiringSoon) return AppColors.warning;
    return AppColors.success;
  }

  String _expiryText(BuildContext context) {
    final days = doc.daysUntilExpiry;
    if (doc.isExpired) {
      final n = days.abs();
      return '$n ${context.tr('days_ago')}';
    }
    if (days == 0) return 'Expires today';
    if (days == 1) return 'Expires tomorrow';
    return 'in $days days';
  }

  @override
  Widget build(BuildContext context) {
    final borderColor = _borderColor();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
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
                Container(
                  width: 4,
                  decoration: BoxDecoration(
                    color: borderColor,
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
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: borderColor.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                _iconForDocType(doc.type),
                                color: borderColor,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    doc.type,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: context.textPrimaryColor,
                                      fontSize: 15,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    doc.number.isEmpty ? '—' : doc.number,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: context.textSecondaryColor,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(
                                Icons.delete_outline_rounded,
                                color: AppColors.error,
                              ),
                              onPressed: onDelete,
                            ),
                          ],
                        ),
                        if (doc.issuingAuthority.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Icon(
                                Icons.account_balance_outlined,
                                size: 14,
                                color: context.textMutedColor,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  doc.issuingAuthority,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: context.textSecondaryColor,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Icon(
                              Icons.event_rounded,
                              size: 14,
                              color: context.textMutedColor,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              DateFormat('MMM d, yyyy')
                                  .format(doc.expiryDate),
                              style: TextStyle(
                                color: context.textPrimaryColor,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '· ${_expiryText(context)}',
                              style: TextStyle(
                                color: context.textMutedColor,
                                fontSize: 12,
                              ),
                            ),
                            const Spacer(),
                            if (doc.isExpired)
                              _Badge(
                                label: context.tr('expired').toUpperCase(),
                                color: AppColors.error,
                              )
                            else if (doc.isExpiringSoon)
                              _Badge(
                                label:
                                    context.tr('expiring_soon').toUpperCase(),
                                color: AppColors.warning,
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

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  const _Badge({required this.label, required this.color});

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
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

// =============================================================================
// Document form (bottom sheet)
// =============================================================================

class _DocumentForm extends StatefulWidget {
  final String carId;
  final VehicleDocument? existing;
  const _DocumentForm({required this.carId, this.existing});

  @override
  State<_DocumentForm> createState() => _DocumentFormState();
}

class _DocumentFormState extends State<_DocumentForm> {
  late final TextEditingController _number;
  late final TextEditingController _authority;
  late final TextEditingController _notes;
  String _type = 'Registration';
  late DateTime _issueDate;
  late DateTime _expiryDate;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _number = TextEditingController(text: e?.number ?? '');
    _authority = TextEditingController(text: e?.issuingAuthority ?? '');
    _notes = TextEditingController(text: e?.notes ?? '');
    _type = e?.type ?? 'Registration';
    _issueDate = e?.issueDate ?? DateTime.now();
    _expiryDate = e?.expiryDate ??
        DateTime.now().add(const Duration(days: 365));
  }

  @override
  void dispose() {
    _number.dispose();
    _authority.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickIssueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _issueDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 20)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
    );
    if (picked == null) return;
    setState(() => _issueDate = picked);
  }

  Future<void> _pickExpiryDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _expiryDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 20)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 20)),
    );
    if (picked == null) return;
    setState(() => _expiryDate = picked);
  }

  void _submit() {
    final id = widget.existing?.id ??
        DateTime.now().microsecondsSinceEpoch.toString();
    Navigator.pop(
      context,
      VehicleDocument(
        id: id,
        carId: widget.carId,
        type: _type,
        number: _number.text.trim(),
        issueDate: _issueDate,
        expiryDate: _expiryDate,
        issuingAuthority: _authority.text.trim(),
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
                  ? '${context.tr('add')} — ${context.tr('documents')}'
                  : '${context.tr('edit')} — ${context.tr('documents')}',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              value: _type,
              decoration: InputDecoration(labelText: context.tr('type')),
              dropdownColor: context.cardColor,
              items: [
                for (final t in _kDocTypes)
                  DropdownMenuItem(value: t, child: Text(t)),
              ],
              onChanged: (v) {
                if (v != null) setState(() => _type = v);
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _number,
              decoration: const InputDecoration(
                labelText: 'Document Number',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _authority,
              decoration: InputDecoration(
                labelText: context.tr('issuing_authority'),
              ),
            ),
            const SizedBox(height: 12),
            _DateRow(
              label: context.tr('issue_date'),
              date: _issueDate,
              onTap: _pickIssueDate,
            ),
            const SizedBox(height: 12),
            _DateRow(
              label: context.tr('expiry_date'),
              date: _expiryDate,
              onTap: _pickExpiryDate,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notes,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: context.tr('description'),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _submit,
                child: Text(context.tr('save')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DateRow extends StatelessWidget {
  final String label;
  final DateTime date;
  final VoidCallback onTap;
  const _DateRow({
    required this.label,
    required this.date,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.dividerColor),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.calendar_today_rounded,
              color: AppColors.primary,
              size: 16,
            ),
            const SizedBox(width: 10),
            Text(
              '$label: ',
              style: TextStyle(color: context.textMutedColor, fontSize: 12),
            ),
            Text(
              DateFormat('MMM d, yyyy').format(date),
              style: TextStyle(
                color: context.textPrimaryColor,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
