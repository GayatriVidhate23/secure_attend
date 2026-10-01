import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../core/api_client.dart';
import '../faculty_live_session.dart';
import 'package:intl/intl.dart';

class FacultyHomeTab extends StatefulWidget {
  const FacultyHomeTab({super.key});

  @override
  State<FacultyHomeTab> createState() => _FacultyHomeTabState();
}

class _FacultyHomeTabState extends State<FacultyHomeTab> {
  List<dynamic> _activeSessions = [];
  List<dynamic> _todayClasses = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final sessionsRes = await ApiClient.get('/admin/attendance-sessions/active');
      final timetableRes = await ApiClient.get('/timetable/today');
      
      if (sessionsRes.statusCode == 200) {
        _activeSessions = jsonDecode(sessionsRes.body);
      }
      if (timetableRes.statusCode == 200) {
        _todayClasses = jsonDecode(timetableRes.body);
      }
    } catch (e) {
      // ignore
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  bool _isSessionActive(dynamic entry) {
    return _activeSessions.any((s) => s['subject_id'] == entry['subject_id'] && s['division_id'] == entry['division_id']);
  }

  String _getClassStatus(dynamic entry) {
    final now = DateTime.now();
    final currentMins = now.hour * 60 + now.minute;
    
    final startParts = entry['start_time'].split(':');
    final endParts = entry['end_time'].split(':');
    
    final startMins = int.parse(startParts[0]) * 60 + int.parse(startParts[1]);
    final endMins = int.parse(endParts[0]) * 60 + int.parse(endParts[1]);
    
    if (currentMins < startMins - 30) return 'upcoming';
    if (currentMins >= startMins - 30 && currentMins <= endMins) return 'active';
    return 'completed';
  }

  Future<void> _startSession(dynamic entry) async {
    final auth = context.read<AuthService>();
    final facultyId = auth.userProfile?['id'];
    if (facultyId == null) return;
    
    try {
      final response = await ApiClient.post('/admin/attendance-sessions', body: {
        'faculty_id': facultyId,
        'subject_id': entry['subject_id'],
        'division_id': entry['division_id'],
      });
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => FacultyLiveSession(sessionId: data['id']),
            ),
          ).then((_) => _fetchData());
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: ${response.body}')));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to start session.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final todayStr = DateFormat('EEEE, MMM d').format(DateTime.now());

    return RefreshIndicator(
      onRefresh: _fetchData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Today's Classes",
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.primary),
              ),
              Text(todayStr, style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey)),
              const SizedBox(height: 16),
              
              if (_isLoading)
                const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
              else if (_todayClasses.isEmpty)
                Card(
                  margin: EdgeInsets.zero,
                  child: const Padding(
                    padding: EdgeInsets.all(32.0),
                    child: Center(
                      child: Text('No classes scheduled for today.', style: TextStyle(color: Colors.grey)),
                    ),
                  ),
                )
              else
                ..._todayClasses.map((entry) {
                  final status = _getClassStatus(entry);
                  final hasActiveSession = _isSessionActive(entry);
                  
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      side: BorderSide(
                        color: status == 'active' ? Colors.green.withValues(alpha: 0.5) : theme.colorScheme.outline.withValues(alpha: 0.3), 
                        width: status == 'active' ? 2 : 1
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('${entry['start_time']} - ${entry['end_time']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: status == 'active' ? Colors.green.withValues(alpha: 0.1) : Colors.grey.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  status.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 10, 
                                    fontWeight: FontWeight.bold,
                                    color: status == 'active' ? Colors.green : Colors.grey,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(entry['subject_name'] ?? '', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text('Division: ${entry['division_name']} | Room: ${entry['room'] ?? 'TBA'}', style: theme.textTheme.bodyMedium),
                          const SizedBox(height: 12),
                          if (status == 'active')
                            hasActiveSession
                              ? SizedBox(
                                  width: double.infinity,
                                  child: OutlinedButton.icon(
                                    onPressed: () {
                                      final session = _activeSessions.firstWhere((s) => s['subject_id'] == entry['subject_id'] && s['division_id'] == entry['division_id']);
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => FacultyLiveSession(sessionId: session['id']),
                                        ),
                                      ).then((_) => _fetchData());
                                    },
                                    icon: const Icon(Icons.visibility),
                                    label: const Text('View Active Session'),
                                  ),
                                )
                              : SizedBox(
                                  width: double.infinity,
                                  child: FilledButton.icon(
                                    onPressed: () => _startSession(entry),
                                    icon: const Icon(Icons.play_arrow),
                                    label: const Text('Start Attendance'),
                                  ),
                                ),
                        ],
                      ),
                    ),
                  );
                }),
                
              const SizedBox(height: 32),
              Text(
                'Active Sessions',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.primary),
              ),
              const SizedBox(height: 16),
              
              if (!_isLoading && _activeSessions.isEmpty)
                Card(
                  margin: EdgeInsets.zero,
                  child: const Padding(
                    padding: EdgeInsets.all(32.0),
                    child: Center(
                      child: Text('No active sessions found.', style: TextStyle(color: Colors.grey)),
                    ),
                  ),
                )
              else if (!_isLoading)
                ..._activeSessions.map((session) => Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    side: BorderSide(color: theme.colorScheme.secondary.withValues(alpha: 0.3), width: 1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.secondary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(Icons.qr_code, color: theme.colorScheme.secondary),
                    ),
                    title: Text(session['subject_name'] ?? 'Unknown Subject', style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('${session['division_name'] ?? 'Unknown Div'} \u2022 Started at ${DateTime.parse(session['start_time']).toLocal().toString().split('.')[0]}'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => FacultyLiveSession(sessionId: session['id']),
                        ),
                      ).then((_) => _fetchData());
                    },
                  ),
                )),
            ],
          ),
        ),
      ),
    );
  }
}
