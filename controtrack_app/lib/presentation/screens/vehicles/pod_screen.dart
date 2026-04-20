import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';

/// Record of a single proof-of-delivery event stored locally in
/// SharedPreferences under the key `pod_<carId>`.
class PodRecord {
  final String id;
  final String carId;
  final DateTime timestamp;
  final String recipientName;
  final String deliveryAddress;
  final String notes;
  final String status; // delivered | failed | partial
  final String signature; // text initials
  final double? latitude;
  final double? longitude;
  final List<String> photoNotes;

  const PodRecord({
    required this.id,
    required this.carId,
    required this.timestamp,
    required this.recipientName,
    required this.deliveryAddress,
    required this.notes,
    required this.status,
    required this.signature,
    this.latitude,
    this.longitude,
    this.photoNotes = const [],
  });

  factory PodRecord.fromJson(Map<String, dynamic> j) => PodRecord(
        id: (j['id'] ?? '').toString(),
        carId: (j['carId'] ?? '').toString(),
        timestamp: DateTime.tryParse(j['timestamp']?.toString() ?? '') ??
            DateTime.now(),
        recipientName: (j['recipientName'] ?? '').toString(),
        deliveryAddress: (j['deliveryAddress'] ?? '').toString(),
        notes: (j['notes'] ?? '').toString(),
        status: (j['status'] ?? 'delivered').toString(),
        signature: (j['signature'] ?? '').toString(),
        latitude: j['latitude'] is num ? (j['latitude'] as num).toDouble() : null,
        longitude:
            j['longitude'] is num ? (j['longitude'] as num).toDouble() : null,
        photoNotes: (j['photoNotes'] is List)
            ? List<String>.from(
                (j['photoNotes'] as List).map((e) => e.toString()))
            : const [],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'carId': carId,
        'timestamp': timestamp.toIso8601String(),
        'recipientName': recipientName,
        'deliveryAddress': deliveryAddress,
        'notes': notes,
        'status': status,
        'signature': signature,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        'photoNotes': photoNotes,
      };
}

String _podKey(String carId) => 'pod_$carId';

class PodScreen extends StatefulWidget {
  final String carId;
  const PodScreen({super.key, required this.carId});

  @override
  State<PodScreen> createState() => _PodScreenState();
}

class _PodScreenState extends State<PodScreen>
    with SingleTickerProviderStateMixin {
  List<PodRecord> _items = const [];
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
    final raw = prefs.getString(_podKey(widget.carId));
    final list = <PodRecord>[];
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = json.decode(raw);
        if (decoded is List) {
          for (final e in decoded) {
            if (e is Map) {
              list.add(PodRecord.fromJson(Map<String, dynamic>.from(e)));
            }
          }
        }
      } catch (_) {
        // ignore malformed
      }
    }
    list.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    if (!mounted) return;
    setState(() {
      _items = list;
      _loading = false;
    });
  }

  Future<void> _persist(List<PodRecord> list) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = json.encode(list.map((e) => e.toJson()).toList());
    await prefs.setString(_podKey(widget.carId), encoded);
  }

  Future<void> _addNew() async {
    final result = await showModalBottomSheet<PodRecord>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _PodForm(carId: widget.carId),
    );
    if (result == null) return;
    final list = [result, ..._items];
    await _persist(list);
    if (!mounted) return;
    setState(() => _items = list);
  }

  List<PodRecord> _filtered() {
    switch (_tab.index) {
      case 1:
        return _items.where((e) => e.status == 'delivered').toList();
      case 2:
        return _items.where((e) => e.status == 'failed').toList();
      case 3:
        return _items.where((e) => e.status == 'partial').toList();
      default:
        return _items;
    }
  }

  int get _todayCount {
    final now = DateTime.now();
    return _items
        .where((e) =>
            e.timestamp.year == now.year &&
            e.timestamp.month == now.month &&
            e.timestamp.day == now.day)
        .length;
  }

  double get _successRate {
    if (_items.isEmpty) return 0;
    final ok = _items.where((e) => e.status == 'delivered').length;
    return ok * 100.0 / _items.length;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered();
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(context.tr('proof_of_delivery')),
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
            Tab(text: context.tr('delivered')),
            Tab(text: context.tr('failed_delivery')),
            Tab(text: context.tr('partial_delivery')),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addNew,
        icon: const Icon(Icons.add_rounded),
        label: Text(context.tr('new_pod')),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                  child: _PodSummaryCard(
                    todayCount: _todayCount,
                    successRate: _successRate,
                    total: _items.length,
                  ).animate().fadeIn(duration: 300.ms),
                ),
                Expanded(
                  child: filtered.isEmpty
                      ? _EmptyState(
                          title: context.tr('pod_empty'),
                          subtitle: context.tr('pod_empty_subtitle'),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (_, i) => _PodTile(record: filtered[i])
                              .animate()
                              .fadeIn(delay: (i * 40).ms, duration: 300.ms)
                              .slideY(begin: 0.05, end: 0),
                        ),
                ),
              ],
            ),
    );
  }
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

class _PodSummaryCard extends StatelessWidget {
  final int todayCount;
  final double successRate;
  final int total;
  const _PodSummaryCard({
    required this.todayCount,
    required this.successRate,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary.withValues(alpha: 0.14),
            AppColors.secondary.withValues(alpha: 0.08),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _StatCell(
              icon: Icons.local_shipping_rounded,
              color: AppColors.primary,
              label: context.tr('deliveries_today'),
              value: '$todayCount',
            ),
          ),
          Container(
            width: 1,
            height: 42,
            color: context.dividerColor,
          ),
          Expanded(
            child: _StatCell(
              icon: Icons.trending_up_rounded,
              color: AppColors.success,
              label: context.tr('success_rate'),
              value: '${successRate.toStringAsFixed(0)}%',
            ),
          ),
          Container(
            width: 1,
            height: 42,
            color: context.dividerColor,
          ),
          Expanded(
            child: _StatCell(
              icon: Icons.inventory_2_rounded,
              color: AppColors.accent,
              label: context.tr('total'),
              value: '$total',
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCell extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;
  const _StatCell({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 6),
        Text(
          value,
          style: TextStyle(
            color: context.textPrimaryColor,
            fontSize: 18,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(color: context.textMutedColor, fontSize: 10.5),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// POD list tile
// ---------------------------------------------------------------------------

class _PodTile extends StatelessWidget {
  final PodRecord record;
  const _PodTile({required this.record});

  Color _statusColor(BuildContext context) {
    switch (record.status) {
      case 'delivered':
        return AppColors.success;
      case 'failed':
        return AppColors.error;
      case 'partial':
        return AppColors.warning;
      default:
        return context.textSecondaryColor;
    }
  }

  IconData _statusIcon() {
    switch (record.status) {
      case 'delivered':
        return Icons.check_circle_rounded;
      case 'failed':
        return Icons.cancel_rounded;
      case 'partial':
        return Icons.pie_chart_rounded;
      default:
        return Icons.help_outline_rounded;
    }
  }

  String _statusLabel(BuildContext ctx) {
    switch (record.status) {
      case 'delivered':
        return ctx.tr('delivered');
      case 'failed':
        return ctx.tr('failed_delivery');
      case 'partial':
        return ctx.tr('partial_delivery');
      default:
        return record.status;
    }
  }

  String _initials(String name) {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((e) => e.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(context);
    final hasGps = record.latitude != null && record.longitude != null;
    final initials = record.signature.trim().isNotEmpty
        ? _initials(record.signature)
        : _initials(record.recipientName);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: color.withValues(alpha: 0.45)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(_statusIcon(), color: color, size: 14),
                    const SizedBox(width: 6),
                    Text(
                      _statusLabel(context).toUpperCase(),
                      style: TextStyle(
                        color: color,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                DateFormat('MMM d, HH:mm').format(record.timestamp),
                style:
                    TextStyle(color: context.textMutedColor, fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            record.recipientName.isNotEmpty
                ? record.recipientName
                : '—',
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 15,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (record.deliveryAddress.isNotEmpty) ...[
            const SizedBox(height: 4),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.location_on_outlined,
                    color: context.textMutedColor, size: 14),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    record.deliveryAddress,
                    style: TextStyle(
                      color: context.textSecondaryColor,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ],
          if (record.notes.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              record.notes,
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 12,
                fontStyle: FontStyle.italic,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (hasGps) ...[
                Icon(Icons.my_location_rounded,
                    color: AppColors.primary, size: 14),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    '${record.latitude!.toStringAsFixed(4)}, ${record.longitude!.toStringAsFixed(4)}',
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 11,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
              const Spacer(),
              if (record.photoNotes.isNotEmpty) ...[
                Icon(Icons.photo_camera_back_rounded,
                    color: context.textMutedColor, size: 14),
                const SizedBox(width: 4),
                Text(
                  '${record.photoNotes.length}',
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

class _EmptyState extends StatelessWidget {
  final String title;
  final String subtitle;
  const _EmptyState({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.local_shipping_rounded,
                  color: AppColors.primary, size: 34),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(color: context.textMutedColor, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// POD form bottom sheet
// ---------------------------------------------------------------------------

class _PodForm extends StatefulWidget {
  final String carId;
  const _PodForm({required this.carId});

  @override
  State<_PodForm> createState() => _PodFormState();
}

class _PodFormState extends State<_PodForm> {
  final _formKey = GlobalKey<FormState>();
  final _recipient = TextEditingController();
  final _address = TextEditingController();
  final _notes = TextEditingController();
  final _signature = TextEditingController();
  final _photoInput = TextEditingController();

  String _status = 'delivered';
  double? _lat;
  double? _lng;
  bool _capturingGps = false;
  final List<String> _photoNotes = [];

  @override
  void dispose() {
    _recipient.dispose();
    _address.dispose();
    _notes.dispose();
    _signature.dispose();
    _photoInput.dispose();
    super.dispose();
  }

  Future<void> _captureGps() async {
    final messenger = ScaffoldMessenger.of(context);
    final msgLocationDenied = context.tr('location_permission_denied');
    setState(() => _capturingGps = true);
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.deniedForever ||
          perm == LocationPermission.denied) {
        if (!mounted) return;
        setState(() => _capturingGps = false);
        messenger.showSnackBar(
          SnackBar(
            backgroundColor: AppColors.error,
            content: Text(msgLocationDenied),
          ),
        );
        return;
      }
      final pos = await Geolocator.getCurrentPosition();
      if (!mounted) return;
      setState(() {
        _lat = pos.latitude;
        _lng = pos.longitude;
        _capturingGps = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _capturingGps = false);
    }
  }

  void _addPhotoNote() {
    final text = _photoInput.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _photoNotes.add('Photo ${_photoNotes.length + 1}: $text');
      _photoInput.clear();
    });
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final now = DateTime.now();
    final record = PodRecord(
      id: now.microsecondsSinceEpoch.toString(),
      carId: widget.carId,
      timestamp: now,
      recipientName: _recipient.text.trim(),
      deliveryAddress: _address.text.trim(),
      notes: _notes.text.trim(),
      status: _status,
      signature: _signature.text.trim(),
      latitude: _lat,
      longitude: _lng,
      photoNotes: List<String>.from(_photoNotes),
    );
    Navigator.pop(context, record);
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.of(context).viewInsets;
    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets.bottom),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Form(
            key: _formKey,
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
                const SizedBox(height: 16),
                Text(
                  context.tr('new_pod'),
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _recipient,
                  decoration: InputDecoration(
                    labelText: context.tr('recipient'),
                    prefixIcon: const Icon(Icons.person_rounded),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return context.tr('recipient_required');
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _address,
                  decoration: InputDecoration(
                    labelText: context.tr('delivery_address'),
                    prefixIcon: const Icon(Icons.location_on_outlined),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  context.tr('delivery_status').toUpperCase(),
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _StatusToggle(
                        label: context.tr('delivered'),
                        icon: Icons.check_circle_rounded,
                        color: AppColors.success,
                        selected: _status == 'delivered',
                        onTap: () => setState(() => _status = 'delivered'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _StatusToggle(
                        label: context.tr('partial_delivery'),
                        icon: Icons.pie_chart_rounded,
                        color: AppColors.warning,
                        selected: _status == 'partial',
                        onTap: () => setState(() => _status = 'partial'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _StatusToggle(
                        label: context.tr('failed_delivery'),
                        icon: Icons.cancel_rounded,
                        color: AppColors.error,
                        selected: _status == 'failed',
                        onTap: () => setState(() => _status = 'failed'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _notes,
                  minLines: 2,
                  maxLines: 4,
                  decoration: InputDecoration(
                    labelText: context.tr('notes'),
                    prefixIcon: const Icon(Icons.sticky_note_2_outlined),
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _signature,
                  decoration: InputDecoration(
                    labelText: context.tr('signature'),
                    hintText: 'e.g. JD',
                    prefixIcon: const Icon(Icons.edit_rounded),
                  ),
                ),
                const SizedBox(height: 14),
                _GpsCard(
                  lat: _lat,
                  lng: _lng,
                  capturing: _capturingGps,
                  onCapture: _capturingGps ? null : _captureGps,
                ),
                const SizedBox(height: 14),
                Text(
                  context.tr('photo_notes').toUpperCase(),
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _photoInput,
                        decoration: InputDecoration(
                          hintText: context.tr('add_photo_note'),
                          prefixIcon:
                              const Icon(Icons.photo_camera_back_rounded),
                        ),
                        onSubmitted: (_) => _addPhotoNote(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: _addPhotoNote,
                      icon: const Icon(Icons.add_rounded),
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.black,
                      ),
                    ),
                  ],
                ),
                if (_photoNotes.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (int i = 0; i < _photoNotes.length; i++)
                        Chip(
                          backgroundColor: context.cardElevatedColor,
                          side:
                              BorderSide(color: context.dividerColor),
                          label: Text(
                            _photoNotes[i],
                            style: TextStyle(
                              color: context.textSecondaryColor,
                              fontSize: 11,
                            ),
                          ),
                          deleteIcon:
                              const Icon(Icons.close_rounded, size: 14),
                          onDeleted: () =>
                              setState(() => _photoNotes.removeAt(i)),
                        ),
                    ],
                  ),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _submit,
                    icon: const Icon(Icons.check_rounded),
                    label: Text(context.tr('submit')),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.black,
                      padding:
                          const EdgeInsets.symmetric(vertical: 14),
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

class _StatusToggle extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool selected;
  final VoidCallback onTap;
  const _StatusToggle({
    required this.label,
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
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          decoration: BoxDecoration(
            color: selected
                ? color.withValues(alpha: 0.18)
                : context.cardColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected
                  ? color
                  : context.dividerColor,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon,
                  color: selected ? color : context.textMutedColor, size: 22),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: selected ? color : context.textSecondaryColor,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GpsCard extends StatelessWidget {
  final double? lat;
  final double? lng;
  final bool capturing;
  final VoidCallback? onCapture;
  const _GpsCard({
    required this.lat,
    required this.lng,
    required this.capturing,
    required this.onCapture,
  });

  @override
  Widget build(BuildContext context) {
    final hasGps = lat != null && lng != null;
    final color = hasGps ? AppColors.success : AppColors.secondary;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              hasGps
                  ? Icons.check_circle_rounded
                  : Icons.my_location_rounded,
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
                  hasGps
                      ? context.tr('location_captured')
                      : context.tr('capture_gps'),
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (hasGps)
                  Text(
                    '${lat!.toStringAsFixed(5)}, ${lng!.toStringAsFixed(5)}',
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
          ),
          TextButton.icon(
            onPressed: onCapture,
            icon: capturing
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor:
                          AlwaysStoppedAnimation<Color>(AppColors.primary),
                    ),
                  )
                : const Icon(Icons.refresh_rounded, size: 16),
            label: Text(context.tr('capture_gps')),
          ),
        ],
      ),
    );
  }
}
