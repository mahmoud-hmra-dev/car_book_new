import 'package:flutter/material.dart';

// ─────────────────────────────────────────────────────────────
//  Design System — ControTrack  (Violet + Zinc)
//  Primary: Violet #7C3AED (dark) / #6D28D9 (light)
//  Neutrals: Zinc scale (warm-gray, almost off-black)
//  8-px spacing grid. Border radius: 10 / 14 / 20.
// ─────────────────────────────────────────────────────────────

class AppColors {
  // ── Brand ─────────────────────────────────────────────────
  static const Color primary      = Color(0xFF7C3AED); // Violet 600
  static const Color primaryLight = Color(0xFFA78BFA); // Violet 400
  static const Color primaryDark  = Color(0xFF5B21B6); // Violet 800

  // Backward-compat aliases
  static const Color secondary = Color(0xFF8B5CF6); // Violet 500
  static const Color accent    = Color(0xFFDDD6FE); // Violet 200

  // ── Dark surfaces (Zinc scale) ────────────────────────────
  static const Color background   = Color(0xFF09090B); // Zinc 950
  static const Color surface      = Color(0xFF18181B); // Zinc 900
  static const Color card         = Color(0xFF27272A); // Zinc 800
  static const Color cardElevated = Color(0xFF3F3F46); // Zinc 700

  // ── Dark text ─────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFFFAFAFA); // Zinc 50
  static const Color textSecondary = Color(0xFFA1A1AA); // Zinc 400
  static const Color textMuted     = Color(0xFF71717A); // Zinc 500
  static const Color divider       = Color(0xFF27272A); // Zinc 800

  // ── Semantic ──────────────────────────────────────────────
  static const Color error   = Color(0xFFEF4444); // Red 500
  static const Color warning = Color(0xFFF59E0B); // Amber 500
  static const Color success = Color(0xFF22C55E); // Green 500

  // ── Status colours ────────────────────────────────────────
  static const Color statusMoving   = Color(0xFF22C55E); // Green 500
  static const Color statusIdle     = Color(0xFFF59E0B); // Amber 500
  static const Color statusStopped  = Color(0xFFEF4444); // Red 500
  static const Color statusOffline  = Color(0xFF71717A); // Zinc 500
  static const Color statusStale    = Color(0xFFF97316); // Orange 500
  static const Color statusNoGps    = Color(0xFFA78BFA); // Violet 400
  static const Color statusUnlinked = Color(0xFF52525B); // Zinc 600

  // ── Gradients ─────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF7C3AED), Color(0xFFA78BFA)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    colors: [Color(0xFF09090B), Color(0xFF18181B), Color(0xFF09090B)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFF3F3F46), Color(0xFF27272A)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ── Status helper ─────────────────────────────────────────
  static Color statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'moving':   return statusMoving;
      case 'idle':     return statusIdle;
      case 'stopped':  return statusStopped;
      case 'stale':    return statusStale;
      case 'nogps':
      case 'no_gps':   return statusNoGps;
      case 'unlinked': return statusUnlinked;
      default:         return statusOffline;
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  Light palette (Zinc neutrals + Violet brand)
// ─────────────────────────────────────────────────────────────
class LightColors {
  // ── Brand ─────────────────────────────────────────────────
  static const Color primary      = Color(0xFF6D28D9); // Violet 700
  static const Color primaryLight = Color(0xFF7C3AED); // Violet 600
  static const Color primaryDark  = Color(0xFF5B21B6); // Violet 800

  static const Color secondary = Color(0xFF8B5CF6); // Violet 500
  static const Color accent    = Color(0xFFEDE9FE); // Violet 100

  // ── Light surfaces ────────────────────────────────────────
  static const Color background   = Color(0xFFF4F4F5); // Zinc 100
  static const Color surface      = Color(0xFFFFFFFF); // White
  static const Color card         = Color(0xFFFFFFFF); // White
  static const Color cardElevated = Color(0xFFF4F4F5); // Zinc 100

  // ── Light text ────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFF09090B); // Zinc 950
  static const Color textSecondary = Color(0xFF52525B); // Zinc 600
  static const Color textMuted     = Color(0xFFA1A1AA); // Zinc 400
  static const Color divider       = Color(0xFFE4E4E7); // Zinc 200

  // ── Semantic ──────────────────────────────────────────────
  static const Color error   = Color(0xFFDC2626); // Red 600
  static const Color warning = Color(0xFFD97706); // Amber 600
  static const Color success = Color(0xFF16A34A); // Green 600

  // ── Status colours ────────────────────────────────────────
  static const Color statusMoving   = Color(0xFF16A34A);
  static const Color statusIdle     = Color(0xFFD97706);
  static const Color statusStopped  = Color(0xFFDC2626);
  static const Color statusOffline  = Color(0xFF71717A);
  static const Color statusStale    = Color(0xFFEA580C);
  static const Color statusNoGps    = Color(0xFF7C3AED);
  static const Color statusUnlinked = Color(0xFFA1A1AA);

  // ── Gradients ─────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF6D28D9), Color(0xFF7C3AED)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    colors: [Color(0xFFF4F4F5), Color(0xFFFFFFFF), Color(0xFFF4F4F5)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFFFFFFFF), Color(0xFFF4F4F5)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

// ─────────────────────────────────────────────────────────────
//  BuildContext extensions — theme-aware color access
// ─────────────────────────────────────────────────────────────
extension ThemeColors on BuildContext {
  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;

  Color get bgColor      => Theme.of(this).scaffoldBackgroundColor;
  Color get surfaceColor => Theme.of(this).colorScheme.surface;

  Color get cardColor          => isDarkMode ? AppColors.card          : LightColors.card;
  Color get cardElevatedColor  => isDarkMode ? AppColors.cardElevated  : LightColors.cardElevated;
  Color get textPrimaryColor   => isDarkMode ? AppColors.textPrimary   : LightColors.textPrimary;
  Color get textSecondaryColor => isDarkMode ? AppColors.textSecondary : LightColors.textSecondary;
  Color get textMutedColor     => isDarkMode ? AppColors.textMuted     : LightColors.textMuted;
  Color get dividerColor       => isDarkMode ? AppColors.divider       : LightColors.divider;
  Color get primaryColor       => isDarkMode ? AppColors.primary       : LightColors.primary;
  Color get primaryLightColor  => isDarkMode ? AppColors.primaryLight  : LightColors.primaryLight;
  Color get errorColor         => isDarkMode ? AppColors.error         : LightColors.error;
  Color get successColor       => isDarkMode ? AppColors.success       : LightColors.success;
  Color get warningColor       => isDarkMode ? AppColors.warning       : LightColors.warning;

  Gradient get primaryGradientColor    => isDarkMode ? AppColors.primaryGradient    : LightColors.primaryGradient;
  Gradient get cardGradientColor       => isDarkMode ? AppColors.cardGradient       : LightColors.cardGradient;
  Gradient get backgroundGradientColor => isDarkMode ? AppColors.backgroundGradient : LightColors.backgroundGradient;
}
