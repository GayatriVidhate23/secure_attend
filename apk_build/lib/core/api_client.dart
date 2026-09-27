import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final customIp = prefs.getString('server_ip');
    if (customIp != null && customIp.isNotEmpty) {
      return 'http://$customIp:8000/api/v1';
    }
    return 'http://10.14.223.107:8000/api/v1'; // Local LAN IP
  }
  static Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');
    
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<http.Response> get(String endpoint) async {
    final headers = await _getHeaders();
    final baseUrl = await getBaseUrl();
    final response = await http.get(Uri.parse('$baseUrl$endpoint'), headers: headers).timeout(const Duration(seconds: 10));
    return response;
  }

  static Future<http.Response> post(String endpoint, {Map<String, dynamic>? body}) async {
    final headers = await _getHeaders();
    final baseUrl = await getBaseUrl();
    final response = await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    ).timeout(const Duration(seconds: 10));
    return response;
  }

  
  static Future<http.Response> put(String endpoint, {Map<String, dynamic>? data}) async {
    final headers = await _getHeaders();
    final baseUrl = await getBaseUrl();
    final response = await http.put(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
      body: data != null ? jsonEncode(data) : null,
    ).timeout(const Duration(seconds: 10));
    return response;
  }

  static Future<http.Response> postMultipart(String endpoint, {required String fileField, required String filePath}) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');

    final baseUrl = await getBaseUrl();
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$endpoint'));
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    
    request.files.add(await http.MultipartFile.fromPath(fileField, filePath));
    
    final streamedResponse = await request.send().timeout(const Duration(seconds: 15));
    return http.Response.fromStream(streamedResponse);
  }
}
