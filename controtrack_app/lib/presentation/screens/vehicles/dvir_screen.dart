import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../widgets/common/app_error.dart';

/// Driver Vehicle Inspection Report (DVIR) screen.
///
/// All data stored locally in SharedPreferences as JSON under
/// key `'dvir_$carId'`.
class DvirScreen extends StatefulWidget {
  final String carId;
  const DvirScreen({super.key, required this.carId});

  @override
  State<DvirScreen> createState() => _DvirScreenState();
}

/// Canonical hardcoded checklist item keys.
const List<String> _kDvirItems = [
  'Brakes',
  'Tires',
  'Lights',
  'Horn',
  'Wipers',
  'Mirrors',
  'Seatbelts',
  'Fire Extinguisher',
  'First Aid Kit',
  'Engine Oil',
  'Coolant',
  'Fuel Level',
];

IconData _iconForItem(String item) {
  switch (item) {
    case 'Brakes':
      return Icons.disc_full_rounded;
    case 'Tires':
      return Icons.tire_repair_rounded;
    case 'Lights':
      return Icons.lightbulb_outline_rounded;
    case 'Horn':
      return Icons.campaign_rounded;
    case 'Wipers':
      return Icons.water_drop_outlined;
    case 'Mirrors':
      return Icons.flip_rounded;
    case 'Seatbelts':
      return Icons.airline_seat_recline_normal_rounded;
    case 'Fire Extinguisher':
      return Icons.local_fire_department_rounded;
    case 'First Aid Kit':
      return Icons.medical_services_rounded;
    case 'Engine Oil':
      return Icons.opacity_rounded;
    case 'Coolant':
      return Icons.ac_unit_rounded;
    case 'Fuel Level':
      return Icons.local_gas_station_rounded;
    default:
      return Icons.check_circle_outline_rounded;
  }
}

class DvirReport {
  final String id;
  final String carId;
  final String driverName;
  final DateTime date;
  final String tripType; // 'pre_trip' | 'post_trip'
  final Map<String, String> items; // itemName -> ok|defect|na
  final String notes;
  final bool defectsFound;
  final bool defectsCorrected;
  final String signature;

  const DvirReport({
    required this.id,
    required this.carId,
    required this.driverName,
    required this.date,
    required this.tripType,
    required this.items,
    required this.notes,
    required this.defectsFound,
    required this.defectsCorrected,
    required this.signature,
  });

  int get defectsCount =>
      items.values.where((v) => v == 'defect').length;

  factory DvirReport.fromJson(Map<String, dynamic> j) {
    final rawItems = j['items'];
    final parsed = <String, String>{};
    if (rawItems is Map) {
      rawItems.forEach((k, v) {
        parsed[k.toString()] = v?.toString() ?? 'na';
      });
    }
    return DvirReport(
      id: (j['id'] ?? '').toString(),
      carId: (j['carId'] ?? '').toString(),
      driverName: (j['driverName'] ?? '').toString(),
      date: DateTime.tryParse(j['date']?.toString() ?? '') ?? DateTime.now(),
      tripType: (j['tripType'] ?? 'pre_trip').toString(),
      items: parsed,
      notes: (j['notes'] ?? '').toString(),
      defectsFound: j['defectsFound'] == true,
      defectsCorrected: j['defectsCorrected'] == true,
      signature: (j['signature'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'carId': carId,
        'driverName': driverName,
        'date': date.toIso8601String(),
        'tripType': tripType,
        'items': items,
        'notes': notes,
        'defectsFound': defectsFound,
        'defectsCorrected': defectsCorrected,
        'signature': signature,
      };
}

String _prefsKey(String carId) => 'dvir_$carId';

class _DvirScreenState extends State<DvirScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;
  List<DvirReport> _reports = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
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
    final raw = prefs.getString(_prefsKey(widget.carId));
    final list = <DvirReport>[];
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = json.decode(raw);
        if (decoded is List) {
          for (final e in decoded) {
            if (e is Map) {
              list.add(DvirReport.fromJson(Map<String, dynamic>.from(e)));
            }
          }
        }
      } catch (_) {
        // ignore malformed data
      }
    }
    list.sort((a, b) => b.date.compareTo(a.date));
    if (!mounted) return;
    setState(() {
      _reports = list;
      _loading = false;
    });
  }

  Future<void> _saveAll(List<DvirReport> list) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = json.encode(list.map((e) => e.toJson()).toList());
    await prefs.setString(_prefsKey(widget.carId), encoded);
  }

  Future<void> _submitNew(DvirReport report) async {
    final next = [report, ..._reports];
    next.sort((a, b) => b.date.compareTo(a.date));
    await _saveAll(next);
    if (!mounted) return;
    setState(() => _reports = next);
    _tab.animateTo(0);
  }

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
            Text(context.tr('dvir')),
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
        bottom: TabBar(
          controller: _tab,
          labelColor: AppColors.primary,
          unselectedLabelColor: context.textSecondaryColor,
          indicatorColor: AppColors.primary,
          tabs: [
            Tab(text: context.tr('history')),
            Tab(text: context.tr('new_inspection')),
          ],
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : TabBarView(
              controller: _tab,
              children: [
                _HistoryTab(reports: _reports),
                _NewInspectionTab(
                  carId: widget.carId,
                  onSubmit: _submitNew,
                ),
              ],
            ),
    );
  }
}

// =============================================================================
// History tab
// =============================================================================

class _HistoryTab extends StatelessWidget {
  final List<DvirReport> reports;
  const _HistoryTab({required this.reports});

  @override
  Widget build(BuildContext context) {
    if (reports.isEmpty) {
      return EmptyState(
        title: 'No inspections yet',
        subtitle: 'Submit an inspection from the "New Inspection" tab.',
        icon: Icons.fact_check_outlined,
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      itemCount: reports.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _HistoryCard(report: reports[i]),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  final DvirReport report;
  const _HistoryCard({required this.report});

  Color _statusColor(BuildContext context) {
    if (!report.defectsFound) return context.textMutedColor;
    if (report.defectsCorrected) return AppColors.success;
    return AppColors.error;
  }

  String _statusLabel(BuildContext context) {
    if (!report.defectsFound) return context.tr('all_ok');
    if (report.defectsCorrected) return context.tr('defects_corrected');
    return context.tr('defects_found');
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(context);
    final tripLabel = report.tripType == 'pre_trip'
        ? context.tr('pre_trip')
        : context.tr('post_trip');
    final tripColor = report.tripType == 'pre_trip'
        ? AppColors.secondary
        : AppColors.accent;

    return Container(
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
                    Row(
                      children: [
                        _Pill(
                          label: tripLabel,
                          color: tripColor,
                        ),
                        const Spacer(),
                        if (report.defectsCount > 0)
                          _Pill(
                            label:
                                '${report.defectsCount} ${context.tr('defects_found').toLowerCase()}',
                            color: AppColors.error,
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Icon(
                          Icons.calendar_today_rounded,
                          size: 14,
                          color: context.textMutedColor,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          DateFormat('MMM d, yyyy · HH:mm')
                              .format(report.date),
                          style: TextStyle(
                            color: context.textSecondaryColor,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(
                          Icons.person_rounded,
                          size: 14,
                          color: context.textMutedColor,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            report.driverName.isEmpty
                                ? '—'
                                : report.driverName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: context.textPrimaryColor,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: statusColor.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            report.defectsFound
                                ? (report.defectsCorrected
                                    ? Icons.verified_rounded
                                    : Icons.warning_amber_rounded)
                                : Icons.check_circle_rounded,
                            size: 14,
                            color: statusColor,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _statusLabel(context),
                            style: TextStyle(
                              color: statusColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (report.notes.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        report.notes,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: context.textSecondaryColor,
                          fontSize: 12,
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

class _Pill extends StatelessWidget {
  final String label;
  final Color color;
  const _Pill({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

// =============================================================================
// New Inspection tab
// =============================================================================

class _NewInspectionTab extends StatefulWidget {
  final String carId;
  final Future<void> Function(DvirReport) onSubmit;

  const _NewInspectionTab({
    required this.carId,
    required this.onSubmit,
  });

  @override
  State<_NewInspectionTab> createState() => _NewInspectionTabState();
}

class _NewInspectionTabState extends State<_NewInspectionTab>
    with AutomaticKeepAliveClientMixin {
  final TextEditingController _driverName = TextEditingController();
  final TextEditingController _notes = TextEditingController();
  final TextEditingController _signature = TextEditingController();
  String _tripType = 'pre_trip';
  bool _defectsCorrected = false;
  bool _submitting = false;
  final Map<String, String> _items = {
    for (final item in _kDvirItems) item: 'ok',
  };

  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _driverName.dispose();
    _notes.dispose();
    _signature.dispose();
    super.dispose();
  }

  bool get _anyDefect => _items.values.any((v) => v == 'defect');

  Future<void> _submit() async {
    final messenger = ScaffoldMessenger.of(context);
    final msgDriverRequired = context.tr('driver_name_required');
    final msgSigRequired = context.tr('signature_required');
    final msgSubmitted = context.tr('inspection_submitted');
    final driver = _driverName.text.trim();
    final sig = _signature.text.trim();
    if (driver.isEmpty) {
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text(msgDriverRequired),
        ),
      );
      return;
    }
    if (sig.isEmpty) {
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text(msgSigRequired),
        ),
      );
      return;
    }

    setState(() => _submitting = true);
    final report = DvirReport(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      carId: widget.carId,
      driverName: driver,
      date: DateTime.now(),
      tripType: _tripType,
      items: Map<String, String>.from(_items),
      notes: _notes.text.trim(),
      defectsFound: _anyDefect,
      defectsCorrected: _anyDefect && _defectsCorrected,
      signature: sig,
    );
    try {
      await widget.onSubmit(report);
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.primaryDark,
          content: Text(msgSubmitted),
        ),
      );
      // Reset form
      setState(() {
        _driverName.clear();
        _notes.clear();
        _signature.clear();
        _tripType = 'pre_trip';
        _defectsCorrected = false;
        for (final k in _kDvirItems) {
          _items[k] = 'ok';
        }
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final anyDefect = _anyDefect;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        // Driver name
        _SectionLabel(label: 'Driver Name'),
        const SizedBox(height: 6),
        TextField(
          controller: _driverName,
          decoration: const InputDecoration(
            hintText: 'Full name',
            prefixIcon: Icon(Icons.person_rounded),
          ),
        ),
        const SizedBox(height: 18),

        // Trip type
        _SectionLabel(label: 'Trip Type'),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _TripTypeToggle(
                label: context.tr('pre_trip'),
                icon: Icons.play_circle_outline_rounded,
                selected: _tripType == 'pre_trip',
                color: AppColors.secondary,
                onTap: () => setState(() => _tripType = 'pre_trip'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _TripTypeToggle(
                label: context.tr('post_trip'),
                icon: Icons.stop_circle_outlined,
                selected: _tripType == 'post_trip',
                color: AppColors.accent,
                onTap: () => setState(() => _tripType = 'post_trip'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),

        // Checklist
        _SectionLabel(label: 'Inspection Checklist'),
        const SizedBox(height: 10),
        for (final item in _kDvirItems) ...[
          _ChecklistRow(
            itemKey: item,
            value: _items[item] ?? 'ok',
            onChanged: (v) => setState(() => _items[item] = v),
          ),
          const SizedBox(height: 8),
        ],
        const SizedBox(height: 12),

        // Notes
        _SectionLabel(label: context.tr('description')),
        const SizedBox(height: 6),
        TextField(
          controller: _notes,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Additional notes…',
          ),
        ),
        const SizedBox(height: 18),

        // Defects corrected toggle (only if defects found)
        if (anyDefect) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: AppColors.warning.withValues(alpha: 0.35),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.warning_amber_rounded,
                  color: AppColors.warning,
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    context.tr('defects_corrected'),
                    style: TextStyle(
                      color: context.textPrimaryColor,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Switch(
                  value: _defectsCorrected,
                  activeColor: AppColors.success,
                  onChanged: (v) => setState(() => _defectsCorrected = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
        ],

        // Signature
        _SectionLabel(label: 'Signature (Initials)'),
        const SizedBox(height: 6),
        TextField(
          controller: _signature,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(
            hintText: 'e.g. JD',
            prefixIcon: Icon(Icons.draw_rounded),
          ),
        ),
        const SizedBox(height: 24),

        // Submit
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton.icon(
            onPressed: _submitting ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            icon: _submitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.black,
                    ),
                  )
                : const Icon(Icons.check_rounded),
            label: Text(
              _submitting ? 'Submitting…' : context.tr('save'),
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Text(
      label.toUpperCase(),
      style: TextStyle(
        color: context.textMutedColor,
        fontSize: 11,
        fontWeight: FontWeight.w800,
        letterSpacing: 1.2,
      ),
    );
  }
}

class _TripTypeToggle extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _TripTypeToggle({
    required this.label,
    required this.icon,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
          decoration: BoxDecoration(
            color: selected
                ? color.withValues(alpha: 0.2)
                : context.cardColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected
                  ? color.withValues(alpha: 0.7)
                  : context.dividerColor,
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 20,
                color: selected ? color : context.textMutedColor,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: selected ? color : context.textSecondaryColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChecklistRow extends StatelessWidget {
  final String itemKey;
  final String value; // ok | defect | na
  final ValueChanged<String> onChanged;

  const _ChecklistRow({
    required this.itemKey,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              _iconForItem(itemKey),
              color: AppColors.primary,
              size: 18,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              itemKey,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          _StatusButton(
            icon: Icons.check_rounded,
            color: AppColors.success,
            selected: value == 'ok',
            onTap: () => onChanged('ok'),
          ),
          const SizedBox(width: 6),
          _StatusButton(
            icon: Icons.close_rounded,
            color: AppColors.error,
            selected: value == 'defect',
            onTap: () => onChanged('defect'),
          ),
          const SizedBox(width: 6),
          _StatusButton(
            icon: Icons.remove_rounded,
            color: context.textMutedColor,
            selected: value == 'na',
            onTap: () => onChanged('na'),
          ),
        ],
      ),
    );
  }
}

class _StatusButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const _StatusButton({
    required this.icon,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: selected
                ? color.withValues(alpha: 0.22)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected
                  ? color.withValues(alpha: 0.7)
                  : context.dividerColor,
              width: selected ? 1.6 : 1,
            ),
          ),
          child: Icon(
            icon,
            size: 18,
            color: selected ? color : context.textMutedColor,
          ),
        ),
      ),
    );
  }
}
