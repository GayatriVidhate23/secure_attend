import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../core/api_client.dart';

class FacultyLiveSession extends StatefulWidget {
  final int sessionId;

  const FacultyLiveSession({super.key, required this.sessionId});

  @override
  State<FacultyLiveSession> createState() => _FacultyLiveSessionState();
}

class _FacultyLiveSessionState extends State<FacultyLiveSession> {
  String? _qrToken;
  int _countdown = 60;
  int _maxCountdown = 60;
  int _presentCount = 0;
  List<dynamic> _students = [];
  Timer? _fetchTimer;
  Timer? _countdownTimer;
  Timer? _attendanceTimer;
  bool _isEnding = false;

  @override
  void initState() {
    super.initState();
    _fetchQrToken();
    _fetchAttendance();
    _attendanceTimer = Timer.periodic(
      const Duration(seconds: 5),
      (_) => _fetchAttendance(),
    );
  }

  @override
  void dispose() {
    _fetchTimer?.cancel();
    _countdownTimer?.cancel();
    _attendanceTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchQrToken() async {
    try {
      final response = await ApiClient.get(
        '/admin/attendance-sessions/${widget.sessionId}/qr',
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _qrToken = data['qr_token'];
            _countdown = (data['expires_in'] as num?)?.toInt() ?? 60;
            _maxCountdown = (data['expires_in'] as num?)?.toInt() ?? 60;
            _presentCount =
                (data['present_count'] as num?)?.toInt() ??
                _presentCount; // Mock update if available
          });
          _startCountdown();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: ${response.statusCode}')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _fetchAttendance() async {
    try {
      final response = await ApiClient.get(
        '/admin/attendance-sessions/${widget.sessionId}/attendance',
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _students = data['records'] ?? [];
            _presentCount = data['total_present'] ?? 0;
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    _attendanceTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          if (_countdown > 0) {
            _countdown--;
          } else {
            _countdownTimer?.cancel();
            _attendanceTimer?.cancel();
            _fetchQrToken();
            _fetchAttendance();
            _attendanceTimer = Timer.periodic(
              const Duration(seconds: 5),
              (_) => _fetchAttendance(),
            );
          }
        });
      }
    });
  }

  Future<void> _endSession() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'End Session?',
          style: TextStyle(
            color: Theme.of(context).colorScheme.primary,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: const Text(
          'Are you sure you want to end this attendance session? The QR code will be invalidated immediately.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('End Session'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isEnding = true);
      try {
        await ApiClient.post('/admin/attendance-sessions/${widget.sessionId}/end');
        if (mounted) Navigator.pop(context);
      } catch (e) {
        if (mounted) setState(() => _isEnding = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text(
          'Attendance Session',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        elevation: 0,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(24.0),
              color: Theme.of(context).colorScheme.primary,
              width: double.infinity,
              child: Column(
                children: [
                  const Text(
                    'Live Session Active',
                    style: TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Session ID: ${widget.sessionId}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '$_presentCount Present',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    const SizedBox(height: 16),
                    _qrToken == null
                        ? const CircularProgressIndicator()
                        : Card(
                            elevation: 4,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(24),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(24.0),
                              child: QrImageView(
                                data: _qrToken!,
                                version: QrVersions.auto,
                                size: 280.0,
                                backgroundColor: Colors.white,
                              ),
                            ),
                          ),
                    const SizedBox(height: 24),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32.0),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'QR expires in:',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                '00:${_countdown.toString().padLeft(2, '0')}',
                                style: TextStyle(
                                  color: _countdown <= 10
                                      ? Theme.of(context).colorScheme.error
                                      : Theme.of(context).colorScheme.primary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 24,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          LinearProgressIndicator(
                            value: _maxCountdown > 0
                                ? (_countdown / _maxCountdown)
                                : 0,
                            backgroundColor: Colors.grey[300],
                            color: _countdown <= 10
                                ? Theme.of(context).colorScheme.error
                                : Theme.of(context).colorScheme.secondary,
                            minHeight: 8,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Divider(),
                    const Padding(
                      padding: EdgeInsets.all(16.0),
                      child: Text(
                        'Present Students',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    _students.isEmpty
                        ? const Padding(
                            padding: EdgeInsets.all(16.0),
                            child: Text(
                              'No students have marked attendance yet.',
                              style: TextStyle(color: Colors.grey),
                            ),
                          )
                        : ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _students.length,
                            itemBuilder: (ctx, index) {
                              final student = _students[index];
                              return ListTile(
                                leading: const CircleAvatar(
                                  child: Icon(Icons.check, color: Colors.green),
                                ),
                                title: Text(
                                  '${student['first_name']} ${student['last_name']}',
                                ),
                                subtitle: Text(
                                  'Roll: ${student['roll_number']}',
                                ),
                                trailing: Text(
                                  student['marked_at'] != null
                                      ? DateTime.parse(student['marked_at'])
                                            .toLocal()
                                            .toString()
                                            .split('.')[0]
                                            .split(' ')[1]
                                      : '',
                                  style: const TextStyle(color: Colors.grey),
                                ),
                              );
                            },
                          ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.error,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: _isEnding ? null : _endSession,
                  icon: _isEnding
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Icon(Icons.stop_circle_outlined, size: 28),
                  label: const Text(
                    'End Session',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
