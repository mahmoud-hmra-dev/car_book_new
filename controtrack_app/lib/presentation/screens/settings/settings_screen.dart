import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../config/app_config.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/locale/locale_cubit.dart';
import '../../blocs/theme/theme_cubit.dart';
import '../../widgets/map/map_type_selector.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  int _refreshInterval = AppConfig.trackingRefreshIntervalMs ~/ 1000;
  String _units = 'metric';
  MapType _mapType = MapType.normal;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final savedMap = await loadSavedMapType();
    setState(() {
      _refreshInterval =
          prefs.getInt(AppConstants.refreshIntervalKey) ?? _refreshInterval;
      _units = prefs.getString(AppConstants.unitsKey) ?? 'metric';
      _mapType = savedMap;
      _loaded = true;
    });
  }

  Future<void> _saveRefresh(int seconds) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(AppConstants.refreshIntervalKey, seconds);
    setState(() => _refreshInterval = seconds);
  }

  Future<void> _saveUnits(String v) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.unitsKey, v);
    setState(() => _units = v);
  }

  Future<void> _saveMap(MapType t) async {
    await saveMapType(t);
    setState(() => _mapType = t);
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = context.watch<ThemeCubit>().state;
    final locale = context.watch<LocaleCubit>().state;

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(context.tr('settings')),
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
                // Appearance section
                _SectionCard(
                  index: 0,
                  icon: Icons.palette_rounded,
                  iconColor: AppColors.primary,
                  title: context.tr('appearance'),
                  children: [
                    _ThemeSwitcher(
                      current: themeMode,
                      onSelected: (mode) {
                        final cubit = context.read<ThemeCubit>();
                        if (mode == ThemeMode.dark) {
                          cubit.setDark();
                        } else {
                          cubit.setLight();
                        }
                      },
                    ),
                    const SizedBox(height: 16),
                    _SubLabel(text: context.tr('language')),
                    const SizedBox(height: 10),
                    _LanguageSwitcher(
                      current: locale.languageCode,
                      onSelected: (code) =>
                          context.read<LocaleCubit>().setLocale(code),
                    ),
                    const SizedBox(height: 16),
                    _SubLabel(text: context.tr('map_type')),
                    const SizedBox(height: 10),
                    _MapTypeGridPicker(
                      current: _mapType,
                      onSelected: _saveMap,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Preferences section
                _SectionCard(
                  index: 1,
                  icon: Icons.tune_rounded,
                  iconColor: AppColors.secondary,
                  title: context.tr('preferences'),
                  children: [
                    _Tile(
                      leading: const Icon(Icons.refresh_rounded,
                          color: AppColors.primary),
                      title: context.tr('refresh_interval'),
                      subtitle: 'Every $_refreshInterval seconds',
                      onTap: () async {
                        final v = await showDialog<int>(
                          context: context,
                          builder: (ctx) => _PickerDialog(
                            title: context.tr('refresh_interval'),
                            options: const [15, 30, 60, 120, 300],
                            current: _refreshInterval,
                            formatter: (v) => '$v sec',
                          ),
                        );
                        if (v != null) _saveRefresh(v);
                      },
                    ),
                    Divider(
                        height: 1, indent: 16, color: context.dividerColor),
                    _Tile(
                      leading: const Icon(Icons.straighten_rounded,
                          color: AppColors.secondary),
                      title: context.tr('units'),
                      subtitle: _units == 'metric'
                          ? context.tr('metric')
                          : context.tr('imperial'),
                      onTap: () async {
                        final v = await showDialog<String>(
                          context: context,
                          builder: (ctx) => SimpleDialog(
                            backgroundColor: context.surfaceColor,
                            title: Text(context.tr('units')),
                            children: [
                              SimpleDialogOption(
                                onPressed: () =>
                                    Navigator.pop(ctx, 'metric'),
                                child: Text(
                                  context.tr('metric'),
                                  style: TextStyle(
                                      color: context.textPrimaryColor),
                                ),
                              ),
                              SimpleDialogOption(
                                onPressed: () =>
                                    Navigator.pop(ctx, 'imperial'),
                                child: Text(
                                  context.tr('imperial'),
                                  style: TextStyle(
                                      color: context.textPrimaryColor),
                                ),
                              ),
                            ],
                          ),
                        );
                        if (v != null) _saveUnits(v);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _SectionCard(
                  index: 2,
                  icon: Icons.notifications_active_rounded,
                  iconColor: AppColors.warning,
                  title: context.tr('alert_preferences'),
                  children: [
                    _Tile(
                      leading: const Icon(Icons.sms_rounded,
                          color: AppColors.warning),
                      title: context.tr('sms_alerts'),
                      subtitle: context.tr('sms_info_banner'),
                      onTap: () => context.push('/settings/sms-alerts'),
                    ),
                    Divider(height: 1, indent: 16, color: context.dividerColor),
                    _Tile(
                      leading: const Icon(Icons.sos_rounded,
                          color: AppColors.error),
                      title: 'Emergency Contacts',
                      subtitle: 'SOS contacts notified on panic trigger',
                      onTap: () => context.push('/settings/emergency-contacts'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // About section
                _SectionCard(
                  index: 3,
                  icon: Icons.info_rounded,
                  iconColor: AppColors.accent,
                  title: context.tr('about'),
                  padded: true,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            gradient: AppColors.primaryGradient,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.location_on_rounded,
                              color: Colors.black),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(AppConfig.appName,
                                style:
                                    Theme.of(context).textTheme.titleLarge),
                            const SizedBox(height: 2),
                            Text('v${AppConfig.appVersion}',
                                style: TextStyle(
                                    color: context.textMutedColor)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Professional fleet management & GPS tracking. Built with real-time data and powerful insights to keep your fleet running smoothly.',
                      style: TextStyle(
                          color: context.textSecondaryColor, height: 1.4),
                    ),
                  ],
                ),
              ],
            ),
    );
  }
}

// -----------------------------------------------------------------------------
// Section card with animated entrance.
// -----------------------------------------------------------------------------
class _SectionCard extends StatelessWidget {
  final int index;
  final IconData icon;
  final Color iconColor;
  final String title;
  final List<Widget> children;
  final bool padded;

  const _SectionCard({
    required this.index,
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.children,
    this.padded = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: iconColor.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: iconColor, size: 18),
                ),
                const SizedBox(width: 10),
                Text(
                  title,
                  style: TextStyle(
                    color: context.textPrimaryColor,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.2,
                  ),
                ),
              ],
            ),
          ),
          if (padded)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: children,
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: children,
              ),
            ),
        ],
      ),
    ).animate(delay: (index * 100).ms).fadeIn(duration: 350.ms).slideY(
          begin: 0.1,
          end: 0,
          duration: 400.ms,
          curve: Curves.easeOutCubic,
        );
  }
}

class _SubLabel extends StatelessWidget {
  final String text;
  const _SubLabel({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4, left: 2),
      child: Text(
        text,
        style: TextStyle(
          color: context.textMutedColor,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  final Widget leading;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  const _Tile({
    required this.leading,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
        child: Row(
          children: [
            leading,
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
                    subtitle,
                    style: TextStyle(
                      color: context.textSecondaryColor,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right,
                color: context.textMutedColor, size: 20),
          ],
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Theme switcher (segmented)
// -----------------------------------------------------------------------------
class _ThemeSwitcher extends StatelessWidget {
  final ThemeMode current;
  final ValueChanged<ThemeMode> onSelected;
  const _ThemeSwitcher({required this.current, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          for (final mode in [ThemeMode.dark, ThemeMode.light])
            Expanded(
              child: _ThemeOption(
                mode: mode,
                icon: mode == ThemeMode.dark
                    ? Icons.dark_mode_rounded
                    : Icons.light_mode_rounded,
                label: mode == ThemeMode.dark
                    ? context.tr('dark_mode')
                    : context.tr('light_mode'),
                selected: current == mode,
                onTap: () => onSelected(mode),
              ),
            ),
        ],
      ),
    );
  }
}

class _ThemeOption extends StatelessWidget {
  final ThemeMode mode;
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _ThemeOption({
    required this.mode,
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: 250.ms,
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withValues(alpha: 0.18)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? AppColors.primary : Colors.transparent,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: selected ? AppColors.primary : context.textSecondaryColor,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color:
                    selected ? AppColors.primary : context.textSecondaryColor,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Language switcher (flag toggle buttons)
// -----------------------------------------------------------------------------
class _LanguageSwitcher extends StatelessWidget {
  final String current;
  final ValueChanged<String> onSelected;
  const _LanguageSwitcher({required this.current, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _LangOption(
            flag: '🇺🇸',
            label: 'English',
            selected: current == 'en',
            onTap: () => onSelected('en'),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _LangOption(
            flag: '🇸🇦',
            label: 'العربية',
            selected: current == 'ar',
            onTap: () => onSelected('ar'),
          ),
        ),
      ],
    );
  }
}

class _LangOption extends StatelessWidget {
  final String flag;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _LangOption({
    required this.flag,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: 250.ms,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withValues(alpha: 0.15)
              : context.surfaceColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.primary : context.dividerColor,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(flag, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color:
                    selected ? AppColors.primary : context.textPrimaryColor,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Map-type visual 2x2 grid
// -----------------------------------------------------------------------------
class _MapTypeGridPicker extends StatelessWidget {
  final MapType current;
  final ValueChanged<MapType> onSelected;
  const _MapTypeGridPicker({
    required this.current,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 2.4,
      children: [
        for (final t in kMapTypes)
          _MapTypeTile(
            type: t,
            selected: t == current,
            onTap: () => onSelected(t),
          ),
      ],
    );
  }
}

class _MapTypeTile extends StatelessWidget {
  final MapType type;
  final bool selected;
  final VoidCallback onTap;
  const _MapTypeTile({
    required this.type,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: 250.ms,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withValues(alpha: 0.15)
              : context.surfaceColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppColors.primary : context.dividerColor,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: selected
                    ? AppColors.primary.withValues(alpha: 0.25)
                    : context.cardColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                mapTypeIcon(type),
                size: 18,
                color: selected ? AppColors.primary : context.textSecondaryColor,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                mapTypeLabel(context, type),
                style: TextStyle(
                  color: selected ? AppColors.primary : context.textPrimaryColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            if (selected)
              const Icon(Icons.check_rounded,
                  color: AppColors.primary, size: 18),
          ],
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Shared picker dialog
// -----------------------------------------------------------------------------
class _PickerDialog extends StatelessWidget {
  final String title;
  final List<int> options;
  final int current;
  final String Function(int) formatter;
  const _PickerDialog({
    required this.title,
    required this.options,
    required this.current,
    required this.formatter,
  });

  @override
  Widget build(BuildContext context) {
    return SimpleDialog(
      backgroundColor: context.surfaceColor,
      title: Text(title),
      children: [
        for (final o in options)
          SimpleDialogOption(
            onPressed: () => Navigator.pop(context, o),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    formatter(o),
                    style: TextStyle(color: context.textPrimaryColor),
                  ),
                ),
                if (o == current)
                  const Icon(Icons.check, color: AppColors.primary),
              ],
            ),
          ),
      ],
    );
  }
}
