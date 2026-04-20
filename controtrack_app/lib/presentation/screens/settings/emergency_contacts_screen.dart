import 'dart:convert';

import 'package:controtrack/core/theme/app_colors.dart';
import 'package:controtrack/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shared_preferences/shared_preferences.dart';

class EmergencyContact {
  EmergencyContact({
    required this.id,
    required this.name,
    required this.phone,
    required this.relationship,
    this.sendSms = true,
    this.allowCall = true,
  });

  factory EmergencyContact.fromJson(Map<String, dynamic> json) {
    return EmergencyContact(
      id: json['id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      relationship: json['relationship'] as String,
      sendSms: json['sendSms'] as bool? ?? true,
      allowCall: json['allowCall'] as bool? ?? true,
    );
  }

  final String id;
  String name;
  String phone;
  String relationship;
  bool sendSms;
  bool allowCall;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'name': name,
        'phone': phone,
        'relationship': relationship,
        'sendSms': sendSms,
        'allowCall': allowCall,
      };
}

class EmergencyContactsScreen extends StatefulWidget {
  const EmergencyContactsScreen({super.key});

  @override
  State<EmergencyContactsScreen> createState() =>
      _EmergencyContactsScreenState();
}

class _EmergencyContactsScreenState extends State<EmergencyContactsScreen> {
  static const String _contactsKey = 'emergency_contacts';
  static const String _smsOnSosKey = 'sos_send_sms';
  static const String _autoCallKey = 'sos_auto_call';
  static const String _shareLocationKey = 'sos_share_location';
  static const String _countdownKey = 'sos_countdown_seconds';
  static const int _maxContacts = 5;

  final List<EmergencyContact> _contacts = <EmergencyContact>[];

  bool _sendSmsOnSos = true;
  bool _autoCallFirst = false;
  bool _shareLiveLocation = true;
  int _countdownSeconds = 30;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();

    final List<String>? raw = prefs.getStringList(_contactsKey);
    final List<EmergencyContact> loaded = <EmergencyContact>[];
    if (raw != null) {
      for (final String entry in raw) {
        try {
          final Map<String, dynamic> json =
              jsonDecode(entry) as Map<String, dynamic>;
          loaded.add(EmergencyContact.fromJson(json));
        } catch (_) {
          // Skip malformed entries.
        }
      }
    }

    if (!mounted) return;
    setState(() {
      _contacts
        ..clear()
        ..addAll(loaded);
      _sendSmsOnSos = prefs.getBool(_smsOnSosKey) ?? true;
      _autoCallFirst = prefs.getBool(_autoCallKey) ?? false;
      _shareLiveLocation = prefs.getBool(_shareLocationKey) ?? true;
      _countdownSeconds = prefs.getInt(_countdownKey) ?? 30;
      _loading = false;
    });
  }

  Future<void> _saveContacts() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final List<String> serialized = _contacts
        .map((EmergencyContact c) => jsonEncode(c.toJson()))
        .toList();
    await prefs.setStringList(_contactsKey, serialized);
  }

  Future<void> _saveSettings() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_smsOnSosKey, _sendSmsOnSos);
    await prefs.setBool(_autoCallKey, _autoCallFirst);
    await prefs.setBool(_shareLocationKey, _shareLiveLocation);
    await prefs.setInt(_countdownKey, _countdownSeconds);
  }

  void _showSnack(String message, {Color? bg}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: bg ?? context.cardColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _openAddContactSheet() async {
    if (_contacts.length >= _maxContacts) {
      _showSnack(
        'Maximum of $_maxContacts emergency contacts reached',
        bg: AppColors.error,
      );
      return;
    }

    final EmergencyContact? result = await showModalBottomSheet<EmergencyContact>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext ctx) => const _AddContactSheet(),
    );

    if (result != null) {
      setState(() => _contacts.add(result));
      await _saveContacts();
      _showSnack('${result.name} added to emergency contacts');
    }
  }

  Future<void> _deleteContact(EmergencyContact contact) async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (BuildContext ctx) => AlertDialog(
        backgroundColor: ctx.cardColor,
        title: Text(
          'Remove Contact',
          style: TextStyle(color: ctx.textPrimaryColor),
        ),
        content: Text(
          'Remove ${contact.name} from emergency contacts?',
          style: TextStyle(color: ctx.textSecondaryColor),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(
              ctx.tr('cancel'),
              style: TextStyle(color: ctx.textSecondaryColor),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text(
              'Remove',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _contacts.removeWhere((EmergencyContact c) => c.id == contact.id));
      await _saveContacts();
      _showSnack('${contact.name} removed');
    }
  }

  void _reorder(int oldIndex, int newIndex) {
    setState(() {
      int target = newIndex;
      if (target > oldIndex) target -= 1;
      final EmergencyContact item = _contacts.removeAt(oldIndex);
      _contacts.insert(target, item);
    });
    _saveContacts();
  }

  Future<void> _confirmTestSos() async {
    if (_contacts.isEmpty) {
      _showSnack(
        context.tr('add_emergency_contact_first'),
        bg: AppColors.warning,
      );
      return;
    }

    final msgTestSosSent = context.tr('test_sos_sent')
        .replaceFirst('%d', '${_contacts.length}');
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (BuildContext ctx) => AlertDialog(
        backgroundColor: ctx.cardColor,
        title: Row(
          children: <Widget>[
            const Icon(Icons.warning_amber_rounded, color: AppColors.warning),
            const SizedBox(width: 8),
            Text(
              ctx.tr('test_sos_alert'),
              style: TextStyle(color: ctx.textPrimaryColor),
            ),
          ],
        ),
        content: Text(
          ctx.tr('test_sos_confirm').replaceFirst('%d', '${_contacts.length}'),
          style: TextStyle(color: ctx.textSecondaryColor),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(
              ctx.tr('cancel'),
              style: TextStyle(color: ctx.textSecondaryColor),
            ),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.error,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(ctx.tr('send_test')),
          ),
        ],
      ),
    );

    if (confirm == true) {
      _showSnack(msgTestSosSent, bg: AppColors.primary);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(
          context.tr('emergency_contacts'),
          style: TextStyle(
            color: context.textPrimaryColor,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.black,
        onPressed: _openAddContactSheet,
        icon: const Icon(Icons.person_add_alt_1),
        label: Text(
          context.tr('add_contact'),
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : SafeArea(
              child: CustomScrollView(
                slivers: <Widget>[
                  SliverToBoxAdapter(child: _buildWarningBanner()),
                  SliverToBoxAdapter(child: _buildSosSettingsCard()),
                  SliverToBoxAdapter(child: _buildContactsHeader()),
                  if (_contacts.isEmpty)
                    SliverToBoxAdapter(child: _buildEmptyState())
                  else
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      sliver: SliverReorderableList(
                        itemCount: _contacts.length,
                        onReorder: _reorder,
                        itemBuilder: (BuildContext ctx, int index) {
                          final EmergencyContact contact = _contacts[index];
                          return _buildContactCard(contact, index);
                        },
                      ),
                    ),
                  SliverToBoxAdapter(child: _buildTestSosButton()),
                  const SliverToBoxAdapter(child: SizedBox(height: 96)),
                ],
              ),
            ),
    );
  }

  Widget _buildWarningBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: <Color>[
            AppColors.error.withValues(alpha: 0.25),
            AppColors.warning.withValues(alpha: 0.20),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.error.withValues(alpha: 0.45),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.emergency_outlined,
              color: AppColors.error,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'These contacts will be alerted when SOS/Panic is triggered',
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${_contacts.length} of $_maxContacts contacts configured',
                  style: TextStyle(
                    color: context.textSecondaryColor,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: -0.1, end: 0);
  }

  Widget _buildSosSettingsCard() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Row(
              children: <Widget>[
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.settings_suggest_outlined,
                    color: AppColors.secondary,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'SOS Settings',
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),
          _buildSwitchTile(
            icon: Icons.sms_outlined,
            label: 'Send SMS on SOS',
            subtitle: 'Text all contacts when SOS fires',
            value: _sendSmsOnSos,
            onChanged: (bool v) {
              setState(() => _sendSmsOnSos = v);
              _saveSettings();
            },
          ),
          _divider(),
          _buildSwitchTile(
            icon: Icons.call_outlined,
            label: 'Call first contact automatically',
            subtitle: 'Dial #1 contact after countdown',
            value: _autoCallFirst,
            onChanged: (bool v) {
              setState(() => _autoCallFirst = v);
              _saveSettings();
            },
          ),
          _divider(),
          _buildSwitchTile(
            icon: Icons.share_location_outlined,
            label: 'Share live location link',
            subtitle: 'Include a live tracker URL in SMS',
            value: _shareLiveLocation,
            onChanged: (bool v) {
              setState(() => _shareLiveLocation = v);
              _saveSettings();
            },
          ),
          _divider(),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Auto-cancel SOS after',
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <int>[30, 60, 90, 120].map((int seconds) {
                    final bool selected = _countdownSeconds == seconds;
                    return GestureDetector(
                      onTap: () {
                        setState(() => _countdownSeconds = seconds);
                        _saveSettings();
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: selected
                              ? AppColors.primary.withValues(alpha: 0.2)
                              : context.bgColor,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: selected
                                ? AppColors.primary
                                : context.dividerColor,
                            width: selected ? 1.5 : 1,
                          ),
                        ),
                        child: Text(
                          '${seconds}s',
                          style: TextStyle(
                            color: selected
                                ? AppColors.primary
                                : context.textSecondaryColor,
                            fontWeight:
                                selected ? FontWeight.w700 : FontWeight.w500,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 350.ms, delay: 80.ms);
  }

  Widget _buildSwitchTile({
    required IconData icon,
    required String label,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        children: <Widget>[
          Icon(icon, color: context.textSecondaryColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  label,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: context.textMutedColor,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: AppColors.primary,
            inactiveTrackColor: context.dividerColor,
          ),
        ],
      ),
    );
  }

  Widget _divider() {
    return Container(
      height: 1,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      color: context.dividerColor.withValues(alpha: 0.5),
    );
  }

  Widget _buildContactsHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 8),
      child: Row(
        children: <Widget>[
          Text(
            'Contacts',
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '${_contacts.length}/$_maxContacts',
              style: const TextStyle(
                color: AppColors.primary,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const Spacer(),
          if (_contacts.length > 1)
            Text(
              'Hold & drag to reorder',
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 11,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: context.dividerColor,
          style: BorderStyle.solid,
        ),
      ),
      child: Column(
        children: <Widget>[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.accent.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.contact_phone_outlined,
              color: AppColors.accent,
              size: 32,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'No emergency contacts yet',
            style: TextStyle(
              color: context.textPrimaryColor,
              fontWeight: FontWeight.w600,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Tap "Add Contact" to configure your first trusted contact for SOS alerts.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: context.textMutedColor,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactCard(EmergencyContact contact, int index) {
    final Color priorityColor = <Color>[
      AppColors.primary,
      AppColors.secondary,
      AppColors.accent,
      AppColors.warning,
      AppColors.error,
    ][index.clamp(0, 4)];

    return Padding(
      key: ValueKey<String>(contact.id),
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: context.dividerColor),
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: <Color>[
                        priorityColor.withValues(alpha: 0.9),
                        priorityColor.withValues(alpha: 0.5),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '#${index + 1}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        contact.name,
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        contact.phone,
                        style: TextStyle(
                          color: context.textSecondaryColor,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: priorityColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          contact.relationship,
                          style: TextStyle(
                            color: priorityColor,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Remove',
                  onPressed: () => _deleteContact(contact),
                  icon: const Icon(
                    Icons.delete_outline,
                    color: AppColors.error,
                  ),
                ),
                ReorderableDragStartListener(
                  index: index,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Icon(
                      Icons.drag_handle,
                      color: context.textMutedColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              height: 1,
              color: context.dividerColor.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 8),
            Row(
              children: <Widget>[
                Expanded(
                  child: _inlineToggle(
                    icon: Icons.sms_outlined,
                    label: 'SMS',
                    value: contact.sendSms,
                    onChanged: (bool v) {
                      setState(() => contact.sendSms = v);
                      _saveContacts();
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _inlineToggle(
                    icon: Icons.call_outlined,
                    label: 'Call',
                    value: contact.allowCall,
                    onChanged: (bool v) {
                      setState(() => contact.allowCall = v);
                      _saveContacts();
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _inlineToggle({
    required IconData icon,
    required String label,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: context.bgColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: value
              ? AppColors.primary.withValues(alpha: 0.5)
              : context.dividerColor,
        ),
      ),
      child: Row(
        children: <Widget>[
          Icon(
            icon,
            size: 16,
            color: value ? AppColors.primary : context.textMutedColor,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: value ? context.textPrimaryColor : context.textMutedColor,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const Spacer(),
          Transform.scale(
            scale: 0.8,
            child: Switch(
              value: value,
              onChanged: onChanged,
              activeColor: AppColors.primary,
              inactiveTrackColor: context.dividerColor,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTestSosButton() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: InkWell(
        onTap: _confirmTestSos,
        borderRadius: BorderRadius.circular(14),
        child: Ink(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: <Color>[
                AppColors.error,
                AppColors.error.withValues(alpha: 0.7),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(14),
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: AppColors.error.withValues(alpha: 0.35),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Icon(Icons.warning_amber_rounded, color: Colors.white),
                SizedBox(width: 10),
                Text(
                  'Test SOS Alert',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ).animate().fadeIn(duration: 400.ms, delay: 150.ms);
  }
}

class _AddContactSheet extends StatefulWidget {
  const _AddContactSheet();

  @override
  State<_AddContactSheet> createState() => _AddContactSheetState();
}

class _AddContactSheetState extends State<_AddContactSheet> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  String _relationship = 'Family';

  static const List<String> _options = <String>[
    'Family',
    'Colleague',
    'Manager',
    'Police',
    'Medical',
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    final EmergencyContact contact = EmergencyContact(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: _nameController.text.trim(),
      phone: _phoneController.text.trim(),
      relationship: _relationship,
    );
    Navigator.of(context).pop(contact);
  }

  @override
  Widget build(BuildContext context) {
    final double bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: Container(
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: context.dividerColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Text(
                context.tr('add_contact'),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 18),
              _buildTextField(
                controller: _nameController,
                label: context.tr('name'),
                icon: Icons.person_outline,
                validator: (String? v) =>
                    (v == null || v.trim().isEmpty) ? context.tr('name_required') : null,
              ),
              const SizedBox(height: 12),
              _buildTextField(
                controller: _phoneController,
                label: context.tr('phone'),
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
                validator: (String? v) {
                  if (v == null || v.trim().isEmpty) return context.tr('required');
                  if (v.trim().length < 6) return context.tr('required');
                  return null;
                },
              ),
              const SizedBox(height: 12),
              _buildDropdown(),
              const SizedBox(height: 20),
              Row(
                children: <Widget>[
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: BorderSide(color: context.dividerColor),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text(
                        context.tr('cancel'),
                        style: TextStyle(color: context.textSecondaryColor),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: _submit,
                      child: Text(
                        context.tr('save_contact'),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
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
      validator: validator,
      style: TextStyle(color: context.textPrimaryColor),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: context.textSecondaryColor),
        prefixIcon: Icon(icon, color: context.textSecondaryColor),
        filled: true,
        fillColor: context.bgColor,
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: context.dividerColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error, width: 1.5),
        ),
      ),
    );
  }

  Widget _buildDropdown() {
    return DropdownButtonFormField<String>(
      value: _relationship,
      dropdownColor: context.cardColor,
      style: TextStyle(color: context.textPrimaryColor),
      iconEnabledColor: context.textSecondaryColor,
      decoration: InputDecoration(
        labelText: context.tr('relationship'),
        labelStyle: TextStyle(color: context.textSecondaryColor),
        prefixIcon: Icon(
          Icons.group_outlined,
          color: context.textSecondaryColor,
        ),
        filled: true,
        fillColor: context.bgColor,
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: context.dividerColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
      items: _options
          .map(
            (String opt) => DropdownMenuItem<String>(
              value: opt,
              child: Text(opt),
            ),
          )
          .toList(),
      onChanged: (String? v) {
        if (v != null) setState(() => _relationship = v);
      },
    );
  }
}
