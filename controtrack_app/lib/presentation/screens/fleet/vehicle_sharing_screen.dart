import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:controtrack/core/theme/app_colors.dart';
import 'package:controtrack/data/models/fleet_item_model.dart';
import 'package:controtrack/l10n/app_localizations.dart';
import 'package:controtrack/presentation/blocs/fleet/fleet_cubit.dart';
import 'package:controtrack/presentation/blocs/fleet/fleet_state.dart';

// ---------------------------------------------------------------------------
// Data models
// ---------------------------------------------------------------------------

enum SharingStatus { active, expired, pending }

class SharedVehicle {
  final String id;
  final String vehicleName;
  final String plate;
  final String driverName;
  final String driverPhone;
  final DateTime startTime;
  final DateTime expiryTime;
  final SharingStatus status;
  final String accessCode;
  final int maxSpeedKmh;

  const SharedVehicle({
    required this.id,
    required this.vehicleName,
    required this.plate,
    required this.driverName,
    required this.driverPhone,
    required this.startTime,
    required this.expiryTime,
    required this.status,
    required this.accessCode,
    required this.maxSpeedKmh,
  });

  Duration get remaining => expiryTime.difference(DateTime.now());
  bool get isActive => status == SharingStatus.active && remaining.isNegative == false;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class VehicleSharingScreen extends StatefulWidget {
  const VehicleSharingScreen({super.key});

  @override
  State<VehicleSharingScreen> createState() => _VehicleSharingScreenState();
}

class _VehicleSharingScreenState extends State<VehicleSharingScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<SharedVehicle> _shares = [];

  // --- new share form state ---
  final _formKey = GlobalKey<FormState>();
  FleetItem? _selectedFleetItem;
  final _driverNameCtrl = TextEditingController();
  final _driverPhoneCtrl = TextEditingController();
  Duration _duration = const Duration(hours: 24);
  int _maxSpeed = 120;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final cubit = context.read<FleetCubit>();
      if (cubit.state.status == FleetStatus.initial) {
        cubit.load();
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _driverNameCtrl.dispose();
    _driverPhoneCtrl.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.surfaceColor,
        title: Text(
          context.tr('vehicle_sharing'),
          style: TextStyle(
            color: context.textPrimaryColor,
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: context.textPrimaryColor),
          onPressed: () => Navigator.of(context).pop(),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: context.textMutedColor,
          tabs: [
            Tab(text: context.tr('active')),
            Tab(text: context.tr('history')),
            Tab(text: context.tr('new_share')),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildActiveTab(),
          _buildHistoryTab(),
          _buildNewShareTab(),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Active tab
  // ---------------------------------------------------------------------------

  Widget _buildActiveTab() {
    final active = _shares.where((s) => s.status == SharingStatus.active).toList();
    final pending = _shares.where((s) => s.status == SharingStatus.pending).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Summary strip
        _buildSummaryStrip(active.length, pending.length)
            .animate()
            .fadeIn(duration: 400.ms)
            .slideY(begin: -0.1),

        const SizedBox(height: 20),

        if (pending.isNotEmpty) ...[
          _sectionLabel(context.tr('pending_activation')),
          const SizedBox(height: 8),
          ...pending.mapIndexed(
            (i, s) => _buildShareCard(s, i).animate().fadeIn(delay: (i * 80).ms).slideX(begin: 0.05),
          ),
          const SizedBox(height: 16),
        ],

        _sectionLabel(context.tr('active_now')),
        const SizedBox(height: 8),
        if (active.isEmpty)
          _buildEmptyState(context.tr('no_active_shares'), Icons.share_outlined)
        else
          ...active.mapIndexed(
            (i, s) => _buildShareCard(s, i).animate().fadeIn(delay: (i * 80).ms).slideX(begin: 0.05),
          ),
      ],
    );
  }

  Widget _buildSummaryStrip(int active, int pending) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withValues(alpha: 0.15),
            AppColors.secondary.withValues(alpha: 0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _stripStat(context.tr('active'), active.toString(), AppColors.primary),
          _dividerV(),
          _stripStat(context.tr('pending'), pending.toString(), AppColors.warning),
          _dividerV(),
          _stripStat(context.tr('today_total'), (active + pending).toString(), AppColors.secondary),
        ],
      ),
    );
  }

  Widget _stripStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(value,
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 2),
        Text(label, style: TextStyle(color: context.textMutedColor, fontSize: 11)),
      ],
    );
  }

  Widget _dividerV() => Container(width: 1, height: 40, color: context.dividerColor);

  Widget _buildShareCard(SharedVehicle share, int index) {
    final color = _statusColor(share.status);
    final remaining = share.remaining;
    final remainingText = _formatDuration(remaining);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            context.cardColor,
            context.cardColor.withValues(alpha: 0.8),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: color, width: 4)),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _statusLabel(share.status),
                    style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
                const Spacer(),
                // Access code chip
                GestureDetector(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: share.accessCode));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                            '${context.tr('code')} ${share.accessCode} ${context.tr('copied')}'),
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.vpn_key, size: 12, color: AppColors.accent),
                        const SizedBox(width: 4),
                        Text(
                          share.accessCode,
                          style: const TextStyle(
                            color: AppColors.accent,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Vehicle + driver info
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.local_shipping, color: AppColors.primary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        share.vehicleName,
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      Text(
                        share.plate,
                        style: TextStyle(color: context.textMutedColor, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      share.status == SharingStatus.pending
                          ? context.tr('starts_in')
                          : context.tr('expires_in'),
                      style: TextStyle(color: context.textMutedColor, fontSize: 11),
                    ),
                    Text(
                      remaining.isNegative ? context.tr('expired') : remainingText,
                      style: TextStyle(
                        color: remaining.inHours < 2 && !remaining.isNegative
                            ? AppColors.warning
                            : context.textPrimaryColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),

            Divider(color: context.dividerColor, height: 1),
            const SizedBox(height: 10),

            // Driver info row
            Row(
              children: [
                const Icon(Icons.person_outline, size: 14, color: AppColors.secondary),
                const SizedBox(width: 4),
                Text(share.driverName,
                    style: TextStyle(color: context.textSecondaryColor, fontSize: 12)),
                const SizedBox(width: 12),
                const Icon(Icons.phone_outlined, size: 14, color: AppColors.secondary),
                const SizedBox(width: 4),
                Text(share.driverPhone,
                    style: TextStyle(color: context.textSecondaryColor, fontSize: 12)),
              ],
            ),
            const SizedBox(height: 8),

            // Speed limit badge + progress bar if active
            Row(
              children: [
                const Icon(Icons.speed, size: 14, color: AppColors.warning),
                const SizedBox(width: 4),
                Text(
                  '${context.tr('max')} ${share.maxSpeedKmh} km/h',
                  style: TextStyle(color: context.textSecondaryColor, fontSize: 12),
                ),
                const Spacer(),
                if (share.status == SharingStatus.active) ...[
                  TextButton.icon(
                    onPressed: () => _revokeShare(share),
                    icon: const Icon(Icons.cancel_outlined, size: 14, color: AppColors.error),
                    label: Text(context.tr('revoke'),
                        style: const TextStyle(color: AppColors.error, fontSize: 12)),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: Size.zero,
                    ),
                  ),
                ],
              ],
            ),

            if (share.status == SharingStatus.active) ...[
              const SizedBox(height: 8),
              _buildTimeProgress(share),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTimeProgress(SharedVehicle share) {
    final total = share.expiryTime.difference(share.startTime).inSeconds;
    final elapsed = DateTime.now().difference(share.startTime).inSeconds;
    final progress = (elapsed / total).clamp(0.0, 1.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(context.tr('time_used'),
                style: TextStyle(color: context.textMutedColor, fontSize: 10)),
            Text('${(progress * 100).toStringAsFixed(0)}%',
                style: TextStyle(color: context.textMutedColor, fontSize: 10)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: progress,
            backgroundColor: context.dividerColor,
            valueColor: AlwaysStoppedAnimation(
              progress > 0.8 ? AppColors.warning : AppColors.primary,
            ),
            minHeight: 6,
          ),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // History tab
  // ---------------------------------------------------------------------------

  Widget _buildHistoryTab() {
    final expired = _shares.where((s) => s.status == SharingStatus.expired).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (expired.isEmpty)
          _buildEmptyState(context.tr('no_share_history'), Icons.history_outlined)
        else
          ...expired.mapIndexed(
            (i, s) => _buildShareCard(s, i).animate().fadeIn(delay: (i * 80).ms),
          ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // New Share tab (form)
  // ---------------------------------------------------------------------------

  Widget _buildNewShareTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Info banner
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: AppColors.secondary, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      context.tr('share_info_text'),
                      style: TextStyle(color: context.textSecondaryColor, fontSize: 12),
                    ),
                  ),
                ],
              ),
            )
                .animate()
                .fadeIn(duration: 400.ms),

            const SizedBox(height: 20),
            _sectionLabel(context.tr('vehicle')),
            const SizedBox(height: 8),

            _buildVehicleDropdown()
                .animate()
                .fadeIn(delay: 100.ms)
                .slideY(begin: 0.05),

            const SizedBox(height: 20),
            _sectionLabel(context.tr('external_driver')),
            const SizedBox(height: 8),

            _buildTextField(
              controller: _driverNameCtrl,
              label: context.tr('full_name'),
              icon: Icons.person_outline,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? context.tr('required') : null,
            ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.05),

            const SizedBox(height: 12),

            _buildTextField(
              controller: _driverPhoneCtrl,
              label: context.tr('phone'),
              icon: Icons.phone_outlined,
              keyboardType: TextInputType.phone,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? context.tr('required') : null,
            ).animate().fadeIn(delay: 260.ms).slideY(begin: 0.05),

            const SizedBox(height: 20),
            _sectionLabel(context.tr('duration')),
            const SizedBox(height: 8),

            _buildDurationSelector()
                .animate()
                .fadeIn(delay: 320.ms)
                .slideY(begin: 0.05),

            const SizedBox(height: 20),
            _sectionLabel(context.tr('speed_limit')),
            const SizedBox(height: 8),

            _buildSpeedSlider()
                .animate()
                .fadeIn(delay: 380.ms)
                .slideY(begin: 0.05),

            const SizedBox(height: 28),

            SizedBox(
              width: double.infinity,
              height: 52,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.secondary],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.4),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: TextButton.icon(
                  onPressed: _submitShare,
                  icon: const Icon(Icons.share, color: Colors.black, size: 20),
                  label: Text(
                    context.tr('generate_share_code'),
                    style: const TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ),
              ),
            ).animate().fadeIn(delay: 440.ms).slideY(begin: 0.05),
          ],
        ),
      ),
    );
  }

  Widget _buildVehicleDropdown() {
    return BlocBuilder<FleetCubit, FleetState>(
      builder: (context, state) {
        final items = state.items;
        return DropdownButtonFormField<FleetItem>(
          value: _selectedFleetItem,
          decoration: _inputDecoration(context.tr('vehicle'), Icons.local_shipping_outlined),
          dropdownColor: context.cardColor,
          style: TextStyle(color: context.textPrimaryColor),
          items: items.map((item) {
            final label = item.licensePlate.isNotEmpty
                ? '${item.carName} (${item.licensePlate})'
                : item.carName;
            return DropdownMenuItem<FleetItem>(
              value: item,
              child: Text(label, overflow: TextOverflow.ellipsis),
            );
          }).toList(),
          onChanged: (val) => setState(() => _selectedFleetItem = val),
          validator: (v) => v == null ? context.tr('select_vehicle') : null,
        );
      },
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      style: TextStyle(color: context.textPrimaryColor),
      decoration: _inputDecoration(label, icon),
      validator: validator,
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      labelStyle: TextStyle(color: context.textMutedColor),
      prefixIcon: Icon(icon, color: context.textMutedColor, size: 18),
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
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
    );
  }

  Widget _buildDurationSelector() {
    final options = [
      const Duration(hours: 4),
      const Duration(hours: 8),
      const Duration(hours: 12),
      const Duration(hours: 24),
      const Duration(days: 3),
      const Duration(days: 7),
    ];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((d) {
        final selected = _duration == d;
        return GestureDetector(
          onTap: () => setState(() => _duration = d),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: selected
                  ? AppColors.primary.withValues(alpha: 0.15)
                  : context.cardColor,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: selected ? AppColors.primary : context.dividerColor,
                width: selected ? 1.5 : 1,
              ),
            ),
            child: Text(
              _formatDuration(d),
              style: TextStyle(
                color: selected ? AppColors.primary : context.textSecondaryColor,
                fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                fontSize: 13,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSpeedSlider() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.tr('speed_limit'),
                  style: TextStyle(color: context.textSecondaryColor, fontSize: 13)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$_maxSpeed km/h',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          Slider(
            value: _maxSpeed.toDouble(),
            min: 40,
            max: 160,
            divisions: 12,
            activeColor: AppColors.primary,
            inactiveColor: context.dividerColor,
            onChanged: (v) => setState(() => _maxSpeed = v.round()),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('40 km/h', style: TextStyle(color: context.textMutedColor, fontSize: 10)),
              Text('160 km/h', style: TextStyle(color: context.textMutedColor, fontSize: 10)),
            ],
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  Widget _sectionLabel(String text) {
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        color: context.textMutedColor,
        fontSize: 11,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _buildEmptyState(String text, IconData icon) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 60),
        child: Column(
          children: [
            Icon(icon, size: 56, color: context.textMutedColor),
            const SizedBox(height: 12),
            Text(text, style: TextStyle(color: context.textMutedColor, fontSize: 14)),
          ],
        ),
      ),
    );
  }

  Color _statusColor(SharingStatus s) {
    switch (s) {
      case SharingStatus.active:
        return AppColors.primary;
      case SharingStatus.expired:
        return context.textMutedColor;
      case SharingStatus.pending:
        return AppColors.warning;
    }
  }

  String _statusLabel(SharingStatus s) {
    switch (s) {
      case SharingStatus.active:
        return context.tr('active').toUpperCase();
      case SharingStatus.expired:
        return context.tr('expired').toUpperCase();
      case SharingStatus.pending:
        return context.tr('pending').toUpperCase();
    }
  }

  String _formatDuration(Duration d) {
    if (d.isNegative) return '';
    final days = d.inDays;
    final hours = d.inHours % 24;
    final mins = d.inMinutes % 60;
    if (days > 0) return '${days}d ${hours}h';
    if (hours > 0) return '${hours}h${mins > 0 ? ' ${mins}m' : ''}';
    return '${mins}m';
  }

  void _revokeShare(SharedVehicle share) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: context.cardColor,
        title: Text(context.tr('revoke_share'),
            style: TextStyle(color: context.textPrimaryColor)),
        content: Text(
          '${context.tr('revoke_access_for')} ${share.driverName} ${context.tr('to')} ${share.vehicleName}?',
          style: TextStyle(color: context.textSecondaryColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(context.tr('cancel'),
                style: TextStyle(color: context.textMutedColor)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                // Remove from list or mark as expired
                _shares.removeWhere((s) => s.id == share.id);
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                      '${context.tr('share_revoked_for')} ${share.vehicleName}'),
                  backgroundColor: AppColors.error,
                ),
              );
            },
            child: Text(context.tr('revoke'),
                style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _submitShare() {
    if (!_formKey.currentState!.validate()) return;

    final vehicle = _selectedFleetItem!;
    final code = 'CT-${Random().nextInt(9000) + 1000}';
    final now = DateTime.now();
    final newShare = SharedVehicle(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      vehicleName: vehicle.carName,
      plate: vehicle.licensePlate,
      driverName: _driverNameCtrl.text.trim(),
      driverPhone: _driverPhoneCtrl.text.trim(),
      startTime: now,
      expiryTime: now.add(_duration),
      status: SharingStatus.active,
      accessCode: code,
      maxSpeedKmh: _maxSpeed,
    );

    setState(() {
      _shares.insert(0, newShare);
      _driverNameCtrl.clear();
      _driverPhoneCtrl.clear();
      _selectedFleetItem = null;
      _duration = const Duration(hours: 24);
      _maxSpeed = 120;
    });

    _tabController.animateTo(0);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
            '${context.tr('share_created')} ${context.tr('access_code')}: $code'),
        backgroundColor: AppColors.primary.withValues(alpha: 0.9),
        action: SnackBarAction(
          label: context.tr('copy'),
          textColor: Colors.black,
          onPressed: () => Clipboard.setData(ClipboardData(text: code)),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Extension helper
// ---------------------------------------------------------------------------

extension _IndexedMap<T> on Iterable<T> {
  Iterable<R> mapIndexed<R>(R Function(int i, T e) f) {
    var i = 0;
    return map((e) => f(i++, e));
  }
}
