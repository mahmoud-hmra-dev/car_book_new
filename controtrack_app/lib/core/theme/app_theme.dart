import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app_colors.dart';
import 'app_text_styles.dart';

class AppTheme {
  static const _r10 = Radius.circular(10);
  static const _r14 = Radius.circular(14);
  static const _r20 = Radius.circular(20);

  static ThemeData get darkTheme => _build(
        brightness: Brightness.dark,
        bg: AppColors.background,
        surface: AppColors.surface,
        card: AppColors.card,
        cardElevated: AppColors.cardElevated,
        primary: AppColors.primary,
        primaryLight: AppColors.primaryLight,
        textPrimary: AppColors.textPrimary,
        textSecondary: AppColors.textSecondary,
        textMuted: AppColors.textMuted,
        divider: AppColors.divider,
        error: AppColors.error,
        statusBar: Brightness.light,
      );

  static ThemeData get lightTheme => _build(
        brightness: Brightness.light,
        bg: LightColors.background,
        surface: LightColors.surface,
        card: LightColors.card,
        cardElevated: LightColors.cardElevated,
        primary: LightColors.primary,
        primaryLight: LightColors.primaryLight,
        textPrimary: LightColors.textPrimary,
        textSecondary: LightColors.textSecondary,
        textMuted: LightColors.textMuted,
        divider: LightColors.divider,
        error: LightColors.error,
        statusBar: Brightness.dark,
      );

  static ThemeData _build({
    required Brightness brightness,
    required Color bg,
    required Color surface,
    required Color card,
    required Color cardElevated,
    required Color primary,
    required Color primaryLight,
    required Color textPrimary,
    required Color textSecondary,
    required Color textMuted,
    required Color divider,
    required Color error,
    required Brightness statusBar,
  }) {
    final isDark = brightness == Brightness.dark;

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: bg,
      primaryColor: primary,

      colorScheme: ColorScheme(
        brightness: brightness,
        primary: primary,
        onPrimary: Colors.white,
        primaryContainer: isDark
            ? AppColors.primaryDark
            : LightColors.accent,
        onPrimaryContainer: isDark ? Colors.white : LightColors.primaryDark,
        secondary: primaryLight,
        onSecondary: Colors.white,
        surface: surface,
        onSurface: textPrimary,
        surfaceContainerHighest: cardElevated,
        error: error,
        onError: Colors.white,
        outline: divider,
        outlineVariant: divider.withValues(alpha: 0.5),
      ),

      fontFamily: AppTextStyles.fontFamily,
      // Apply the correct text color for each theme (dark vs light).
      // TextStyles in AppTextStyles carry no hardcoded color so that this
      // single apply() call propagates textPrimary across every text role,
      // including DropdownMenuItem and PopupMenuItem labels.
      textTheme: TextTheme(
        displayLarge:  AppTextStyles.displayLarge,
        displayMedium: AppTextStyles.displayMedium,
        headlineLarge: AppTextStyles.headlineLarge,
        headlineMedium: AppTextStyles.headlineMedium,
        titleLarge:   AppTextStyles.titleLarge,
        titleMedium:  AppTextStyles.titleMedium,
        titleSmall:   AppTextStyles.titleSmall,
        bodyLarge:    AppTextStyles.bodyLarge,
        bodyMedium:   AppTextStyles.bodyMedium,
        bodySmall:    AppTextStyles.bodySmall,
        labelLarge:   AppTextStyles.labelLarge,
        labelMedium:  AppTextStyles.labelMedium,
        labelSmall:   AppTextStyles.labelSmall,
      ).apply(
        bodyColor:    textPrimary,
        displayColor: textPrimary,
        decorationColor: textPrimary,
        fontFamily: AppTextStyles.fontFamily,
      ),

      appBarTheme: AppBarTheme(
        backgroundColor: bg,
        foregroundColor: textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: statusBar,
          statusBarBrightness: isDark ? Brightness.dark : Brightness.light,
        ),
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
          fontFamily: AppTextStyles.fontFamily,
        ),
      ),

      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(_r14),
          side: BorderSide(color: divider, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: cardElevated,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: TextStyle(color: textMuted, fontSize: 14),
        labelStyle: TextStyle(color: textSecondary, fontSize: 14),
        floatingLabelStyle: TextStyle(color: primary, fontSize: 12, fontWeight: FontWeight.w600),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(_r10),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(_r10),
          borderSide: BorderSide(color: divider, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(_r10),
          borderSide: BorderSide(color: primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(_r10),
          borderSide: BorderSide(color: error, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(_r10),
          borderSide: BorderSide(color: error, width: 1.5),
        ),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: primary.withValues(alpha: 0.38),
          disabledForegroundColor: Colors.white.withValues(alpha: 0.5),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(_r10)),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.1,
          ),
          elevation: 0,
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: BorderSide(color: primary, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 13),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(_r10)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        ),
      ),

      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: textSecondary,
          highlightColor: primary.withValues(alpha: 0.10),
        ),
      ),

      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(_r14)),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: cardElevated,
        selectedColor: primary,
        labelStyle: TextStyle(color: textPrimary, fontWeight: FontWeight.w600, fontSize: 13),
        secondaryLabelStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
        shape: const StadiumBorder(),
        side: BorderSide.none,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),

      dividerTheme: DividerThemeData(color: divider, thickness: 1, space: 1),

      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? Colors.white : textMuted,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? primary : cardElevated,
        ),
        trackOutlineColor: WidgetStateProperty.all(Colors.transparent),
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: isDark ? AppColors.cardElevated : Colors.white,
        contentTextStyle: TextStyle(color: textPrimary, fontSize: 14, fontWeight: FontWeight.w500),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(_r10)),
        behavior: SnackBarBehavior.floating,
        elevation: 8,
      ),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: isDark ? AppColors.surface : Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: _r20),
        ),
        elevation: 0,
        dragHandleColor: isDark ? AppColors.textMuted : LightColors.divider,
        dragHandleSize: const Size(40, 4),
      ),

      listTileTheme: ListTileThemeData(
        tileColor: Colors.transparent,
        iconColor: textSecondary,
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 15,
          fontWeight: FontWeight.w600,
          fontFamily: AppTextStyles.fontFamily,
        ),
        subtitleTextStyle: TextStyle(
          color: textMuted,
          fontSize: 13,
          fontFamily: AppTextStyles.fontFamily,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(_r10)),
      ),

      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: primary,
        linearTrackColor: primary.withValues(alpha: 0.15),
        circularTrackColor: primary.withValues(alpha: 0.15),
      ),

      // ── Dropdown / Popup menus ─────────────────────────────
      // DropdownButtonFormField uses these for its overlay menu.
      dropdownMenuTheme: DropdownMenuThemeData(
        textStyle: TextStyle(color: textPrimary, fontSize: 15),
        menuStyle: MenuStyle(
          backgroundColor: WidgetStatePropertyAll(card),
          surfaceTintColor: WidgetStatePropertyAll(Colors.transparent),
          elevation: const WidgetStatePropertyAll(8),
          shape: WidgetStatePropertyAll(
            RoundedRectangleBorder(
              borderRadius: BorderRadius.all(_r10),
              side: BorderSide(color: divider),
            ),
          ),
        ),
      ),

      popupMenuTheme: PopupMenuThemeData(
        color: card,
        surfaceTintColor: Colors.transparent,
        textStyle: TextStyle(color: textPrimary, fontSize: 14, fontWeight: FontWeight.w500),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(_r10),
          side: BorderSide(color: divider),
        ),
        elevation: 8,
      ),
    );
  }
}
