import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/api_client.dart';

class FacultyStudentDetailsScreen extends StatefulWidget {
  final dynamic student;
  
  const FacultyStudentDetailsScreen({super.key, required this.student});

  @override
  State<FacultyStudentDetailsScreen> createState() => _FacultyStudentDetailsScreenState();
}

class _FacultyStudentDetailsScreenState extends State<FacultyStudentDetailsScreen> {
  bool _isLoadingFace = true;
  bool _isFaceEnrolled = false;
  String? _enrolledAt;

  @override
  void initState() {
    super.initState();
    _fetchFaceStatus();
  }

  Future<void> _fetchFaceStatus() async {
    final studentId = widget.student['user_id'];
    try {
      final response = await ApiClient.get('/students/$studentId/face-enrollment/status');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _isFaceEnrolled = data['face_enrolled'] ?? false;
          _enrolledAt = data['enrolled_at'];
        });
      } else {
        setState(() {
          _isFaceEnrolled = false;
        });
      }
    } catch (e) {
      setState(() {
        _isFaceEnrolled = false;
      });
    } finally {
      if (mounted) setState(() => _isLoadingFace = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.student;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Details'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            CircleAvatar(
              radius: 50,
              backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              child: Text(
                s['first_name']?[0] ?? '?',
                style: const TextStyle(fontSize: 40),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '${s['first_name']} ${s['last_name']}',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              s['email'] ?? 'No email',
              style: const TextStyle(color: Colors.grey, fontSize: 16),
            ),
            const SizedBox(height: 24),
            
            _buildInfoCard(context, [
              _buildInfoRow('Roll Number', s['roll_number']),
              const Divider(),
              _buildInfoRow('Department ID', s['department_id']?.toString() ?? 'N/A'),
            ]),
            
            const SizedBox(height: 16),
            
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                side: BorderSide(color: Colors.grey.shade200),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Security Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 16),
                    _isLoadingFace
                        ? const Center(child: CircularProgressIndicator())
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Face Enrollment', style: TextStyle(fontSize: 16)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: _isFaceEnrolled ? Colors.green.shade50 : Colors.red.shade50,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: _isFaceEnrolled ? Colors.green.shade200 : Colors.red.shade200),
                                ),
                                child: Text(
                                  _isFaceEnrolled ? 'Enrolled' : 'Not Enrolled',
                                  style: TextStyle(
                                    color: _isFaceEnrolled ? Colors.green.shade700 : Colors.red.shade700,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                    if (_isFaceEnrolled && _enrolledAt != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8.0),
                        child: Text(
                          'Enrolled At: ${DateTime.parse(_enrolledAt!).toLocal().toString().split('.')[0]}',
                          style: const TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(BuildContext context, List<Widget> children) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: Colors.grey.shade200),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: children,
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 16)),
          Text(value?.toString() ?? 'N/A', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        ],
      ),
    );
  }
}
