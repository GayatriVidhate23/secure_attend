from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import TimetableEntry, User, RoleName, Faculty, Subject, Division
from dependencies import get_current_user, require_role

router = APIRouter(prefix="/timetable", tags=["Timetable"])

class TimetableCreate(BaseModel):
    subject_id: int
    faculty_id: int
    division_id: int
    day_of_week: int
    start_time: str
    end_time: str
    room: Optional[str] = None

class TimetableResponse(BaseModel):
    id: int
    subject_id: int
    faculty_id: int
    division_id: int
    day_of_week: int
    start_time: str
    end_time: str
    room: Optional[str] = None
    subject_name: str
    faculty_name: str
    division_name: str

    class Config:
        from_attributes = True

def format_timetable_entry(entry: TimetableEntry):
    return {
        "id": entry.id,
        "subject_id": entry.subject_id,
        "faculty_id": entry.faculty_id,
        "division_id": entry.division_id,
        "day_of_week": entry.day_of_week,
        "start_time": entry.start_time,
        "end_time": entry.end_time,
        "room": entry.room,
        "subject_name": entry.subject.name if entry.subject else "Unknown",
        "faculty_name": f"{entry.faculty.user.first_name} {entry.faculty.user.last_name}" if entry.faculty and entry.faculty.user else "Unknown",
        "division_name": entry.division.name if entry.division else "Unknown"
    }

@router.get("/today", response_model=List[TimetableResponse])
def get_today_timetable(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch today's classes for Faculty or Student."""
    today_index = datetime.now().weekday() # 0 = Monday
    query = db.query(TimetableEntry).options(
        joinedload(TimetableEntry.subject),
        joinedload(TimetableEntry.faculty).joinedload(Faculty.user),
        joinedload(TimetableEntry.division)
    ).filter(TimetableEntry.day_of_week == today_index)
    
    if current_user.role.name == RoleName.FACULTY:
        query = query.filter(TimetableEntry.faculty_id == current_user.id)
    elif current_user.role.name == RoleName.STUDENT:
        if not current_user.student_profile or not current_user.student_profile.enrollments:
            return []
        div_id = current_user.student_profile.enrollments[0].division_id
        query = query.filter(TimetableEntry.division_id == div_id)
    elif current_user.role.name == RoleName.ADMIN:
        pass # Admin sees all by default, or maybe shouldn't use this route much
    else:
        return []
        
    entries = query.all()
    return [format_timetable_entry(e) for e in entries]

@router.get("/", response_model=List[TimetableResponse], dependencies=[Depends(require_role(RoleName.ADMIN, RoleName.FACULTY))])
def list_timetable(db: Session = Depends(get_db)):
    entries = db.query(TimetableEntry).options(
        joinedload(TimetableEntry.subject),
        joinedload(TimetableEntry.faculty).joinedload(Faculty.user),
        joinedload(TimetableEntry.division)
    ).all()
    return [format_timetable_entry(e) for e in entries]

@router.post("/", response_model=TimetableResponse, dependencies=[Depends(require_role(RoleName.ADMIN))])
def create_timetable_entry(entry: TimetableCreate, db: Session = Depends(get_db)):
    # Basic overlap check
    existing = db.query(TimetableEntry).filter(TimetableEntry.day_of_week == entry.day_of_week).all()
    
    # Conflict checks
    for e in existing:
        if e.start_time < entry.end_time and e.end_time > entry.start_time:
            # Overlapping time
            if e.faculty_id == entry.faculty_id:
                raise HTTPException(status_code=400, detail="Faculty already has a class scheduled at this time.")
            if e.division_id == entry.division_id:
                raise HTTPException(status_code=400, detail="Division already has a class scheduled at this time.")
            if entry.room and e.room == entry.room:
                raise HTTPException(status_code=400, detail="Room is already booked at this time.")
                
    db_entry = TimetableEntry(
        subject_id=entry.subject_id,
        faculty_id=entry.faculty_id,
        division_id=entry.division_id,
        day_of_week=entry.day_of_week,
        start_time=entry.start_time,
        end_time=entry.end_time,
        room=entry.room
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    # Need to load relationships for format_timetable_entry
    db_entry = db.query(TimetableEntry).options(
        joinedload(TimetableEntry.subject),
        joinedload(TimetableEntry.faculty).joinedload(Faculty.user),
        joinedload(TimetableEntry.division)
    ).filter(TimetableEntry.id == db_entry.id).first()
    
    return format_timetable_entry(db_entry)

@router.delete("/{entry_id}", dependencies=[Depends(require_role(RoleName.ADMIN))])
def delete_timetable_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(TimetableEntry).filter(TimetableEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Deleted successfully"}
