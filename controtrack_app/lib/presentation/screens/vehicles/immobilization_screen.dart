import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../data/repositories/fleet_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../blocs/fleet/fleet_state.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';

/// SharedPreferences key for the immobilization PIN. Single PIN per device.
const String kImmobilizationPinKey = 'immobilization_pin';
const String kImmobilizationPinDefault = '1234';

/// Key for the per-vehicle immobilization action history (last 5 entries).
String immobilizationHistoryKey(String carId) =>
    'immobilization_history_$carId';

/// Read the currently stored PIN, falling back to the default.
Future<String> readImmobilizationPin() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(kImmobilizationPinKey) ?? kImmobilizationPinDefault;
}

/// Save a new PIN.
Future<void> saveImmobilizationPin(String pin) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(kImmobilizationPinKey, pin);
}

/// Shows the reusable PIN-change dialog. Returns `true` if the PIN was
/// updated, `false` otherwise.
Future<bool> showChangePinDialog(BuildContext context) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (_) => const _ChangePinDialog(),
  );
  return result == true;
}

class ImmobilizationScreen extends StatefulWidget {
  final String carId;
  const ImmobilizationScreen({super.key, required this.carId});

  @override
  State<ImmobilizationScreen> createState() => _ImmobilizationScreenState();
}

class _ImmobilizationScreenState extends State<ImmobilizationScreen> {
  bool _sending = false;
  List<_ActionEntry> _history = const [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final raw =
        prefs.getStringList(immobilizationHistoryKey(widget.carId)) ??
            const [];
    if (!mounted) return;
    setState(() {
      _history = raw.map(_ActionEntry.parse).toList();
    });
  }

  Future<void> _appendHistory(String type) async {
    final prefs = await SharedPreferences.getInstance();
    final entry = _ActionEntry(type: type, at: DateTime.now());
    final updated = [entry, ..._history].take(5).toList();
    await prefs.setStringList(
      immobilizationHistoryKey(widget.carId),
      updated.map((e) => e.serialize()).toList(),
    );
    if (!mounted) return;
    setState(() => _history = updated);
  }

  Future<void> _sendCommand(String type) async {
    final pinOk = await _promptForPin();
    if (pinOk != true) return;
    if (!mounted) return;
    final repo = context.read<FleetRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final successMsg = type == 'engineStop'
        ? context.tr('engine_stop_sent')
        : context.tr('engine_resume_sent');
    final failMsg = context.tr('command_failed');
    setState(() => _sending = true);
    try {
      await repo.sendCommand(widget.carId, {'type': type});
      await _appendHistory(type);
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: type == 'engineStop'
              ? AppColors.error
              : AppColors.primaryDark,
          content: Text(successMsg),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$failMsg: $e'),
        ),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<bool?> _promptForPin() async {
    return showDialog<bool>(
      context: context,
      builder: (_) => const _EnterPinDialog(),
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
        title: Text(
          context.tr('immobilization'),
          style: TextStyle(
            color: context.textPrimaryColor,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.key_rounded),
            tooltip: context.tr('change_pin'),
            onPressed: () => showChangePinDialog(context),
          ),
        ],
      ),
      body: BlocBuilder<FleetCubit, FleetState>(
        builder: (context, state) {
          if (state.status == FleetStatus.loading && state.items.isEmpty) {
            return const AppLoading();
          }
          FleetItem? item;
          for (final it in state.items) {
            if (it.carId == widget.carId) {
              item = it;
              break;
            }
          }
          if (item == null) {
            return AppError(
              message: 'Vehicle not found',
              onRetry: () => context.read<FleetCubit>().load(),
            );
          }
          final ignition = item.ignition;
          final running = ignition == true;
          final unknown = ignition == null;
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
            children: [
              Text(
                item.carName.isEmpty
                    ? context.tr('unnamed_vehicle')
                    : item.carName,
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (item.licensePlate.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    item.licensePlate,
                    style: TextStyle(color: context.textSecondaryColor),
                  ),
                ),
              const SizedBox(height: 20),
              _EngineStatusBadge(
                running: running,
                unknown: unknown,
              ).animate().fadeIn(duration: 350.ms),
              const SizedBox(height: 16),
              _WarningBanner(
                text:
                    'Stopping the engine is a safety-critical action. Only use this if the vehicle is safely parked.',
              ).animate(delay: 100.ms).fadeIn(duration: 350.ms),
              const SizedBox(height: 20),
              _LargeActionButton(
                label: context.tr('stop_engine'),
                icon: Icons.power_off_rounded,
                color: AppColors.error,
                loading: _sending,
                onPressed: _sending ? null : () => _sendCommand('engineStop'),
              ),
              const SizedBox(height: 14),
              _LargeActionButton(
                label: context.tr('resume_engine'),
                icon: Icons.power_settings_new,
                color: AppColors.statusMoving,
                loading: _sending,
                onPressed:
                    _sending ? null : () => _sendCommand('engineResume'),
              ),
              const SizedBox(height: 28),
              Row(
                children: [
                  Icon(Icons.history_rounded,
                      size: 16, color: context.textMutedColor),
                  const SizedBox(width: 6),
                  Text(
                    context.tr('recent_actions').toUpperCase(),
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
              if (_history.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: context.cardColor,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: context.dividerColor),
                  ),
                  child: Text(
                    context.tr('no_recent_actions'),
                    style: TextStyle(color: context.textMutedColor),
                  ),
                )
              else
                Column(
                  children: [
                    for (final e in _history)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _HistoryTile(entry: e),
                      ),
                  ],
                ),
            ],
          );
        },
      ),
    );
  }
}

class _WarningBanner extends StatelessWidget {
  final String text;
  const _WarningBanner({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.45)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.22),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.warning_amber_rounded,
              color: AppColors.warning,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 12.5,
                height: 1.35,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionEntry {
  final String type;
  final DateTime at;
  const _ActionEntry({required this.type, required this.at});

  String serialize() => '$type|${at.toIso8601String()}';

  static _ActionEntry parse(String raw) {
    final parts = raw.split('|');
    return _ActionEntry(
      type: parts.isNotEmpty ? parts[0] : '',
      at: parts.length > 1
          ? (DateTime.tryParse(parts[1]) ?? DateTime.now())
          : DateTime.now(),
    );
  }
}

class _EngineStatusBadge extends StatelessWidget {
  final bool running;
  final bool unknown;
  const _EngineStatusBadge({required this.running, required this.unknown});

  @override
  Widget build(BuildContext context) {
    final color = unknown
        ? AppColors.statusOffline
        : running
            ? AppColors.statusMoving
            : AppColors.error;
    final label = unknown
        ? context.tr('engine_status_unknown')
        : running
            ? context.tr('engine_running')
            : context.tr('engine_stopped');
    final icon = unknown
        ? Icons.help_outline_rounded
        : running
            ? Icons.power_settings_new
            : Icons.power_off_rounded;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.25),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 32),
          ),
          const SizedBox(height: 12),
          Text(
            label.toUpperCase(),
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.4,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
}

class _LargeActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool loading;
  final VoidCallback? onPressed;
  const _LargeActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.loading,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !loading;
    return SizedBox(
      width: double.infinity,
      height: 66,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: enabled ? onPressed : null,
          borderRadius: BorderRadius.circular(18),
          child: AnimatedContainer(
            duration: 180.ms,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            decoration: BoxDecoration(
              color: enabled ? color : color.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(18),
              boxShadow: enabled
                  ? [
                      BoxShadow(
                        color: color.withValues(alpha: 0.45),
                        blurRadius: 14,
                        offset: const Offset(0, 4),
                      ),
                    ]
                  : null,
            ),
            child: Row(
              children: [
                Icon(icon, color: Colors.white, size: 26),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
                if (loading)
                  const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2.4,
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

class _HistoryTile extends StatelessWidget {
  final _ActionEntry entry;
  const _HistoryTile({required this.entry});

  @override
  Widget build(BuildContext context) {
    final isStop = entry.type == 'engineStop';
    final color = isStop ? AppColors.error : AppColors.statusMoving;
    final label =
        isStop ? context.tr('stop_engine') : context.tr('resume_engine');
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
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
            child: Icon(
              isStop ? Icons.power_off_rounded : Icons.power_settings_new,
              color: color,
              size: 18,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _formatTimestamp(entry.at),
                  style: TextStyle(
                      color: context.textMutedColor, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _formatTimestamp(DateTime d) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${d.year}-${two(d.month)}-${two(d.day)} '
        '${two(d.hour)}:${two(d.minute)}';
  }
}

// -----------------------------------------------------------------------------
// PIN entry dialog — verifies against the stored PIN.
// -----------------------------------------------------------------------------
class _EnterPinDialog extends StatefulWidget {
  const _EnterPinDialog();

  @override
  State<_EnterPinDialog> createState() => _EnterPinDialogState();
}

class _EnterPinDialogState extends State<_EnterPinDialog> {
  final _controller = TextEditingController();
  String? _error;
  bool _verifying = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    setState(() {
      _verifying = true;
      _error = null;
    });
    final stored = await readImmobilizationPin();
    if (!mounted) return;
    if (_controller.text == stored) {
      Navigator.of(context).pop(true);
    } else {
      setState(() {
        _verifying = false;
        _error = context.tr('incorrect_pin');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: context.surfaceColor,
      title: Text(context.tr('enter_pin')),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.tr('enter_pin_to_continue'),
            style: TextStyle(color: context.textSecondaryColor),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _controller,
            keyboardType: TextInputType.number,
            autofocus: true,
            obscureText: true,
            maxLength: 4,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 22,
              letterSpacing: 12,
              fontWeight: FontWeight.w800,
            ),
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: InputDecoration(
              counterText: '',
              errorText: _error,
              filled: true,
              fillColor: context.cardColor,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onSubmitted: (_) => _verify(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(context.tr('cancel')),
        ),
        ElevatedButton(
          onPressed: _verifying ? null : _verify,
          child: _verifying
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(context.tr('done')),
        ),
      ],
    );
  }
}

// -----------------------------------------------------------------------------
// Change-PIN dialog — current PIN + new PIN + confirm.
// -----------------------------------------------------------------------------
class _ChangePinDialog extends StatefulWidget {
  const _ChangePinDialog();

  @override
  State<_ChangePinDialog> createState() => _ChangePinDialogState();
}

class _ChangePinDialogState extends State<_ChangePinDialog> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  String? _error;
  bool _saving = false;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final incorrectPin = context.tr('incorrect_pin');
    final pinsNoMatch = context.tr('pins_do_not_match');
    final pinUpdated = context.tr('pin_updated');
    final messenger = ScaffoldMessenger.of(context);
    setState(() {
      _saving = true;
      _error = null;
    });
    final stored = await readImmobilizationPin();
    if (!mounted) return;
    if (_current.text != stored) {
      setState(() {
        _saving = false;
        _error = incorrectPin;
      });
      return;
    }
    if (_next.text.length != 4) {
      setState(() {
        _saving = false;
        _error = 'PIN must be 4 digits';
      });
      return;
    }
    if (_next.text != _confirm.text) {
      setState(() {
        _saving = false;
        _error = pinsNoMatch;
      });
      return;
    }
    await saveImmobilizationPin(_next.text);
    if (!mounted) return;
    Navigator.of(context).pop(true);
    messenger.showSnackBar(
      SnackBar(
        backgroundColor: AppColors.primaryDark,
        content: Text(pinUpdated),
      ),
    );
  }

  Widget _pinField(TextEditingController c, String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: c,
        keyboardType: TextInputType.number,
        obscureText: true,
        maxLength: 4,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        decoration: InputDecoration(
          counterText: '',
          labelText: label,
          filled: true,
          fillColor: context.cardColor,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: context.surfaceColor,
      title: Text(context.tr('change_pin')),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _pinField(_current, context.tr('current_pin')),
          _pinField(_next, context.tr('new_pin')),
          _pinField(_confirm, context.tr('confirm_pin')),
          if (_error != null)
            Text(
              _error!,
              style: const TextStyle(color: AppColors.error, fontSize: 12),
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(context.tr('cancel')),
        ),
        ElevatedButton(
          onPressed: _saving ? null : _submit,
          child: _saving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(context.tr('save')),
        ),
      ],
    );
  }
}
