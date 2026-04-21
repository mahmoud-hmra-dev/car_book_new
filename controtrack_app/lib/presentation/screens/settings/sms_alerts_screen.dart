import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../widgets/web/web_page_scaffold.dart';

class SmsAlertsScreen extends StatefulWidget {
  const SmsAlertsScreen({super.key});

  @override
  State<SmsAlertsScreen> createState() => _SmsAlertsScreenState();
}

class _SmsAlertsScreenState extends State<SmsAlertsScreen> {
  bool _enabled = false;
  bool _speed = true;
  bool _geofence = true;
  bool _maintenance = false;
  int _speedLimit = 120;
  final TextEditingController _phone = TextEditingController();
  bool _loaded = false;
  String? _phoneError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _enabled = prefs.getBool('sms_enabled') ?? false;
      _phone.text = prefs.getString('sms_phone') ?? '';
      _speed = prefs.getBool('sms_speed') ?? true;
      _geofence = prefs.getBool('sms_geofence') ?? true;
      _maintenance = prefs.getBool('sms_maintenance') ?? false;
      _speedLimit = prefs.getInt('sms_speed_limit') ?? 120;
      _loaded = true;
    });
  }

  bool _validatePhone(String v) {
    // Basic E.164: + followed by 8-15 digits.
    final re = RegExp(r'^\+[1-9]\d{7,14}$');
    return re.hasMatch(v.trim());
  }

  Future<void> _save() async {
    final phone = _phone.text.trim();
    if (_enabled && phone.isNotEmpty && !_validatePhone(phone)) {
      setState(() => _phoneError = context.tr('invalid_phone'));
      return;
    }
    setState(() => _phoneError = null);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('sms_enabled', _enabled);
    await prefs.setString('sms_phone', phone);
    await prefs.setBool('sms_speed', _speed);
    await prefs.setBool('sms_geofence', _geofence);
    await prefs.setBool('sms_panic', true); // always on
    await prefs.setBool('sms_maintenance', _maintenance);
    await prefs.setInt('sms_speed_limit', _speedLimit);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.primaryDark,
        content: Text(context.tr('save')),
      ),
    );
  }

  void _sendTest() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.warning,
        content: Text(context.tr('sms_test_info')),
      ),
    );
  }

  Widget _buildForm(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.warning.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
            border:
                Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
          ),
          child: Row(
            children: [
              const Icon(Icons.info_outline_rounded,
                  color: AppColors.warning, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  context.tr('sms_info_banner'),
                  style: const TextStyle(
                    color: AppColors.warning,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _Section(
          title: context.tr('sms_enabled'),
          child: SwitchListTile(
            contentPadding: EdgeInsets.zero,
            activeColor: AppColors.primary,
            title: Text(
              context.tr('sms_enabled'),
              style: TextStyle(color: context.textPrimaryColor),
            ),
            value: _enabled,
            onChanged: (v) => setState(() => _enabled = v),
          ),
        ),
        const SizedBox(height: 12),
        _Section(
          title: context.tr('sms_phone'),
          child: TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.phone_rounded,
                  color: AppColors.primary),
              hintText: context.tr('sms_phone_hint'),
              errorText: _phoneError,
            ),
          ),
        ),
        const SizedBox(height: 12),
        _Section(
          title: context.tr('alert_preferences'),
          child: Column(
            children: [
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeColor: AppColors.primary,
                title: Text(context.tr('sms_speed_alerts'),
                    style: TextStyle(color: context.textPrimaryColor)),
                value: _speed,
                onChanged: (v) => setState(() => _speed = v),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeColor: AppColors.primary,
                title: Text(context.tr('sms_geofence_alerts'),
                    style: TextStyle(color: context.textPrimaryColor)),
                value: _geofence,
                onChanged: (v) => setState(() => _geofence = v),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeColor: AppColors.primary,
                title: Text(context.tr('sms_panic_alerts'),
                    style: TextStyle(color: context.textPrimaryColor)),
                subtitle: Text(
                  context.tr('always_on'),
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 11,
                  ),
                ),
                value: true,
                onChanged: null,
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeColor: AppColors.primary,
                title: Text(context.tr('sms_maintenance_alerts'),
                    style: TextStyle(color: context.textPrimaryColor)),
                value: _maintenance,
                onChanged: (v) => setState(() => _maintenance = v),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _Section(
          title: context.tr('speed_limit_threshold'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$_speedLimit km/h',
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                context.tr('minimum_speed_kmh'),
                style: TextStyle(
                  color: context.textMutedColor,
                  fontSize: 11,
                ),
              ),
              Slider(
                activeColor: AppColors.primary,
                value: _speedLimit.toDouble(),
                min: 80,
                max: 200,
                divisions: 12,
                label: '$_speedLimit',
                onChanged: (v) => setState(() => _speedLimit = v.round()),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _save,
            icon: const Icon(Icons.save_rounded),
            label: Text(context.tr('save')),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: TextButton.icon(
            onPressed: _sendTest,
            icon: const Icon(Icons.sms_rounded),
            label: Text(context.tr('sms_test')),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoPanel(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary.withValues(alpha: 0.15),
            AppColors.secondary.withValues(alpha: 0.08),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(Icons.sms_rounded,
                color: Colors.black, size: 32),
          ),
          const SizedBox(height: 18),
          Text(
            context.tr('sms_alerts'),
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Receive critical fleet events as text messages on your phone — even when the app is closed or out of data coverage.',
            style: TextStyle(
              color: context.textSecondaryColor,
              fontSize: 14,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 20),
          _InfoBullet(
            icon: Icons.speed_rounded,
            color: AppColors.warning,
            title: 'Speed violations',
            description: 'Get alerted whenever a vehicle breaches your limit.',
          ),
          const SizedBox(height: 12),
          _InfoBullet(
            icon: Icons.fence_rounded,
            color: AppColors.secondary,
            title: 'Geofence breaches',
            description: 'Be notified when a vehicle enters or exits a zone.',
          ),
          const SizedBox(height: 12),
          _InfoBullet(
            icon: Icons.sos_rounded,
            color: AppColors.error,
            title: 'Panic / SOS',
            description: 'Always-on priority alerts for emergency events.',
          ),
          const SizedBox(height: 12),
          _InfoBullet(
            icon: Icons.build_rounded,
            color: AppColors.accent,
            title: 'Maintenance reminders',
            description: 'Stay on top of scheduled service windows.',
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: AppColors.warning.withValues(alpha: 0.35)),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded,
                    color: AppColors.warning, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Carrier SMS fees may apply.',
                    style: TextStyle(
                      color: context.textSecondaryColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    if (isWide) {
      return WebPageScaffold(
        title: context.tr('sms_alerts'),
        subtitle: 'Text message notification settings',
        scrollable: true,
        child: !_loaded
            ? const Padding(
                padding: EdgeInsets.symmetric(vertical: 80),
                child: Center(
                  child:
                      CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            : Padding(
                padding: const EdgeInsets.only(top: 20),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: _buildForm(context)),
                    const SizedBox(width: 24),
                    Expanded(child: _buildInfoPanel(context)),
                  ],
                ),
              ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('sms_alerts')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: !_loaded
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.warning.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline_rounded,
                          color: AppColors.warning, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          context.tr('sms_info_banner'),
                          style: const TextStyle(
                            color: AppColors.warning,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _Section(
                  title: context.tr('sms_enabled'),
                  child: SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    activeColor: AppColors.primary,
                    title: Text(
                      context.tr('sms_enabled'),
                      style: TextStyle(color: context.textPrimaryColor),
                    ),
                    value: _enabled,
                    onChanged: (v) => setState(() => _enabled = v),
                  ),
                ),
                const SizedBox(height: 12),
                _Section(
                  title: context.tr('sms_phone'),
                  child: TextField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.phone_rounded,
                          color: AppColors.primary),
                      hintText: context.tr('sms_phone_hint'),
                      errorText: _phoneError,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                _Section(
                  title: context.tr('alert_preferences'),
                  child: Column(
                    children: [
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        activeColor: AppColors.primary,
                        title: Text(context.tr('sms_speed_alerts'),
                            style:
                                TextStyle(color: context.textPrimaryColor)),
                        value: _speed,
                        onChanged: (v) => setState(() => _speed = v),
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        activeColor: AppColors.primary,
                        title: Text(context.tr('sms_geofence_alerts'),
                            style:
                                TextStyle(color: context.textPrimaryColor)),
                        value: _geofence,
                        onChanged: (v) => setState(() => _geofence = v),
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        activeColor: AppColors.primary,
                        title: Text(context.tr('sms_panic_alerts'),
                            style:
                                TextStyle(color: context.textPrimaryColor)),
                        subtitle: Text(
                          context.tr('always_on'),
                          style: TextStyle(
                            color: context.textMutedColor,
                            fontSize: 11,
                          ),
                        ),
                        value: true,
                        onChanged: null,
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        activeColor: AppColors.primary,
                        title: Text(context.tr('sms_maintenance_alerts'),
                            style:
                                TextStyle(color: context.textPrimaryColor)),
                        value: _maintenance,
                        onChanged: (v) => setState(() => _maintenance = v),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                _Section(
                  title: context.tr('speed_limit_threshold'),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$_speedLimit km/h',
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        context.tr('minimum_speed_kmh'),
                        style: TextStyle(
                          color: context.textMutedColor,
                          fontSize: 11,
                        ),
                      ),
                      Slider(
                        activeColor: AppColors.primary,
                        value: _speedLimit.toDouble(),
                        min: 80,
                        max: 200,
                        divisions: 12,
                        label: '$_speedLimit',
                        onChanged: (v) =>
                            setState(() => _speedLimit = v.round()),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _save,
                    icon: const Icon(Icons.save_rounded),
                    label: Text(context.tr('save')),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: TextButton.icon(
                    onPressed: _sendTest,
                    icon: const Icon(Icons.sms_rounded),
                    label: Text(context.tr('sms_test')),
                  ),
                ),
              ],
            ),
    );
  }
}

class _InfoBullet extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String description;

  const _InfoBullet({
    required this.icon,
    required this.color,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
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
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: TextStyle(
                  color: context.textSecondaryColor,
                  fontSize: 12,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final Widget child;
  const _Section({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: context.textMutedColor,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}
