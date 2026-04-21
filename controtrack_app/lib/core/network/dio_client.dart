import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../config/app_config.dart';
import '../constants/api_constants.dart';
import '../errors/failures.dart';
import '../services/auth_event_bus.dart';
import '../storage/secure_storage.dart';

class DioClient {
  late final Dio _dio;
  final SecureStorage _storage;

  DioClient(this._storage) {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiHost,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 30),
        responseType: ResponseType.json,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers[ApiConstants.tokenHeader] = token;
          }
          handler.next(options);
        },
        onError: (DioException error, handler) async {
          final status = error.response?.statusCode;
          if (status == 401 || status == 403) {
            // Clear stored credentials so the app falls back to the login flow.
            // We have no refresh-token endpoint, so there's nothing to retry here.
            await _storage.deleteToken();
            await _storage.deleteUser();
            // Broadcast a token-expired event so AuthCubit can react immediately
            // (redirect to login without needing an app restart).
            AuthEventBus.instance.add401Event();
          }
          handler.next(error);
        },
      ),
    );
  }

  Dio get dio => _dio;

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  Future<Response> post(String path, {dynamic data, Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.post(path, data: data, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  Future<Response> put(String path, {dynamic data}) async {
    try {
      return await _dio.put(path, data: data);
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  Future<Response> patch(String path, {dynamic data}) async {
    try {
      return await _dio.patch(path, data: data);
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  Future<Response> delete(String path) async {
    try {
      return await _dio.delete(path);
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  AppException _mapError(DioException e) {
    final status = e.response?.statusCode;
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout) {
      return AppException('Connection timed out. Please try again.', statusCode: status);
    }
    if (e.type == DioExceptionType.connectionError) {
      // On web, CORS blocks also surface as connectionError.
      final msg = kIsWeb
          ? 'Unable to reach server. Check CORS settings or network.'
          : 'No internet connection.';
      return AppException(msg, statusCode: status);
    }
    if (status == 401 || status == 403) {
      return AppException('Unauthorized. Please sign in again.', statusCode: status);
    }
    if (status != null && status >= 500) {
      return AppException('Server error. Please try again later.', statusCode: status);
    }
    final msg = e.response?.data is Map ? (e.response?.data['message'] ?? e.message) : e.message;
    return AppException(msg?.toString() ?? 'Unknown error', statusCode: status);
  }
}
