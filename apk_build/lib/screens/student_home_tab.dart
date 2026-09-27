import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../core/api_client.dart';
import 'student_qr_scanner.dart';
import 'student_face_enrollment.dart';

class StudentHomeTab extends StatefulWidget {
  final Map<String, dynamic> profile;
  final bool isEnrolled;
  final VoidCallback onHistoryTap;

  const StudentHomeTab({
    super.key,
    required this.profile,
    required this.isEnrolled,
    required this.onHistoryTap,
  });

  @override
  State<StudentHomeTab> createState() => _StudentHomeTabState();
}

class _StudentHomeTabState extends State<StudentHomeTab> {
  bool _isLoading = true;
  Map<String, dynamic>? _statsData;
  List<dynamic>? _historyData;
  
  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    try {
      final statsRes = await ApiClient.get('/reports/student/my-attendance');
      final now = DateTime.now();
      // Fetch last 7 days for pulse
      final startDate = now.subtract(const Duration(days: 6)).toIso8601String().split('T')[0];
      final endDate = now.toIso8601String().split('T')[0];
      final historyRes = await ApiClient.get('/reports/student/attendance-history?start_date=$startDate&end_date=$endDate');
      
      if (mounted) {
        setState(() {
          if (statsRes.statusCode == 200) {
            var decodedStats = jsonDecode(statsRes.body);
            if (decodedStats is Map<String, dynamic>) {
              _statsData = decodedStats;
            } else {
              _statsData = null;
            }
          } else {
            _statsData = null;
          }

          if (historyRes.statusCode == 200) {
            var decoded = jsonDecode(historyRes.body);
            if (decoded is List) {
              _historyData = decoded;
            } else {
              _historyData = [];
            }
          } else {
            _historyData = [];
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning 👋';
    if (hour < 17) return 'Good Afternoon 👋';
    return 'Good Evening 👋';
  }

  Color _getHealthColor(double percentage) {
    if (percentage >= 75) return Colors.green;
    if (percentage >= 60) return Colors.orange;
    return Colors.red;
  }

  String _getHealthText(double percentage) {
    if (percentage >= 75) return 'Healthy';
    if (percentage >= 60) return 'Attention Needed';
    return 'Critical';
  }

  Widget _buildPulse() {
    if (_historyData == null || _historyData!.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8.0),
        child: Text('No recent attendance data'),
      );
    }
    
    // Create the last 7 days list
    final now = DateTime.now();
    final List<DateTime> last7Days = List.generate(7, (index) => now.subtract(Duration(days: 6 - index)));
    
    // Map dates to history
    final historyMap = {
      for (var item in _historyData!) item['date']: item
    };
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: last7Days.map((date) {
        final dateStr = date.toIso8601String().split('T')[0];
        final dayData = historyMap[dateStr];
        
        Color dotColor = Colors.grey.shade300; // default for NO_CLASS
        if (dayData != null) {
          switch (dayData['status']) {
            case 'PRESENT':
              dotColor = Colors.green;
              break;
            case 'PARTIAL':
              dotColor = Colors.orange;
              break;
            case 'ABSENT':
              dotColor = Colors.red;
              break;
            case 'HOLIDAY':
              dotColor = Colors.brown;
              break;
            case 'NO_CLASS':
            default:
              dotColor = Colors.grey.shade300;
              break;
          }
        }
        
        final dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][date.weekday - 1];
        
        return GestureDetector(
          onTap: () {
             if (dayData != null) {
               _showDayDetails(dayData);
             }
          },
          child: Column(
            children: [
              Text(dayName, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              const SizedBox(height: 4),
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: dotColor,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  void _showDayDetails(Map<String, dynamic> dayData) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        final sessions = dayData['sessions'] as List<dynamic>? ?? [];
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                dayData['date'],
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                dayData['summary'],
                style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
              ),
              const SizedBox(height: 16),
              if (sessions.isEmpty)
                const Text('No classes conducted on this day.')
              else
                ...sessions.map((s) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(s['subject_name']),
                  leading: Icon(
                    s['status'] == 'PRESENT' ? Icons.check_circle : Icons.cancel,
                    color: s['status'] == 'PRESENT' ? Colors.green : Colors.red,
                  ),
                )).toList(),
            ],
          ),
        );
      }
    );
  }

  Widget _buildToday() {
    if (_historyData == null) return const SizedBox.shrink();
    final todayStr = DateTime.now().toIso8601String().split('T')[0];
    final todayData = _historyData!.firstWhere((h) => h['date'] == todayStr, orElse: () => null);
    
    if (todayData == null || todayData['status'] == 'NO_CLASS' || todayData['status'] == 'HOLIDAY') {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 16.0),
        child: Text(
          todayData != null ? todayData['summary'] : 'No Classes Today', 
          style: TextStyle(color: Colors.grey.shade600)
        ),
      );
    }
    
    final sessions = todayData['sessions'] as List<dynamic>? ?? [];
    return Column(
      children: sessions.map((s) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(s['subject_name'], style: const TextStyle(fontWeight: FontWeight.w500)),
            Text(
              s['status'] == 'PRESENT' ? 'Present' : 'Absent',
              style: TextStyle(
                color: s['status'] == 'PRESENT' ? Colors.green : Colors.red,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      )).toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    
    final percentage = _statsData != null ? (_statsData!['percentage'] as num).toDouble() : 0.0;
    
    return RefreshIndicator(
      onRefresh: _fetchData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Greeting Header
            Text(
              _getGreeting(),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 4),
            Text(
              widget.profile['first_name'] ?? 'Student',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            if (widget.profile['roll_number'] != null)
               Text(
                'Roll Number: ${widget.profile['roll_number']} • ${widget.profile['department_name'] ?? ''}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade500),
              ),
            
            const SizedBox(height: 24),
            
            // Mark Attendance Button
            FilledButton.icon(
              onPressed: () async {
                if (!widget.isEnrolled) {
                  final result = await Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const StudentFaceEnrollment()),
                  );
                  if (result == true) {
                    context.read<AuthService>().fetchProfile();
                  }
                } else {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const StudentQrScanner()),
                  );
                }
              },
              icon: Icon(widget.isEnrolled ? Icons.qr_code_scanner : Icons.camera_front),
              label: Text(widget.isEnrolled ? 'Mark Attendance' : 'Enroll Identity Profile'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Theme.of(context).colorScheme.primary,
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Attendance Overview Card
            Card(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('ATTENDANCE OVERVIEW', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '$percentage%',
                          style: const TextStyle(fontSize: 42, fontWeight: FontWeight.bold, height: 1.0),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: _getHealthColor(percentage).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _getHealthText(percentage),
                            style: TextStyle(color: _getHealthColor(percentage), fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '${_statsData?['present_classes'] ?? 0} / ${_statsData?['total_classes'] ?? 0} classes attended',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Attendance Pulse
            const Text('ATTENDANCE PULSE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: _buildPulse(),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Today's Attendance
            const Text('TODAY\'S ATTENDANCE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: _buildToday(),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Subject Health
            const Text('SUBJECT HEALTH', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: ((_statsData?['subjects'] as List?) ?? []).map((s) {
                    final p = (s['percentage'] as num).toDouble();
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(child: Text(s['subject_name'])),
                          Text('${s['percentage']}%', style: const TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(width: 8),
                          Icon(
                            p >= 75 ? Icons.circle : (p >= 60 ? Icons.warning_rounded : Icons.cancel),
                            color: _getHealthColor(p),
                            size: 16,
                          )
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            OutlinedButton(
              onPressed: widget.onHistoryTap,
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('View Full History →'),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
