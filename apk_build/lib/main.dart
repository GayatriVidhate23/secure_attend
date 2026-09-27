import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/auth_service.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/student_dashboard.dart';
import 'screens/faculty_dashboard.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final authService = AuthService();
  await authService.checkAuthStatus();
  
  runApp(
    ChangeNotifierProvider.value(
      value: authService,
      child: const SecureAttendApp(),
    ),
  );
}

class SecureAttendApp extends StatelessWidget {
  const SecureAttendApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Primary: Deep Navy (#0F172A)
    // Accent: Professional Blue (#2563EB)
    // Background: Light Gray (#F8FAFC)
    
    return MaterialApp(
      title: 'SecureAttend',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: const ColorScheme.light(
          primary: Color(0xFF0F172A), // Deep Navy
          secondary: Color(0xFF2563EB), // Professional Blue
          surface: Color(0xFFF8FAFC), // Off-white / light gray
          error: Color(0xFFDC2626), // Red
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0F172A),
          foregroundColor: Colors.white,
          centerTitle: false,
          elevation: 0,
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.grey.shade200),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFF2563EB),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          ),
        ),
        useMaterial3: true,
      ),
      // We force light theme for the enterprise app look as requested, but we can define dark if needed.
      themeMode: ThemeMode.light,
      home: const SplashScreen(),
    );
  }
}

class AuthenticationWrapper extends StatelessWidget {
  const AuthenticationWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthService>(
      builder: (context, auth, _) {
        if (!auth.isAuthenticated) {
          return const LoginScreen();
        }
        
        final currentRole = auth.role?.toLowerCase();
        
        if (currentRole == 'student') {
          return const StudentDashboard();
        } else if (currentRole == 'faculty' || currentRole == 'admin') {
          return const FacultyDashboard();
        }
        
        // Fallback
        return const LoginScreen();
      },
    );
  }
}
