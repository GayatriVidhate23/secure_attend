# Geo-Fencing

Geo-fencing adds a physical location requirement to the attendance process, ensuring students are actually in the classroom or on campus when they mark their attendance.

## Configuration
When a faculty member starts an attendance session, the session captures the exact GPS coordinates (Latitude and Longitude) of the faculty's device or the classroom's fixed coordinates. A `radius` (in meters) is also configured for the session.

## Validation Process
1. When the student prepares to submit their attendance (after QR scan and Face Verification), the Flutter app retrieves their current high-accuracy GPS coordinates.
2. These coordinates are included in the final attendance payload.
3. The backend receives the payload and executes the **Haversine Formula**:
   - The Haversine formula calculates the great-circle distance between two points on a sphere given their longitudes and latitudes.
   - Distance = `haversine_distance(student_lat, student_lon, session_lat, session_lon)`.
4. If the calculated distance in meters is less than or equal to the session's configured radius, the location is verified.
5. If the distance exceeds the radius, the backend rejects the attendance attempt with a "Student is outside the allowed geo-fence" error.

## Anti-Spoofing Considerations
- The Flutter application requests High Accuracy location permissions.
- In future iterations, mock-location detection can be enabled on the mobile client to prevent GPS spoofing apps from bypassing the fence.
