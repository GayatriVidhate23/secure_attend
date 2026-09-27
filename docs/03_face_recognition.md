# Face Recognition & Verification

Facial recognition is the primary mechanism for proving identity in SecureAttend AI, ensuring that the student marking attendance is actually the student they claim to be.

## Technology Stack
- **Model**: InsightFace (`buffalo_sc` model).
- **Embeddings**: 512-dimensional floating-point vectors representing facial features.
- **Matching Metric**: Cosine Similarity.

## Enrollment Phase
1. An administrator or authorized faculty member uploads or captures a clear photo of the student.
2. The image is processed by the backend face service.
3. The AI model detects the face, aligns it, and extracts the 512-dimensional embedding.
4. The embedding is serialized as binary data and stored securely in the `face_templates` database table, linked to the student's ID.

## Verification Phase (During Attendance)
1. When a student scans a QR code, the Flutter app prompts them to take a live selfie.
2. The image is sent to the backend `/student/face-verification/verify` endpoint.
3. The backend extracts the embedding from the live image and retrieves the student's enrolled template from the database.
4. A cosine similarity comparison is performed. If the similarity score exceeds the configured threshold (e.g., `0.40`), verification succeeds.
5. **Face Proof Token**: Upon successful verification, the backend issues a short-lived (e.g., 2 minutes) "Face Proof Token". This token must be included in the final attendance payload to prove the face was just verified.
