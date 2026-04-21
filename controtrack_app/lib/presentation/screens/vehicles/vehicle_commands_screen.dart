import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/repositories/fleet_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';

const String _kCommandsPinKey = 'commands_pin';
const String _kRequirePinKey = 'commands_require_pin';
const String _kDefaultPin = '1234';

class VehicleCommandsScreen extends StatefulWidget {
  final String carId;
  const VehicleCommandsScreen({super.key, required this.carId});

  @override
  State<VehicleCommandsScreen> createState() => _VehicleCommandsScreenState();
}

class _VehicleCommandsScreenState extends State<VehicleCommandsScreen> {
  late Future<List<Map<String, dynamic>>> _future;
  Set<String> _pinned = <String>{};
  bool _prefsLoaded = false;

  String get _prefsKey => 'pinned_commands_${widget.carId}';

  @override
  void initState() {
    super.initState();
    _future = _load();
    _loadPinned();
  }

  Future<List<Map<String, dynamic>>> _load() {
    return context.read<FleetRepository>().getCommandTypes(widget.carId);
  }

  Future<void> _loadPinned() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_prefsKey) ?? const [];
    if (!mounted) return;
    setState(() {
      _pinned = list.toSet();
      _prefsLoaded = true;
    });
  }

  Future<void> _togglePin(String type) async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      if (_pinned.contains(type)) {
        _pinned.remove(type);
      } else {
        _pinned.add(type);
      }
    });
    await prefs.setStringList(_prefsKey, _pinned.toList());
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  Future<bool> _verifyPinIfRequired() async {
    final prefs = await SharedPreferences.getInstance();
    final required = prefs.getBool(_kRequirePinKey) ?? true;
    if (!required) return true;
    final storedPin = prefs.getString(_kCommandsPinKey) ?? _kDefaultPin;
    if (!mounted) return false;
    final ok = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _PinDialog(
        title: context.tr('enter_pin'),
        subtitle: context.tr('pin_hint'),
        expectedPin: storedPin,
      ),
    );
    return ok == true;
  }

  Future<void> _confirmAndSend(String type) async {
    final label = _humanize(type);
    final repo = context.read<FleetRepository>();
    final msgSendCmd = context.tr('confirm_send_command')
        .replaceFirst('%s', '"$label"');
    final msgSentOk = context.tr('command_sent');
    final msgSendFailed = context.tr('command_send_failed');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.surfaceColor,
        title: Text(context.tr('commands')),
        content: Text(
          msgSendCmd,
          style: TextStyle(color: ctx.textSecondaryColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(context.tr('cancel')),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(context.tr('save')),
          ),
        ],
      ),
    );
    if (ok != true) return;

    final pinOk = await _verifyPinIfRequired();
    if (!pinOk) return;
    if (!mounted) return;

    try {
      await repo.sendCommand(widget.carId, {'type': type});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.primaryDark,
          content: Text('"$label" $msgSentOk'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('$msgSendFailed: $e'),
        ),
      );
    }
  }

  Future<void> _openPinSettings() async {
    final prefs = await SharedPreferences.getInstance();
    final storedPin = prefs.getString(_kCommandsPinKey) ?? _kDefaultPin;
    if (!mounted) return;

    // Show settings bottom sheet
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.surfaceColor,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => _PinSettingsSheet(
        currentPin: storedPin,
      ),
    );
  }

  static (IconData, Color) _iconFor(String type) {
    switch (type) {
      case 'engineStop':
        return (Icons.power_off_rounded, AppColors.error);
      case 'engineResume':
        return (Icons.power_settings_new, AppColors.statusMoving);
      case 'positionSingle':
        return (Icons.my_location_rounded, AppColors.secondary);
      case 'alarm':
        return (Icons.notifications_active_rounded, AppColors.warning);
      case 'custom':
        return (Icons.code_rounded, AppColors.accent);
      default:
        return (Icons.send_rounded, AppColors.primary);
    }
  }

  static String _humanize(String type) {
    if (type.isEmpty) return type;
    final spaced = type
        .replaceAllMapped(RegExp('([A-Z])'), (m) => ' ${m[1]}')
        .replaceAll('_', ' ')
        .trim();
    return spaced
        .split(RegExp(r'\s+'))
        .map((w) => w.isEmpty ? w : w[0].toUpperCase() + w.substring(1))
        .join(' ');
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
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.tr('remote_commands'),
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(
              widget.carId,
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 11,
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_rounded),
            tooltip: context.tr('pin_settings'),
            onPressed: _openPinSettings,
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _refresh,
          ),
        ],
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting || !_prefsLoaded) {
            return const _CommandsShimmer();
          }
          if (snap.hasError) {
            return AppError(
              message: snap.error.toString(),
              onRetry: _refresh,
            );
          }
          final commands = snap.data ?? const [];
          if (commands.isEmpty) {
            return EmptyState(
              title: context.tr('no_data'),
              subtitle: context.tr('long_press_pin'),
              icon: Icons.settings_remote_rounded,
            );
          }

          final pinnedCommands = commands
              .where((c) => _pinned.contains((c['type'] ?? '').toString()))
              .toList();
          final otherCommands = commands
              .where((c) => !_pinned.contains((c['type'] ?? '').toString()))
              .toList();

          final isWide = MediaQuery.sizeOf(context).width >= 900;

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _refresh,
            child: ListView(
              padding: EdgeInsets.fromLTRB(
                isWide ? 28 : 16,
                isWide ? 24 : 16,
                isWide ? 28 : 16,
                32,
              ),
              children: [
                if (pinnedCommands.isNotEmpty) ...[
                  Row(
                    children: [
                      const Icon(Icons.push_pin_rounded,
                          color: AppColors.primary, size: 14),
                      const SizedBox(width: 6),
                      Text(
                        context.tr('pinned').toUpperCase(),
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
                  _CommandGrid(
                    commands: pinnedCommands,
                    pinned: _pinned,
                    onTap: _confirmAndSend,
                    onLongPress: _togglePin,
                    isWide: isWide,
                  ),
                  const SizedBox(height: 24),
                ],
                if (otherCommands.isNotEmpty) ...[
                  if (pinnedCommands.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Text(
                        context.tr('all_commands').toUpperCase(),
                        style: TextStyle(
                          color: context.textMutedColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ),
                  _CommandGrid(
                    commands: otherCommands,
                    pinned: _pinned,
                    onTap: _confirmAndSend,
                    onLongPress: _togglePin,
                    isWide: isWide,
                  ),
                ],
                const SizedBox(height: 16),
                Center(
                  child: Text(
                    context.tr('long_press_pin'),
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 11,
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// PIN Dialog — beautiful 4-digit numpad
// -----------------------------------------------------------------------------
class _PinDialog extends StatefulWidget {
  final String title;
  final String subtitle;
  final String expectedPin;

  /// If true, the dialog accepts ANY 4-digit value and returns it in `pop`.
  /// Used for "new PIN" capture flows rather than verification.
  final bool captureMode;

  const _PinDialog({
    required this.title,
    required this.subtitle,
    this.expectedPin = '',
    this.captureMode = false,
  });

  @override
  State<_PinDialog> createState() => _PinDialogState();
}

class _PinDialogState extends State<_PinDialog> {
  String _entered = '';
  bool _error = false;
  int _shakeNonce = 0;

  void _onDigit(String d) {
    if (_entered.length >= 4) return;
    HapticFeedback.selectionClick();
    setState(() {
      _entered += d;
      _error = false;
    });
    if (_entered.length == 4) {
      _submit();
    }
  }

  void _onBackspace() {
    if (_entered.isEmpty) return;
    HapticFeedback.selectionClick();
    setState(() {
      _entered = _entered.substring(0, _entered.length - 1);
      _error = false;
    });
  }

  Future<void> _submit() async {
    if (widget.captureMode) {
      // Return the entered PIN to caller.
      await Future<void>.delayed(const Duration(milliseconds: 120));
      if (!mounted) return;
      Navigator.of(context).pop<String>(_entered);
      return;
    }
    if (_entered == widget.expectedPin) {
      HapticFeedback.mediumImpact();
      await Future<void>.delayed(const Duration(milliseconds: 120));
      if (!mounted) return;
      Navigator.of(context).pop<bool>(true);
    } else {
      HapticFeedback.heavyImpact();
      setState(() {
        _error = true;
        _shakeNonce++;
      });
      await Future<void>.delayed(const Duration(milliseconds: 600));
      if (!mounted) return;
      setState(() {
        _entered = '';
        _error = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      backgroundColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
        decoration: BoxDecoration(
          gradient: context.backgroundGradientColor,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: context.dividerColor),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.15),
              blurRadius: 32,
              spreadRadius: -8,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Close button row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.lock_rounded,
                    color: AppColors.primary,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.title,
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        widget.subtitle,
                        style: TextStyle(
                          color: context.textMutedColor,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(
                    Icons.close_rounded,
                    color: context.textMutedColor,
                    size: 20,
                  ),
                  onPressed: () => Navigator.of(context).pop(false),
                ),
              ],
            ),
            const SizedBox(height: 20),
            // Digit dots display
            _PinDots(
              length: 4,
              filled: _entered.length,
              error: _error,
              shakeNonce: _shakeNonce,
            ),
            if (_error) ...[
              const SizedBox(height: 10),
              Text(
                context.tr('incorrect_pin'),
                style: const TextStyle(
                  color: AppColors.error,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            const SizedBox(height: 24),
            // Numpad
            _Numpad(
              onDigit: _onDigit,
              onBackspace: _onBackspace,
            ),
          ],
        ),
      ),
    );
  }
}

class _PinDots extends StatefulWidget {
  final int length;
  final int filled;
  final bool error;
  final int shakeNonce;
  const _PinDots({
    required this.length,
    required this.filled,
    required this.error,
    required this.shakeNonce,
  });

  @override
  State<_PinDots> createState() => _PinDotsState();
}

class _PinDotsState extends State<_PinDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _shake = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 350),
  );

  @override
  void didUpdateWidget(covariant _PinDots old) {
    super.didUpdateWidget(old);
    if (widget.shakeNonce != old.shakeNonce) {
      _shake.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _shake.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _shake,
      builder: (_, __) {
        final t = _shake.value;
        final dx = (t == 0) ? 0.0 : 10.0 * (1 - t) * (t < 0.5 ? 1 : -1);
        return Transform.translate(
          offset: Offset(dx, 0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(widget.length, (i) {
              final active = i < widget.filled;
              final color = widget.error
                  ? AppColors.error
                  : active
                      ? AppColors.primary
                      : context.dividerColor;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                margin: const EdgeInsets.symmetric(horizontal: 8),
                width: active ? 18 : 14,
                height: active ? 18 : 14,
                decoration: BoxDecoration(
                  color: active ? color : Colors.transparent,
                  border: Border.all(color: color, width: 2),
                  shape: BoxShape.circle,
                  boxShadow: active && !widget.error
                      ? [
                          BoxShadow(
                            color: color.withValues(alpha: 0.6),
                            blurRadius: 8,
                          ),
                        ]
                      : null,
                ),
              );
            }),
          ),
        );
      },
    );
  }
}

class _Numpad extends StatelessWidget {
  final ValueChanged<String> onDigit;
  final VoidCallback onBackspace;

  const _Numpad({required this.onDigit, required this.onBackspace});

  @override
  Widget build(BuildContext context) {
    final rows = <List<String>>[
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'back'],
    ];
    return Column(
      children: [
        for (final row in rows)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (final key in row)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: _NumKey(
                      label: key,
                      onTap: key.isEmpty
                          ? null
                          : key == 'back'
                              ? onBackspace
                              : () => onDigit(key),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _NumKey extends StatefulWidget {
  final String label;
  final VoidCallback? onTap;

  const _NumKey({required this.label, required this.onTap});

  @override
  State<_NumKey> createState() => _NumKeyState();
}

class _NumKeyState extends State<_NumKey> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    if (widget.label.isEmpty) {
      return const SizedBox(width: 68, height: 60);
    }
    final isBack = widget.label == 'back';
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: (_) => setState(() => _pressed = false),
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        width: 68,
        height: 60,
        decoration: BoxDecoration(
          color: _pressed
              ? AppColors.primary.withValues(alpha: 0.20)
              : context.cardElevatedColor.withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color:
                _pressed ? AppColors.primary : context.dividerColor,
            width: 1,
          ),
        ),
        child: Center(
          child: isBack
              ? Icon(
                  Icons.backspace_rounded,
                  color: context.textSecondaryColor,
                  size: 20,
                )
              : Text(
                  widget.label,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                  ),
                ),
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// PIN Settings bottom sheet
// -----------------------------------------------------------------------------
class _PinSettingsSheet extends StatefulWidget {
  final String currentPin;

  const _PinSettingsSheet({required this.currentPin});

  @override
  State<_PinSettingsSheet> createState() => _PinSettingsSheetState();
}

class _PinSettingsSheetState extends State<_PinSettingsSheet> {
  bool _requirePin = true;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _requirePin = prefs.getBool(_kRequirePinKey) ?? true;
      _loaded = true;
    });
  }

  Future<void> _toggleRequirePin(bool v) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kRequirePinKey, v);
    if (!mounted) return;
    setState(() => _requirePin = v);
  }

  Future<void> _changePin() async {
    final messenger = ScaffoldMessenger.of(context);
    final msgPinsMismatch = context.tr('pins_do_not_match');
    final msgPinUpdated = context.tr('pin_updated');

    // Step 1: verify current PIN
    final verified = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _PinDialog(
        title: context.tr('current_pin'),
        subtitle: context.tr('enter_pin_to_continue'),
        expectedPin: widget.currentPin,
      ),
    );
    if (verified != true) return;
    if (!mounted) return;

    // Step 2: capture new PIN
    final newPin = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _PinDialog(
        title: context.tr('new_pin'),
        subtitle: context.tr('enter_pin_to_continue'),
        captureMode: true,
      ),
    );
    if (newPin == null || newPin.length != 4) return;
    if (!mounted) return;

    // Step 3: confirm new PIN
    final confirmPin = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _PinDialog(
        title: context.tr('confirm_pin'),
        subtitle: context.tr('enter_pin_to_continue'),
        captureMode: true,
      ),
    );
    if (confirmPin == null) return;
    if (confirmPin != newPin) {
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text(msgPinsMismatch),
        ),
      );
      return;
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kCommandsPinKey, newPin);

    messenger.showSnackBar(
      SnackBar(
        backgroundColor: AppColors.primaryDark,
        content: Text(msgPinUpdated),
      ),
    );
    if (!mounted) return;
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          child: !_loaded
              ? const SizedBox(
                  height: 200,
                  child: Center(
                    child: CircularProgressIndicator(
                      color: AppColors.primary,
                    ),
                  ),
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: context.dividerColor,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.shield_rounded,
                            color: AppColors.primary,
                            size: 18,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          context.tr('pin_security'),
                          style: TextStyle(
                            color: context.textPrimaryColor,
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Container(
                      decoration: BoxDecoration(
                        color: context.cardColor,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: context.dividerColor),
                      ),
                      child: Column(
                        children: [
                          SwitchListTile(
                            value: _requirePin,
                            onChanged: _toggleRequirePin,
                            activeColor: AppColors.primary,
                            title: Text(
                              context.tr('require_pin'),
                              style: TextStyle(
                                color: context.textPrimaryColor,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            subtitle: Text(
                              context.tr('pin_hint'),
                              style: TextStyle(
                                color: context.textMutedColor,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          Divider(height: 1, color: context.dividerColor),
                          ListTile(
                            leading: const Icon(
                              Icons.password_rounded,
                              color: AppColors.secondary,
                            ),
                            title: Text(
                              context.tr('change_pin'),
                              style: TextStyle(
                                color: context.textPrimaryColor,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            trailing: Icon(
                              Icons.chevron_right,
                              color: context.textMutedColor,
                            ),
                            onTap: _changePin,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Command grid / card / shimmer
// -----------------------------------------------------------------------------
class _CommandGrid extends StatelessWidget {
  final List<Map<String, dynamic>> commands;
  final Set<String> pinned;
  final ValueChanged<String> onTap;
  final ValueChanged<String> onLongPress;
  final bool isWide;

  const _CommandGrid({
    required this.commands,
    required this.pinned,
    required this.onTap,
    required this.onLongPress,
    this.isWide = false,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: commands.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: isWide ? 3 : 2,
        mainAxisSpacing: isWide ? 14 : 12,
        crossAxisSpacing: isWide ? 14 : 12,
        childAspectRatio: isWide ? 1.8 : 1.15,
      ),
      itemBuilder: (_, i) {
        final type = (commands[i]['type'] ?? '').toString();
        return _CommandCard(
          type: type,
          isPinned: pinned.contains(type),
          onTap: () => onTap(type),
          onLongPress: () => onLongPress(type),
          isWide: isWide,
        );
      },
    );
  }
}

class _CommandCard extends StatelessWidget {
  final String type;
  final bool isPinned;
  final VoidCallback onTap;
  final VoidCallback onLongPress;
  final bool isWide;

  const _CommandCard({
    required this.type,
    required this.isPinned,
    required this.onTap,
    required this.onLongPress,
    this.isWide = false,
  });

  @override
  Widget build(BuildContext context) {
    final (icon, color) = _VehicleCommandsScreenState._iconFor(type);
    final label = _VehicleCommandsScreenState._humanize(type);

    if (isWide) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          onLongPress: onLongPress,
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: context.cardGradientColor,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isPinned
                    ? AppColors.primary.withValues(alpha: 0.55)
                    : context.dividerColor,
                width: isPinned ? 1.4 : 1,
              ),
            ),
            child: Stack(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(icon, color: color, size: 32),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            label,
                            style: TextStyle(
                              color: context.textPrimaryColor,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            type,
                            style: TextStyle(
                              color: context.textMutedColor,
                              fontSize: 11,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 10),
                          ElevatedButton.icon(
                            onPressed: onTap,
                            icon: const Icon(Icons.send_rounded, size: 16),
                            label: Text(context.tr('save')),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: color,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              textStyle: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (isPinned)
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.push_pin_rounded,
                        size: 11,
                        color: Colors.black,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        onLongPress: onLongPress,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isPinned
                  ? AppColors.primary.withValues(alpha: 0.55)
                  : context.dividerColor,
              width: isPinned ? 1.4 : 1,
            ),
          ),
          child: Stack(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: color, size: 22),
                  ),
                  Column(
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
                        type,
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
              if (isPinned)
                Positioned(
                  top: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.push_pin_rounded,
                      size: 11,
                      color: Colors.black,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CommandsShimmer extends StatelessWidget {
  const _CommandsShimmer();

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 6,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.15,
      ),
      itemBuilder: (_, __) => const ShimmerBox(borderRadius: 18, height: 140),
    );
  }
}
