import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../config/app_config.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';

/// Live ETA / location share screen. Lets a fleet manager generate a share
/// link with a configurable expiry, copy it, or send it via WhatsApp / SMS.
///
/// Persists past-and-active shares in `SharedPreferences` under
/// `eta_shares_$carId` so the manager can revisit what they've already
/// shared and see a live expiry countdown.
class EtaShareScreen extends StatefulWidget {
  final String carId;
  const EtaShareScreen({super.key, required this.carId});

  @override
  State<EtaShareScreen> createState() => _EtaShareScreenState();
}

class _EtaShareScreenState extends State<EtaShareScreen> {
  final TextEditingController _destination = TextEditingController();
  final TextEditingController _lat = TextEditingController();
  final TextEditingController _lng = TextEditingController();

  int _durationHours = 4;
  bool _useCoords = false;

  String? _currentLink;
  DateTime? _currentExpiresAt;

  List<_EtaShare> _shares = [];
  late final Stream<DateTime> _ticker;

  @override
  void initState() {
    super.initState();
    _ticker = Stream<DateTime>.periodic(
      const Duration(seconds: 30),
      (_) => DateTime.now(),
    );
    _loadShares();
  }

  @override
  void dispose() {
    _destination.dispose();
    _lat.dispose();
    _lng.dispose();
    super.dispose();
  }

  String _prefsKey() => 'eta_shares_${widget.carId}';

  Future<void> _loadShares() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey());
    if (raw == null || raw.isEmpty) {
      if (!mounted) return;
      setState(() => _shares = []);
      return;
    }
    try {
      final list = (jsonDecode(raw) as List)
          .map((e) => _EtaShare.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
      if (!mounted) return;
      setState(() => _shares = list);
    } catch (_) {
      if (!mounted) return;
      setState(() => _shares = []);
    }
  }

  Future<void> _persistShares() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = jsonEncode(_shares.map((s) => s.toJson()).toList());
    await prefs.setString(_prefsKey(), raw);
  }

  String _randomToken([int len = 24]) {
    const alphabet =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    final rand = Random.secure();
    return String.fromCharCodes(Iterable.generate(
      len,
      (_) => alphabet.codeUnitAt(rand.nextInt(alphabet.length)),
    ));
  }

  void _generate() {
    final dest = _useCoords
        ? '${_lat.text.trim()},${_lng.text.trim()}'
        : _destination.text.trim();
    final expiresAt = DateTime.now().add(Duration(hours: _durationHours));
    final token = _randomToken();
    final url =
        '${AppConfig.apiHost}/track/${widget.carId}?expires=${expiresAt.millisecondsSinceEpoch}&token=$token';
    final share = _EtaShare(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      url: url,
      destination: dest,
      createdAt: DateTime.now(),
      expiresAt: expiresAt,
    );
    setState(() {
      _currentLink = url;
      _currentExpiresAt = expiresAt;
      _shares = [share, ..._shares];
    });
    _persistShares();
  }

  Future<void> _copy(String url) async {
    final messenger = ScaffoldMessenger.of(context);
    final msg = context.tr('link_copied_msg');
    await Clipboard.setData(ClipboardData(text: url));
    messenger.showSnackBar(
      SnackBar(
        backgroundColor: AppColors.primaryDark,
        content: Text(msg),
      ),
    );
  }

  Future<void> _shareVia(Uri uri, String failMsg) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final ok = await canLaunchUrl(uri) &&
          await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!ok) {
        messenger.showSnackBar(
          SnackBar(
            backgroundColor: AppColors.error,
            content: Text(failMsg),
          ),
        );
      }
    } catch (_) {
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text(failMsg),
        ),
      );
    }
  }

  Future<void> _deleteShare(_EtaShare s) async {
    setState(() => _shares.removeWhere((x) => x.id == s.id));
    await _persistShares();
  }

  @override
  Widget build(BuildContext context) {
    final fleetState = context.watch<FleetCubit>().state;
    FleetItem? vehicle;
    for (final it in fleetState.items) {
      if (it.carId == widget.carId) {
        vehicle = it;
        break;
      }
    }
    final vehicleName = vehicle?.carName.isNotEmpty == true
        ? vehicle!.carName
        : context.tr('unnamed_vehicle');

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
              context.tr('share_live'),
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(
              vehicleName,
              style: TextStyle(
                fontSize: 11,
                color: context.textMutedColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          _sectionLabel(context, context.tr('destination')),
          const SizedBox(height: 8),
          _buildDestinationCard(),
          const SizedBox(height: 20),
          _sectionLabel(context, context.tr('share_duration')),
          const SizedBox(height: 8),
          _buildDurationSelector(),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              onPressed: _generate,
              icon: const Icon(Icons.link_rounded),
              label: Text(
                context.tr('generate_link'),
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          if (_currentLink != null) ...[
            const SizedBox(height: 20),
            _buildCurrentLinkCard(_currentLink!, _currentExpiresAt),
          ],
          const SizedBox(height: 28),
          _sectionLabel(context, _pastSharesTitle()),
          const SizedBox(height: 8),
          _buildSharesList(),
        ],
      ),
    );
  }

  String _pastSharesTitle() {
    // Reuses existing strings to avoid new translations churn; label is
    // derived from generic vocabulary.
    return '${context.tr('share_live')} · ${_shares.length}';
  }

  Widget _sectionLabel(BuildContext context, String text) {
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

  Widget _buildDestinationCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _toggleBtn(
                  label: context.tr('address'),
                  icon: Icons.place_rounded,
                  selected: !_useCoords,
                  onTap: () => setState(() => _useCoords = false),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _toggleBtn(
                  label: context.tr('coordinates'),
                  icon: Icons.my_location_rounded,
                  selected: _useCoords,
                  onTap: () => setState(() => _useCoords = true),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (!_useCoords)
            TextField(
              controller: _destination,
              style: TextStyle(color: context.textPrimaryColor),
              decoration: _inputDec(
                hint: context.tr('destination'),
                icon: Icons.search_rounded,
              ),
            )
          else
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _lat,
                    keyboardType: const TextInputType.numberWithOptions(
                        signed: true, decimal: true),
                    style: TextStyle(color: context.textPrimaryColor),
                    decoration: _inputDec(hint: 'Lat', icon: Icons.north),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _lng,
                    keyboardType: const TextInputType.numberWithOptions(
                        signed: true, decimal: true),
                    style: TextStyle(color: context.textPrimaryColor),
                    decoration: _inputDec(hint: 'Lng', icon: Icons.east),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _toggleBtn({
    required String label,
    required IconData icon,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: selected
                ? AppColors.primary.withValues(alpha: 0.15)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected
                  ? AppColors.primary.withValues(alpha: 0.6)
                  : context.dividerColor,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 15,
                color: selected ? AppColors.primary : context.textMutedColor,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: selected
                      ? AppColors.primary
                      : context.textSecondaryColor,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDec({required String hint, required IconData icon}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: context.textMutedColor),
      prefixIcon: Icon(icon, color: context.textMutedColor, size: 18),
      filled: true,
      fillColor: context.surfaceColor,
      isDense: true,
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
        borderSide:
            const BorderSide(color: AppColors.primary, width: 1.5),
      ),
    );
  }

  Widget _buildDurationSelector() {
    const options = [1, 4, 8, 24];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((h) {
        final selected = _durationHours == h;
        return ChoiceChip(
          label: Text('${h}h'),
          labelStyle: TextStyle(
            color: selected ? Colors.black : context.textSecondaryColor,
            fontWeight: FontWeight.w700,
          ),
          selected: selected,
          showCheckmark: false,
          onSelected: (_) => setState(() => _durationHours = h),
          backgroundColor: context.cardColor,
          selectedColor: AppColors.primary,
          side: BorderSide(
            color: selected
                ? AppColors.primary
                : context.dividerColor,
          ),
        );
      }).toList(),
    );
  }

  Widget _buildCurrentLinkCard(String url, DateTime? expiresAt) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: AppColors.primary,
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  context.tr('generate_link'),
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              if (expiresAt != null)
                StreamBuilder<DateTime>(
                  stream: _ticker,
                  builder: (_, __) => Text(
                    _remaining(expiresAt, context),
                    style: TextStyle(
                      color: _isExpired(expiresAt)
                          ? AppColors.error
                          : AppColors.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: context.surfaceColor,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: context.dividerColor),
            ),
            child: SelectableText(
              url,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 11,
                fontFamily: 'monospace',
              ),
            ),
          ),
          const SizedBox(height: 12),
          // QR placeholder
          Center(
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                color: context.surfaceColor,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: context.dividerColor),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.qr_code_2_rounded,
                    size: 56,
                    color: context.textMutedColor,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'QR Code',
                    style: TextStyle(
                      color: context.textMutedColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _copy(url),
                  icon: const Icon(Icons.copy_rounded, size: 16),
                  label: Text(context.tr('copy_link')),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF25D366),
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () => _shareVia(
                    Uri.parse('whatsapp://send?text=${Uri.encodeComponent('Track our vehicle: $url')}'),
                    'WhatsApp not available',
                  ),
                  icon: const Icon(Icons.chat_rounded, size: 16),
                  label: const Text('WhatsApp'),  // Brand name, no translation
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _shareVia(
                Uri.parse('sms:?body=${Uri.encodeComponent('Track our vehicle: $url')}'),
                'SMS not available',
              ),
              icon: const Icon(Icons.sms_rounded, size: 16),
              label: const Text('SMS'),  // Acronym, no translation
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSharesList() {
    if (_shares.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.surfaceColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: context.dividerColor),
        ),
        child: Row(
          children: [
            Icon(Icons.inbox_outlined, color: context.textMutedColor),
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
        for (final s in _shares) ...[
          _buildShareTile(s),
          const SizedBox(height: 8),
        ],
      ],
    );
  }

  Widget _buildShareTile(_EtaShare s) {
    final expired = _isExpired(s.expiresAt);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: expired
              ? AppColors.error.withValues(alpha: 0.3)
              : context.dividerColor,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: (expired ? AppColors.error : AppColors.primary)
                  .withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              expired
                  ? Icons.link_off_rounded
                  : Icons.share_location_rounded,
              color: expired ? AppColors.error : AppColors.primary,
              size: 18,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  s.destination.isEmpty ? '—' : s.destination,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                StreamBuilder<DateTime>(
                  stream: _ticker,
                  builder: (_, __) => Text(
                    _remaining(s.expiresAt, context),
                    style: TextStyle(
                      color: expired
                          ? AppColors.error
                          : context.textMutedColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: context.tr('copy_link'),
            icon: Icon(Icons.copy_rounded,
                color: context.textSecondaryColor, size: 18),
            onPressed: () => _copy(s.url),
          ),
          IconButton(
            tooltip: context.tr('delete'),
            icon: const Icon(Icons.delete_outline,
                color: AppColors.error, size: 18),
            onPressed: () => _deleteShare(s),
          ),
        ],
      ),
    );
  }

  static bool _isExpired(DateTime d) => DateTime.now().isAfter(d);

  static String _remaining(DateTime expiresAt, BuildContext context) {
    final now = DateTime.now();
    if (now.isAfter(expiresAt)) return 'Expired';
    final diff = expiresAt.difference(now);
    final h = diff.inHours;
    final m = diff.inMinutes.remainder(60);
    if (h > 0) return 'Expires in ${h}h ${m}m';
    return 'Expires in ${m}m';
  }
}

class _EtaShare {
  final String id;
  final String url;
  final String destination;
  final DateTime createdAt;
  final DateTime expiresAt;

  _EtaShare({
    required this.id,
    required this.url,
    required this.destination,
    required this.createdAt,
    required this.expiresAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'url': url,
        'destination': destination,
        'createdAt': createdAt.toIso8601String(),
        'expiresAt': expiresAt.toIso8601String(),
      };

  factory _EtaShare.fromJson(Map<String, dynamic> j) => _EtaShare(
        id: j['id']?.toString() ?? '',
        url: j['url']?.toString() ?? '',
        destination: j['destination']?.toString() ?? '',
        createdAt: DateTime.tryParse(j['createdAt']?.toString() ?? '') ??
            DateTime.now(),
        expiresAt: DateTime.tryParse(j['expiresAt']?.toString() ?? '') ??
            DateTime.now(),
      );
}
