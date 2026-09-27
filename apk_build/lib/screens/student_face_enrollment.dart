import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'dart:convert';
import '../core/api_client.dart';


class StudentFaceEnrollment extends StatefulWidget {
  const StudentFaceEnrollment({super.key});

  @override
  State<StudentFaceEnrollment> createState() => _StudentFaceEnrollmentState();
}

class _StudentFaceEnrollmentState extends State<StudentFaceEnrollment> {
  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  bool _isInitializing = true;
  bool _isProcessing = false;
  XFile? _capturedImage;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        if (mounted) setState(() => _isInitializing = false);
        return;
      }
      
      // Prefer front camera for face verification
      final frontCamera = _cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => _cameras.first
      );

      _controller = CameraController(
        frontCamera,
        ResolutionPreset.medium,
        enableAudio: false,
      );

      await _controller!.initialize();
    } catch (e) {
      // ignore
    } finally {
      if (mounted) setState(() => _isInitializing = false);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _captureFace() async {
    if (_controller == null || !_controller!.value.isInitialized) return;
    if (_controller!.value.isTakingPicture) return;

    try {
      final image = await _controller!.takePicture();
      setState(() => _capturedImage = image);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to capture image')),
      );
    }
  }

  Future<void> _submitVerification() async {
    if (_capturedImage == null) return;
    
    setState(() => _isProcessing = true);
    
    try {
      final response = await ApiClient.postMultipart(
        '/student/face-enrollment/enroll',
        fileField: 'file',
        filePath: _capturedImage!.path,
      );
      
      if (!mounted) return;

      if (response.statusCode == 200) {
                
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Face enrolled successfully!'), backgroundColor: Colors.green),
        );
        
        Navigator.pop(context, true);
      } else {
        String err = "Enrollment failed.";
        try { err = jsonDecode(response.body)['detail']; } catch (_) {}
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: Colors.red),
        );
      }

    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Connection error during verification.'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isInitializing) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_controller == null || !_controller!.value.isInitialized) {
      return Scaffold(
        appBar: AppBar(title: const Text('Face Enrollment')),
        body: const Center(child: Text('Camera unavailable. Check permissions.')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Face Enrollment')),
      backgroundColor: Colors.black,
      body: _capturedImage == null
          ? Stack(
              children: [
                Positioned.fill(child: CameraPreview(_controller!)),
                Align(
                  alignment: Alignment.bottomCenter,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 32.0),
                    child: FloatingActionButton(
                      onPressed: _captureFace,
                      child: const Icon(Icons.camera_alt, size: 32),
                    ),
                  ),
                ),
              ],
            )
          : Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle_outline, color: Colors.green, size: 64),
                const SizedBox(height: 24),
                const Text('Face Captured Successfully', style: TextStyle(color: Colors.white, fontSize: 18)),
                const SizedBox(height: 48),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    TextButton.icon(
                      onPressed: _isProcessing ? null : () => setState(() => _capturedImage = null),
                      icon: const Icon(Icons.refresh, color: Colors.white),
                      label: const Text('Retake', style: TextStyle(color: Colors.white)),
                    ),
                    FilledButton.icon(
                      onPressed: _isProcessing ? null : _submitVerification,
                      icon: _isProcessing 
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                          : const Icon(Icons.send),
                      label: const Text('Enroll Face'),
                    )
                  ],
                )
              ],
            ),
    );
  }
}
