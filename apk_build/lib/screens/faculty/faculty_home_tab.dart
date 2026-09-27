import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../core/api_client.dart';
import '../faculty_live_session.dart';

class FacultyHomeTab extends StatefulWidget {
  const FacultyHomeTab({super.key});

  @override
  State<FacultyHomeTab> createState() => _FacultyHomeTabState();
}

class _FacultyHomeTabState extends State<FacultyHomeTab> {
  List<dynamic> _activeSessions = [];
  bool _isLoadingSessions = true;

  @override
  void initState() {
    super.initState();
    _fetchActiveSessions();
  }

  Future<void> _fetchActiveSessions() async {
    setState(() => _isLoadingSessions = true);
    try {
      final response = await ApiClient.get('/admin/attendance-sessions/active');
      if (response.statusCode == 200) {
        setState(() {
          _activeSessions = jsonDecode(response.body);
        });
      }
    } catch (e) {
      // ignore
    } finally {
      if (mounted) setState(() => _isLoadingSessions = false);
    }
  }

  Future<void> _showStartSessionDialog() async {
    final auth = context.read<AuthService>();
    final facultyId = auth.userProfile?['id'];
    if (facultyId == null) return;

    List<dynamic> assignments = [];
    
    try {
      final res = await ApiClient.get('/faculty/$facultyId/subjects');
      if (res.statusCode == 200) {
        assignments = jsonDecode(res.body);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to load assignments.')));
      return;
    }

    if (!mounted) return;

    if (assignments.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No subjects assigned.')));
      return;
    }

    dynamic selectedAssignment;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text('Start Attendance Session', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<dynamic>(
                    decoration: const InputDecoration(labelText: 'Subject & Division', border: OutlineInputBorder()),
                    isExpanded: true,
                    items: assignments.map((a) => DropdownMenuItem<dynamic>(
                      value: a, 
                      child: Text('${a['subject_name']} - ${a['division_name']}'),
                    )).toList(),
                    onChanged: (v) => setDialogState(() => selectedAssignment = v),
                  ),
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                FilledButton(
                  onPressed: () async {
                    if (selectedAssignment == null) return;
                    
                    final response = await ApiClient.post('/admin/attendance-sessions', body: {
                      'faculty_id': facultyId,
                      'subject_id': selectedAssignment['subject_id'],
                      'division_id': selectedAssignment['division_id'],
                    });
                    
                    if (response.statusCode == 200) {
                      Navigator.pop(ctx);
                      _fetchActiveSessions();
                    } else if (response.statusCode == 409) {
                      Navigator.pop(ctx);
                      if (mounted) {
                        ScaffoldMessenger.of(this.context).showSnackBar(const SnackBar(content: Text('Active session already exists for this faculty.')));
                      }
                    } else {
                      Navigator.pop(ctx);
                      if (mounted) {
                        ScaffoldMessenger.of(this.context).showSnackBar(SnackBar(content: Text('Failed to start session: ${response.statusCode}')));
                      }
                    }
                  }, 
                  child: const Text('Start Session')
                ),
              ],
            );
          }
        );
      }
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final profile = auth.userProfile ?? {};

    return RefreshIndicator(
      onRefresh: _fetchActiveSessions,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Good Morning, Prof. ${profile["last_name"] ?? ""}'.trim(),
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Department of Engineering',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w500,
                  ),
            ),
            const SizedBox(height: 24),

            // Attendance Module Card (Main Focus)
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.secondary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.co_present_outlined,
                            color: Theme.of(context).colorScheme.secondary,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Attendance',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _showStartSessionDialog,
                        icon: const Icon(Icons.add_circle_outline),
                        label: const Text('Start New Session'),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: Theme.of(context).colorScheme.secondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            Text(
              'Active Sessions',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
            ),
            const SizedBox(height: 16),
            
            if (_isLoadingSessions)
              const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
            else if (_activeSessions.isEmpty)
              Card(
                margin: EdgeInsets.zero,
                child: const Padding(
                  padding: EdgeInsets.all(32.0),
                  child: Center(
                    child: Text(
                      'No active sessions found.',
                      style: TextStyle(color: Colors.grey),
                    ),
                  ),
                ),
              )
            else
              ..._activeSessions.map((session) => Card(
                margin: const EdgeInsets.only(bottom: 12),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  side: BorderSide(color: Theme.of(context).colorScheme.secondary.withValues(alpha: 0.3), width: 1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.secondary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(Icons.qr_code, color: Theme.of(context).colorScheme.secondary),
                  ),
                  title: Text(session['subject_name'] ?? 'Unknown Subject', style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text('${session['division_name'] ?? 'Unknown Div'} • Started at ${DateTime.parse(session['start_time']).toLocal().toString().split('.')[0]}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => FacultyLiveSession(sessionId: session['id']),
                      ),
                    ).then((_) => _fetchActiveSessions());
                  },
                ),
              )),
          ],
        ),
      ),
    );
  }
}
