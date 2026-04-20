import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:controtrack/core/errors/failures.dart';
import 'package:controtrack/core/network/dio_client.dart';
import 'package:controtrack/core/storage/secure_storage.dart';
import 'package:controtrack/data/repositories/auth_repository.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class MockDioClient extends Mock implements DioClient {}

class MockSecureStorage extends Mock implements SecureStorage {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

Response<T> _response<T>(T data, {int statusCode = 200}) => Response<T>(
      data: data,
      statusCode: statusCode,
      requestOptions: RequestOptions(path: '/'),
    );

void main() {
  late MockDioClient client;
  late MockSecureStorage storage;
  late AuthRepository repo;

  setUp(() {
    client = MockDioClient();
    storage = MockSecureStorage();
    repo = AuthRepository(client, storage);
  });

  // ── signIn ─────────────────────────────────────────────────────────────────

  group('signIn', () {
    const email = 'admin@test.com';
    const pass = 'secret';

    final validPayload = <String, dynamic>{
      '_id': 'u1',
      'email': email,
      'fullName': 'Admin',
      'accessToken': 'tok123',
    };

    test('returns user and persists token on success', () async {
      when(() => client.post(any(), data: any(named: 'data')))
          .thenAnswer((_) async => _response(validPayload));
      when(() => storage.saveToken(any())).thenAnswer((_) async {});
      when(() => storage.saveUser(any())).thenAnswer((_) async {});

      final user = await repo.signIn(email: email, password: pass);

      expect(user.id, 'u1');
      expect(user.accessToken, 'tok123');
      verify(() => storage.saveToken('tok123')).called(1);
      verify(() => storage.saveUser(any())).called(1);
    });

    test('throws AppException when status code is not 200', () async {
      when(() => client.post(any(), data: any(named: 'data')))
          .thenAnswer((_) async => _response(null, statusCode: 401));

      expect(
        () => repo.signIn(email: email, password: pass),
        throwsA(isA<AppException>()),
      );
    });

    test('throws AppException when access token is empty in response', () async {
      when(() => client.post(any(), data: any(named: 'data')))
          .thenAnswer((_) async => _response(<String, dynamic>{
                '_id': 'u2',
                'email': email,
                'fullName': 'Test',
                'accessToken': '', // empty!
              }));

      expect(
        () => repo.signIn(email: email, password: pass),
        throwsA(isA<AppException>()),
      );
    });

    test('throws AppException when response data is null', () async {
      when(() => client.post(any(), data: any(named: 'data')))
          .thenAnswer((_) async => _response(null));

      expect(
        () => repo.signIn(email: email, password: pass),
        throwsA(isA<AppException>()),
      );
    });

    test('propagates DioException from client', () async {
      when(() => client.post(any(), data: any(named: 'data'))).thenThrow(
        AppException('Unauthorized', statusCode: 401),
      );

      expect(
        () => repo.signIn(email: email, password: pass),
        throwsA(isA<AppException>()),
      );
    });
  });

  // ── validateToken ──────────────────────────────────────────────────────────

  group('validateToken', () {
    test('returns true when server responds 200', () async {
      when(() => client.post(any()))
          .thenAnswer((_) async => _response(<String, dynamic>{}));

      final result = await repo.validateToken();
      expect(result, isTrue);
    });

    test('returns false when server responds non-200', () async {
      when(() => client.post(any()))
          .thenAnswer((_) async => _response(null, statusCode: 401));

      final result = await repo.validateToken();
      expect(result, isFalse);
    });

    test('returns false when client throws', () async {
      when(() => client.post(any()))
          .thenThrow(AppException('Network error'));

      final result = await repo.validateToken();
      expect(result, isFalse);
    });
  });

  // ── getCachedUser ──────────────────────────────────────────────────────────

  group('getCachedUser', () {
    test('returns null when storage is empty', () async {
      when(() => storage.getUser()).thenAnswer((_) async => null);

      final user = await repo.getCachedUser();
      expect(user, isNull);
    });

    test('returns null when stored string is empty', () async {
      when(() => storage.getUser()).thenAnswer((_) async => '');

      final user = await repo.getCachedUser();
      expect(user, isNull);
    });

    test('returns null when stored JSON is malformed', () async {
      when(() => storage.getUser()).thenAnswer((_) async => 'not-valid-json');

      final user = await repo.getCachedUser();
      expect(user, isNull);
    });

    test('parses and returns user when stored JSON is valid', () async {
      // Build a valid UserModel JSON string
      const json =
          '{"_id":"u1","email":"admin@test.com","fullName":"Admin","accessToken":"tok123"}';
      when(() => storage.getUser()).thenAnswer((_) async => json);

      final user = await repo.getCachedUser();
      expect(user, isNotNull);
      expect(user!.id, 'u1');
      expect(user.accessToken, 'tok123');
    });
  });

  // ── signOut ────────────────────────────────────────────────────────────────

  group('signOut', () {
    test('clears all secure storage on sign-out', () async {
      when(() => storage.clearAll()).thenAnswer((_) async {});

      await repo.signOut();

      verify(() => storage.clearAll()).called(1);
    });
  });
}
