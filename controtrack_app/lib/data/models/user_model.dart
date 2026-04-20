import 'dart:convert';
import 'package:equatable/equatable.dart';

class UserModel extends Equatable {
  final String id;
  final String email;
  final String fullName;
  final String accessToken;
  final String language;
  final String? avatar;
  final String? phone;
  final String type;

  const UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    required this.accessToken,
    this.language = 'en',
    this.avatar,
    this.phone,
    this.type = 'admin',
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      fullName: (json['fullName'] ?? json['name'] ?? '').toString(),
      accessToken: (json['accessToken'] ?? '').toString(),
      language: (json['language'] ?? 'en').toString(),
      avatar: json['avatar']?.toString(),
      phone: json['phone']?.toString(),
      type: (json['type'] ?? 'admin').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'email': email,
        'fullName': fullName,
        'accessToken': accessToken,
        'language': language,
        'avatar': avatar,
        'phone': phone,
        'type': type,
      };

  String toJsonString() => jsonEncode(toJson());

  factory UserModel.fromJsonString(String source) =>
      UserModel.fromJson(jsonDecode(source) as Map<String, dynamic>);

  UserModel copyWith({
    String? id,
    String? email,
    String? fullName,
    String? accessToken,
    String? language,
    String? avatar,
    String? phone,
    String? type,
  }) =>
      UserModel(
        id: id ?? this.id,
        email: email ?? this.email,
        fullName: fullName ?? this.fullName,
        accessToken: accessToken ?? this.accessToken,
        language: language ?? this.language,
        avatar: avatar ?? this.avatar,
        phone: phone ?? this.phone,
        type: type ?? this.type,
      );

  @override
  List<Object?> get props => [id, email, fullName, accessToken, language, avatar, phone, type];
}
