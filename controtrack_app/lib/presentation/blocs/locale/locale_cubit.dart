import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists the active [Locale] (currently `en` or `ar`).
class LocaleCubit extends Cubit<Locale> {
  static const _key = 'app_locale';

  LocaleCubit() : super(const Locale('en')) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_key) ?? 'en';
    emit(Locale(code));
  }

  Future<void> setLocale(String code) async {
    emit(Locale(code));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, code);
  }

  Future<void> toggle() async {
    final next = state.languageCode == 'en' ? 'ar' : 'en';
    await setLocale(next);
  }
}
