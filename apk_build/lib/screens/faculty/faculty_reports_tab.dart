import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/api_client.dart';

class FacultyReportsTab extends StatefulWidget {
  const FacultyReportsTab({super.key});

  @override
  State<FacultyReportsTab> createState() => _FacultyReportsTabState();
}

class _FacultyReportsTabState extends State<FacultyReportsTab> {
  bool _isLoading = true;
  Map<String, dynamic>? _reportData;

  @override
  void initState() {
    super.initState();
    _fetchReports();
  }

  Future<void> _fetchReports() async {
    try {
      final response = await ApiClient.get('/reports/faculty/my-classes');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _reportData = data;
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load reports: $e')),
        );
      }
    }
  }

  String _formatDivisionLabel(String semester, String division) {
    return division;
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_reportData == null) {
      return const Center(child: Text('No report data available.'));
    }

    final classes = _reportData!['classes'] as List<dynamic>? ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance Reports'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              color: Theme.of(context).colorScheme.primaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    const Text('Overall Attendance', style: TextStyle(fontSize: 16)),
                    const SizedBox(height: 8),
                    Text(
                      '${_reportData!['overall_percentage']}%',
                      style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text('${_reportData!['total_sessions_conducted']} Sessions Conducted'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Class-wise Breakdown',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (classes.isEmpty)
               const Text('No classes found.'),
            ...classes.map((cls) {
              final divLabel = _formatDivisionLabel(cls['semester'], cls['division']);
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  title: Text(cls['subject_name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text('$divLabel • ${cls['sessions_conducted']} Sessions'),
                  trailing: Text(
                    '${cls['percentage']}%',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: (cls['percentage'] as num) >= 75 ? Colors.green : Colors.red,
                    ),
                  ),
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }
}
