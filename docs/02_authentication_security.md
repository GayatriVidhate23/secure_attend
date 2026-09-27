# Authentication & Security

Security is deeply integrated into every layer of SecureAttend AI to prevent spoofing, unauthorized access, and data manipulation.

## Role-Based Access Control (RBAC)

The system enforces strict role isolation:
- **Admin (`role_id: 1`)**: Has global access. Can create academic structures (semesters, divisions), assign faculty, bulk-enroll students, and view global statistics.
- **Faculty (`role_id: 2`)**: Scoped access. Can only view students within their assigned divisions, start attendance sessions for their subjects, and view reports scoped to their classes.
- **Student (`role_id: 3`)**: Limited access. Can only mark attendance during an active session using their own device and view their own attendance history.

## JWT Authentication

Authentication is handled via industry-standard JSON Web Tokens (JWT):
- **Access Tokens**: Short-lived tokens (e.g., 15 minutes) used for authenticating API requests.
- **Refresh Tokens**: Long-lived tokens (e.g., 7 days) stored securely on the device to obtain new Access Tokens without requiring the user to constantly log in.
- **Token Blacklisting/Invalidation**: On logout, tokens are invalidated to prevent reuse.

## Endpoint Protection

FastAPI's dependency injection system is heavily utilized to secure endpoints. Dependencies like `get_current_active_user` and `require_role([Roles.ADMIN, Roles.FACULTY])` ensure that only authorized roles can execute specific actions, returning `401 Unauthorized` or `403 Forbidden` automatically if constraints aren't met.
