from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Float, Text, Text, Integer, func, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from database import Base

class RoleName(str, enum.Enum):
    ADMIN = "ADMIN"
    FACULTY = "FACULTY"
    STUDENT = "STUDENT"
    PARENT = "PARENT"

class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[RoleName] = mapped_column(SQLEnum(RoleName), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(255))
    
    users: Mapped[List["User"]] = relationship(back_populates="role")
    permissions: Mapped[List["RolePermission"]] = relationship(back_populates="role")

class Permission(Base):
    __tablename__ = "permissions"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(100), unique=True, index=True) # e.g. "admin:students:manage"
    description: Mapped[Optional[str]] = mapped_column(String(255))
    
    role_mappings: Mapped[List["RolePermission"]] = relationship(back_populates="permission")

class RolePermission(Base):
    __tablename__ = "role_permissions"
    id: Mapped[int] = mapped_column(primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"))
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id", ondelete="CASCADE"))
    
    role: Mapped["Role"] = relationship(back_populates="permissions")
    permission: Mapped["Permission"] = relationship(back_populates="role_mappings")

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    
    role: Mapped["Role"] = relationship(back_populates="users")
    student_profile: Mapped[Optional["Student"]] = relationship(back_populates="user", uselist=False)
    faculty_profile: Mapped[Optional["Faculty"]] = relationship(back_populates="user", uselist=False)
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(back_populates="user")
    audit_logs: Mapped[List["AuditLog"]] = relationship(back_populates="user")

class Department(Base):
    __tablename__ = "departments"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    
    students: Mapped[List["Student"]] = relationship(back_populates="department")
    faculty: Mapped[List["Faculty"]] = relationship(back_populates="department")
    subjects: Mapped[List["Subject"]] = relationship(back_populates="department")

class AcademicYear(Base):
    __tablename__ = "academic_years"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(20), unique=True) # e.g. "2026-2027"
    start_date: Mapped[datetime] = mapped_column(DateTime)
    end_date: Mapped[datetime] = mapped_column(DateTime)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    
    semesters: Mapped[List["Semester"]] = relationship(back_populates="academic_year")

class Semester(Base):
    __tablename__ = "semesters"
    id: Mapped[int] = mapped_column(primary_key=True)
    academic_year_id: Mapped[int] = mapped_column(ForeignKey("academic_years.id"))
    name: Mapped[str] = mapped_column(String(50)) # e.g. "Fall 2026"
    number: Mapped[Optional[int]] = mapped_column(Integer) # e.g. 3, 4, 5
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    
    academic_year: Mapped["AcademicYear"] = relationship(back_populates="semesters")
    student_enrollments: Mapped[List["StudentEnrollment"]] = relationship(back_populates="semester")
    faculty_assignments: Mapped[List["FacultySubjectAssignment"]] = relationship(back_populates="semester")

class Division(Base):
    __tablename__ = "divisions"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(10)) # e.g. "A", "B"
    semester_id: Mapped[Optional[int]] = mapped_column(ForeignKey("semesters.id"))
    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("departments.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    semester: Mapped[Optional["Semester"]] = relationship()
    department: Mapped[Optional["Department"]] = relationship()
    enrollments: Mapped[List["StudentEnrollment"]] = relationship(back_populates="division")
    faculty_assignments: Mapped[List["FacultySubjectAssignment"]] = relationship(back_populates="division")

    __table_args__ = (
        UniqueConstraint('name', 'semester_id', 'department_id', name='uix_division_name_sem_dept'),
    )

class Subject(Base):
    __tablename__ = "subjects"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(150))
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    semester_id: Mapped[Optional[int]] = mapped_column(ForeignKey("semesters.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    subject_type: Mapped[Optional[str]] = mapped_column(String(50))
    
    semester: Mapped[Optional["Semester"]] = relationship()
    department: Mapped["Department"] = relationship(back_populates="subjects")
    faculty_assignments: Mapped[List["FacultySubjectAssignment"]] = relationship(back_populates="subject")

class Student(Base):
    __tablename__ = "students"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    roll_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("departments.id"))
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    blood_group: Mapped[Optional[str]] = mapped_column(String(10))
    address: Mapped[Optional[str]] = mapped_column(Text)
    profile_photo_url: Mapped[Optional[str]] = mapped_column(String(500))
    face_profile_active: Mapped[bool] = mapped_column(Boolean, default=False)
    
    user: Mapped["User"] = relationship(back_populates="student_profile")
    department: Mapped[Optional["Department"]] = relationship(back_populates="students")
    enrollments: Mapped[List["StudentEnrollment"]] = relationship(back_populates="student")
    attendance_records: Mapped[List["AttendanceRecord"]] = relationship(back_populates="student")

class Faculty(Base):
    __tablename__ = "faculty"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    employee_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("departments.id"))
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    blood_group: Mapped[Optional[str]] = mapped_column(String(10))
    address: Mapped[Optional[str]] = mapped_column(Text)
    profile_photo_url: Mapped[Optional[str]] = mapped_column(String(500))
    
    user: Mapped["User"] = relationship(back_populates="faculty_profile")
    department: Mapped[Optional["Department"]] = relationship(back_populates="faculty")
    subject_assignments: Mapped[List["FacultySubjectAssignment"]] = relationship(back_populates="faculty")

class FaceTemplate(Base):
    __tablename__ = "face_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.user_id", ondelete="CASCADE"), unique=True, index=True)
    embedding: Mapped[str] = mapped_column(Text) # JSON serialized float array
    embedding_dimension: Mapped[int] = mapped_column(Integer)
    model_name: Mapped[str] = mapped_column(String(50))
    enrolled_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    student: Mapped["Student"] = relationship(backref="face_template")

class StudentEnrollment(Base):
    __tablename__ = "student_enrollments"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.user_id", ondelete="CASCADE"))
    semester_id: Mapped[int] = mapped_column(ForeignKey("semesters.id"))
    division_id: Mapped[int] = mapped_column(ForeignKey("divisions.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    student: Mapped["Student"] = relationship(back_populates="enrollments")
    semester: Mapped["Semester"] = relationship(back_populates="student_enrollments")
    division: Mapped["Division"] = relationship(back_populates="enrollments")

class FacultySubjectAssignment(Base):
    __tablename__ = "faculty_subject_assignments"
    id: Mapped[int] = mapped_column(primary_key=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.user_id", ondelete="CASCADE"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    semester_id: Mapped[int] = mapped_column(ForeignKey("semesters.id"))
    division_id: Mapped[Optional[int]] = mapped_column(ForeignKey("divisions.id"))
    
    faculty: Mapped["Faculty"] = relationship(back_populates="subject_assignments")
    subject: Mapped["Subject"] = relationship(back_populates="faculty_assignments")
    semester: Mapped["Semester"] = relationship(back_populates="faculty_assignments")
    division: Mapped[Optional["Division"]] = relationship(back_populates="faculty_assignments")

    __table_args__ = (
        UniqueConstraint('faculty_id', 'subject_id', 'division_id', name='uix_faculty_subject_division'),
    )

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    family_id: Mapped[str] = mapped_column(String(50)) # For detecting token reuse
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    user: Mapped["User"] = relationship(back_populates="refresh_tokens")

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.user_id", ondelete="CASCADE"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    division_id: Mapped[int] = mapped_column(ForeignKey("divisions.id"))
    start_time: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    current_qr_token: Mapped[Optional[str]] = mapped_column(Text)
    qr_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    faculty: Mapped["Faculty"] = relationship(backref="attendance_sessions")
    subject: Mapped["Subject"] = relationship(backref="attendance_sessions")
    division: Mapped["Division"] = relationship(backref="attendance_sessions")
    records: Mapped[List["AttendanceRecord"]] = relationship(back_populates="session", cascade="all, delete-orphan")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    attendance_session_id: Mapped[int] = mapped_column(ForeignKey("attendance_sessions.id", ondelete="CASCADE"))
    student_id: Mapped[int] = mapped_column(ForeignKey("students.user_id", ondelete="CASCADE"))
    marked_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    status: Mapped[str] = mapped_column(String(50), default="PRESENT")

    session: Mapped["AttendanceSession"] = relationship(back_populates="records")
    student: Mapped["Student"] = relationship(back_populates="attendance_records")

    __table_args__ = (
        UniqueConstraint('attendance_session_id', 'student_id', name='uix_session_student_attendance'),
    )

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(100))
    target_resource: Mapped[Optional[str]] = mapped_column(String(255))
    target_id: Mapped[Optional[str]] = mapped_column(String(100))
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ip_address: Mapped[Optional[str]] = mapped_column(String(50))
    details: Mapped[Optional[str]] = mapped_column(Text)
    
    user: Mapped[Optional["User"]] = relationship(back_populates="audit_logs")

# --- DeptERP Expanded Models ---

class FacultyResponsibility(Base):
    __tablename__ = "faculty_responsibilities"
    id: Mapped[int] = mapped_column(primary_key=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.user_id", ondelete="CASCADE"), unique=True)
    is_hod: Mapped[bool] = mapped_column(Boolean, default=False)
    is_amc: Mapped[bool] = mapped_column(Boolean, default=False)
    is_gfm: Mapped[bool] = mapped_column(Boolean, default=False)
    
    faculty: Mapped["Faculty"] = relationship(backref="responsibilities")

class Parent(Base):
    __tablename__ = "parents"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    address: Mapped[Optional[str]] = mapped_column(Text)
    
    user: Mapped["User"] = relationship(backref="parent_profile")
    student_links: Mapped[List["ParentStudentLink"]] = relationship(back_populates="parent")

class ParentStudentLink(Base):
    __tablename__ = "parent_student_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    parent_id: Mapped[int] = mapped_column(ForeignKey("parents.user_id", ondelete="CASCADE"))
    student_id: Mapped[int] = mapped_column(ForeignKey("students.user_id", ondelete="CASCADE"))
    relation: Mapped[str] = mapped_column(String(50)) # e.g. "Father", "Mother", "Guardian"
    
    parent: Mapped["Parent"] = relationship(back_populates="student_links")
    student: Mapped["Student"] = relationship(backref="parent_links")

class GFMGroup(Base):
    __tablename__ = "gfm_groups"
    id: Mapped[int] = mapped_column(primary_key=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.user_id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    
    gfm: Mapped["Faculty"] = relationship(backref="gfm_groups")
    students: Mapped[List["GFMStudentMapping"]] = relationship(back_populates="group")

class GFMStudentMapping(Base):
    __tablename__ = "gfm_student_mappings"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("gfm_groups.id", ondelete="CASCADE"))
    student_id: Mapped[int] = mapped_column(ForeignKey("students.user_id", ondelete="CASCADE"), unique=True)
    
    group: Mapped["GFMGroup"] = relationship(back_populates="students")
    student: Mapped["Student"] = relationship(backref="gfm_mapping")

class InternalMark(Base):
    __tablename__ = "internal_marks"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.user_id", ondelete="CASCADE"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"))
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.user_id", ondelete="SET NULL"), nullable=True)
    marks_obtained: Mapped[float] = mapped_column(Float)
    total_marks: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(50), default="PENDING_APPROVAL") # PENDING_APPROVAL, APPROVED, REJECTED
    
    student: Mapped["Student"] = relationship(backref="internal_marks")
    subject: Mapped["Subject"] = relationship()
    faculty: Mapped["Faculty"] = relationship()

class OfficialResult(Base):
    __tablename__ = "official_results"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.user_id", ondelete="CASCADE"))
    semester_id: Mapped[int] = mapped_column(ForeignKey("semesters.id", ondelete="CASCADE"))
    sgpa: Mapped[Optional[float]] = mapped_column(Float)
    cgpa: Mapped[Optional[float]] = mapped_column(Float)
    percentage: Mapped[Optional[float]] = mapped_column(Float)
    has_backlog: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(50), default="PUBLISHED")
    
    student: Mapped["Student"] = relationship(backref="official_results")

class TimetableEntry(Base):
    __tablename__ = "timetable_entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"))
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.user_id", ondelete="CASCADE"))
    division_id: Mapped[int] = mapped_column(ForeignKey("divisions.id", ondelete="CASCADE"))
    day_of_week: Mapped[int] = mapped_column(Integer) # 0 = Monday, 6 = Sunday
    start_time: Mapped[str] = mapped_column(String(5)) # HH:MM
    end_time: Mapped[str] = mapped_column(String(5)) # HH:MM
    room: Mapped[Optional[str]] = mapped_column(String(50))
    
    subject: Mapped["Subject"] = relationship()
    faculty: Mapped["Faculty"] = relationship()
    division: Mapped["Division"] = relationship()

class SyllabusDocument(Base):
    __tablename__ = "syllabus_documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"))
    file_url: Mapped[str] = mapped_column(String(500))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    subject: Mapped["Subject"] = relationship(backref="syllabus")

class DepartmentDocument(Base):
    __tablename__ = "department_documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    file_url: Mapped[str] = mapped_column(String(500))
    document_type: Mapped[str] = mapped_column(String(50)) # e.g. "CIRCULAR", "POLICY"
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.user_id", ondelete="CASCADE"))
    start_date: Mapped[datetime] = mapped_column(DateTime)
    end_date: Mapped[datetime] = mapped_column(DateTime)
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="PENDING") # PENDING, APPROVED, REJECTED
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    faculty: Mapped["Faculty"] = relationship(backref="leave_requests")

class Achievement(Base):
    __tablename__ = "achievements"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.user_id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text)
    date_achieved: Mapped[Optional[datetime]] = mapped_column(DateTime)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=True) # Locks on submit
    
    student: Mapped["Student"] = relationship(backref="achievements")

class Notice(Base):
    __tablename__ = "notices"
    id: Mapped[int] = mapped_column(primary_key=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    target_audience: Mapped[str] = mapped_column(String(100)) # e.g. "ALL", "STUDENTS", "FACULTY", "SE", "PARENTS"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    sender: Mapped["User"] = relationship()

class CampusSettings(Base):
    __tablename__ = "campus_settings"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True) # Will strictly be 1 for singleton
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    radius_meters: Mapped[float] = mapped_column(Float, nullable=False, default=200.0)
    qr_duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    enforce_liveness: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
