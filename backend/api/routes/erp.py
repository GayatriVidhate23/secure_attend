from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import User, RoleName, TimetableEntry, InternalMark, OfficialResult, LeaveRequest, Achievement, Notice
from dependencies import get_current_user, require_role, require_hod, require_amc, require_gfm

router = APIRouter(prefix="/erp", tags=["erp"])

# ----------------- TIMETABLE (AMC & FACULTY) -----------------
class TimetableCreate(BaseModel):
    subject_id: int
    faculty_id: int
    division_id: int
    day_of_week: int
    start_time: str
    end_time: str
    room: Optional[str] = None

@router.post("/timetable", dependencies=[Depends(require_amc)])
def create_timetable_entry(entry: TimetableCreate, db: Session = Depends(get_db)):
    db_entry = TimetableEntry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.get("/timetable/student")
def get_student_timetable(current_user: User = Depends(require_role(RoleName.STUDENT)), db: Session = Depends(get_db)):
    # Student sees their division's timetable
    if not current_user.student_profile or not current_user.student_profile.enrollments:
        return []
    div_id = current_user.student_profile.enrollments[-1].division_id
    entries = db.query(TimetableEntry).filter_by(division_id=div_id).all()
    return entries

# ----------------- LEAVES (HOD & FACULTY) -----------------
class LeaveCreate(BaseModel):
    start_date: datetime
    end_date: datetime
    reason: str

@router.post("/leaves")
def apply_leave(leave: LeaveCreate, current_user: User = Depends(require_role(RoleName.FACULTY)), db: Session = Depends(get_db)):
    req = LeaveRequest(faculty_id=current_user.id, **leave.model_dump())
    db.add(req)
    db.commit()
    db.refresh(req)
    return req

@router.get("/leaves", dependencies=[Depends(require_hod)])
def get_department_leaves(db: Session = Depends(get_db)):
    return db.query(LeaveRequest).all()

# ----------------- ACHIEVEMENTS (STUDENT & GFM) -----------------
class AchievementCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date_achieved: Optional[datetime] = None

@router.post("/achievements")
def add_achievement(ach: AchievementCreate, current_user: User = Depends(require_role(RoleName.STUDENT)), db: Session = Depends(get_db)):
    db_ach = Achievement(student_id=current_user.id, **ach.model_dump())
    db.add(db_ach)
    db.commit()
    db.refresh(db_ach)
    return db_ach

@router.get("/achievements", dependencies=[Depends(require_role(RoleName.FACULTY))])
def view_achievements(db: Session = Depends(get_db)):
    return db.query(Achievement).all()

# ----------------- MARKS & RESULTS (FACULTY & AMC) -----------------
class MarkCreate(BaseModel):
    student_id: int
    subject_id: int
    marks_obtained: float
    total_marks: float

@router.post("/marks", dependencies=[Depends(require_role(RoleName.FACULTY))])
def add_internal_mark(mark: MarkCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_mark = InternalMark(faculty_id=current_user.id, **mark.model_dump())
    db.add(db_mark)
    db.commit()
    db.refresh(db_mark)
    return db_mark

@router.get("/marks/student")
def get_my_marks(current_user: User = Depends(require_role(RoleName.STUDENT, RoleName.PARENT)), db: Session = Depends(get_db)):
    # Wait, parent scope needs to be specific! If parent, use linked student_id
    if current_user.role.name == RoleName.PARENT:
        student_ids = [link.student_id for link in current_user.parent_profile.student_links]
        return db.query(InternalMark).filter(InternalMark.student_id.in_(student_ids)).all()
    return db.query(InternalMark).filter(InternalMark.student_id == current_user.id).all()

# ----------------- NOTICES (ADMIN/HOD -> EVERYONE) -----------------
class NoticeCreate(BaseModel):
    title: str
    content: str
    target_audience: str

@router.post("/notices", dependencies=[Depends(require_role(RoleName.ADMIN, RoleName.FACULTY))])
def create_notice(notice: NoticeCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_notice = Notice(sender_id=current_user.id, **notice.model_dump())
    db.add(db_notice)
    db.commit()
    db.refresh(db_notice)
    return db_notice

@router.get("/notices")
def get_notices(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Notice).order_by(Notice.created_at.desc()).all()

