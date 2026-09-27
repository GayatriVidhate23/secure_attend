import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api_client.dart';

class AuthService extends ChangeNotifier {
  bool _isAuthenticated = false;
  Map<String, dynamic>? _userProfile;

  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get userProfile => _userProfile;
  String? get role => _userProfile?['role'];

  Future<void> checkAuthStatus() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getString('access_token') != null) {
      // Validate token by fetching profile
      await fetchProfile();
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      final response = await ApiClient.post('/auth/login', body: {
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', data['access_token']);
        await prefs.setString('refresh_token', data['refresh_token']);
        
        await fetchProfile();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<void> fetchProfile() async {
    try {
      final response = await ApiClient.get('/auth/me');
      if (response.statusCode == 200) {
        _userProfile = jsonDecode(response.body);
        _isAuthenticated = true;
        notifyListeners();
      } else {
        await logout();
      }
    } catch (e) {
      await logout();
    }
  }

  Future<void> logout() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final refreshToken = prefs.getString('refresh_token');
      if (refreshToken != null) {
        await ApiClient.post('/auth/logout', body: {'refresh_token': refreshToken});
      }
    } catch (_) {}
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
    _isAuthenticated = false;
    _userProfile = null;
    notifyListeners();
  }
}
