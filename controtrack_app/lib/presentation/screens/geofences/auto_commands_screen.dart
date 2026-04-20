import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/repositories/auto_commands_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Model helpers
// ─────────────────────────────────────────────────────────────────────────────

enum _ActionPreset {
  notification,
  engineStop,
  engineResume,
  alarm,
}

extension _ActionPresetX on _ActionPreset {
  String get commandType {
    switch (this) {
      case _ActionPreset.notification:
        return 'notification';
      case _ActionPreset.engineStop:
        return 'engineStop';
      case _ActionPreset.engineResume:
        return 'engineResume';
      case _ActionPreset.alarm:
        return 'alarm';
    }
  }

  IconData get icon {
    switch (this) {
      case _ActionPreset.notification:
        return Icons.notifications_active_rounded;
      case _ActionPreset.engineStop:
        return Icons.power_settings_new_rounded;
      case _ActionPreset.engineResume:
        return Icons.play_circle_rounded;
      case _ActionPreset.alarm:
        return Icons.campaign_rounded;
    }
  }

  Color get color {
    switch (this) {
      case _ActionPreset.notification:
        return AppColors.secondary;
      case _ActionPreset.engineStop:
        return AppColors.error;
      case _ActionPreset.engineResume:
        return AppColors.primary;
      case _ActionPreset.alarm:
        return AppColors.warning;
    }
  }

  String labelKey() {
    switch (this) {
      case _ActionPreset.notification:
        return 'action_send_notification';
      case _ActionPreset.engineStop:
        return 'action_engine_stop';
      case _ActionPreset.engineResume:
        return 'action_engine_resume';
      case _ActionPreset.alarm:
        return 'action_trigger_alarm';
    }
  }

  String descKey() {
    switch (this) {
      case _ActionPreset.notification:
        return 'action_send_notification_desc';
      case _ActionPreset.engineStop:
        return 'action_engine_stop_desc';
      case _ActionPreset.engineResume:
        return 'action_engine_resume_desc';
      case _ActionPreset.alarm:
        return 'action_trigger_alarm_desc';
    }
  }

  bool get supportsOnlyWhenStopped => this == _ActionPreset.engineStop;
}

_ActionPreset? _presetFromCommand(String cmd) {
  switch (cmd.toLowerCase()) {
    case 'notification':
      return _ActionPreset.notification;
    case 'enginestop':
      return _ActionPreset.engineStop;
    case 'engineresume':
      return _ActionPreset.engineResume;
    case 'alarm':
      return _ActionPreset.alarm;
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

class AutoCommandsScreen extends StatefulWidget {
  final String geofenceId;
  final String geofenceName;

  const AutoCommandsScreen({
    super.key,
    required this.geofenceId,
    required this.geofenceName,
  });

  @override
  State<AutoCommandsScreen> createState() => _AutoCommandsScreenState();
}

class _AutoCommandsScreenState extends State<AutoCommandsScreen> {
  final _repo = AutoCommandsRepository();
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _future = _repo.getForGeofence(widget.geofenceId);
  }

  void _refresh() {
    setState(() {
      _future = _repo.getForGeofence(widget.geofenceId);
    });
  }

  Future<void> _delete(Map<String, dynamic> ac) async {
    final id = (ac['_id'] ?? ac['id'] ?? '').toString();
    if (id.isEmpty) return;

    // Capture strings before async gap
    final confirmTitle = context.tr('confirm_delete');
    final confirmContent = context.tr('action_cannot_be_undone');
    final cancelLabel = context.tr('cancel');
    final deleteLabel = context.tr('delete');

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.surfaceColor,
        title: Text(confirmTitle),
        content: Text(
          confirmContent,
          style: TextStyle(color: ctx.textSecondaryColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(cancelLabel),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(deleteLabel,
                style: const TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (ok != true) return;

    await _repo.delete(geofenceId: widget.geofenceId, id: id);
    if (!mounted) return;
    _refresh();
  }

  Future<void> _add() async {
    // Capture strings before async gap
    final msgCreated = context.tr('auto_command_created');
    final surfaceColor = context.surfaceColor;

    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => const _AutoCommandForm(),
    );
    if (result == null) return;

    await _repo.create(
      geofenceId: widget.geofenceId,
      commandType: result['commandType'] as String,
      trigger: result['trigger'] as String,
      onlyWhenStopped: result['onlyWhenStopped'] == true,
    );

    if (!mounted) return;
    _refresh();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.primaryDark,
        content: Text(msgCreated),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        title:
            Text('${context.tr('auto_commands_for')} ${widget.geofenceName}'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _add,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.black,
        icon: const Icon(Icons.add_rounded),
        label: Text(context.tr('add')),
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const AppLoading();
          }
          if (snap.hasError) {
            return AppError(
              message: snap.error.toString(),
              onRetry: _refresh,
            );
          }
          final list = snap.data ?? const [];
          if (list.isEmpty) {
            return _EmptyAutoCommands(onAdd: _add);
          }
          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async => _refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _AutoCommandTile(
                data: list[i],
                onDelete: () => _delete(list[i]),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

class _EmptyAutoCommands extends StatelessWidget {
  final VoidCallback onAdd;
  const _EmptyAutoCommands({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.bolt_rounded,
                  color: AppColors.primary, size: 36),
            ),
            const SizedBox(height: 16),
            Text(
              context.tr('no_auto_commands'),
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              context.tr('no_auto_commands_subtitle'),
              textAlign: TextAlign.center,
              style:
                  TextStyle(color: context.textSecondaryColor, fontSize: 13),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onAdd,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              icon: const Icon(Icons.add_rounded),
              label: Text(context.tr('new_auto_command')),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile
// ─────────────────────────────────────────────────────────────────────────────

class _AutoCommandTile extends StatelessWidget {
  final Map<String, dynamic> data;
  final VoidCallback onDelete;

  const _AutoCommandTile({required this.data, required this.onDelete});

  static (String, Color) _triggerMeta(BuildContext context, String t) {
    switch (t.toLowerCase()) {
      case 'enter':
        return (context.tr('enter'), AppColors.primary);
      case 'exit':
        return (context.tr('exit'), AppColors.warning);
      case 'both':
        return (context.tr('both'), AppColors.accent);
      default:
        return (t.isEmpty ? '—' : t, context.textSecondaryColor);
    }
  }

  String _triggerSubtitle(BuildContext context, String trigger) {
    switch (trigger.toLowerCase()) {
      case 'enter':
        return context.tr('when_enters');
      case 'exit':
        return context.tr('when_exits');
      case 'both':
        return context.tr('when_enters_or_exits');
      default:
        return context.tr('triggered_auto');
    }
  }

  @override
  Widget build(BuildContext context) {
    final trigger = (data['trigger'] ?? '').toString();
    final commandType = (data['commandType'] ?? '').toString();
    final onlyWhenStopped = data['onlyWhenStopped'] == true;
    final preset = _presetFromCommand(commandType);
    final (triggerLabel, triggerColor) = _triggerMeta(context, trigger);

    final actionColor = preset?.color ?? context.textSecondaryColor;
    final actionIcon = preset?.icon ?? Icons.settings_rounded;
    final actionLabel = preset != null
        ? context.tr(preset.labelKey())
        : commandType.isEmpty
            ? '—'
            : commandType;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          // Action icon badge
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: actionColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: actionColor.withValues(alpha: 0.35)),
            ),
            child: Icon(actionIcon, color: actionColor, size: 22),
          ),
          const SizedBox(width: 12),

          // Labels
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  actionLabel,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    // Trigger badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: triggerColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: triggerColor.withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        triggerLabel,
                        style: TextStyle(
                          color: triggerColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _triggerSubtitle(context, trigger),
                      style: TextStyle(
                          color: context.textMutedColor, fontSize: 11),
                    ),
                  ],
                ),
                // "Only when stopped" badge
                if (onlyWhenStopped) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: AppColors.warning.withValues(alpha: 0.35)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.pause_circle_outline_rounded,
                            color: AppColors.warning, size: 11),
                        const SizedBox(width: 4),
                        Text(
                          context.tr('only_stopped_badge'),
                          style: const TextStyle(
                            color: AppColors.warning,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),

          IconButton(
            icon: const Icon(Icons.delete_outline, color: AppColors.error),
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Form — visual action picker
// ─────────────────────────────────────────────────────────────────────────────

class _AutoCommandForm extends StatefulWidget {
  const _AutoCommandForm();

  @override
  State<_AutoCommandForm> createState() => _AutoCommandFormState();
}

class _AutoCommandFormState extends State<_AutoCommandForm> {
  String _trigger = 'exit';
  _ActionPreset? _selected;
  bool _onlyWhenStopped = false;

  static const _presets = _ActionPreset.values;

  @override
  Widget build(BuildContext context) {
    final canSave = _selected != null;
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle bar
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
              context.tr('new_auto_command'),
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 20),

            // ── Trigger ──────────────────────────────────────────────────────
            Text(
              context.tr('trigger'),
              style: TextStyle(
                color: context.textSecondaryColor,
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _TriggerChip(
                  label: context.tr('enter'),
                  selected: _trigger == 'enter',
                  color: AppColors.primary,
                  onTap: () => setState(() => _trigger = 'enter'),
                ),
                const SizedBox(width: 8),
                _TriggerChip(
                  label: context.tr('exit'),
                  selected: _trigger == 'exit',
                  color: AppColors.warning,
                  onTap: () => setState(() => _trigger = 'exit'),
                ),
                const SizedBox(width: 8),
                _TriggerChip(
                  label: context.tr('both'),
                  selected: _trigger == 'both',
                  color: AppColors.accent,
                  onTap: () => setState(() => _trigger = 'both'),
                ),
              ],
            ),
            const SizedBox(height: 22),

            // ── Action picker ─────────────────────────────────────────────────
            Text(
              context.tr('select_action'),
              style: TextStyle(
                color: context.textSecondaryColor,
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 10),

            GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.55,
              children: _presets.map((preset) {
                final isSelected = _selected == preset;
                final color = preset.color;
                return GestureDetector(
                  onTap: () => setState(() {
                    _selected = preset;
                    if (!preset.supportsOnlyWhenStopped) {
                      _onlyWhenStopped = false;
                    }
                  }),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? color.withValues(alpha: 0.15)
                          : context.cardColor,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected ? color : context.dividerColor,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child:
                                  Icon(preset.icon, color: color, size: 18),
                            ),
                            if (isSelected)
                              Icon(Icons.check_circle_rounded,
                                  color: color, size: 18),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.tr(preset.labelKey()),
                              style: TextStyle(
                                color: isSelected
                                    ? color
                                    : context.textPrimaryColor,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              context.tr(preset.descKey()),
                              style: TextStyle(
                                color: context.textMutedColor,
                                fontSize: 10,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),

            // ── "Only when stopped" toggle (engine stop only) ─────────────────
            if (_selected?.supportsOnlyWhenStopped == true) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: AppColors.warning.withValues(alpha: 0.35)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.pause_circle_outline_rounded,
                            color: AppColors.warning, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            context.tr('only_when_stopped'),
                            style: const TextStyle(
                              color: AppColors.warning,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        Switch(
                          value: _onlyWhenStopped,
                          activeColor: AppColors.warning,
                          onChanged: (v) =>
                              setState(() => _onlyWhenStopped = v),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      context.tr('only_when_stopped_hint'),
                      style: TextStyle(
                          color: context.textMutedColor, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 20),

            // ── Save button ───────────────────────────────────────────────────
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: canSave
                    ? () => Navigator.pop(context, {
                          'commandType': _selected!.commandType,
                          'trigger': _trigger,
                          'onlyWhenStopped': _onlyWhenStopped,
                        })
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.black,
                  disabledBackgroundColor:
                      AppColors.primary.withValues(alpha: 0.3),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                icon: const Icon(Icons.check_rounded),
                label: Text(
                  context.tr('save'),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger chip
// ─────────────────────────────────────────────────────────────────────────────

class _TriggerChip extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _TriggerChip({
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
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.15) : context.cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? color : context.dividerColor,
            width: selected ? 2 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? color : context.textSecondaryColor,
            fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}
