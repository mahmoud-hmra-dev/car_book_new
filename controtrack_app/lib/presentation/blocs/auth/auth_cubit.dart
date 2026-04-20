import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/errors/failures.dart';
import '../../../core/services/auth_event_bus.dart';
import '../../../core/services/push_notification_service.dart';
import '../../../data/repositories/auth_repository.dart';
import 'auth_state.dart';

class AuthCubit extends Cubit<AuthState> {
  final AuthRepository _repo;
  StreamSubscription<dynamic>? _authEventSub;

  AuthCubit(this._repo) : super(const AuthState.initial()) {
    // Listen for 401/403 events emitted by DioClient interceptor.
    // When the server rejects the token mid-session, immediately transition
    // to unauthenticated so GoRouter redirects the user to the login screen.
    _authEventSub = AuthEventBus.instance.stream.listen((_) {
      if (state.status == AuthStatus.authenticated) {
        try {
          PushNotificationService().disconnect();
        } catch (_) {}
        emit(const AuthState(status: AuthStatus.unauthenticated));
      }
    });
  }

  @override
  Future<void> close() {
    _authEventSub?.cancel();
    return super.close();
  }

  Future<void> checkAuth() async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      final user = await _repo.getCachedUser();
      if (user == null || user.accessToken.isEmpty) {
        emit(state.copyWith(status: AuthStatus.unauthenticated));
        return;
      }
      final valid = await _repo.validateToken();
      if (valid) {
        emit(state.copyWith(status: AuthStatus.authenticated, user: user));
        // Connect WebSocket push notifications — best-effort; auth state is unaffected on failure
        try {
          await PushNotificationService().connect(user.accessToken);
        } catch (_) {
          // ignore: WebSocket is not critical for auth
        }
      } else {
        await _repo.signOut();
        emit(state.copyWith(status: AuthStatus.unauthenticated));
      }
    } catch (_) {
      emit(state.copyWith(status: AuthStatus.unauthenticated));
    }
  }

  Future<void> signIn({required String email, required String password}) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      final user = await _repo.signIn(email: email, password: password);
      emit(state.copyWith(status: AuthStatus.authenticated, user: user));
      // Connect WebSocket push notifications — best-effort; auth state is unaffected on failure
      try {
        await PushNotificationService().connect(user.accessToken);
      } catch (_) {
        // ignore: WebSocket is not critical for auth
      }
    } catch (e) {
      emit(state.copyWith(
        status: AuthStatus.error,
        errorMessage: _friendlySignInError(e),
      ));
    }
  }

  Future<void> signOut() async {
    // Disconnect WebSocket — best-effort; proceed regardless
    try {
      await PushNotificationService().disconnect();
    } catch (_) {
      // ignore
    }
    await _repo.signOut();
    emit(const AuthState(status: AuthStatus.unauthenticated));
  }

  /// Turn raw exceptions from the auth pipeline into messages safe to show in UI.
  String _friendlySignInError(Object error) {
    if (error is AppException) {
      final status = error.statusCode;
      if (status == 401 || status == 403) {
        return 'Incorrect email or password. Please try again.';
      }
      if (status != null && status >= 500) {
        return 'Server error. Please try again later.';
      }
      final msg = error.message.trim();
      if (msg.isEmpty) return 'Sign-in failed. Please try again.';
      // Avoid leaking framework/stacktrace-looking strings.
      if (msg.startsWith('Exception:') || msg.contains('DioException')) {
        return 'Sign-in failed. Please try again.';
      }
      return msg;
    }
    return 'Sign-in failed. Please try again.';
  }
}
