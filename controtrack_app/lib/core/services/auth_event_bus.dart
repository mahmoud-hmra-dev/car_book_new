import 'dart:async';

/// Global event bus for auth-level events that need to cross service/UI layers.
///
/// Usage:
///   DioClient fires `AuthEventBus.instance.add401Event()` on a 401/403 response.
///   AuthCubit listens and emits `AuthStatus.unauthenticated` so GoRouter
///   redirects the user to the login screen immediately — no restart required.
class AuthEventBus {
  AuthEventBus._();
  static final AuthEventBus instance = AuthEventBus._();

  final _controller = StreamController<AuthEvent>.broadcast();

  Stream<AuthEvent> get stream => _controller.stream;

  /// Signal that the server rejected the current token.
  void add401Event() => _controller.add(AuthEvent.tokenExpired);

  void dispose() => _controller.close();
}

enum AuthEvent { tokenExpired }
