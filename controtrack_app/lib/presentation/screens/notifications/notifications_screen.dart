import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../data/repositories/tracking_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';
import '../../widgets/web/web_page_scaffold.dart';

const _telegramChatIdKey = 'telegram_chat_id';
const _telegramBlue = Color(0xFF229ED9);

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late Future<List<Map<String, dynamic>>> _future;
  final _telegramCtrl = TextEditingController();
  bool _telegramLoaded = false;
  bool _savingChatId = false;
  bool _testingChatId = false;
  String? _typeFilter; // null = All

  @override
  void initState() {
    super.initState();
    _future = _load();
    _loadTelegram();
  }

  @override
  void dispose() {
    _telegramCtrl.dispose();
    super.dispose();
  }

  Future<List<Map<String, dynamic>>> _load() {
    return context.read<TrackingRepository>().getNotifications();
  }

  Future<void> _loadTelegram() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_telegramChatIdKey) ?? '';
    if (!mounted) return;
    setState(() {
      _telegramCtrl.text = stored;
      _telegramLoaded = true;
    });
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  Future<void> _saveTelegramChatId() async {
    final value = _telegramCtrl.text.trim();
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _savingChatId = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_telegramChatIdKey, value);
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.primaryDark,
          content: Text(value.isEmpty
              ? 'Telegram Chat ID cleared'
              : 'Telegram Chat ID saved'),
        ),
      );
    } finally {
      if (mounted) setState(() => _savingChatId = false);
    }
  }

  Future<void> _testTelegram() async {
    final value = _telegramCtrl.text.trim();
    final messenger = ScaffoldMessenger.of(context);
    final msgEnterChatId = context.tr('enter_telegram_chat_id');
    final msgTestSent = context.tr('test_notification_sent');
    final msgTestFailed = context.tr('test_failed');
    if (value.isEmpty) {
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.warning,
          content: Text(msgEnterChatId),
        ),
      );
      return;
    }
    final dio = context.read<DioClient>();
    setState(() => _testingChatId = true);
    try {
      await dio.post(ApiConstants.notificationTest, data: {'chatId': value});
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.primaryDark,
          content: Text(msgTestSent),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$msgTestFailed: $e'),
        ),
      );
    } finally {
      if (mounted) setState(() => _testingChatId = false);
    }
  }

  Future<void> _deleteRule(Map<String, dynamic> rule) async {
    final id = (rule['_id'] ?? rule['id'] ?? '').toString();
    if (id.isEmpty) return;
    final type = (rule['type'] ?? '').toString();
    final repo = context.read<TrackingRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final msgDeleteFailed = context.tr('delete_failed');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.surfaceColor,
        title: Text(ctx.tr('confirm_delete')),
        content: Text(
          'Remove the "${_NotificationMeta.label(type)}" notification rule?',
          style: TextStyle(color: ctx.textSecondaryColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(ctx.tr('cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(ctx.tr('delete'),
                style: const TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await repo.deleteNotification(id);
      if (!mounted) return;
      _refresh();
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$msgDeleteFailed: $e'),
        ),
      );
    }
  }

  Future<void> _toggleEnabled(Map<String, dynamic> rule, bool enabled) async {
    final id = (rule['_id'] ?? rule['id'] ?? '').toString();
    if (id.isEmpty) return;
    final repo = context.read<TrackingRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final msgUpdateFailed = context.tr('update_failed');
    try {
      final body = Map<String, dynamic>.from(rule);
      body['enabled'] = enabled;
      body.remove('_id');
      body.remove('id');
      await repo.updateNotification(id, body);
      if (!mounted) return;
      _refresh();
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$msgUpdateFailed: $e'),
        ),
      );
    }
  }

  Future<void> _addRule() async {
    final notifRepo = context.read<TrackingRepository>();
    final fleetItems = context.read<FleetCubit>().state.items;
    final messenger = ScaffoldMessenger.of(context);
    final msgRuleCreated = context.tr('notification_rule_created');
    final msgCreateFailed = context.tr('create_rule_failed');
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _NotificationRuleForm(items: fleetItems),
    );
    if (result == null) return;
    try {
      await notifRepo.createNotification(result);
      if (!mounted) return;
      _refresh();
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.primaryDark,
          content: Text(msgRuleCreated),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$msgCreateFailed: $e'),
        ),
      );
    }
  }

  String _carNameFor(String? carId) {
    if (carId == null || carId.isEmpty) return context.tr('all_vehicles');
    final items = context.read<FleetCubit>().state.items;
    for (final it in items) {
      if (it.carId == carId) {
        return it.carName.isEmpty ? carId : it.carName;
      }
    }
    return carId;
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    if (isWide) {
      return WebPageScaffoldScrollable(
        title: context.tr('notification_rules'),
        subtitle: 'Event triggers & alert channels',
        actions: [
          ElevatedButton.icon(
            onPressed: _addRule,
            icon: const Icon(Icons.add_alert_rounded, size: 18),
            label: Text(context.tr('add_rule')),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.black,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
        ],
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: _refresh,
          child: FutureBuilder<List<Map<String, dynamic>>>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const ShimmerList();
              }
              if (snap.hasError) {
                return AppError(
                  message: snap.error.toString(),
                  onRetry: _refresh,
                );
              }
              final rules = snap.data ?? const [];
              final activeCount = rules.where((r) {
                final enabled = r['enabled'];
                if (enabled is bool) return enabled;
                if (enabled is num) return enabled != 0;
                return true;
              }).length;
              final disabledCount = rules.length - activeCount;

              final filtered = _typeFilter == null
                  ? rules
                  : rules
                      .where((r) =>
                          (r['type'] ?? '').toString() == _typeFilter)
                      .toList();

              final types = rules
                  .map((r) => (r['type'] ?? '').toString())
                  .where((t) => t.isNotEmpty)
                  .toSet()
                  .toList();

              return SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(28, 20, 28, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Summary stats chips row
                    Row(
                      children: [
                        _WebStatChip(
                          label: context.tr('total'),
                          value: rules.length,
                          color: AppColors.secondary,
                          icon: Icons.notifications_rounded,
                        ),
                        const SizedBox(width: 12),
                        _WebStatChip(
                          label: context.tr('active'),
                          value: activeCount,
                          color: AppColors.primary,
                          icon: Icons.check_circle_rounded,
                        ),
                        const SizedBox(width: 12),
                        _WebStatChip(
                          label: context.tr('disabled'),
                          value: disabledCount,
                          color: context.textMutedColor,
                          icon: Icons.do_not_disturb_on_rounded,
                        ),
                      ],
                    ),
                    if (types.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      SizedBox(
                        height: 36,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            _NotifFilterChip(
                              label: context.tr('all'),
                              selected: _typeFilter == null,
                              color: AppColors.primary,
                              onTap: () =>
                                  setState(() => _typeFilter = null),
                            ),
                            ...types.map((t) {
                              final (_, color) =
                                  _NotificationMeta.iconColor(t);
                              return Padding(
                                padding: const EdgeInsets.only(left: 6),
                                child: _NotifFilterChip(
                                  label: _NotificationMeta.label(t),
                                  selected: _typeFilter == t,
                                  color: color,
                                  onTap: () => setState(() => _typeFilter =
                                      _typeFilter == t ? null : t),
                                ),
                              );
                            }),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),
                    if (filtered.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 60),
                        child: Column(
                          children: [
                            Container(
                              width: 84,
                              height: 84,
                              decoration: BoxDecoration(
                                color: context.cardColor,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.notifications_off_rounded,
                                color: context.textMutedColor,
                                size: 40,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _typeFilter != null
                                  ? context.tr('no_results')
                                  : context.tr('no_notification_rules'),
                              style: TextStyle(
                                color: context.textPrimaryColor,
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _typeFilter != null
                                  ? context.tr('try_adjusting_filters')
                                  : context
                                      .tr('no_notification_rules_subtitle'),
                              style: TextStyle(
                                  color: context.textSecondaryColor),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      )
                    else
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: filtered.length,
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 14,
                          crossAxisSpacing: 14,
                          childAspectRatio: 2.2,
                        ),
                        itemBuilder: (context, i) {
                          final r = filtered[i];
                          return _RuleTile(
                            rule: r,
                            carNameResolver: _carNameFor,
                            onDelete: () => _deleteRule(r),
                            onToggle: (v) => _toggleEnabled(r, v),
                          );
                        },
                      ),
                    const SizedBox(height: 24),
                    _TelegramCard(
                      controller: _telegramCtrl,
                      loaded: _telegramLoaded,
                      saving: _savingChatId,
                      testing: _testingChatId,
                      onSave: _saveTelegramChatId,
                      onTest: _testTelegram,
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        title: Text(context.tr('notification_rules')),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addRule,
        icon: const Icon(Icons.add_alert_rounded),
        label: Text(context.tr('add_rule')),
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _refresh,
        child: FutureBuilder<List<Map<String, dynamic>>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const ShimmerList();
            }
            if (snap.hasError) {
              return AppError(
                message: snap.error.toString(),
                onRetry: _refresh,
              );
            }
            final rules = snap.data ?? const [];
            final activeCount = rules.where((r) {
              final enabled = r['enabled'];
              if (enabled is bool) return enabled;
              if (enabled is num) return enabled != 0;
              return true;
            }).length;
            final disabledCount = rules.length - activeCount;

            // Apply type filter
            final filtered = _typeFilter == null
                ? rules
                : rules
                    .where((r) =>
                        (r['type'] ?? '').toString() == _typeFilter)
                    .toList();

            // Distinct types for filter chips
            final types = rules
                .map((r) => (r['type'] ?? '').toString())
                .where((t) => t.isNotEmpty)
                .toSet()
                .toList();

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
              children: [
                // ── Stats summary row ──
                if (rules.isNotEmpty) ...[
                  _NotifStatsRow(
                    total: rules.length,
                    active: activeCount,
                    disabled: disabledCount,
                  ),
                  const SizedBox(height: 10),
                ],
                // ── Type filter chips ──
                if (types.isNotEmpty) ...[
                  SizedBox(
                    height: 36,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _NotifFilterChip(
                          label: context.tr('all'),
                          selected: _typeFilter == null,
                          color: AppColors.primary,
                          onTap: () =>
                              setState(() => _typeFilter = null),
                        ),
                        ...types.map((t) {
                          final (_, color) =
                              _NotificationMeta.iconColor(t);
                          return Padding(
                            padding: const EdgeInsets.only(left: 6),
                            child: _NotifFilterChip(
                              label: _NotificationMeta.label(t),
                              selected: _typeFilter == t,
                              color: color,
                              onTap: () => setState(() => _typeFilter =
                                  _typeFilter == t ? null : t),
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                // ── Rules list ──
                if (filtered.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 40),
                    child: Column(
                      children: [
                        Container(
                          width: 84,
                          height: 84,
                          decoration: BoxDecoration(
                            color: context.cardColor,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.notifications_off_rounded,
                            color: context.textMutedColor,
                            size: 40,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _typeFilter != null
                              ? context.tr('no_results')
                              : context.tr('no_notification_rules'),
                          style: TextStyle(
                            color: context.textPrimaryColor,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _typeFilter != null
                              ? context.tr('try_adjusting_filters')
                              : context.tr('no_notification_rules_subtitle'),
                          style: TextStyle(
                              color: context.textSecondaryColor),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  )
                else
                  ...filtered.map(
                    (r) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _RuleTile(
                        rule: r,
                        carNameResolver: _carNameFor,
                        onDelete: () => _deleteRule(r),
                        onToggle: (v) => _toggleEnabled(r, v),
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
                _TelegramCard(
                  controller: _telegramCtrl,
                  loaded: _telegramLoaded,
                  saving: _savingChatId,
                  testing: _testingChatId,
                  onSave: _saveTelegramChatId,
                  onTest: _testTelegram,
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Filter chips & stats row for notifications screen
// ---------------------------------------------------------------------------

class _NotifStatsRow extends StatelessWidget {
  final int total;
  final int active;
  final int disabled;

  const _NotifStatsRow({
    required this.total,
    required this.active,
    required this.disabled,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          _StatItem(
            label: context.tr('total'),
            value: total,
            color: AppColors.secondary,
            icon: Icons.notifications_rounded,
          ),
          Container(
            width: 1,
            height: 28,
            color: context.dividerColor,
            margin: const EdgeInsets.symmetric(horizontal: 12),
          ),
          _StatItem(
            label: context.tr('active'),
            value: active,
            color: AppColors.primary,
            icon: Icons.check_circle_rounded,
          ),
          Container(
            width: 1,
            height: 28,
            color: context.dividerColor,
            margin: const EdgeInsets.symmetric(horizontal: 12),
          ),
          _StatItem(
            label: context.tr('disabled'),
            value: disabled,
            color: context.textMutedColor,
            icon: Icons.do_not_disturb_on_rounded,
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  final IconData icon;

  const _StatItem({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Row(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$value',
                style: TextStyle(
                  color: color,
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                label,
                style: TextStyle(
                  color: context.textMutedColor,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _WebStatChip extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  final IconData icon;

  const _WebStatChip({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$value',
                style: TextStyle(
                  color: color,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                label,
                style: TextStyle(
                  color: context.textMutedColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _NotifFilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _NotifFilterChip({
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
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.2) : context.cardColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? color : context.dividerColor,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? color : context.textSecondaryColor,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------

class _RuleTile extends StatelessWidget {
  final Map<String, dynamic> rule;
  final String Function(String?) carNameResolver;
  final VoidCallback onDelete;
  final ValueChanged<bool> onToggle;

  const _RuleTile({
    required this.rule,
    required this.carNameResolver,
    required this.onDelete,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final type = (rule['type'] ?? '').toString();
    final label = _NotificationMeta.label(type);
    final (icon, color) = _NotificationMeta.iconColor(type);
    final carId = rule['carId']?.toString();
    final carName = carNameResolver(carId);
    final isAllVehicles = carId == null || carId.isEmpty;
    final enabled = _readBool(rule['enabled'], defaultValue: true);
    final channels = _channelsFor(rule);
    final condition = _conditionPreview(context, rule);

    return Dismissible(
      key: ValueKey(rule['_id'] ?? rule['id'] ?? identityHashCode(rule)),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: AlignmentDirectional.centerEnd,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: BoxDecoration(
          color: AppColors.error.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
        ),
        child: const Icon(Icons.delete_outline, color: AppColors.error),
      ),
      confirmDismiss: (_) async {
        onDelete();
        return false;
      },
      child: Container(
        decoration: BoxDecoration(
          gradient: context.cardGradientColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: context.dividerColor),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Left colored border by event type
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: color,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(icon, color: color, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                label,
                                style: TextStyle(
                                  color: context.textPrimaryColor,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                condition,
                                style: TextStyle(
                                  color: context.textSecondaryColor,
                                  fontSize: 12,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        Switch.adaptive(
                          value: enabled,
                          onChanged: onToggle,
                          activeColor: AppColors.primary,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        _ScopeChip(
                          label: carName,
                          allVehicles: isAllVehicles,
                        ),
                        if (channels.isNotEmpty)
                          _ChannelsRow(channels: channels),
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
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static bool _readBool(dynamic value, {required bool defaultValue}) {
    if (value is bool) return value;
    if (value is num) return value != 0;
    if (value is String) {
      final v = value.toLowerCase();
      if (v == 'true' || v == '1') return true;
      if (v == 'false' || v == '0') return false;
    }
    return defaultValue;
  }

  List<_Channel> _channelsFor(Map<String, dynamic> rule) {
    final channels = <_Channel>[];
    // Support a few shapes: rule['channels'] as list, or top-level booleans.
    final raw = rule['channels'];
    final set = <String>{};
    if (raw is List) {
      for (final c in raw) {
        set.add(c.toString().toLowerCase());
      }
    }
    // Explicit flags
    if (_readBool(rule['push'], defaultValue: false)) set.add('push');
    if (_readBool(rule['sms'], defaultValue: false)) set.add('sms');
    if (_readBool(rule['email'], defaultValue: false)) set.add('email');
    // Traccar-style: notificators = "web,mail,firebase"
    final notificators = rule['notificators']?.toString();
    if (notificators != null && notificators.isNotEmpty) {
      for (final raw in notificators.split(',')) {
        final n = raw.trim().toLowerCase();
        if (n == 'firebase' || n == 'web' || n == 'push') set.add('push');
        if (n == 'mail' || n == 'email') set.add('email');
        if (n == 'sms') set.add('sms');
      }
    }
    // Sensible default: push if nothing detected
    if (set.isEmpty) set.add('push');

    if (set.contains('push')) channels.add(_Channel.push);
    if (set.contains('sms')) channels.add(_Channel.sms);
    if (set.contains('email')) channels.add(_Channel.email);
    return channels;
  }

  String _conditionPreview(BuildContext context, Map<String, dynamic> rule) {
    final type = (rule['type'] ?? '').toString();
    final attrs = rule['attributes'];
    dynamic speedLimit;
    if (attrs is Map) {
      speedLimit = attrs['speedLimit'] ?? attrs['speed'];
    }
    speedLimit ??= rule['speedLimit'] ?? rule['speed'];
    switch (type) {
      case 'overspeed':
        final n = (speedLimit is num)
            ? speedLimit.round()
            : int.tryParse(speedLimit?.toString() ?? '') ?? 120;
        return context.tr('when_speed_over').replaceAll('{n}', '$n');
      case 'geofenceExit':
        return context.tr('when_vehicle_exits_zone');
      case 'geofenceEnter':
        return context.tr('when_vehicle_enters_zone');
      case 'deviceOffline':
        return context.tr('when_device_offline');
      case 'deviceOnline':
        return context.tr('when_device_online');
      case 'deviceMoving':
        return context.tr('when_device_moving');
      case 'deviceStopped':
        return context.tr('when_device_stopped');
      case 'ignitionOn':
        return context.tr('when_ignition_on');
      case 'ignitionOff':
        return context.tr('when_ignition_off');
      case 'alarm':
        return context.tr('when_alarm_triggered');
      default:
        return context.tr('no_condition');
    }
  }
}

enum _Channel { push, sms, email }

class _ScopeChip extends StatelessWidget {
  final String label;
  final bool allVehicles;
  const _ScopeChip({required this.label, required this.allVehicles});

  @override
  Widget build(BuildContext context) {
    final color = allVehicles ? AppColors.accent : AppColors.secondary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            allVehicles
                ? Icons.directions_car_filled_rounded
                : Icons.directions_car_rounded,
            size: 14,
            color: color,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChannelsRow extends StatelessWidget {
  final List<_Channel> channels;
  const _ChannelsRow({required this.channels});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: context.cardElevatedColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final c in channels) ...[
            Icon(_iconFor(c), size: 14, color: _colorFor(c)),
            const SizedBox(width: 4),
            Text(
              _labelFor(context, c),
              style: TextStyle(
                color: context.textSecondaryColor,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (c != channels.last) ...[
              const SizedBox(width: 8),
              Container(width: 1, height: 10, color: context.dividerColor),
              const SizedBox(width: 8),
            ],
          ],
        ],
      ),
    );
  }

  IconData _iconFor(_Channel c) {
    switch (c) {
      case _Channel.push:
        return Icons.notifications_active_rounded;
      case _Channel.sms:
        return Icons.sms_rounded;
      case _Channel.email:
        return Icons.mail_rounded;
    }
  }

  Color _colorFor(_Channel c) {
    switch (c) {
      case _Channel.push:
        return AppColors.primary;
      case _Channel.sms:
        return AppColors.warning;
      case _Channel.email:
        return AppColors.secondary;
    }
  }

  String _labelFor(BuildContext context, _Channel c) {
    switch (c) {
      case _Channel.push:
        return context.tr('push');
      case _Channel.sms:
        return context.tr('sms');
      case _Channel.email:
        return 'Email';
    }
  }
}

class _TelegramCard extends StatelessWidget {
  final TextEditingController controller;
  final bool loaded;
  final bool saving;
  final bool testing;
  final VoidCallback onSave;
  final VoidCallback onTest;

  const _TelegramCard({
    required this.controller,
    required this.loaded,
    required this.saving,
    required this.testing,
    required this.onSave,
    required this.onTest,
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
            _telegramBlue.withValues(alpha: 0.18),
            _telegramBlue.withValues(alpha: 0.06),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _telegramBlue.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _telegramBlue,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: _telegramBlue.withValues(alpha: 0.4),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.send_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('telegram_notifications'),
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Telegram',
                      style: TextStyle(
                        color: _telegramBlue,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            context.tr('telegram_description'),
            style: TextStyle(color: context.textSecondaryColor, fontSize: 13),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: controller,
            enabled: loaded,
            keyboardType: TextInputType.text,
            decoration: const InputDecoration(
              labelText: 'Telegram Chat ID',
              hintText: 'e.g. 123456789',
              prefixIcon: Icon(Icons.tag_rounded),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: (saving || !loaded) ? null : onSave,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _telegramBlue,
                    foregroundColor: Colors.white,
                  ),
                  icon: saving
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.save_rounded),
                  label: Text(context.tr('save_chat_id')),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: (testing || !loaded) ? null : onTest,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _telegramBlue,
                    side: const BorderSide(color: _telegramBlue),
                  ),
                  icon: testing
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: _telegramBlue),
                        )
                      : const Icon(Icons.notifications_active_rounded),
                  label: Text(context.tr('test')),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _NotificationRuleForm extends StatefulWidget {
  final List<FleetItem> items;
  const _NotificationRuleForm({required this.items});

  @override
  State<_NotificationRuleForm> createState() => _NotificationRuleFormState();
}

class _NotificationRuleFormState extends State<_NotificationRuleForm> {
  String _type = 'deviceOffline';
  String? _carId;

  static const _types = <String>[
    'deviceOnline',
    'deviceOffline',
    'deviceMoving',
    'deviceStopped',
    'geofenceEnter',
    'geofenceExit',
    'overspeed',
    'ignitionOn',
    'ignitionOff',
    'alarm',
  ];

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
            Text(context.tr('new_notification_rule'),
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _type,
              decoration: InputDecoration(labelText: context.tr('event_type')),
              dropdownColor: context.surfaceColor,
              items: _types
                  .map(
                    (t) => DropdownMenuItem(
                      value: t,
                      child: Text(_NotificationMeta.label(t)),
                    ),
                  )
                  .toList(),
              onChanged: (v) {
                if (v != null) setState(() => _type = v);
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String?>(
              value: _carId,
              decoration: InputDecoration(labelText: context.tr('vehicle')),
              dropdownColor: context.surfaceColor,
              items: [
                DropdownMenuItem<String?>(
                  value: null,
                  child: Text(context.tr('all_vehicles')),
                ),
                ...widget.items.map(
                  (it) => DropdownMenuItem<String?>(
                    value: it.carId,
                    child: Text(
                      it.carName.isEmpty ? it.carId : it.carName,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ],
              onChanged: (v) => setState(() => _carId = v),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context, {
                    'type': _type,
                    if (_carId != null) 'carId': _carId,
                    'enabled': true,
                    'attributes': <String, dynamic>{},
                  });
                },
                icon: const Icon(Icons.check_rounded),
                label: Text(context.tr('create')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationMeta {
  static String label(String type) {
    switch (type) {
      case 'deviceOnline':
        return 'Online Alert';
      case 'deviceOffline':
        return 'Offline Alert';
      case 'deviceMoving':
        return 'Movement Alert';
      case 'deviceStopped':
        return 'Stop Alert';
      case 'geofenceEnter':
        return 'Geofence Enter';
      case 'geofenceExit':
        return 'Geofence Exit';
      case 'overspeed':
        return 'Overspeed Alert';
      case 'ignitionOn':
        return 'Ignition On';
      case 'ignitionOff':
        return 'Ignition Off';
      case 'alarm':
        return 'Alarm Triggered';
      case 'maintenance':
        return 'Maintenance';
      case 'custom':
        return 'Custom Rule';
      default:
        return type;
    }
  }

  static (IconData, Color) iconColor(String type) {
    switch (type) {
      case 'deviceOnline':
        return (Icons.cloud_done_rounded, AppColors.statusMoving);
      case 'deviceOffline':
        return (Icons.wifi_off_rounded, AppColors.statusOffline);
      case 'deviceMoving':
        return (Icons.navigation_rounded, AppColors.statusMoving);
      case 'deviceStopped':
        return (Icons.stop_circle_outlined, AppColors.statusStopped);
      case 'geofenceEnter':
        return (Icons.fence_rounded, AppColors.success);
      case 'geofenceExit':
        return (Icons.logout_rounded, AppColors.warning);
      case 'overspeed':
        return (Icons.speed_rounded, AppColors.error);
      case 'ignitionOn':
        return (Icons.power_settings_new_rounded, AppColors.statusMoving);
      case 'ignitionOff':
        return (Icons.power_off_rounded, AppColors.statusOffline);
      case 'alarm':
        return (Icons.warning_amber_rounded, AppColors.error);
      case 'maintenance':
        return (Icons.build_rounded, AppColors.secondary);
      case 'custom':
        return (Icons.bolt_rounded, AppColors.accent);
      default:
        return (Icons.notifications_rounded, AppColors.secondary);
    }
  }
}
