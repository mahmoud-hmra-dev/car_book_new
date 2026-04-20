import '../../core/constants/api_constants.dart';
import '../../core/errors/failures.dart';
import '../../core/network/dio_client.dart';
import '../../core/storage/secure_storage.dart';
import '../models/user_model.dart';

class AuthRepository {
  final DioClient _client;
  final SecureStorage _storage;

  AuthRepository(this._client, this._storage);

  Future<UserModel> signIn({required String email, required String password}) async {
    final resp = await _client.post(
      ApiConstants.signInAdmin,
      data: {'email': email, 'password': password, 'mobile': true},
    );

    if (resp.statusCode != 200 || resp.data == null) {
      throw AppException('Invalid credentials');
    }

    final data = resp.data is Map<String, dynamic>
        ? resp.data as Map<String, dynamic>
        : <String, dynamic>{};

    final user = UserModel.fromJson(data);
    if (user.accessToken.isEmpty) {
      throw AppException('Authentication failed');
    }

    await _storage.saveToken(user.accessToken);
    await _storage.saveUser(user.toJsonString());
    return user;
  }

  Future<bool> validateToken() async {
    try {
      final resp = await _client.post(ApiConstants.validateAccessToken);
      return resp.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<UserModel?> getCachedUser() async {
    final s = await _storage.getUser();
    if (s == null || s.isEmpty) return null;
    try {
      return UserModel.fromJsonString(s);
    } catch (_) {
      return null;
    }
  }

  Future<void> signOut() async {
    await _storage.clearAll();
  }
}
