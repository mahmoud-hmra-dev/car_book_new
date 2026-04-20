import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/models/driver_model.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../data/repositories/tracking_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';

const _kCheckinsKey = 'driver_checkins';
String _driverVehicleKey(String driverId) => 'driver_vehicle_$driverId';

class CheckinModel {
  final String id;
  final String driverId;
  final String driverName;
  final String vehicleId;
  final String vehicleName;
  final DateTime time;
  final String status; // on_duty | off_duty

  const CheckinModel({
    required this.id,
    required this.driverId,
    required this.driverName,
    required this.vehicleId,
    required this.vehicleName,
    required this.time,
    required this.status,
  });

  factory CheckinModel.fromJson(Map<String, dynamic> j) => CheckinModel(
        id: (j['id'] ?? '').toString(),
        driverId: (j['driverId'] ?? '').toString(),
        driverName: (j['driverName'] ?? '').toString(),
        vehicleId: (j['vehicleId'] ?? '').toString(),
        vehicleName: (j['vehicleName'] ?? '').toString(),
        time: DateTime.tryParse(j['time']?.toString() ?? '') ?? DateTime.now(),
        status: (j['status'] ?? 'on_duty').toString(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'driverId': driverId,
        'driverName': driverName,
        'vehicleId': vehicleId,
        'vehicleName': vehicleName,
        'time': time.toIso8601String(),
        'status': status,
      };
}

class DriverCheckinScreen extends StatefulWidget {
  const DriverCheckinScreen({super.key});

  @override
  State<DriverCheckinScreen> createState() => _DriverCheckinScreenState();
}

class _DriverCheckinScreenState extends State<DriverCheckinScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;
  List<DriverModel> _drivers = const [];
  List<CheckinModel> _checkins = const [];
  bool _loading = true;
  String? _error;

  // Identification flow
  DriverModel? _identified;
  String? _identifiedVehicleId;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
    _tab.addListener(() {
      if (!_tab.indexIsChanging) setState(() {});
    });
    _bootstrap();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = context.read<TrackingRepository>();
      final drivers = await repo.getDrivers();
      final checkins = await _loadCheckins();
      if (!mounted) return;
      setState(() {
        _drivers = drivers;
        _checkins = checkins;
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

  Future<List<CheckinModel>> _loadCheckins() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kCheckinsKey);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = json.decode(raw);
      if (decoded is List) {
        return decoded
            .whereType<Map<String, dynamic>>()
            .map(CheckinModel.fromJson)
            .toList()
          ..sort((a, b) => b.time.compareTo(a.time));
      }
    } catch (_) {}
    return const [];
  }

  Future<void> _saveCheckins(List<CheckinModel> list) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = json.encode(list.map((e) => e.toJson()).toList());
    await prefs.setString(_kCheckinsKey, encoded);
  }

  FleetItem? _findVehicle(String? id) {
    if (id == null || id.isEmpty) return null;
    final items = context.read<FleetCubit>().state.items;
    for (final v in items) {
      if (v.carId == id) return v;
    }
    return null;
  }

  Future<void> _identifyById(String rawId) async {
    final id = rawId.trim();
    if (id.isEmpty) return;
    DriverModel? match;
    for (final d in _drivers) {
      if (d.id == id || d.name.toLowerCase() == id.toLowerCase()) {
        match = d;
        break;
      }
    }
    match ??= _drivers.isNotEmpty ? _drivers.first : null;
    if (match == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('no_drivers'))),
      );
      return;
    }
    await _setIdentified(match);
  }

  Future<void> _setIdentified(DriverModel d) async {
    final prefs = await SharedPreferences.getInstance();
    final assigned = prefs.getString(_driverVehicleKey(d.id));
    if (!mounted) return;
    setState(() {
      _identified = d;
      _identifiedVehicleId = assigned;
    });
  }

  Future<void> _openQrSimulator() async {
    final picked = await showDialog<DriverModel>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => _QrSimulatorDialog(drivers: _drivers),
    );
    if (picked != null) {
      await _setIdentified(picked);
    }
  }

  Future<void> _openEnterIdSheet() async {
    final controller = TextEditingController();
    final submitted = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: ctx.textMutedColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              ctx.tr('enter_driver_id'),
              style: Theme.of(ctx).textTheme.titleLarge,
            ),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              autofocus: true,
              decoration: InputDecoration(
                labelText: ctx.tr('enter_driver_id'),
                prefixIcon: const Icon(Icons.badge_outlined),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () => Navigator.pop(ctx, controller.text),
                icon: const Icon(Icons.check_rounded),
                label: Text(ctx.tr('submit')),
              ),
            ),
          ],
        ),
      ),
    );
    if (submitted != null) {
      await _identifyById(submitted);
    }
  }

  Future<void> _confirmCheckin() async {
    final d = _identified;
    if (d == null) return;
    final vehicle = _findVehicle(_identifiedVehicleId);
    final vehicleName = vehicle != null
        ? (vehicle.carName.isNotEmpty
            ? vehicle.carName
            : (vehicle.licensePlate.isNotEmpty
                ? vehicle.licensePlate
                : (_identifiedVehicleId ?? '')))
        : (_identifiedVehicleId ?? '');

    // Toggle status if the most recent check-in for this driver is on_duty
    final latestForDriver = _checkins
        .where((c) => c.driverId == d.id)
        .fold<CheckinModel?>(null, (prev, e) {
      if (prev == null) return e;
      return e.time.isAfter(prev.time) ? e : prev;
    });
    final newStatus =
        latestForDriver?.status == 'on_duty' ? 'off_duty' : 'on_duty';

    final entry = CheckinModel(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      driverId: d.id,
      driverName: d.name,
      vehicleId: _identifiedVehicleId ?? '',
      vehicleName: vehicleName,
      time: DateTime.now(),
      status: newStatus,
    );
    final updated = <CheckinModel>[entry, ..._checkins];
    await _saveCheckins(updated);
    if (!mounted) return;
    setState(() {
      _checkins = updated;
      _identified = null;
      _identifiedVehicleId = null;
      _tab.animateTo(1);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          newStatus == 'on_duty'
              ? '${context.tr('confirm_checkin')} — ${d.name}'
              : '${d.name}: off duty',
        ),
      ),
    );
  }

  void _resetIdentified() {
    setState(() {
      _identified = null;
      _identifiedVehicleId = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(context.tr('driver_checkin')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        bottom: TabBar(
          controller: _tab,
          indicatorColor: AppColors.primary,
          labelColor: context.textPrimaryColor,
          unselectedLabelColor: context.textMutedColor,
          tabs: [
            Tab(text: context.tr('driver_checkin')),
            Tab(text: context.tr('recent_activity')),
          ],
        ),
      ),
      body: _loading
          ? const AppLoading()
          : _error != null
              ? AppError(message: _error!, onRetry: _bootstrap)
              : TabBarView(
                  controller: _tab,
                  children: [
                    _buildIdentifyTab(),
                    _buildHistoryTab(),
                  ],
                ),
    );
  }

  Widget _buildIdentifyTab() {
    if (_identified != null) {
      return _buildIdentifiedCard();
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 40),
      child: Column(
        children: [
          const SizedBox(height: 12),
          _NfcPulse()
              .animate()
              .fadeIn(duration: 400.ms)
              .scaleXY(begin: 0.8, end: 1.0, duration: 500.ms),
          const SizedBox(height: 28),
          Text(
            'Tap NFC card or scan QR code to identify driver',
            style: TextStyle(
              color: context.textSecondaryColor,
              fontSize: 14,
              height: 1.4,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
          const SizedBox(height: 32),
          _MethodButton(
            icon: Icons.qr_code_scanner_rounded,
            label: context.tr('scan_qr'),
            color: AppColors.primary,
            onTap: _openQrSimulator,
          ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.1, end: 0),
          const SizedBox(height: 12),
          _MethodButton(
            icon: Icons.keyboard_rounded,
            label: context.tr('enter_driver_id'),
            color: AppColors.secondary,
            onTap: _openEnterIdSheet,
          ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1, end: 0),
        ],
      ),
    );
  }

  Widget _buildIdentifiedCard() {
    final d = _identified!;
    final vehicle = _findVehicle(_identifiedVehicleId);
    final vehicleLabel = vehicle != null
        ? (vehicle.carName.isNotEmpty
            ? vehicle.carName
            : (vehicle.licensePlate.isNotEmpty
                ? vehicle.licensePlate
                : (_identifiedVehicleId ?? '—')))
        : (_identifiedVehicleId != null && _identifiedVehicleId!.isNotEmpty
            ? _identifiedVehicleId!
            : 'Unassigned');
    final now = DateTime.now();

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: context.cardGradientColor,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: AppColors.primary.withValues(alpha: 0.4),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.2),
                  blurRadius: 24,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: Column(
              children: [
                Container(
                  width: 84,
                  height: 84,
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.45),
                        blurRadius: 18,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      (d.name.isNotEmpty ? d.name[0] : 'D').toUpperCase(),
                      style: const TextStyle(
                        color: Colors.black,
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.verified_rounded,
                        color: AppColors.primary, size: 18),
                    const SizedBox(width: 6),
                    Text(
                      'Driver identified',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  d.name,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                  textAlign: TextAlign.center,
                ),
                if (d.licenseNumber != null && d.licenseNumber!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    '${context.tr('license')}: ${d.licenseNumber}',
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 12,
                    ),
                  ),
                ],
                const SizedBox(height: 18),
                _InfoRow(
                  icon: Icons.directions_car_rounded,
                  label: context.tr('vehicle'),
                  value: vehicleLabel,
                ),
                const SizedBox(height: 10),
                _InfoRow(
                  icon: Icons.schedule_rounded,
                  label: context.tr('date'),
                  value: DateFormat('EEE, MMM d • HH:mm').format(now),
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(duration: 350.ms)
              .slideY(begin: 0.08, end: 0, duration: 350.ms),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              onPressed: _confirmCheckin,
              icon: const Icon(Icons.check_circle_rounded),
              label: Text(
                context.tr('confirm_checkin'),
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: BorderSide(
                    color: AppColors.error.withValues(alpha: 0.55)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              onPressed: _resetIdentified,
              icon: const Icon(Icons.close_rounded),
              label: Text(context.tr('wrong_driver')),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryTab() {
    if (_checkins.isEmpty) {
      return EmptyState(
        title: context.tr('no_recent_activity'),
        subtitle: 'Check-ins will appear here',
        icon: Icons.history_rounded,
      );
    }

    // Today's check-ins grouped by vehicle
    final today = DateTime.now();
    final todaysCheckins = _checkins
        .where((c) =>
            c.time.year == today.year &&
            c.time.month == today.month &&
            c.time.day == today.day)
        .toList();

    final byVehicle = <String, List<CheckinModel>>{};
    for (final c in todaysCheckins) {
      final key = c.vehicleName.isEmpty ? 'Unassigned' : c.vehicleName;
      byVehicle.putIfAbsent(key, () => []).add(c);
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async {
        final list = await _loadCheckins();
        if (!mounted) return;
        setState(() => _checkins = list);
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 40),
        children: [
          if (todaysCheckins.isNotEmpty) ...[
            _SectionHeader(title: context.tr('today')),
            const SizedBox(height: 8),
            for (final entry in byVehicle.entries) ...[
              _VehicleGroupCard(
                vehicleName: entry.key,
                entries: entry.value,
              ),
              const SizedBox(height: 10),
            ],
            const SizedBox(height: 8),
          ],
          _SectionHeader(title: context.tr('recent_activity')),
          const SizedBox(height: 8),
          for (final c in _checkins.take(20)) ...[
            _CheckinTile(entry: c),
            const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}

class _NfcPulse extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 180,
      height: 180,
      child: Stack(
        alignment: Alignment.center,
        children: [
          _Ripple(delay: 0),
          _Ripple(delay: 600),
          _Ripple(delay: 1200),
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.45),
                  blurRadius: 24,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: const Icon(
              Icons.nfc_rounded,
              color: Colors.black,
              size: 56,
            ),
          )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scaleXY(
                begin: 0.95,
                end: 1.05,
                duration: 900.ms,
                curve: Curves.easeInOut,
              ),
        ],
      ),
    );
  }
}

class _Ripple extends StatelessWidget {
  final int delay;
  const _Ripple({required this.delay});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 120,
      height: 120,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.6),
          width: 2,
        ),
      ),
    )
        .animate(onPlay: (c) => c.repeat())
        .scaleXY(
          begin: 1.0,
          end: 1.6,
          duration: 1800.ms,
          delay: Duration(milliseconds: delay),
          curve: Curves.easeOut,
        )
        .fadeOut(duration: 1800.ms, delay: Duration(milliseconds: delay));
  }
}

class _MethodButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _MethodButton({
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
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 18),
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withValues(alpha: 0.4)),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Icon(Icons.arrow_forward_ios_rounded,
                  size: 14, color: context.textMutedColor),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: context.textMutedColor),
        const SizedBox(width: 8),
        Text(
          '$label:',
          style: TextStyle(
            color: context.textMutedColor,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.end,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(left: 4, top: 4),
        child: Text(
          title.toUpperCase(),
          style: TextStyle(
            color: context.textMutedColor,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
      );
}

class _VehicleGroupCard extends StatelessWidget {
  final String vehicleName;
  final List<CheckinModel> entries;

  const _VehicleGroupCard({
    required this.vehicleName,
    required this.entries,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: AppColors.secondary.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.directions_car_rounded,
                    color: AppColors.secondary, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  vehicleName,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${entries.length}',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          for (int i = 0; i < entries.length; i++) ...[
            Padding(
              padding: const EdgeInsets.only(left: 42),
              child: Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: entries[i].status == 'on_duty'
                          ? AppColors.success
                          : context.textMutedColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      entries[i].driverName,
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    DateFormat('HH:mm').format(entries[i].time),
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            if (i < entries.length - 1) const SizedBox(height: 6),
          ],
        ],
      ),
    );
  }
}

class _CheckinTile extends StatelessWidget {
  final CheckinModel entry;
  const _CheckinTile({required this.entry});

  @override
  Widget build(BuildContext context) {
    final onDuty = entry.status == 'on_duty';
    final statusColor = onDuty ? AppColors.success : context.textMutedColor;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(12),
        border: Border(
          left: BorderSide(color: statusColor, width: 3),
          top: BorderSide(color: context.dividerColor),
          right: BorderSide(color: context.dividerColor),
          bottom: BorderSide(color: context.dividerColor),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
              child: Text(
                (entry.driverName.isNotEmpty ? entry.driverName[0] : '?')
                    .toUpperCase(),
                style: const TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.driverName.isEmpty ? '—' : entry.driverName,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  entry.vehicleName.isEmpty
                      ? 'Unassigned'
                      : entry.vehicleName,
                  style: TextStyle(
                    color: context.textSecondaryColor,
                    fontSize: 11.5,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  onDuty ? 'ON DUTY' : 'OFF DUTY',
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.4,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                DateFormat('MMM d • HH:mm').format(entry.time),
                style: TextStyle(
                  color: context.textMutedColor,
                  fontSize: 10.5,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Simulated QR scanner dialog: shows a camera-like frame with an animated
/// scanning line and picks a random driver after 2 seconds.
class _QrSimulatorDialog extends StatefulWidget {
  final List<DriverModel> drivers;
  const _QrSimulatorDialog({required this.drivers});

  @override
  State<_QrSimulatorDialog> createState() => _QrSimulatorDialogState();
}

class _QrSimulatorDialogState extends State<_QrSimulatorDialog> {
  bool _done = false;
  DriverModel? _picked;

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      final picked =
          widget.drivers.isNotEmpty ? widget.drivers.first : null;
      setState(() {
        _done = true;
        _picked = picked;
      });
      Future<void>.delayed(const Duration(milliseconds: 700), () {
        if (!mounted) return;
        Navigator.of(context).pop(picked);
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: context.surfaceColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              context.tr('scan_qr'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            AspectRatio(
              aspectRatio: 1,
              child: Stack(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.4),
                      ),
                    ),
                  ),
                  // Corners
                  ..._corners(),
                  // Scanning line
                  if (!_done)
                    Align(
                      alignment: Alignment.topCenter,
                      child: Container(
                        height: 2,
                        margin: const EdgeInsets.symmetric(horizontal: 24),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          boxShadow: [
                            BoxShadow(
                              color:
                                  AppColors.primary.withValues(alpha: 0.7),
                              blurRadius: 12,
                            ),
                          ],
                        ),
                      )
                          .animate(onPlay: (c) => c.repeat(reverse: true))
                          .moveY(
                            begin: 24,
                            end: 200,
                            duration: 1100.ms,
                            curve: Curves.easeInOut,
                          ),
                    ),
                  if (_done)
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.success.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.success,
                            width: 2,
                          ),
                        ),
                        child: const Icon(
                          Icons.check_rounded,
                          color: AppColors.success,
                          size: 48,
                        ),
                      )
                          .animate()
                          .scaleXY(
                            begin: 0.5,
                            end: 1.0,
                            duration: 300.ms,
                            curve: Curves.easeOutBack,
                          )
                          .fadeIn(duration: 250.ms),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Text(
              _done
                  ? (_picked != null
                      ? 'Driver identified: ${_picked!.name}'
                      : 'No drivers available')
                  : 'Scanning…',
              style: TextStyle(
                color: _done
                    ? AppColors.primary
                    : context.textSecondaryColor,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(context.tr('cancel')),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _corners() {
    const cornerColor = AppColors.primary;
    const double size = 22;
    const double thickness = 3;
    Widget corner(
            {required Alignment align,
            required bool top,
            required bool left}) =>
        Align(
          alignment: align,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: SizedBox(
              width: size,
              height: size,
              child: Stack(
                children: [
                  Align(
                    alignment: top ? Alignment.topCenter : Alignment.bottomCenter,
                    child: Container(
                      height: thickness,
                      color: cornerColor,
                    ),
                  ),
                  Align(
                    alignment:
                        left ? Alignment.centerLeft : Alignment.centerRight,
                    child: Container(
                      width: thickness,
                      color: cornerColor,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
    return [
      corner(align: Alignment.topLeft, top: true, left: true),
      corner(align: Alignment.topRight, top: true, left: false),
      corner(align: Alignment.bottomLeft, top: false, left: true),
      corner(align: Alignment.bottomRight, top: false, left: false),
    ];
  }
}
