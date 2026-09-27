import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../core/api_client.dart';
import 'faculty_student_details.dart';

class FacultyStudentsTab extends StatefulWidget {
  const FacultyStudentsTab({super.key});

  @override
  State<FacultyStudentsTab> createState() => _FacultyStudentsTabState();
}

class _FacultyStudentsTabState extends State<FacultyStudentsTab> {
  List<dynamic> _availableDivisions = [];
  dynamic _selectedDivision;
  List<dynamic> _students = [];
  bool _isLoadingStudents = false;
  bool _isLoadingDivisions = true;

  @override
  void initState() {
    super.initState();
    _fetchAssignmentsAndExtractDivisions();
  }

  Future<void> _fetchAssignmentsAndExtractDivisions() async {
    setState(() => _isLoadingDivisions = true);
    final auth = context.read<AuthService>();
    final facultyId = auth.userProfile?['id'];
    
    if (facultyId == null) {
      if (mounted) setState(() => _isLoadingDivisions = false);
      return;
    }
    
    try {
      final response = await ApiClient.get('/faculty/$facultyId/subjects');
      if (response.statusCode == 200) {
        final assignments = jsonDecode(response.body) as List<dynamic>;
        
        // Extract unique divisions
        final Map<String, dynamic> uniqueDivisions = {};
        for (var a in assignments) {
          final semId = a['semester_id'];
          final divId = a['division_id'];
          final divName = a['division_name'];
          final key = '${semId}_${divId}';
          
          if (!uniqueDivisions.containsKey(key)) {
            uniqueDivisions[key] = {
              'semester_id': semId,
              'division_id': divId,
              'division_name': divName,
              // We infer the year name strictly for display grouping purposes if we want, 
              // but we rely on semester_id and division_id for API calls.
              'display_name': 'Semester $semId - $divName',
            };
          }
        }
        
        setState(() {
          _availableDivisions = uniqueDivisions.values.toList();
        });
      }
    } catch (e) {
      // ignore
    } finally {
      if (mounted) setState(() => _isLoadingDivisions = false);
    }
  }

  Future<void> _fetchStudents() async {
    if (_selectedDivision == null) return;
    
    setState(() => _isLoadingStudents = true);
    try {
      final semId = _selectedDivision['semester_id'];
      final divId = _selectedDivision['division_id'];
      final response = await ApiClient.get('/students/?semester_id=$semId&division_id=$divId');
      if (response.statusCode == 200) {
        setState(() {
          _students = jsonDecode(response.body);
        });
      } else {
        setState(() => _students = []);
      }
    } catch (e) {
      setState(() => _students = []);
    } finally {
      if (mounted) setState(() => _isLoadingStudents = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Students'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: _isLoadingDivisions
                ? const LinearProgressIndicator()
                : DropdownButtonFormField<dynamic>(
                    decoration: const InputDecoration(
                      labelText: 'Select Division',
                      border: OutlineInputBorder(),
                    ),
                    value: _selectedDivision,
                    items: _availableDivisions.map((d) => DropdownMenuItem<dynamic>(
                      value: d,
                      child: Text(d['display_name']),
                    )).toList(),
                    onChanged: (v) {
                      setState(() {
                        _selectedDivision = v;
                      });
                      _fetchStudents();
                    },
                  ),
          ),
          const Divider(),
          Expanded(
            child: _isLoadingStudents
                ? const Center(child: CircularProgressIndicator())
                : _selectedDivision == null
                    ? const Center(child: Text('Please select a division to view students.', style: TextStyle(color: Colors.grey)))
                    : _students.isEmpty
                        ? const Center(child: Text('No Students Found.', style: TextStyle(color: Colors.grey)))
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _students.length,
                            itemBuilder: (context, index) {
                              final student = _students[index];
                              return Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor: Theme.of(context).colorScheme.secondary.withValues(alpha: 0.1),
                                    child: Text(student['first_name']?[0] ?? '?'),
                                  ),
                                  title: Text('${student['first_name']} ${student['last_name']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                  subtitle: Text('Roll: ${student['roll_number']}'),
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => FacultyStudentDetailsScreen(student: student),
                                      ),
                                    );
                                  },
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
