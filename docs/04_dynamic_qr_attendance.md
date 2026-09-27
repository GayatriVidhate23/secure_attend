# Dynamic QR Code Attendance

To prevent students from taking photos of a static QR code and sending it to friends who are not in class, SecureAttend AI uses time-rotating, cryptographically signed Dynamic QR codes.

## QR Generation (Faculty)
1. A faculty member starts an attendance session via the dashboard.
2. The frontend constantly polls or calculates a new QR payload every `N` seconds (e.g., 15 seconds).
3. The payload contains:
   - `session_id`: The ID of the active attendance session.
   - `timestamp`: The exact UNIX timestamp the QR code was generated.
   - `signature`: An HMAC-SHA256 signature generated using a shared secret (`QR_HMAC_SECRET_KEY`), combining the session ID and timestamp.

## QR Scanning & Validation (Student)
1. The student scans the QR code using the Flutter app.
2. The app extracts the payload and sends it to the backend during the attendance submission.
3. The backend validates the payload by:
   - Re-calculating the HMAC signature using the same secret. If it doesn't match, the QR code was tampered with or generated using an invalid secret.
   - Checking the `timestamp`. If the time difference between the server's current time and the QR code's timestamp exceeds the `QR_CLOCK_SKEW_TOLERANCE_SECONDS` (e.g., 20 seconds), the QR code is considered expired and rejected.

This effectively neutralizes replay attacks, as a photo of the QR code becomes useless within seconds.
