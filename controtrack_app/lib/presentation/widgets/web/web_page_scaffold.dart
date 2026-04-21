import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../blocs/theme/theme_cubit.dart';
import '../../blocs/locale/locale_cubit.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

const _kBreakpoint = 900.0;

/// Wrap a web screen's body with this widget to get:
/// - Persistent top header bar (title + subtitle + action buttons)
/// - Theme/language toggles in the header
/// - Proper content padding and max-width for readability
/// - Graceful no-op on mobile (returns child as-is)
class WebPageScaffold extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final Widget child;
  final bool scrollable;

  const WebPageScaffold({
    super.key,
    required this.title,
    this.subtitle,
    this.actions = const [],
    required this.child,
    this.scrollable = true,
  });

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < _kBreakpoint) return child; // Mobile: untouched

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Top header bar ─────────────────────────────────────────────────
        _WebTopBar(title: title, subtitle: subtitle, actions: actions),
        // ── Content ────────────────────────────────────────────────────────
        Expanded(
          child: scrollable
              ? SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(28, 0, 28, 32),
                  child: child,
                )
              : Padding(
                  padding: const EdgeInsets.fromLTRB(28, 0, 28, 0),
                  child: child,
                ),
        ),
      ],
    );
  }
}

/// Same as [WebPageScaffold] but the child controls its own scrolling
/// (e.g. a [CustomScrollView] or a [ListView]).
class WebPageScaffoldScrollable extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final Widget child;

  const WebPageScaffoldScrollable({
    super.key,
    required this.title,
    this.subtitle,
    this.actions = const [],
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < _kBreakpoint) return child;

    return Column(
      children: [
        _WebTopBar(title: title, subtitle: subtitle, actions: actions),
        Expanded(child: child),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Top header bar
// ─────────────────────────────────────────────────────────────────────────────
class _WebTopBar extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget> actions;
  const _WebTopBar({required this.title, this.subtitle, required this.actions});

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 28),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF12131A) : Colors.white,
        border: Border(
          bottom: BorderSide(
            color: isDark ? AppColors.divider : LightColors.divider,
          ),
        ),
      ),
      child: Row(
        children: [
          // ── Title ────────────────────────────────────────────────────────
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontWeight: FontWeight.w700,
                  fontSize: 18,
                  letterSpacing: -0.3,
                ),
              ),
              if (subtitle != null)
                Text(
                  subtitle!,
                  style: TextStyle(color: context.textMutedColor, fontSize: 12),
                ),
            ],
          ),
          const Spacer(),
          // ── Custom actions ────────────────────────────────────────────────
          ...actions,
          if (actions.isNotEmpty) const SizedBox(width: 8),
          // ── Theme toggle ─────────────────────────────────────────────────
          _ThemeToggle(),
          const SizedBox(width: 4),
          // ── Language toggle ───────────────────────────────────────────────
          _LangToggle(),
        ],
      ),
    );
  }
}

class _ThemeToggle extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;
    return Tooltip(
      message: isDark ? 'Light mode' : 'Dark mode',
      child: InkWell(
        onTap: () {
          final t = context.read<ThemeCubit>();
          if (context.isDarkMode) { t.setLight(); } else { t.setDark(); }
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: context.isDarkMode
                ? Colors.white.withValues(alpha: 0.07)
                : Colors.black.withValues(alpha: 0.04),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: context.dividerColor),
          ),
          child: Icon(
            isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
            size: 17,
            color: context.textSecondaryColor,
          ),
        ),
      ),
    );
  }
}

class _LangToggle extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleCubit>().state;
    final isAr = locale.languageCode == 'ar';
    return Tooltip(
      message: isAr ? 'Switch to English' : 'التبديل للعربية',
      child: InkWell(
        onTap: () => context.read<LocaleCubit>().setLocale(isAr ? 'en' : 'ar'),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: context.isDarkMode
                ? Colors.white.withValues(alpha: 0.07)
                : Colors.black.withValues(alpha: 0.04),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: context.dividerColor),
          ),
          alignment: Alignment.center,
          child: Text(
            isAr ? 'EN' : 'ع',
            style: TextStyle(
              color: context.textSecondaryColor,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }
}
