import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:geolocator/geolocator.dart';
import 'student_face_verification.dart';

class StudentQrScanner extends StatefulWidget {
  const StudentQrScanner({super.key});

  @override
  State<StudentQrScanner> createState() => _StudentQrScannerState();
}

class _StudentQrScannerState extends State<StudentQrScanner> {
  final MobileScannerController _scannerController = MobileScannerController(
    formats: const [BarcodeFormat.qrCode],
  );
  bool _isProcessing = false;
  String _statusMessage = 'Point camera at the session QR code';

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _handleQrDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty || barcodes.first.rawValue == null) return;
    
    final qrData = barcodes.first.rawValue!;
    setState(() {
      _isProcessing = true;
      _statusMessage = 'Fetching location...';
    });
    
    _scannerController.stop();

    try {
      Position position = await _determinePosition();
      
      if (position.isMocked) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('Mock location detected. Attendance rejected.'), backgroundColor: Theme.of(context).colorScheme.error),
        );
        setState(() {
          _isProcessing = false;
          _statusMessage = 'Location rejected. Try again.';
        });
        _scannerController.start();
        return;
      }
      
      if (!mounted) return;
      
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => StudentFaceVerification(
            qrToken: qrData,
            latitude: position.latitude,
            longitude: position.longitude,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Theme.of(context).colorScheme.error),
      );
      setState(() {
        _isProcessing = false;
        _statusMessage = 'Location failed. Scan again.';
      });
      _scannerController.start();
    }
  }

  Future<Position> _determinePosition() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return Future.error('Location services are disabled.');
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return Future.error('Location permissions are denied');
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      return Future.error('Location permissions are permanently denied, we cannot request permissions.');
    } 

    return await Geolocator.getCurrentPosition(
      
      timeLimit: const Duration(seconds: 15)
    );
  }

  Widget _buildStepper() {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildStep(1, 'Session', true),
          _buildLine(false),
          _buildStep(2, 'Identity', false),
          _buildLine(false),
          _buildStep(3, 'Done', false),
        ],
      ),
    );
  }

  Widget _buildStep(int step, String label, bool isActive, {bool isCompleted = false}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isActive ? Theme.of(context).colorScheme.primary : Colors.grey.shade300,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: isCompleted 
                ? const Icon(Icons.check, color: Colors.white, size: 18)
                : Text(
                    '$step',
                    style: TextStyle(
                      color: isActive ? Colors.white : Colors.grey.shade600,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isActive ? Theme.of(context).colorScheme.primary : Colors.grey.shade600,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildLine(bool isActive) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8).copyWith(bottom: 16),
      width: 40,
      height: 2,
      color: isActive ? Theme.of(context).colorScheme.primary : Colors.grey.shade300,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Attendance QR', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          _buildStepper(),
          Expanded(
            child: Stack(
              children: [
                MobileScanner(
                  controller: _scannerController,
                  onDetect: _handleQrDetect,
                ),
                SafeArea(
                  child: Align(
                    alignment: Alignment.bottomCenter,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 32),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.85),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: _isProcessing 
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                              const SizedBox(width: 12),
                              Text(_statusMessage, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))
                            ]
                          )
                        : Text(
                            _statusMessage,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                    ),
                  ),
                ),
                // Center reticle
                Center(
                  child: Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 3),
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                )
              ],
            ),
          ),
        ],
      ),
    );
  }
}
