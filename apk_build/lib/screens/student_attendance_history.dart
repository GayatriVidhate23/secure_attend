import 'dart:convert';
import 'package:flutter/material.dart';
import '../core/api_client.dart';

class StudentAttendanceHistoryScreen extends StatefulWidget {
  const StudentAttendanceHistoryScreen({super.key});

  @override
  State<StudentAttendanceHistoryScreen> createState() => _StudentAttendanceHistoryScreenState();
}

class _StudentAttendanceHistoryScreenState extends State<StudentAttendanceHistoryScreen> {
  DateTime _currentMonth = DateTime(DateTime.now().year, DateTime.now().month, 1);
  final DateTime _minMonth = DateTime(2026, 7, 1);
  bool _isLoading = true;
  List<dynamic>? _historyData;

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() => _isLoading = true);
    try {
      final start = DateTime(_currentMonth.year, _currentMonth.month, 1).toIso8601String().split('T')[0];
      // Get last day of the month
      final nextMonth = DateTime(_currentMonth.year, _currentMonth.month + 1, 1);
      final end = nextMonth.subtract(const Duration(days: 1)).toIso8601String().split('T')[0];
      
      final response = await ApiClient.get('/reports/student/attendance-history?start_date=$start&end_date=$end');
      
      if (mounted) {
        if (response.statusCode == 200) {
          setState(() {
            var decoded = jsonDecode(response.body);
            if (decoded is List) {
              _historyData = decoded;
            } else {
              _historyData = [];
            }
            _isLoading = false;
          });
        } else {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to load history: Server error ${response.statusCode}')));
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to load history: $e')));
      }
    }
  }

  void _previousMonth() {
    if (_currentMonth.isAfter(_minMonth)) {
      setState(() {
        _currentMonth = DateTime(_currentMonth.year, _currentMonth.month - 1, 1);
      });
      _fetchHistory();
    }
  }

  void _nextMonth() {
    final now = DateTime.now();
    final currentMax = DateTime(now.year, now.month, 1);
    if (_currentMonth.isBefore(currentMax)) {
      setState(() {
        _currentMonth = DateTime(_currentMonth.year, _currentMonth.month + 1, 1);
      });
      _fetchHistory();
    }
  }

  String _getMonthName(int month) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PRESENT': return Colors.green;
      case 'ABSENT': return Colors.red;
      case 'PARTIAL': return Colors.orange;
      case 'HOLIDAY': return Colors.brown;
      case 'NO_CLASS': default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final currentMax = DateTime(now.year, now.month, 1);
    final canGoForward = _currentMonth.isBefore(currentMax);
    final canGoBack = _currentMonth.isAfter(_minMonth);

    return Scaffold(
      appBar: AppBar(title: const Text('Full History')),
      body: Column(
        children: [
          // Month Navigator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: canGoBack ? _previousMonth : null,
                ),
                Text(
                  '${_getMonthName(_currentMonth.month)} ${_currentMonth.year}',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: canGoForward ? _nextMonth : null,
                ),
              ],
            ),
          ),
          
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : (_historyData == null || _historyData!.isEmpty)
                    ? const Center(child: Text('No attendance records for this month.'))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16.0),
                        itemCount: _historyData!.length,
                        itemBuilder: (context, index) {
                          final item = _historyData![index];
                          final dateStr = item['date'] as String;
                          final dateObj = DateTime.parse(dateStr);
                          
                          // Convert 2026-09-15 to "15 Sep"
                          final dayStr = '${dateObj.day} ${_getMonthName(dateObj.month).substring(0, 3)}';
                          final isToday = dateStr == now.toIso8601String().split('T')[0];
                          
                          final status = item['status'] as String;
                          final sessions = item['sessions'] as List<dynamic>? ?? [];
                          final summary = item['summary'] as String;

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 24.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      '$dayStr${isToday ? ' · Today' : ''}',
                                      style: TextStyle(
                                        fontSize: 16, 
                                        fontWeight: FontWeight.bold,
                                        color: isToday ? Theme.of(context).colorScheme.primary : null,
                                      ),
                                    ),
                                    const Spacer(),
                                    if (status == 'HOLIDAY')
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(color: Colors.brown.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                                        child: const Text('Holiday', style: TextStyle(color: Colors.brown, fontSize: 12, fontWeight: FontWeight.bold)),
                                      )
                                  ],
                                ),
                                const Divider(),
                                if (status == 'HOLIDAY' || status == 'NO_CLASS')
                                  Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                                    child: Row(
                                      children: [
                                        Icon(
                                          status == 'HOLIDAY' ? Icons.beach_access : Icons.weekend,
                                          color: _getStatusColor(status),
                                        ),
                                        const SizedBox(width: 12),
                                        Text(summary, style: TextStyle(color: Colors.grey.shade600)),
                                      ],
                                    ),
                                  )
                                else if (sessions.isNotEmpty)
                                  ...sessions.map((s) => Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 6.0),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Padding(
                                          padding: const EdgeInsets.only(top: 2.0),
                                          child: Icon(
                                            s['status'] == 'PRESENT' ? Icons.check_circle : Icons.cancel,
                                            color: s['status'] == 'PRESENT' ? Colors.green : Colors.red,
                                            size: 20,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(s['subject_name'], style: const TextStyle(fontWeight: FontWeight.w500)),
                                              Text(
                                                s['status'] == 'PRESENT' ? 'Present' : 'Absent',
                                                style: TextStyle(
                                                  color: Colors.grey.shade600,
                                                  fontSize: 12,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  )).toList(),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
