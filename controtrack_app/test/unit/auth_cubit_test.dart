import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:controtrack/data/repositories/auth_repository.dart';
import 'package:controtrack/data/models/user_model.dart';
import 'package:controtrack/presentation/blocs/auth/auth_cubit.dart';
import 'package:controtrack/presentation/blocs/auth/auth_state.dart';
import 'package:controtrack/core/errors/failures.dart';

// Mock classes
class MockAuthRepository extends Mock implements AuthRepository {}

const _testUser = UserModel(
  id: 'u1',
  email: 'admin@test.com',
  fullName: 'Test Admin',
  accessToken: 'tok123',
);

void main() {
  late MockAuthRepository repo;
  late AuthCubit cubit;

  setUp(() {
    repo = MockAuthRepository();
    cubit = AuthCubit(repo);
  });

  tearDown(() {
    cubit.close();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  test('initial state is AuthStatus.initial', () {
    expect(cubit.state.status, AuthStatus.initial);
    expect(cubit.state.user, isNull);
    expect(cubit.state.errorMessage, isNull);
  });

  // ── checkAuth ──────────────────────────────────────────────────────────────

  group('checkAuth', () {
    test('emits authenticated when cached token is valid', () async {
      when(() => repo.getCachedUser()).thenAnswer((_) async => _testUser);
      when(() => repo.validateToken()).thenAnswer((_) async => true);

      await cubit.checkAuth();

      expect(cubit.state.status, AuthStatus.authenticated);
      expect(cubit.state.user, _testUser);
    });

    test('emits unauthenticated when no cached user', () async {
      when(() => repo.getCachedUser()).thenAnswer((_) async => null);

      await cubit.checkAuth();

      expect(cubit.state.status, AuthStatus.unauthenticated);
    });

    test('emits unauthenticated when token is invalid', () async {
      when(() => repo.getCachedUser()).thenAnswer((_) async => _testUser);
      when(() => repo.validateToken()).thenAnswer((_) async => false);
      when(() => repo.signOut()).thenAnswer((_) async {});

      await cubit.checkAuth();

      expect(cubit.state.status, AuthStatus.unauthenticated);
      verify(() => repo.signOut()).called(1);
    });

    test('emits unauthenticated when getCachedUser throws', () async {
      when(() => repo.getCachedUser()).thenThrow(Exception('storage error'));

      await cubit.checkAuth();

      expect(cubit.state.status, AuthStatus.unauthenticated);
    });

    test('emits loading before final state', () async {
      when(() => repo.getCachedUser()).thenAnswer((_) async => null);

      // Use expectLater so the listener is registered before the async work starts
      final expectation = expectLater(
        cubit.stream.map((s) => s.status),
        emitsInOrder([AuthStatus.loading, AuthStatus.unauthenticated]),
      );
      await cubit.checkAuth();
      await expectation;
    });
  });

  // ── signIn ─────────────────────────────────────────────────────────────────

  group('signIn', () {
    test('emits authenticated on success', () async {
      when(() => repo.signIn(email: any(named: 'email'), password: any(named: 'password')))
          .thenAnswer((_) async => _testUser);

      await cubit.signIn(email: 'admin@test.com', password: 'password');

      expect(cubit.state.status, AuthStatus.authenticated);
      expect(cubit.state.user, _testUser);
    });

    test('emits error with friendly message on 401', () async {
      when(() => repo.signIn(email: any(named: 'email'), password: any(named: 'password')))
          .thenThrow(AppException('Unauthorized', statusCode: 401));

      await cubit.signIn(email: 'x@x.com', password: 'wrong');

      expect(cubit.state.status, AuthStatus.error);
      expect(cubit.state.errorMessage, contains('Incorrect email'));
    });

    test('emits error with server message on 500', () async {
      when(() => repo.signIn(email: any(named: 'email'), password: any(named: 'password')))
          .thenThrow(AppException('Server error', statusCode: 500));

      await cubit.signIn(email: 'x@x.com', password: 'pass');

      expect(cubit.state.status, AuthStatus.error);
      expect(cubit.state.errorMessage, contains('Server error'));
    });

    test('emits error with fallback on unexpected exception', () async {
      when(() => repo.signIn(email: any(named: 'email'), password: any(named: 'password')))
          .thenThrow(Exception('Network failure'));

      await cubit.signIn(email: 'x@x.com', password: 'p');

      expect(cubit.state.status, AuthStatus.error);
      expect(cubit.state.errorMessage, isNotEmpty);
    });

    test('loading is emitted before error on failure', () async {
      when(() => repo.signIn(email: any(named: 'email'), password: any(named: 'password')))
          .thenThrow(AppException('Unauthorized', statusCode: 401));

      // Use expectLater so the listener is registered before the async work starts
      final expectation = expectLater(
        cubit.stream.map((s) => s.status),
        emitsInOrder([AuthStatus.loading, AuthStatus.error]),
      );
      await cubit.signIn(email: 'x@x.com', password: 'p');
      await expectation;
    });
  });

  // ── signOut ────────────────────────────────────────────────────────────────

  group('signOut', () {
    test('emits unauthenticated after signOut', () async {
      when(() => repo.signOut()).thenAnswer((_) async {});

      // Seed authenticated state before calling signOut
      cubit.emit(cubit.state.copyWith(status: AuthStatus.authenticated, user: _testUser));
      expect(cubit.state.status, AuthStatus.authenticated);

      await cubit.signOut();

      // After signOut the cubit should be unauthenticated
      expect(cubit.state.status, AuthStatus.unauthenticated);
      verify(() => repo.signOut()).called(1);
    });

    test('calls repository signOut exactly once', () async {
      when(() => repo.signOut()).thenAnswer((_) async {});
      await cubit.signOut();
      verify(() => repo.signOut()).called(1);
    });
  });
}
