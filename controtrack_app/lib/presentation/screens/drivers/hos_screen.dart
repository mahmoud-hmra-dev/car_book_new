import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';

/// Driver Hours of Service (HOS) tracking screen. Records duty status
/// transitions (driving / on_duty / sleeper / off_duty) with timestamps,
/// persists them per-driver in `SharedPreferences`, and surfaces the
/// daily driving / on-duty totals against FMCSA-style 11h / 14h limits.
class HosScreen extends StatefulWidget {
  final String driverId;
  final String driverName;

  const HosScreen({
    super.key,
    required this.driverId,
    required this.driverName,
  });

  @override
  State<HosScreen> createState() => _HosScreenState();
}

class _HosScreenState extends State<HosScreen> {
  static const statusDriving = 'driving';
  static const statusOnDuty = 'on_duty';
  static const statusSleeper = 'sleeper';
  static const statusOffDuty = 'off_duty';

  static const double drivingLimitHours = 11;
  static const double onDutyLimitHours = 14;

  List<HosEntry> _entries = [];
  DateTime _selectedDate = _startOfDay(DateTime.now());
  Timer? _ticker;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadEntries();
    // Re-render every 30s so the durations update live.
    _ticker = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  String _prefsKey() => 'hos_${widget.driverId}';

  Future<void> _loadEntries() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey());
    List<HosEntry> list = [];
    if (raw != null && raw.isNotEmpty) {
      try {
        list = (jsonDecode(raw) as List)
            .map((e) => HosEntry.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
      } catch (_) {
        list = [];
      }
    }
    if (!mounted) return;
    setState(() {
      _entries = list;
      _loading = false;
    });
  }

  Future<void> _persistEntries() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = jsonEncode(_entries.map((e) => e.toJson()).toList());
    await prefs.setString(_prefsKey(), raw);
  }

  Future<void> _changeStatus(String newStatus) async {
    final now = DateTime.now();
    final current = _currentEntry();
    final updated = List<HosEntry>.from(_entries);
    if (current != null) {
      if (current.status == newStatus) return; // no-op
      final idx = updated.indexWhere((e) => e.id == current.id);
      if (idx >= 0) {
        updated[idx] = current.copyWith(endTime: now);
      }
    }
    updated.add(HosEntry(
      id: now.microsecondsSinceEpoch.toString(),
      driverId: widget.driverId,
      startTime: now,
      endTime: null,
      status: newStatus,
      notes: '',
    ));
    setState(() => _entries = updated);
    await _persistEntries();
  }

  HosEntry? _currentEntry() {
    for (final e in _entries.reversed) {
      if (e.endTime == null) return e;
    }
    return null;
  }

  /// Returns the duration (in seconds) that entries of `status` were active
  /// within the selected day. Clips entries that span midnight.
  int _totalSecondsForStatus(String status) {
    final dayStart = _selectedDate;
    final dayEnd = dayStart.add(const Duration(days: 1));
    final now = DateTime.now();
    int total = 0;
    for (final e in _entries) {
      if (e.status != status) continue;
      final start = e.startTime;
      final end = e.endTime ?? now;
      if (end.isBefore(dayStart) || start.isAfter(dayEnd)) continue;
      final clippedStart = start.isBefore(dayStart) ? dayStart : start;
      final clippedEnd = end.isAfter(dayEnd) ? dayEnd : end;
      total += clippedEnd.difference(clippedStart).inSeconds;
    }
    return total < 0 ? 0 : total;
  }

  List<HosEntry> _entriesForSelectedDay() {
    final dayStart = _selectedDate;
    final dayEnd = dayStart.add(const Duration(days: 1));
    final now = DateTime.now();
    final filtered = <HosEntry>[];
    for (final e in _entries) {
      final start = e.startTime;
      final end = e.endTime ?? now;
      if (end.isBefore(dayStart) || start.isAfter(dayEnd)) continue;
      filtered.add(e);
    }
    filtered.sort((a, b) => b.startTime.compareTo(a.startTime));
    return filtered;
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked == null) return;
    setState(() => _selectedDate = _startOfDay(picked));
  }

  @override
  Widget build(BuildContext context) {
    final current = _currentEntry();
    final drivingSec = _totalSecondsForStatus(statusDriving);
    final onDutySec = _totalSecondsForStatus(statusOnDuty) +
        _totalSecondsForStatus(statusDriving);
    final offDutySec = _totalSecondsForStatus(statusOffDuty) +
        _totalSecondsForStatus(statusSleeper);

    final drivingViolation = drivingSec > drivingLimitHours * 3600;
    final onDutyViolation = onDutySec > onDutyLimitHours * 3600;

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        foregroundColor: context.textPrimaryColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.tr('hos'),
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(
              widget.driverName,
              style: TextStyle(
                fontSize: 11,
                color: context.textMutedColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: context.tr('pick_date'),
            icon: const Icon(Icons.calendar_today_rounded, size: 20),
            onPressed: _pickDate,
          ),
        ],
      ),
      body: _loading
          ? Center(
              child: CircularProgressIndicator(
                color: AppColors.primary,
                strokeWidth: 2,
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                _buildDateBanner(),
                const SizedBox(height: 16),
                _buildCurrentStatusCard(current),
                const SizedBox(height: 16),
                _buildStatusButtons(current?.status),
                const SizedBox(height: 20),
                _sectionLabel(_hosSummaryLabel()),
                const SizedBox(height: 8),
                _buildSummaryCard(
                  drivingSec: drivingSec,
                  onDutySec: onDutySec,
                  offDutySec: offDutySec,
                  drivingViolation: drivingViolation,
                  onDutyViolation: onDutyViolation,
                ),
                const SizedBox(height: 20),
                _sectionLabel(context.tr('route_history')),
                const SizedBox(height: 8),
                _buildHistory(),
              ],
            ),
    );
  }

  String _hosSummaryLabel() {
    // Composed from existing translation keys.
    return '${context.tr('hos')} · ${context.tr('today')}';
  }

  Widget _sectionLabel(String text) {
    return Text(
      text,
      style: TextStyle(
        color: context.textMutedColor,
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.6,
      ),
    );
  }

  Widget _buildDateBanner() {
    final today = _startOfDay(DateTime.now());
    final isToday = _selectedDate == today;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Icon(
            Icons.today_rounded,
            size: 16,
            color: context.textMutedColor,
          ),
          const SizedBox(width: 8),
          Text(
            _formatDate(_selectedDate),
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(width: 8),
          if (isToday)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                context.tr('today'),
                style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          const Spacer(),
          TextButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.edit_calendar_rounded, size: 16),
            label: Text(context.tr('pick_date')),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentStatusCard(HosEntry? current) {
    final status = current?.status ?? statusOffDuty;
    final color = _statusColor(status);
    final label = _statusLabel(context, status);
    final startedAt = current?.startTime;
    final durSec = current == null
        ? 0
        : DateTime.now().difference(current.startTime).inSeconds;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withValues(alpha: 0.2),
            color.withValues(alpha: 0.03),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.45), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.18),
            blurRadius: 24,
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
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.22),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(
                    color: color.withValues(alpha: 0.55),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: color.withValues(alpha: 0.7),
                            blurRadius: 6,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      label.toUpperCase(),
                      style: TextStyle(
                        color: color,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            _formatDurationLong(durSec),
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 32,
              fontWeight: FontWeight.w800,
              height: 1.05,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            context.tr('duration'),
            style: TextStyle(
              color: context.textMutedColor,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 14),
          Divider(
              height: 1, thickness: 1, color: context.dividerColor),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _metaCell(
                  label: context.tr('start'),
                  value: startedAt != null ? _formatTime(startedAt) : '—',
                ),
              ),
              Container(
                width: 1,
                height: 28,
                color: context.dividerColor,
              ),
              Expanded(
                child: _metaCell(
                  label: context.tr('end_point'),
                  value: current == null ? '—' : _formatTime(DateTime.now()),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _metaCell({required String label, required String value}) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            color: context.textMutedColor,
            fontSize: 10,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.3,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            color: context.textPrimaryColor,
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  Widget _buildStatusButtons(String? current) {
    final options = [
      _StatusOption(
        status: statusDriving,
        icon: Icons.directions_car_rounded,
        label: context.tr('driving_hours'),
        color: AppColors.statusMoving,
      ),
      _StatusOption(
        status: statusOnDuty,
        icon: Icons.work_rounded,
        label: context.tr('on_duty'),
        color: AppColors.secondary,
      ),
      _StatusOption(
        status: statusSleeper,
        icon: Icons.bedtime_rounded,
        label: context.tr('sleeper'),
        color: AppColors.accent,
      ),
      _StatusOption(
        status: statusOffDuty,
        icon: Icons.pause_circle_outline_rounded,
        label: context.tr('off_duty'),
        color: AppColors.statusOffline,
      ),
    ];
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 2.3,
      children: options.map((o) {
        final selected = o.status == current;
        return Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: selected ? null : () => _changeStatus(o.status),
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 12, vertical: 12),
              decoration: BoxDecoration(
                color: selected
                    ? o.color.withValues(alpha: 0.22)
                    : context.cardColor,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: selected
                      ? o.color
                      : context.dividerColor,
                  width: selected ? 1.4 : 1,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: o.color.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(o.icon, color: o.color, size: 18),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      o.label,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: selected
                            ? o.color
                            : context.textPrimaryColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSummaryCard({
    required int drivingSec,
    required int onDutySec,
    required int offDutySec,
    required bool drivingViolation,
    required bool onDutyViolation,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        children: [
          _progressRow(
            label: context.tr('driving_hours'),
            seconds: drivingSec,
            limitHours: drivingLimitHours,
            color: AppColors.statusMoving,
            violation: drivingViolation,
          ),
          const SizedBox(height: 14),
          _progressRow(
            label: context.tr('on_duty'),
            seconds: onDutySec,
            limitHours: onDutyLimitHours,
            color: AppColors.secondary,
            violation: onDutyViolation,
          ),
          const SizedBox(height: 14),
          _progressRow(
            label: context.tr('off_duty'),
            seconds: offDutySec,
            limitHours: null,
            color: AppColors.statusOffline,
            violation: false,
          ),
          if (drivingViolation || onDutyViolation) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.error.withValues(alpha: 0.5),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded,
                      color: AppColors.error, size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      context.tr('hos_violation'),
                      style: const TextStyle(
                        color: AppColors.error,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _progressRow({
    required String label,
    required int seconds,
    required double? limitHours,
    required Color color,
    required bool violation,
  }) {
    final hrs = seconds / 3600.0;
    final ratio = limitHours == null
        ? 0.0
        : (hrs / limitHours).clamp(0.0, 1.0).toDouble();
    final barColor = violation ? AppColors.error : color;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            Text(
              limitHours == null
                  ? _formatDurationShort(seconds)
                  : '${_formatDurationShort(seconds)} / ${limitHours.toStringAsFixed(0)}h',
              style: TextStyle(
                color: violation ? AppColors.error : context.textSecondaryColor,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        if (limitHours != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: ratio,
              minHeight: 8,
              backgroundColor: context.surfaceColor,
              valueColor: AlwaysStoppedAnimation<Color>(barColor),
            ),
          ),
      ],
    );
  }

  Widget _buildHistory() {
    final items = _entriesForSelectedDay();
    if (items.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.surfaceColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: context.dividerColor),
        ),
        child: Row(
          children: [
            Icon(Icons.history_rounded,
                color: context.textMutedColor),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                context.tr('no_data'),
                style: TextStyle(
                  color: context.textMutedColor,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      );
    }
    return Column(
      children: [
        for (final e in items) ...[
          _buildHistoryTile(e),
          const SizedBox(height: 8),
        ],
      ],
    );
  }

  Widget _buildHistoryTile(HosEntry e) {
    final color = _statusColor(e.status);
    final label = _statusLabel(context, e.status);
    final now = DateTime.now();
    final end = e.endTime ?? now;
    final durSec = end.difference(e.startTime).inSeconds;
    final ongoing = e.endTime == null;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 44,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(3),
            ),
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
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        label,
                        style: TextStyle(
                          color: color,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ),
                    if (ongoing) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'LIVE',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 9.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${_formatTime(e.startTime)}  →  ${e.endTime != null ? _formatTime(e.endTime!) : context.tr('loading')}',
                  style: TextStyle(
                    color: context.textSecondaryColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(
            _formatDurationShort(durSec),
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 13,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case statusDriving:
        return AppColors.statusMoving;
      case statusOnDuty:
        return AppColors.secondary;
      case statusSleeper:
        return AppColors.accent;
      case statusOffDuty:
        return AppColors.statusOffline;
    }
    return AppColors.statusOffline;
  }

  static String _statusLabel(BuildContext context, String status) {
    switch (status) {
      case statusDriving:
        return context.tr('driving_hours');
      case statusOnDuty:
        return context.tr('on_duty');
      case statusSleeper:
        return context.tr('sleeper');
      case statusOffDuty:
        return context.tr('off_duty');
    }
    return status;
  }

  static DateTime _startOfDay(DateTime d) =>
      DateTime(d.year, d.month, d.day);

  static String _pad2(int n) => n.toString().padLeft(2, '0');

  static String _formatDate(DateTime d) =>
      '${d.year}-${_pad2(d.month)}-${_pad2(d.day)}';

  static String _formatTime(DateTime d) =>
      '${_pad2(d.hour)}:${_pad2(d.minute)}';

  static String _formatDurationShort(int seconds) {
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    if (h > 0) return '${h}h ${m}m';
    return '${m}m';
  }

  static String _formatDurationLong(int seconds) {
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    return '${h}h ${_pad2(m)}m';
  }
}

class _StatusOption {
  final String status;
  final IconData icon;
  final String label;
  final Color color;
  const _StatusOption({
    required this.status,
    required this.icon,
    required this.label,
    required this.color,
  });
}

class HosEntry {
  final String id;
  final String driverId;
  final DateTime startTime;
  final DateTime? endTime;
  final String status;
  final String notes;

  const HosEntry({
    required this.id,
    required this.driverId,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.notes,
  });

  HosEntry copyWith({
    String? id,
    String? driverId,
    DateTime? startTime,
    DateTime? endTime,
    String? status,
    String? notes,
  }) =>
      HosEntry(
        id: id ?? this.id,
        driverId: driverId ?? this.driverId,
        startTime: startTime ?? this.startTime,
        endTime: endTime ?? this.endTime,
        status: status ?? this.status,
        notes: notes ?? this.notes,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'driverId': driverId,
        'startTime': startTime.toIso8601String(),
        'endTime': endTime?.toIso8601String(),
        'status': status,
        'notes': notes,
      };

  factory HosEntry.fromJson(Map<String, dynamic> j) => HosEntry(
        id: j['id']?.toString() ?? '',
        driverId: j['driverId']?.toString() ?? '',
        startTime: DateTime.tryParse(j['startTime']?.toString() ?? '') ??
            DateTime.now(),
        endTime: j['endTime'] == null
            ? null
            : DateTime.tryParse(j['endTime'].toString()),
        status: j['status']?.toString() ?? 'off_duty',
        notes: j['notes']?.toString() ?? '',
      );
}
