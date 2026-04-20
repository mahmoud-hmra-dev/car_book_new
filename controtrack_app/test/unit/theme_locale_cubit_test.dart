import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:controtrack/presentation/blocs/theme/theme_cubit.dart';
import 'package:controtrack/presentation/blocs/locale/locale_cubit.dart';

void main() {
  // ---------------------------------------------------------------------------
  // ThemeCubit
  // ---------------------------------------------------------------------------

  group('ThemeCubit', () {
    setUp(() {
      // Each test starts with a clean SharedPreferences store.
      SharedPreferences.setMockInitialValues({});
    });

    test('initial state is ThemeMode.dark', () async {
      final cubit = ThemeCubit();
      expect(cubit.state, ThemeMode.dark);
      await Future<void>.delayed(Duration.zero); // let _load() complete
      cubit.close();
    });

    test('loads saved dark preference on startup', () async {
      SharedPreferences.setMockInitialValues({'theme_mode': 'dark'});
      final cubit = ThemeCubit();
      // Allow _load() to complete
      await Future<void>.delayed(Duration.zero);
      expect(cubit.state, ThemeMode.dark);
      cubit.close();
    });

    test('loads saved light preference on startup', () async {
      SharedPreferences.setMockInitialValues({'theme_mode': 'light'});
      final cubit = ThemeCubit();
      await Future<void>.delayed(Duration.zero);
      expect(cubit.state, ThemeMode.light);
      cubit.close();
    });

    test('toggle switches dark → light', () async {
      SharedPreferences.setMockInitialValues({'theme_mode': 'dark'});
      final cubit = ThemeCubit();
      await Future<void>.delayed(Duration.zero);

      await cubit.toggle();
      expect(cubit.state, ThemeMode.light);

      // Verify it was persisted
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('theme_mode'), 'light');
      cubit.close();
    });

    test('toggle switches light → dark', () async {
      SharedPreferences.setMockInitialValues({'theme_mode': 'light'});
      final cubit = ThemeCubit();
      await Future<void>.delayed(Duration.zero);

      await cubit.toggle();
      expect(cubit.state, ThemeMode.dark);
      cubit.close();
    });

    test('setDark sets state to dark and persists', () async {
      SharedPreferences.setMockInitialValues({'theme_mode': 'light'});
      final cubit = ThemeCubit();
      await Future<void>.delayed(Duration.zero);

      await cubit.setDark();
      expect(cubit.state, ThemeMode.dark);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('theme_mode'), 'dark');
      cubit.close();
    });

    test('setLight sets state to light and persists', () async {
      final cubit = ThemeCubit();
      await Future<void>.delayed(Duration.zero);

      await cubit.setLight();
      expect(cubit.state, ThemeMode.light);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('theme_mode'), 'light');
      cubit.close();
    });
  });

  // ---------------------------------------------------------------------------
  // LocaleCubit
  // ---------------------------------------------------------------------------

  group('LocaleCubit', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('initial state is Locale("en")', () async {
      final cubit = LocaleCubit();
      expect(cubit.state, const Locale('en'));
      await Future<void>.delayed(Duration.zero); // let _load() complete
      cubit.close();
    });

    test('loads saved English locale on startup', () async {
      SharedPreferences.setMockInitialValues({'app_locale': 'en'});
      final cubit = LocaleCubit();
      await Future<void>.delayed(Duration.zero);
      expect(cubit.state.languageCode, 'en');
      cubit.close();
    });

    test('loads saved Arabic locale on startup', () async {
      SharedPreferences.setMockInitialValues({'app_locale': 'ar'});
      final cubit = LocaleCubit();
      await Future<void>.delayed(Duration.zero);
      expect(cubit.state.languageCode, 'ar');
      cubit.close();
    });

    test('setLocale changes to Arabic and persists', () async {
      final cubit = LocaleCubit();
      await Future<void>.delayed(Duration.zero);

      await cubit.setLocale('ar');
      expect(cubit.state, const Locale('ar'));

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('app_locale'), 'ar');
      cubit.close();
    });

    test('setLocale changes back to English and persists', () async {
      SharedPreferences.setMockInitialValues({'app_locale': 'ar'});
      final cubit = LocaleCubit();
      await Future<void>.delayed(Duration.zero);

      await cubit.setLocale('en');
      expect(cubit.state, const Locale('en'));
      cubit.close();
    });

    test('toggle switches en → ar', () async {
      final cubit = LocaleCubit();
      await Future<void>.delayed(Duration.zero);

      await cubit.toggle();
      expect(cubit.state.languageCode, 'ar');
      cubit.close();
    });

    test('toggle switches ar → en', () async {
      SharedPreferences.setMockInitialValues({'app_locale': 'ar'});
      final cubit = LocaleCubit();
      await Future<void>.delayed(Duration.zero);

      await cubit.toggle();
      expect(cubit.state.languageCode, 'en');
      cubit.close();
    });

    test('two consecutive toggles return to original locale', () async {
      final cubit = LocaleCubit();
      await Future<void>.delayed(Duration.zero);

      final original = cubit.state.languageCode;
      await cubit.toggle();
      await cubit.toggle();
      expect(cubit.state.languageCode, original);
      cubit.close();
    });
  });
}
