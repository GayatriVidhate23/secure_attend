import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../core/api_client.dart';

class FacultySubjectsTab extends StatefulWidget {
  const FacultySubjectsTab({super.key});

  @override
  State<FacultySubjectsTab> createState() => _FacultySubjectsTabState();
}

class _FacultySubjectsTabState extends State<FacultySubjectsTab> {
  List<dynamic> _assignments = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchSubjects();
  }

  Future<void> _fetchSubjects() async {
    setState(() => _isLoading = true);
    final auth = context.read<AuthService>();
    final facultyId = auth.userProfile?['id'];
    
    if (facultyId == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }
    
    try {
      final response = await ApiClient.get('/faculty/$facultyId/subjects');
      if (response.statusCode == 200) {
        setState(() {
          _assignments = jsonDecode(response.body);
        });
      }
    } catch (e) {
      // ignore
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Subjects'),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchSubjects,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _assignments.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: const [
                      SizedBox(height: 100),
                      Center(
                        child: Text(
                          'No Subjects Assigned',
                          style: TextStyle(color: Colors.grey, fontSize: 16),
                        ),
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _assignments.length,
                    itemBuilder: (context, index) {
                      final assignment = _assignments[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          leading: CircleAvatar(
                            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                            child: const Icon(Icons.book),
                          ),
                          title: Text(
                            assignment['subject_name'] ?? 'Unknown Subject',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            'Code: ${assignment['subject_code']} \nDivision: ${assignment['division_name']}',
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
