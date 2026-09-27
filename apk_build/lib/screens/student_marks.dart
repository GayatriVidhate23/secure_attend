import 'package:flutter/material.dart';
import 'dart:convert';
import '../core/api_client.dart';

class StudentMarksScreen extends StatefulWidget {
  const StudentMarksScreen({super.key});

  @override
  State<StudentMarksScreen> createState() => _StudentMarksScreenState();
}

class _StudentMarksScreenState extends State<StudentMarksScreen> {
  List<dynamic> _marks = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchMarks();
  }

  Future<void> _fetchMarks() async {
    try {
      final response = await ApiClient.get('/api/v1/erp/marks/student');
      if (response.statusCode == 200) {
        setState(() {
          _marks = json.decode(response.body);
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load marks: ${response.statusCode}';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Results'),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _isLoading = true;
                  _error = null;
                });
                _fetchMarks();
              },
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }
    if (_marks.isEmpty) {
      return const Center(child: Text('No marks found.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _marks.length,
      itemBuilder: (context, index) {
        final mark = _marks[index];
        final obtained = mark['marks_obtained'] ?? 0;
        final total = mark['total_marks'] ?? 100;
        final percentage = (total > 0) ? (obtained / total) * 100 : 0.0;
        
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: percentage >= 40 
                  ? Colors.green.withValues(alpha: 0.2) 
                  : Colors.red.withValues(alpha: 0.2),
              foregroundColor: percentage >= 40 ? Colors.green : Colors.red,
              child: const Icon(Icons.assessment),
            ),
            title: Text('Subject ID: ${mark['subject_id']}'),
            subtitle: Text('Score: $obtained / $total'),
            trailing: Text(
              '${percentage.toStringAsFixed(1)}%',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: percentage >= 40 ? Colors.green : Colors.red,
              ),
            ),
          ),
        );
      },
    );
  }
}
