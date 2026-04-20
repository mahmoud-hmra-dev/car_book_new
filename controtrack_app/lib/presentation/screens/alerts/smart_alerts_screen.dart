import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:controtrack/core/theme/app_colors.dart';
import 'package:controtrack/l10n/app_localizations.dart';
import 'package:controtrack/presentation/widgets/common/app_loading.dart';
import '../../../data/repositories/tracking_repository.dart';

enum TriggerType { speed, idle, geofence, lowFuel, engine, custom }

enum Severity { high, medium, low }

class AlertRule {
  AlertRule({
    required this.id,
    required this.name,
    required this.type,
    required this.condition,
    required this.vehicles,
    required this.channels,
    required this.enabled,
    this.phoneNumber,
    this.threshold,
    this.backendType,
  });

  final String id;
  String name;
  final TriggerType type;
  String condition;
  List<String> vehicles;
  Set<String> channels;
  bool enabled;
  String? phoneNumber;
  num? threshold;
  String? backendType;

  /// Map the backend `type` enum string into our [TriggerType].
  static TriggerType triggerFromBackend(String? type) {
    switch (type) {
      case 'speed':
        return TriggerType.speed;
      case 'geofence':
        return TriggerType.geofence;
      case 'panic':
        return TriggerType.engine;
      case 'maintenance':
        return TriggerType.custom;
      default:
        return TriggerType.custom;
    }
  }

  /// Reverse mapping from local [TriggerType] to the backend enum.
  static String triggerToBackend(TriggerType t) {
    switch (t) {
      case TriggerType.speed:
        return 'speed';
      case TriggerType.geofence:
        return 'geofence';
      case TriggerType.engine:
        return 'panic';
      case TriggerType.custom:
      case TriggerType.idle:
      case TriggerType.lowFuel:
        return 'maintenance';
    }
  }
}

class TriggeredEvent {
  TriggeredEvent({
    required this.ruleName,
    required this.vehicleName,
    required this.timestamp,
    required this.value,
    required this.severity,
    required this.type,
  });

  final String ruleName;
  final String vehicleName;
  final DateTime timestamp;
  final String value;
  final Severity severity;
  final TriggerType type;
}

class SmartAlertsScreen extends StatefulWidget {
  const SmartAlertsScreen({super.key});

  @override
  State<SmartAlertsScreen> createState() => _SmartAlertsScreenState();
}

class _SmartAlertsScreenState extends State<SmartAlertsScreen>
    with TickerProviderStateMixin {
  late final TabController _tabController;

  final List<AlertRule> _rules = [];
  final List<TriggeredEvent> _events = [];

  bool _isLoadingRules = true;
  bool _isLoadingEvents = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadRules();
      _loadEvents();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // ---------- Data loaders ----------
  Future<void> _loadRules() async {
    final repo = context.read<TrackingRepository>();
    if (mounted) setState(() => _isLoadingRules = true);
    try {
      final raw = await repo.getAlertRules();
      final parsed = raw.map(_ruleFromJson).toList();
      if (!mounted) return;
      setState(() {
        _rules
          ..clear()
          ..addAll(parsed);
        _isLoadingRules = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoadingRules = false);
    }
  }

  Future<void> _loadEvents() async {
    final repo = context.read<TrackingRepository>();
    if (mounted) setState(() => _isLoadingEvents = true);
    try {
      final raw = await repo.getEvents(limit: 100);
      final parsed = raw.map(_eventFromJson).whereType<TriggeredEvent>().toList();
      if (!mounted) return;
      setState(() {
        _events
          ..clear()
          ..addAll(parsed);
        _isLoadingEvents = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoadingEvents = false);
    }
  }

  // ---------- JSON <-> model helpers ----------
  AlertRule _ruleFromJson(Map<String, dynamic> json) {
    final id = (json['_id'] ?? json['id'] ?? '').toString();
    final backendType = (json['type'] ?? '').toString();
    final type = AlertRule.triggerFromBackend(backendType);
    final vehicleId = (json['vehicleId'] ?? '').toString();
    final phoneNumber = (json['phoneNumber'] ?? '').toString();
    final rawThreshold = json['threshold'];
    final threshold = rawThreshold is num ? rawThreshold : null;
    final enabled = json['enabled'] == true;

    final vehicles = <String>[];
    if (vehicleId.isEmpty || vehicleId.toLowerCase() == 'all') {
      vehicles.add(context.tr('all_vehicles'));
    } else {
      vehicles.add(vehicleId);
    }

    final channels = <String>{context.tr('push')};
    if (phoneNumber.isNotEmpty) channels.add(context.tr('sms'));

    final name = _labelFor(type);
    final condition = _conditionFor(type, threshold);

    return AlertRule(
      id: id,
      name: name,
      type: type,
      condition: condition,
      vehicles: vehicles,
      channels: channels,
      enabled: enabled,
      phoneNumber: phoneNumber.isEmpty ? null : phoneNumber,
      threshold: threshold,
      backendType: backendType,
    );
  }

  TriggeredEvent? _eventFromJson(Map<String, dynamic> json) {
    try {
      final attributes = (json['attributes'] is Map)
          ? Map<String, dynamic>.from(json['attributes'] as Map)
          : <String, dynamic>{};
      final rawType = (json['type'] ?? attributes['alarm'] ?? '').toString();
      final type = _triggerFromEventType(rawType);
      final severity = _severityFromEventType(rawType);

      final vehicleName = (json['deviceName'] ??
              json['vehicleName'] ??
              json['deviceId']?.toString() ??
              context.tr('unnamed_vehicle'))
          .toString();

      DateTime ts;
      final rawTs = json['eventTime'] ?? json['serverTime'] ?? json['fixTime'];
      if (rawTs is String) {
        ts = DateTime.tryParse(rawTs) ?? DateTime.now();
      } else if (rawTs is int) {
        ts = DateTime.fromMillisecondsSinceEpoch(rawTs);
      } else {
        ts = DateTime.now();
      }

      final value = _eventValue(rawType, attributes, json);
      final ruleName = _labelFor(type);

      return TriggeredEvent(
        ruleName: ruleName,
        vehicleName: vehicleName,
        timestamp: ts,
        value: value,
        severity: severity,
        type: type,
      );
    } catch (_) {
      return null;
    }
  }

  TriggerType _triggerFromEventType(String raw) {
    final t = raw.toLowerCase();
    if (t.contains('speed') || t.contains('overspeed')) return TriggerType.speed;
    if (t.contains('geofence')) return TriggerType.geofence;
    if (t.contains('alarm') || t.contains('panic') || t.contains('sos')) {
      return TriggerType.engine;
    }
    if (t.contains('ignition')) return TriggerType.engine;
    if (t.contains('fuel')) return TriggerType.lowFuel;
    if (t.contains('idle') || t.contains('stop')) return TriggerType.idle;
    if (t.contains('maintenance')) return TriggerType.custom;
    return TriggerType.custom;
  }

  Severity _severityFromEventType(String raw) {
    final t = raw.toLowerCase();
    if (t.contains('speed') ||
        t.contains('alarm') ||
        t.contains('panic') ||
        t.contains('sos')) {
      return Severity.high;
    }
    if (t.contains('fuel') || t.contains('idle')) return Severity.medium;
    return Severity.low;
  }

  String _eventValue(
    String rawType,
    Map<String, dynamic> attributes,
    Map<String, dynamic> json,
  ) {
    if (rawType.toLowerCase().contains('speed')) {
      final sp = json['speed'] ?? attributes['speed'];
      if (sp is num) {
        return '${context.tr('speed')}: ${(sp * 1.852).toStringAsFixed(0)} km/h';
      }
    }
    if (rawType.toLowerCase().contains('geofence')) {
      return rawType.toLowerCase().contains('exit')
          ? context.tr('exited_zone')
          : context.tr('entered_zone');
    }
    return rawType.isEmpty ? context.tr('no_data') : rawType;
  }

  String _conditionFor(TriggerType type, num? threshold) {
    switch (type) {
      case TriggerType.speed:
        return context
            .tr('speed_over_kmh')
            .replaceAll('{n}', (threshold ?? 120).toInt().toString());
      case TriggerType.idle:
        return context
            .tr('idle_over_min')
            .replaceAll('{n}', (threshold ?? 15).toInt().toString());
      case TriggerType.geofence:
        return context.tr('enter_exit_zone');
      case TriggerType.lowFuel:
        return context
            .tr('fuel_below_pct')
            .replaceAll('{n}', (threshold ?? 15).toInt().toString());
      case TriggerType.engine:
        return context.tr('engine_onoff_events');
      case TriggerType.custom:
        return context.tr('custom_condition');
    }
  }

  // ---------- Trigger type metadata ----------
  IconData _iconFor(TriggerType type) {
    switch (type) {
      case TriggerType.speed:
        return Icons.speed_rounded;
      case TriggerType.idle:
        return Icons.hourglass_bottom_rounded;
      case TriggerType.geofence:
        return Icons.location_on_rounded;
      case TriggerType.lowFuel:
        return Icons.local_gas_station_rounded;
      case TriggerType.engine:
        return Icons.key_rounded;
      case TriggerType.custom:
        return Icons.tune_rounded;
    }
  }

  Color _colorFor(TriggerType type) {
    switch (type) {
      case TriggerType.speed:
        return AppColors.error;
      case TriggerType.idle:
        return AppColors.warning;
      case TriggerType.geofence:
        return AppColors.secondary;
      case TriggerType.lowFuel:
        return const Color(0xFFFFD93D);
      case TriggerType.engine:
        return AppColors.primary;
      case TriggerType.custom:
        return AppColors.accent;
    }
  }

  String _labelFor(TriggerType type) {
    switch (type) {
      case TriggerType.speed:
        return context.tr('rule_speed');
      case TriggerType.idle:
        return context.tr('rule_idle');
      case TriggerType.geofence:
        return context.tr('rule_geofence');
      case TriggerType.lowFuel:
        return context.tr('rule_low_fuel');
      case TriggerType.engine:
        return context.tr('rule_engine');
      case TriggerType.custom:
        return context.tr('rule_custom');
    }
  }

  Color _severityColor(Severity s) {
    switch (s) {
      case Severity.high:
        return AppColors.error;
      case Severity.medium:
        return AppColors.warning;
      case Severity.low:
        return AppColors.secondary;
    }
  }

  String _severityLabel(Severity s) {
    switch (s) {
      case Severity.high:
        return context.tr('severity_high');
      case Severity.medium:
        return context.tr('severity_medium');
      case Severity.low:
        return context.tr('severity_low');
    }
  }

  String _relativeTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return context.tr('just_now');
    if (diff.inMinutes < 60) {
      return context.tr('minutes_ago').replaceAll('{n}', '${diff.inMinutes}');
    }
    if (diff.inHours < 24) {
      return context.tr('hours_ago').replaceAll('{n}', '${diff.inHours}');
    }
    return context.tr('days_ago_n').replaceAll('{n}', '${diff.inDays}');
  }

  // ---------- Build ----------
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(
          context.tr('smart_alerts'),
          style: TextStyle(
            color: context.textPrimaryColor,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: _NewRuleActionButton(
              label: context.tr('new_rule'),
              onTap: () => _openRuleBuilder(),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            color: context.bgColor,
            child: TabBar(
              controller: _tabController,
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              labelColor: AppColors.primary,
              unselectedLabelColor: context.textMutedColor,
              labelStyle: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
              unselectedLabelStyle: const TextStyle(
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
              tabs: [
                Tab(text: context.tr('my_rules')),
                Tab(text: context.tr('triggered_alerts')),
              ],
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildMyRulesTab(),
          _buildTriggeredTab(),
        ],
      ),
    );
  }

  // ---------- My Rules Tab ----------
  Widget _buildMyRulesTab() {
    if (_isLoadingRules) {
      return const AppLoading();
    }
    return Stack(
      children: [
        RefreshIndicator(
          color: AppColors.primary,
          backgroundColor: context.cardColor,
          onRefresh: _loadRules,
          child: _rules.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 40, 16, 100),
                  children: [
                    Center(
                      child: Column(
                        children: [
                          Icon(
                            Icons.rule_rounded,
                            size: 64,
                            color: context.textMutedColor,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            context.tr('no_notification_rules'),
                            style: TextStyle(
                              color: context.textSecondaryColor,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  itemCount: _rules.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final rule = _rules[index];
                    return _buildRuleCard(rule, index);
                  },
                ),
        ),
        Positioned(
          bottom: 16,
          left: 16,
          right: 16,
          child: _buildNewRuleButton(),
        ),
      ],
    );
  }

  Widget _buildRuleCard(AlertRule rule, int index) {
    final color = _colorFor(rule.type);
    return Container(
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border(
          left: BorderSide(color: color, width: 4),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(_iconFor(rule.type), color: color, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rule.name,
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        rule.condition,
                        style: TextStyle(
                          color: context.textSecondaryColor,
                          fontSize: 12.5,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch.adaptive(
                  value: rule.enabled,
                  activeColor: AppColors.primary,
                  onChanged: (v) => _toggleRule(rule, v),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: rule.channels
                        .map((c) => _buildChannelChip(c))
                        .toList(),
                  ),
                ),
                IconButton(
                  icon: Icon(
                    Icons.delete_outline_rounded,
                    color: AppColors.error.withValues(alpha: 0.85),
                  ),
                  onPressed: () => _confirmDelete(rule),
                ),
              ],
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 280.ms, delay: (index * 60).ms)
        .slideY(begin: 0.1, end: 0, curve: Curves.easeOut);
  }

  Future<void> _toggleRule(AlertRule rule, bool enabled) async {
    final repo = context.read<TrackingRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final previous = rule.enabled;
    setState(() => rule.enabled = enabled);
    try {
      await repo.updateAlertRule(rule.id, {'enabled': enabled});
    } catch (_) {
      if (!mounted) return;
      setState(() => rule.enabled = previous);
      messenger.showSnackBar(
        SnackBar(content: Text(context.tr('update_failed'))),
      );
    }
  }

  Widget _buildChannelChip(String label) {
    IconData icon;
    if (label == context.tr('sms')) {
      icon = Icons.sms_rounded;
    } else if (label == 'Email') {
      icon = Icons.email_rounded;
    } else {
      icon = Icons.notifications_rounded;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.primary),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.primary,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNewRuleButton() {
    return GestureDetector(
      onTap: _openRuleBuilder,
      child: Container(
        height: 54,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.primary, AppColors.secondary],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.35),
              blurRadius: 14,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.add_rounded, color: Colors.white, size: 22),
            const SizedBox(width: 8),
            Text(
              context.tr('new_rule'),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(AlertRule rule) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: context.cardColor,
        title: Text(
          context.tr('delete_rule_q'),
          style: TextStyle(color: context.textPrimaryColor),
        ),
        content: Text(
          context.tr('delete_rule_msg').replaceAll('{name}', rule.name),
          style: TextStyle(color: context.textSecondaryColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              context.tr('cancel'),
              style: TextStyle(color: context.textMutedColor),
            ),
          ),
          TextButton(
            onPressed: () async {
              final repo = context.read<TrackingRepository>();
              final messenger = ScaffoldMessenger.of(context);
              Navigator.of(ctx).pop();
              try {
                await repo.deleteAlertRule(rule.id);
                if (!mounted) return;
                setState(() => _rules.removeWhere((r) => r.id == rule.id));
              } catch (_) {
                if (!mounted) return;
                messenger.showSnackBar(
                  SnackBar(content: Text(context.tr('delete_failed'))),
                );
              }
            },
            child: Text(
              context.tr('delete'),
              style: const TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  // ---------- Triggered Tab ----------
  Widget _buildTriggeredTab() {
    if (_isLoadingEvents) {
      return const AppLoading();
    }
    if (_events.isEmpty) {
      return RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: context.cardColor,
        onRefresh: _loadEvents,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 80, 16, 40),
          children: [
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.notifications_off_outlined,
                    size: 64,
                    color: context.textMutedColor,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    context.tr('no_triggered_alerts'),
                    style: TextStyle(
                      color: context.textSecondaryColor,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: context.cardColor,
      onRefresh: _loadEvents,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _events.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final e = _events[index];
          return _buildEventCard(e, index);
        },
      ),
    );
  }

  Widget _buildEventCard(TriggeredEvent event, int index) {
    final sevColor = _severityColor(event.severity);
    final typeColor = _colorFor(event.type);
    return Container(
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: typeColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(_iconFor(event.type), color: typeColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        event.ruleName,
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: sevColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: sevColor.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Text(
                        _severityLabel(event.severity),
                        style: TextStyle(
                          color: sevColor,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${event.vehicleName}  -  ${event.value}',
                  style: TextStyle(
                    color: context.textSecondaryColor,
                    fontSize: 12.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _relativeTime(event.timestamp),
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 260.ms, delay: (index * 40).ms)
        .slideX(begin: 0.05, end: 0, curve: Curves.easeOut);
  }

  // ---------- Rule Builder Sheet ----------
  void _openRuleBuilder() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _RuleBuilderSheet(
        iconFor: _iconFor,
        colorFor: _colorFor,
        labelFor: _labelFor,
        onSave: _createRule,
      ),
    );
  }

  Future<void> _createRule(AlertRule rule) async {
    final repo = context.read<TrackingRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final backendType = AlertRule.triggerToBackend(rule.type);
    final vehicleId = rule.vehicles.isEmpty ||
            rule.vehicles.first == context.tr('all_vehicles')
        ? 'all'
        : rule.vehicles.first;

    final body = <String, dynamic>{
      'vehicleId': vehicleId,
      'type': backendType,
      'phoneNumber': rule.phoneNumber ?? '',
      'enabled': rule.enabled,
      if (rule.threshold != null) 'threshold': rule.threshold,
    };

    try {
      await repo.createAlertRule(body);
      if (!mounted) return;
      await _loadRules();
    } catch (_) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(content: Text(context.tr('create_rule_failed'))),
      );
    }
  }
}

// =================== New Rule Action Button ===================
class _NewRuleActionButton extends StatelessWidget {
  const _NewRuleActionButton({required this.onTap, required this.label});

  final VoidCallback onTap;
  final String label;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.45),
          ),
        ),
        child: Row(
          children: [
            const Icon(Icons.add_rounded, color: AppColors.primary, size: 16),
            const SizedBox(width: 4),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
                fontSize: 12.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =================== Rule Builder Bottom Sheet ===================
class _RuleBuilderSheet extends StatefulWidget {
  const _RuleBuilderSheet({
    required this.iconFor,
    required this.colorFor,
    required this.labelFor,
    required this.onSave,
  });

  final IconData Function(TriggerType) iconFor;
  final Color Function(TriggerType) colorFor;
  final String Function(TriggerType) labelFor;
  final ValueChanged<AlertRule> onSave;

  @override
  State<_RuleBuilderSheet> createState() => _RuleBuilderSheetState();
}

class _RuleBuilderSheetState extends State<_RuleBuilderSheet> {
  int _step = 0;
  TriggerType? _type;
  double _threshold = 100;
  final TextEditingController _nameController = TextEditingController();
  late final Set<String> _selectedVehicles = {context.tr('all_vehicles')};
  late final Set<String> _channels = {context.tr('push')};

  late final List<String> _availableVehicles = <String>[
    context.tr('all_vehicles'),
    'Truck-001',
    'Truck-002',
    'Truck-004',
    'Truck-007',
    'Truck-008',
    'Van-103',
    'Van-201',
  ];

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _next() {
    if (_step < 3) {
      setState(() => _step++);
    } else {
      _save();
    }
  }

  void _prev() {
    if (_step > 0) setState(() => _step--);
  }

  String _conditionSummary() {
    switch (_type) {
      case TriggerType.speed:
        return context
            .tr('speed_over_kmh')
            .replaceAll('{n}', _threshold.toInt().toString());
      case TriggerType.idle:
        return context
            .tr('idle_over_min')
            .replaceAll('{n}', _threshold.toInt().toString());
      case TriggerType.geofence:
        return context.tr('enter_exit_zone');
      case TriggerType.lowFuel:
        return context
            .tr('fuel_below_pct')
            .replaceAll('{n}', _threshold.toInt().toString());
      case TriggerType.engine:
        return context.tr('engine_onoff_events');
      case TriggerType.custom:
        return context.tr('custom_condition');
      case null:
        return '';
    }
  }

  void _save() {
    if (_type == null) return;
    final name = _nameController.text.trim().isEmpty
        ? widget.labelFor(_type!)
        : _nameController.text.trim();
    final usesThreshold = _type == TriggerType.speed ||
        _type == TriggerType.idle ||
        _type == TriggerType.lowFuel;
    final rule = AlertRule(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: name,
      type: _type!,
      condition: _conditionSummary(),
      vehicles: _selectedVehicles.toList(),
      channels: Set<String>.from(_channels),
      enabled: true,
      threshold: usesThreshold ? _threshold : null,
    );
    widget.onSave(rule);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.88,
        ),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(24),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),
            Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: context.textMutedColor.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 14),
            _buildStepper(),
            const SizedBox(height: 10),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 220),
                  child: _buildStepContent(),
                ),
              ),
            ),
            _buildSheetActions(),
            const SizedBox(height: 14),
          ],
        ),
      ),
    );
  }

  Widget _buildStepper() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: List.generate(4, (i) {
          final active = i <= _step;
          return Expanded(
            child: Container(
              margin: EdgeInsets.only(right: i < 3 ? 6 : 0),
              height: 4,
              decoration: BoxDecoration(
                color: active
                    ? AppColors.primary
                    : context.dividerColor.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_step) {
      case 0:
        return _stepTriggerType();
      case 1:
        return _stepThreshold();
      case 2:
        return _stepVehicles();
      case 3:
      default:
        return _stepChannels();
    }
  }

  String _stepEyebrow(int step) {
    return context
        .tr('step_of')
        .replaceAll('{n}', '$step')
        .replaceAll('{total}', '4');
  }

  // --- Step 1: trigger type grid ---
  Widget _stepTriggerType() {
    return Column(
      key: const ValueKey('step1'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _stepHeader(_stepEyebrow(1), context.tr('select_trigger_type')),
        const SizedBox(height: 14),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.4,
          children: TriggerType.values.map((t) {
            final selected = _type == t;
            final c = widget.colorFor(t);
            return GestureDetector(
              onTap: () {
                setState(() {
                  _type = t;
                  switch (t) {
                    case TriggerType.speed:
                      _threshold = 120;
                      break;
                    case TriggerType.idle:
                      _threshold = 15;
                      break;
                    case TriggerType.lowFuel:
                      _threshold = 15;
                      break;
                    default:
                      _threshold = 0;
                  }
                });
              },
              child: Container(
                decoration: BoxDecoration(
                  color: selected
                      ? c.withValues(alpha: 0.14)
                      : context.bgColor.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: selected
                        ? c
                        : context.dividerColor.withValues(alpha: 0.3),
                    width: selected ? 2 : 1,
                  ),
                ),
                padding: const EdgeInsets.all(12),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: c.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(widget.iconFor(t), color: c, size: 20),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      widget.labelFor(t),
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  // --- Step 2: threshold ---
  Widget _stepThreshold() {
    final usesSlider = _type == TriggerType.speed ||
        _type == TriggerType.idle ||
        _type == TriggerType.lowFuel;
    double min = 0;
    double max = 100;
    String unit = '';
    if (_type == TriggerType.speed) {
      min = 20;
      max = 200;
      unit = 'km/h';
    } else if (_type == TriggerType.idle) {
      min = 1;
      max = 120;
      unit = 'min';
    } else if (_type == TriggerType.lowFuel) {
      min = 5;
      max = 50;
      unit = '%';
    }
    return Column(
      key: const ValueKey('step2'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _stepHeader(_stepEyebrow(2), context.tr('configure_threshold')),
        const SizedBox(height: 14),
        TextField(
          controller: _nameController,
          style: TextStyle(color: context.textPrimaryColor),
          decoration: InputDecoration(
            hintText: context.tr('rule_name_optional'),
            hintStyle: TextStyle(color: context.textMutedColor),
            filled: true,
            fillColor: context.bgColor.withValues(alpha: 0.6),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: context.dividerColor.withValues(alpha: 0.3),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: context.dividerColor.withValues(alpha: 0.3),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary),
            ),
          ),
        ),
        const SizedBox(height: 18),
        if (usesSlider) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                context.tr('threshold'),
                style: TextStyle(
                  color: context.textSecondaryColor,
                  fontSize: 13,
                ),
              ),
              Text(
                '${_threshold.toInt()} $unit',
                style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          SliderTheme(
            data: SliderThemeData(
              activeTrackColor: AppColors.primary,
              inactiveTrackColor:
                  context.dividerColor.withValues(alpha: 0.4),
              thumbColor: AppColors.primary,
              overlayColor: AppColors.primary.withValues(alpha: 0.2),
            ),
            child: Slider(
              value: _threshold.clamp(min, max),
              min: min,
              max: max,
              onChanged: (v) => setState(() => _threshold = v),
            ),
          ),
        ] else ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: context.bgColor.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: context.dividerColor.withValues(alpha: 0.3),
              ),
            ),
            child: Text(
              _type == TriggerType.geofence
                  ? context.tr('geofence_rule_info')
                  : _type == TriggerType.engine
                      ? context.tr('engine_rule_info')
                      : context.tr('custom_rule_info'),
              style: TextStyle(
                color: context.textSecondaryColor,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ],
    );
  }

  // --- Step 3: vehicles ---
  Widget _stepVehicles() {
    return Column(
      key: const ValueKey('step3'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _stepHeader(_stepEyebrow(3), context.tr('select_vehicles')),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _availableVehicles.map((v) {
            final selected = _selectedVehicles.contains(v);
            final allLabel = context.tr('all_vehicles');
            return GestureDetector(
              onTap: () {
                setState(() {
                  if (v == allLabel) {
                    _selectedVehicles
                      ..clear()
                      ..add(allLabel);
                  } else {
                    _selectedVehicles.remove(allLabel);
                    if (selected) {
                      _selectedVehicles.remove(v);
                      if (_selectedVehicles.isEmpty) {
                        _selectedVehicles.add(allLabel);
                      }
                    } else {
                      _selectedVehicles.add(v);
                    }
                  }
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 9),
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.primary.withValues(alpha: 0.18)
                      : context.bgColor.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(
                    color: selected
                        ? AppColors.primary
                        : context.dividerColor.withValues(alpha: 0.3),
                    width: selected ? 1.5 : 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (selected)
                      const Padding(
                        padding: EdgeInsets.only(right: 6),
                        child: Icon(
                          Icons.check_circle_rounded,
                          size: 14,
                          color: AppColors.primary,
                        ),
                      ),
                    Text(
                      v,
                      style: TextStyle(
                        color: selected
                            ? AppColors.primary
                            : context.textSecondaryColor,
                        fontWeight:
                            selected ? FontWeight.w700 : FontWeight.w500,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  // --- Step 4: channels ---
  Widget _stepChannels() {
    final channels = [context.tr('sms'), 'Email', context.tr('push')];
    return Column(
      key: const ValueKey('step4'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _stepHeader(
          _stepEyebrow(4),
          context.tr('select_notification_channels'),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: channels.map((c) {
            final selected = _channels.contains(c);
            IconData icon;
            if (c == context.tr('sms')) {
              icon = Icons.sms_rounded;
            } else if (c == 'Email') {
              icon = Icons.email_rounded;
            } else {
              icon = Icons.notifications_rounded;
            }
            return GestureDetector(
              onTap: () {
                setState(() {
                  if (selected) {
                    _channels.remove(c);
                  } else {
                    _channels.add(c);
                  }
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 11),
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.secondary.withValues(alpha: 0.18)
                      : context.bgColor.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: selected
                        ? AppColors.secondary
                        : context.dividerColor.withValues(alpha: 0.3),
                    width: selected ? 1.5 : 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      size: 16,
                      color: selected
                          ? AppColors.secondary
                          : context.textMutedColor,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      c,
                      style: TextStyle(
                        color: selected
                            ? AppColors.secondary
                            : context.textSecondaryColor,
                        fontWeight:
                            selected ? FontWeight.w700 : FontWeight.w500,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppColors.primary.withValues(alpha: 0.25),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.info_outline_rounded,
                color: AppColors.primary,
                size: 18,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${context.tr('summary')}: ${_conditionSummary()}',
                  style: TextStyle(
                    color: context.textSecondaryColor,
                    fontSize: 12.5,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _stepHeader(String eyebrow, String title) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          eyebrow,
          style: const TextStyle(
            color: AppColors.primary,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          title,
          style: TextStyle(
            color: context.textPrimaryColor,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  Widget _buildSheetActions() {
    final canProceed = _step == 0 ? _type != null : true;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          if (_step > 0)
            Expanded(
              child: OutlinedButton(
                onPressed: _prev,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: BorderSide(
                    color: context.dividerColor.withValues(alpha: 0.5),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(
                  context.tr('back'),
                  style: TextStyle(
                    color: context.textSecondaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          if (_step > 0) const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: canProceed ? _next : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                disabledBackgroundColor:
                    AppColors.primary.withValues(alpha: 0.3),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Text(
                _step == 3 ? context.tr('confirm') : context.tr('next'),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
