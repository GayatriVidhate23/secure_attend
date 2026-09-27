import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import 'student_profile.dart';
import 'student_attendance_history.dart';
import 'student_home_tab.dart';

class StudentDashboard extends StatefulWidget {
  const StudentDashboard({super.key});

  @override
  State<StudentDashboard> createState() => _StudentDashboardState();
}

class _StudentDashboardState extends State<StudentDashboard> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final profile = auth.userProfile ?? {};
    final isEnrolled = profile["face_profile_active"] == true;

    final List<Widget> _screens = [
      StudentHomeTab(
        profile: profile,
        isEnrolled: isEnrolled,
        onHistoryTap: () {
          setState(() {
            _currentIndex = 2; // Index of Attendance
          });
        },
      ),
      const StudentAttendanceHistoryScreen(),
      const StudentProfileScreen(),
    ];

    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.history), label: 'Attendance'),
          NavigationDestination(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
