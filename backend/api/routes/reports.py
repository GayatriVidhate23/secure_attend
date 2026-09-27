import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime

from database import get_db
from models import (
    User, RoleName, AttendanceSession, AttendanceRecord,
    StudentEnrollment, FacultySubjectAssignment, Student, Subject, Semester, Division
)
from dependencies import get_current_user, require_role

router = APIRouter(prefix="/reports", tags=["reports"])

def get_student_stats(db: Session, student_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None, subject_id: Optional[int] = None, faculty_id: Optional[int] = None):
    # Find active enrollments
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.student_id == student_id,
        StudentEnrollment.is_active == True
    ).all()
    
    total_classes = 0
    present_classes = 0
    subject_stats = {}
    
    for enr in enrollments:
        # Find sessions for this division/semester
        session_query = db.query(AttendanceSession).filter(
            AttendanceSession.division_id == enr.division_id)
        if start_date:
            session_query = session_query.filter(func.date(AttendanceSession.start_time) >= start_date)
        if end_date:
            session_query = session_query.filter(func.date(AttendanceSession.start_time) <= end_date)
        if subject_id:
            session_query = session_query.filter(AttendanceSession.subject_id == subject_id)
        if faculty_id:
            session_query = session_query.filter(AttendanceSession.faculty_id == faculty_id)
        sessions = session_query.all()
        session_ids = [s.id for s in sessions]
        
        # Present records
        present_count = 0
        if session_ids:
            present_count = db.query(func.count(AttendanceRecord.id)).filter(
                AttendanceRecord.attendance_session_id.in_(session_ids),
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.status == "PRESENT"
            ).scalar() or 0
        
        total_classes += len(sessions)
        present_classes += present_count
        
        # Breakdown by subject
        for s in sessions:
            if s.subject_id not in subject_stats:
                subject_stats[s.subject_id] = {"total": 0, "present": 0, "name": s.subject.name}
            subject_stats[s.subject_id]["total"] += 1
            
        # Fill present for subjects
        if session_ids:
            records = db.query(AttendanceRecord).filter(
                AttendanceRecord.attendance_session_id.in_(session_ids),
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.status == "PRESENT"
            ).all()
            for r in records:
                if r.session.subject_id in subject_stats:
                    subject_stats[r.session.subject_id]["present"] += 1
                
    percentage = (present_classes / total_classes * 100) if total_classes > 0 else 0
    
    subs = []
    for sid, data in subject_stats.items():
        sub_perc = (data["present"] / data["total"] * 100) if data["total"] > 0 else 0
        subs.append({
            "subject_id": sid,
            "subject_name": data["name"],
            "total": data["total"],
            "present": data["present"],
            "percentage": round(sub_perc, 2)
        })
        
    return {
        "total_classes": total_classes,
        "present_classes": present_classes,
        "percentage": round(percentage, 2),
        "subjects": subs
    }

@router.get("/student/my-attendance")
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleName.STUDENT)),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """Student views their own attendance"""
    return get_student_stats(db, current_user.id, start_date, end_date)

MAHARASHTRA_HOLIDAYS_2026 = {
    date(2026, 8, 15): "Independence Day",
    date(2026, 8, 17): "Parsi New Year",
    date(2026, 9, 14): "Ganesh Chaturthi",
    date(2026, 10, 2): "Mahatma Gandhi Jayanti",
    date(2026, 10, 19): "Dasara",
    date(2026, 11, 8): "Diwali Amavasya",
    date(2026, 11, 10): "Diwali (Bali Pratipada)",
    date(2026, 12, 25): "Christmas",
}

from datetime import timedelta

@router.get("/student/attendance-history")
def get_student_attendance_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleName.STUDENT)),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """Student views their chronological daily attendance history"""
    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        end_date = date.today()
        
    if (end_date - start_date).days > 365:
        raise HTTPException(status_code=400, detail="Date range cannot exceed 1 year")

    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.student_id == current_user.id,
        StudentEnrollment.is_active == True
    ).all()
    
    if not enrollments:
        return []
        
    div_sem_pairs = [(e.division_id, e.semester_id) for e in enrollments]

    # Get all sessions for these pairs in the date range
    session_query = db.query(AttendanceSession).filter(
        func.date(AttendanceSession.start_time) >= start_date,
        func.date(AttendanceSession.start_time) <= end_date
    )
    
    from sqlalchemy import or_
    filter_conditions = []
    for div_id, sem_id in div_sem_pairs:
        filter_conditions.append(
            (AttendanceSession.division_id == div_id)
        )
    session_query = session_query.filter(or_(*filter_conditions))
    
    sessions = session_query.all()
    
    # Get student's present records for these sessions
    session_ids = [s.id for s in sessions]
    present_records = set()
    if session_ids:
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.attendance_session_id.in_(session_ids),
            AttendanceRecord.student_id == current_user.id,
            AttendanceRecord.status == "PRESENT"
        ).all()
        present_records = {r.attendance_session_id for r in records}

    # Group sessions by date
    sessions_by_date = {}
    for s in sessions:
        d = s.start_time.date()
        if d not in sessions_by_date:
            sessions_by_date[d] = []
        sessions_by_date[d].append(s)

    history = []
    
    curr = end_date
    while curr >= start_date:
        is_weekend = curr.weekday() >= 5
        is_holiday = curr in MAHARASHTRA_HOLIDAYS_2026
        
        day_sessions = sessions_by_date.get(curr, [])
        
        daily_status = "NO_CLASS"
        summary_text = "No Class"
        
        if is_holiday:
            daily_status = "HOLIDAY"
            summary_text = MAHARASHTRA_HOLIDAYS_2026[curr]
            
        sessions_data = []
        if day_sessions:
            present_count = 0
            for s in day_sessions:
                s_status = "PRESENT" if s.id in present_records else "ABSENT"
                if s_status == "PRESENT":
                    present_count += 1
                sessions_data.append({
                    "session_id": s.id,
                    "subject_id": s.subject_id,
                    "subject_name": s.subject.name,
                    "subject_code": s.subject.code,
                    "start_time": s.start_time.isoformat(),
                    "end_time": s.end_time.isoformat() if s.end_time else None,
                    "status": s_status
                })
            
            # If sessions exist, it overrides HOLIDAY and NO_CLASS
            if present_count == len(day_sessions):
                daily_status = "PRESENT"
                summary_text = "All Present"
            elif present_count == 0:
                daily_status = "ABSENT"
                summary_text = "All Absent"
            else:
                daily_status = "PARTIAL"
                summary_text = f"{present_count}/{len(day_sessions)} Present"
                
        # Only yield dates that have sessions OR are valid holidays/working days in the past
        if sessions_data or is_holiday or (not is_weekend and curr <= date.today()):
            history.append({
                "date": curr.isoformat(),
                "status": daily_status,
                "summary": summary_text,
                "sessions": sessions_data
            })
            
        curr -= timedelta(days=1)
        
    return history

@router.get("/faculty/my-classes")
def get_faculty_attendance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleName.FACULTY)),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """Faculty views attendance scoped exactly to their assignments"""
    assignments = db.query(FacultySubjectAssignment).filter(
        FacultySubjectAssignment.faculty_id == current_user.id
    ).all()
    
    total_sessions = 0
    total_expected_student_sessions = 0
    total_present_records = 0
    
    classes_data = []
    
    for a in assignments:
        if not a.division_id:
            continue
            
        session_query = db.query(AttendanceSession).filter(
            AttendanceSession.faculty_id == current_user.id,
            AttendanceSession.subject_id == a.subject_id,
            AttendanceSession.division_id == a.division_id
        )
        if start_date:
            session_query = session_query.filter(func.date(AttendanceSession.start_time) >= start_date)
        if end_date:
            session_query = session_query.filter(func.date(AttendanceSession.start_time) <= end_date)

        sessions = session_query.all()
        session_ids = [s.id for s in sessions]
        
        # Enrolled students in this division
        enrolled_count = db.query(func.count(StudentEnrollment.id)).filter(
            StudentEnrollment.division_id == a.division_id,
            StudentEnrollment.semester_id == a.semester_id,
            StudentEnrollment.is_active == True
        ).scalar() or 0
        
        expected_attendance = len(sessions) * enrolled_count
        
        present_count = 0
        if session_ids:
            present_count = db.query(func.count(AttendanceRecord.id)).filter(
                AttendanceRecord.attendance_session_id.in_(session_ids),
                AttendanceRecord.status == "PRESENT"
            ).scalar() or 0
            
        total_sessions += len(sessions)
        total_expected_student_sessions += expected_attendance
        total_present_records += present_count
        
        perc = (present_count / expected_attendance * 100) if expected_attendance > 0 else 0
        
        classes_data.append({
            "subject_name": a.subject.name,
            "semester": a.semester.name,
            "division": a.division.name,
            "sessions_conducted": len(sessions),
            "expected_attendance": expected_attendance,
            "actual_attendance": present_count,
            "percentage": round(perc, 2)
        })
        
    overall_perc = (total_present_records / total_expected_student_sessions * 100) if total_expected_student_sessions > 0 else 0
    
    return {
        "overall_percentage": round(overall_perc, 2),
        "total_sessions_conducted": total_sessions,
        "classes": classes_data
    }

@router.get("/admin/summary")
def get_admin_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleName.ADMIN)),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    subject_id: Optional[int] = None,
    faculty_id: Optional[int] = None
):
    """Admin system-wide summary"""
    session_q = db.query(AttendanceSession)
    if start_date:
        session_q = session_q.filter(func.date(AttendanceSession.start_time) >= start_date)
    if end_date:
        session_q = session_q.filter(func.date(AttendanceSession.start_time) <= end_date)
    if subject_id:
        session_q = session_q.filter(AttendanceSession.subject_id == subject_id)
    if faculty_id:
        session_q = session_q.filter(AttendanceSession.faculty_id == faculty_id)
        
    sessions = session_q.all()
    session_ids = [s.id for s in sessions]
    
    total_expected = 0
    # Calculate expected by summing enrolled students per session division
    for s in sessions:
        enr_c = db.query(func.count(StudentEnrollment.id)).filter(
            StudentEnrollment.division_id == s.division_id,
            StudentEnrollment.is_active == True
        ).scalar() or 0
        total_expected += enr_c
        
    total_present = 0
    if session_ids:
        total_present = db.query(func.count(AttendanceRecord.id)).filter(
            AttendanceRecord.attendance_session_id.in_(session_ids),
            AttendanceRecord.status == "PRESENT"
        ).scalar() or 0
        
    overall_perc = (total_present / total_expected * 100) if total_expected > 0 else 0
    
    return {
        "total_sessions": len(sessions),
        "total_expected_attendance": total_expected,
        "total_present": total_present,
        "total_absent": total_expected - total_present,
        "overall_percentage": round(overall_perc, 2)
    }

@router.get("/export/csv")
def export_attendance_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleName.ADMIN, RoleName.FACULTY)),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    subject_id: Optional[int] = None,
    faculty_id: Optional[int] = None
):
    """Export attendance data to CSV. Faculty restricted to own scope."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Time", "Semester", "Division", "Subject", "Faculty", "Student Name", "Roll Number", "Status"])
    
    session_q = db.query(AttendanceSession)
    
    if current_user.role.name == RoleName.FACULTY:
        session_q = session_q.filter(AttendanceSession.faculty_id == current_user.id)
        
    if start_date:
        session_q = session_q.filter(func.date(AttendanceSession.start_time) >= start_date)
    if end_date:
        session_q = session_q.filter(func.date(AttendanceSession.start_time) <= end_date)
    if subject_id:
        session_q = session_q.filter(AttendanceSession.subject_id == subject_id)
    if faculty_id:
        session_q = session_q.filter(AttendanceSession.faculty_id == faculty_id)
        
    sessions = session_q.all()
    
    for s in sessions:
        # Load all enrolled students for this division
        enrollments = db.query(StudentEnrollment).filter(
            StudentEnrollment.division_id == s.division_id,
            StudentEnrollment.is_active == True
        ).all()
        
        # Load present records
        present_ids = set()
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.attendance_session_id == s.id,
            AttendanceRecord.status == "PRESENT"
        ).all()
        for r in records:
            present_ids.add(r.student_id)
            
        date_str = s.start_time.strftime("%Y-%m-%d")
        time_str = s.start_time.strftime("%H:%M:%S")
        
        for enr in enrollments:
            student_obj = enr.student
            status = "PRESENT" if enr.student_id in present_ids else "ABSENT"
            writer.writerow([
                date_str,
                time_str,
                s.division.semester.name if hasattr(s.division, 'semester') and s.division.semester else "Unknown",
                s.division.name,
                s.subject.name,
                f"{s.faculty.first_name} {s.faculty.last_name}",
                f"{student_obj.first_name} {student_obj.last_name}",
                student_obj.roll_number,
                status
            ])
            
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=attendance_export.csv"
    return response

@router.get("/admin/defaulters")
def get_defaulters(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleName.ADMIN)),
    semester_id: Optional[int] = None,
    division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    threshold: float = 75.0
):
    """Get students below a specific attendance threshold"""
    # Find active enrollments, optionally filtered
    enrollment_query = db.query(StudentEnrollment).filter(StudentEnrollment.is_active == True)
    if semester_id:
        enrollment_query = enrollment_query.filter(StudentEnrollment.semester_id == semester_id)
    if division_id:
        enrollment_query = enrollment_query.filter(StudentEnrollment.division_id == division_id)
        
    enrollments = enrollment_query.all()
    
    defaulters = []
    for enr in enrollments:
        stats = get_student_stats(db, enr.student_id, start_date=start_date, end_date=end_date, subject_id=subject_id, faculty_id=faculty_id)
        if stats["total_classes"] > 0 and stats["percentage"] < threshold:
            defaulters.append({
                "student_id": enr.student_id,
                "student_name": f"{enr.student.first_name} {enr.student.last_name}",
                "roll_number": enr.student.roll_number,
                "semester": enr.semester.name,
                "division": enr.division.name,
                "total_classes": stats["total_classes"],
                "present_classes": stats["present_classes"],
                "percentage": stats["percentage"]
            })
            
    # Sort by lowest percentage
    defaulters.sort(key=lambda x: x["percentage"])
    return defaulters

@router.get("/admin/students")
def get_admin_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleName.ADMIN)),
    semester_id: Optional[int] = None,
    division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """Get all students attendance"""
    enrollment_query = db.query(StudentEnrollment).filter(StudentEnrollment.is_active == True)
    if semester_id:
        enrollment_query = enrollment_query.filter(StudentEnrollment.semester_id == semester_id)
    if division_id:
        enrollment_query = enrollment_query.filter(StudentEnrollment.division_id == division_id)
        
    enrollments = enrollment_query.all()
    
    students_list = []
    for enr in enrollments:
        # Note: If we had a subject filter, we'd need to modify get_student_stats
        stats = get_student_stats(db, enr.student_id, start_date=start_date, end_date=end_date, subject_id=subject_id, faculty_id=faculty_id)
        students_list.append({
            "student_id": enr.student_id,
            "student_name": f"{enr.student.first_name} {enr.student.last_name}",
            "roll_number": enr.student.roll_number,
            "semester": enr.semester.name,
            "division": enr.division.name,
            "total_classes": stats["total_classes"],
            "present_classes": stats["present_classes"],
            "percentage": stats["percentage"]
        })
            
    students_list.sort(key=lambda x: x["roll_number"])
    return students_list

@router.get("/admin/sessions")
def get_admin_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleName.ADMIN)),
    semester_id: Optional[int] = None,
    division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """Admin session history"""
    session_q = db.query(AttendanceSession)
    
    if division_id:
        session_q = session_q.filter(AttendanceSession.division_id == division_id)
    if subject_id:
        session_q = session_q.filter(AttendanceSession.subject_id == subject_id)
    if start_date:
        session_q = session_q.filter(func.date(AttendanceSession.start_time) >= start_date)
    if end_date:
        session_q = session_q.filter(func.date(AttendanceSession.start_time) <= end_date)
        
    # Order by newest first
    session_q = session_q.order_by(AttendanceSession.start_time.desc())
    sessions = session_q.all()
    
    res = []
    for s in sessions:
        if semester_id and hasattr(s.division, 'semester_id') and s.division.semester_id != semester_id:
            continue
            
        enr_c = db.query(func.count(StudentEnrollment.id)).filter(
            StudentEnrollment.division_id == s.division_id,
            StudentEnrollment.is_active == True
        ).scalar() or 0
        
        present = db.query(func.count(AttendanceRecord.id)).filter(
            AttendanceRecord.attendance_session_id == s.id,
            AttendanceRecord.status == "PRESENT"
        ).scalar() or 0
        
        perc = (present / enr_c * 100) if enr_c > 0 else 0
        
        res.append({
            "id": s.id,
            "date": s.start_time.strftime("%Y-%m-%d"),
            "time": s.start_time.strftime("%H:%M"),
            "subject": s.subject.name,
            "faculty": f"{s.faculty.first_name} {s.faculty.last_name}",
            "semester": s.division.semester.name if hasattr(s.division, 'semester') and s.division.semester else "Unknown",
            "division": s.division.name,
            "present": present,
            "expected": enr_c,
            "percentage": round(perc, 2)
        })
        
    return res
