import 'package:flutter/material.dart';

class AppColors {
  static const Color background = Color(0xFF0A0E1A);
  static const Color surface = Color(0xFF131929);
  static const Color card = Color(0xFF1A2236);
  static const Color cardElevated = Color(0xFF222B42);

  static const Color primary = Color(0xFF00E5A0);
  static const Color primaryDark = Color(0xFF00B880);
  static const Color secondary = Color(0xFF0080FF);
  static const Color accent = Color(0xFF7C5CFF);

  static const Color error = Color(0xFFFF4757);
  static const Color warning = Color(0xFFFFB020);
  static const Color success = Color(0xFF00E5A0);

  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFB0B8C9);
  static const Color textMuted = Color(0xFF6B7280);
  static const Color divider = Color(0xFF2A3349);

  // Status colors
  static const Color statusMoving = Color(0xFF00E5A0);
  static const Color statusIdle = Color(0xFFFFB020);
  static const Color statusStopped = Color(0xFFFF4757);
  static const Color statusOffline = Color(0xFF6B7280);
  static const Color statusStale = Color(0xFFFF8C00);
  static const Color statusNoGps = Color(0xFF8B5CF6);
  static const Color statusUnlinked = Color(0xFF4B5563);

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF00E5A0), Color(0xFF0080FF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    colors: [Color(0xFF0A0E1A), Color(0xFF131929), Color(0xFF0A0E1A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFF1A2236), Color(0xFF131929)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static Color statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'moving':
        return statusMoving;
      case 'idle':
        return statusIdle;
      case 'stopped':
        return statusStopped;
      case 'offline':
        return statusOffline;
      case 'stale':
        return statusStale;
      case 'nogps':
      case 'no_gps':
        return statusNoGps;
      case 'unlinked':
        return statusUnlinked;
      default:
        return statusOffline;
    }
  }
}

/// Light theme palette mirrors AppColors but tuned for a bright surface.
class LightColors {
  static const Color background = Color(0xFFF5F7FA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color card = Color(0xFFFFFFFF);
  static const Color cardElevated = Color(0xFFF0F2F5);

  static const Color primary = Color(0xFF00B880);
  static const Color primaryDark = Color(0xFF009966);
  static const Color secondary = Color(0xFF0070E0);
  static const Color accent = Color(0xFF6C4FE8);

  static const Color error = Color(0xFFE53935);
  static const Color warning = Color(0xFFF59E0B);
  static const Color success = Color(0xFF00B880);

  static const Color textPrimary = Color(0xFF0D1117);
  static const Color textSecondary = Color(0xFF4B5563);
  static const Color textMuted = Color(0xFF9CA3AF);
  static const Color divider = Color(0xFFE5E7EB);

  static const Color statusMoving = Color(0xFF00B880);
  static const Color statusIdle = Color(0xFFF59E0B);
  static const Color statusStopped = Color(0xFFE53935);
  static const Color statusOffline = Color(0xFF9CA3AF);
  static const Color statusStale = Color(0xFFEA7212);
  static const Color statusNoGps = Color(0xFF7C3AED);
  static const Color statusUnlinked = Color(0xFF6B7280);

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF00B880), Color(0xFF0070E0)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    colors: [Color(0xFFF5F7FA), Color(0xFFFFFFFF), Color(0xFFF5F7FA)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFFFFFFFF), Color(0xFFF9FAFB)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

/// Theme-aware color access. Use `context.cardColor` etc. in widgets that
/// need to adapt to both light and dark modes.
extension ThemeColors on BuildContext {
  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;

  Color get bgColor => Theme.of(this).scaffoldBackgroundColor;

  Color get surfaceColor => Theme.of(this).colorScheme.surface;

  Color get cardColor => isDarkMode ? AppColors.card : LightColors.card;

  Color get cardElevatedColor =>
      isDarkMode ? AppColors.cardElevated : LightColors.cardElevated;

  Color get textPrimaryColor =>
      isDarkMode ? AppColors.textPrimary : LightColors.textPrimary;

  Color get textSecondaryColor =>
      isDarkMode ? AppColors.textSecondary : LightColors.textSecondary;

  Color get textMutedColor =>
      isDarkMode ? AppColors.textMuted : LightColors.textMuted;

  Color get dividerColor =>
      isDarkMode ? AppColors.divider : LightColors.divider;

  Gradient get cardGradientColor =>
      isDarkMode ? AppColors.cardGradient : LightColors.cardGradient;

  Gradient get backgroundGradientColor =>
      isDarkMode ? AppColors.backgroundGradient : LightColors.backgroundGradient;
}
