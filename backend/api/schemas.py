from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class UserProfile(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_active: bool
    
    model_config = {"from_attributes": True}

class AuditLogResponse(BaseModel):
    id: int
    action: str
    timestamp: datetime
    
    model_config = {"from_attributes": True}

class DivisionResponse(BaseModel):
    id: int
    name: str
    semester_id: Optional[int] = None
    department_id: Optional[int] = None
    is_active: bool = True

    model_config = {"from_attributes": True}

class AttendanceSessionCreate(BaseModel):
    faculty_id: int
    subject_id: int
    division_id: int

class AttendanceSessionResponse(BaseModel):
    id: int
    faculty_id: int
    subject_id: int
    division_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    is_active: bool
    subject_name: Optional[str] = None
    division_name: Optional[str] = None

    model_config = {"from_attributes": True}

class LiveAttendanceStudent(BaseModel):
    student_id: int
    first_name: str
    last_name: str
    roll_number: str
    marked_at: datetime
    status: str

class LiveAttendanceResponse(BaseModel):
    session_id: int
    total_present: int
    records: List[LiveAttendanceStudent]

class AttendanceMarkRequest(BaseModel):
    qr_token: str
    face_proof_token: str
    latitude: float
    longitude: float

class CampusSettingsBase(BaseModel):
    latitude: float
    longitude: float
    radius_meters: float
    qr_duration_seconds: int = Field(default=10, ge=5, le=60)
    enforce_liveness: bool = Field(default=True)

class CampusSettingsCreate(CampusSettingsBase):
    pass

class CampusSettingsResponse(CampusSettingsBase):
    id: int
    updated_at: datetime

    model_config = {"from_attributes": True}
