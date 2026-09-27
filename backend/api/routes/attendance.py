from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from typing import List
from datetime import datetime, timezone

from database import get_db
from models import AttendanceSession, Faculty, Subject, Division, User, RoleName
from dependencies import require_role, require_admin, require_admin_or_faculty, get_faculty_scopes, get_current_user
from schemas import AttendanceSessionCreate, AttendanceSessionResponse, LiveAttendanceResponse
from security import create_attendance_qr_token

router = APIRouter(prefix="/attendance-sessions", tags=["Attendance Sessions"], dependencies=[Depends(require_admin_or_faculty())])

@router.post("", response_model=AttendanceSessionResponse)
def create_session(session_data: AttendanceSessionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.name == RoleName.FACULTY:
        if session_data.faculty_id != current_user.id:
            raise HTTPException(status_code=403, detail="Cannot create session for another faculty")
            
        from models import FacultySubjectAssignment
        assignment = db.query(FacultySubjectAssignment).filter(
            FacultySubjectAssignment.faculty_id == current_user.id,
            FacultySubjectAssignment.subject_id == session_data.subject_id,
            FacultySubjectAssignment.division_id == session_data.division_id
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Unauthorized for this subject and division")
    elif current_user.role.name != RoleName.ADMIN:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Validate entities exist
    faculty = db.query(Faculty).filter(Faculty.user_id == session_data.faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
        
    existing_active_session = db.query(AttendanceSession).filter(
        AttendanceSession.faculty_id == session_data.faculty_id,
        AttendanceSession.is_active == True
    ).first()
    if existing_active_session:
        raise HTTPException(status_code=409, detail="Faculty already has an active attendance session.")
        
    subject = db.query(Subject).filter(Subject.id == session_data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    division = db.query(Division).filter(Division.id == session_data.division_id).first()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")

    new_session = AttendanceSession(
        faculty_id=session_data.faculty_id,
        subject_id=session_data.subject_id,
        division_id=session_data.division_id,
        is_active=True
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return new_session

@router.get("/active", response_model=List[dict])
def list_active_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(AttendanceSession).options(
        joinedload(AttendanceSession.faculty),
        joinedload(AttendanceSession.subject),
        joinedload(AttendanceSession.division)
    ).filter(AttendanceSession.is_active == True)
    
    if current_user.role.name == RoleName.FACULTY:
        scopes = get_faculty_scopes(db, current_user.id)
        query = query.filter(AttendanceSession.division_id.in_(scopes["divisions"]))
        
    sessions = query.all()
    
    result = []
    for s in sessions:
        result.append({
            "id": s.id,
            "faculty_id": s.faculty_id,
            "subject_id": s.subject_id,
            "division_id": s.division_id,
            "start_time": s.start_time,
            "faculty_name": f"{s.faculty.first_name} {s.faculty.last_name}",
            "subject_name": s.subject.name,
            "division_name": s.division.name
        })
    return result

@router.post("/{session_id}/end")
def end_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if current_user.role.name == RoleName.FACULTY:
        if session.faculty_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized to end this session")
        
    session.is_active = False
    session.end_time = datetime.now(timezone.utc)
    
    db.commit()
    return {"success": True, "message": "Session ended"}

@router.get("/{session_id}/qr")
def get_qr_token(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Use with_for_update() to prevent race conditions when generating token
    session = db.query(AttendanceSession).with_for_update().filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if current_user.role.name == RoleName.FACULTY:
        if session.faculty_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized to get QR for this session")
        
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session is not active")
        
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    
    qr_expires_at = session.qr_expires_at
    if qr_expires_at and qr_expires_at.tzinfo is None:
        qr_expires_at = qr_expires_at.replace(tzinfo=timezone.utc)
    
    # Fetch dynamic QR duration from settings
    from models import CampusSettings
    settings = db.query(CampusSettings).filter(CampusSettings.id == 1).first()
    duration_seconds = settings.qr_duration_seconds if settings else 10

    # If there's no valid token, or it's expired, generate a new one
    if not qr_expires_at or qr_expires_at <= now:
        token = create_attendance_qr_token(session_id=session.id, expires_in_seconds=duration_seconds)
        session.current_qr_token = token
        session.qr_expires_at = now + timedelta(seconds=duration_seconds)
        db.commit()
        qr_expires_at = session.qr_expires_at
        if qr_expires_at and qr_expires_at.tzinfo is None:
            qr_expires_at = qr_expires_at.replace(tzinfo=timezone.utc)
    
    expires_in = int((qr_expires_at - now).total_seconds())
    # Ensure expires_in is at least 0
    expires_in = max(0, expires_in)
    
    return {
        "session_id": session.id,
        "qr_token": session.current_qr_token,
        "expires_at": session.qr_expires_at.isoformat(),
        "server_time": now.isoformat(),
        "expires_in": expires_in,
        "valid_for": duration_seconds
    }

@router.get("/{session_id}/attendance", response_model=LiveAttendanceResponse)
def get_session_attendance(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if current_user.role.name == RoleName.FACULTY:
        scopes = get_faculty_scopes(db, current_user.id)
        if session.division_id not in scopes["divisions"]:
            raise HTTPException(status_code=404, detail="Session not found")

    from models import AttendanceRecord
    records = db.query(AttendanceRecord).filter(AttendanceRecord.attendance_session_id == session_id).all()
    
    formatted_records = []
    for r in records:
        student = r.student
        formatted_records.append({
            "student_id": student.user_id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "roll_number": student.roll_number,
            "marked_at": r.marked_at,
            "status": r.status
        })

    return {
        "session_id": session.id,
        "total_present": len(formatted_records),
        "records": formatted_records
    }
