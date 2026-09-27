import os
import sys
import math
import random
import logging
from datetime import date, datetime, timedelta, timezone

# Adjust path so we can import from backend.api
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from sqlalchemy import text, func

from database import SessionLocal
from models import (
    StudentEnrollment,
    FacultySubjectAssignment,
    AttendanceSession,
    AttendanceRecord,
    Semester,
    Division,
    Subject,
    Faculty,
    Student,
    User
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# --- CONFIGURATION ---

START_DATE = date(2026, 7, 1)
END_DATE = date.today()

# Official Maharashtra Public Holidays 2026 (Applicable after July 1st)
# Ref: Based on standard typical dates for 2026.
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

# The active semesters for which to generate attendance
ACTIVE_SEMESTER_NAMES = ["Semester 3", "Semester 5", "Semester 7"]

def is_working_day(d: date) -> bool:
    """Returns True if the date is not a weekend and not a public holiday."""
    # 5 = Saturday, 6 = Sunday
    if d.weekday() >= 5:
        return False
    if d in MAHARASHTRA_HOLIDAYS_2026:
        return False
    return True

def generate_student_profile(student_id: int) -> float:
    """
    Deterministically generates an attendance probability for a student.
    Excellent: 90-98%, Regular: 80-92%, Average: 70-85%, Irregular: 55-75%, Chronic: 40-60%
    """
    # Use the student ID to seed so it's consistent across runs
    rng = random.Random(f"student_profile_{student_id}")
    roll = rng.random()
    
    if roll < 0.15:
        return rng.uniform(0.90, 0.98) # Excellent (15%)
    elif roll < 0.50:
        return rng.uniform(0.80, 0.92) # Regular (35%)
    elif roll < 0.85:
        return rng.uniform(0.70, 0.85) # Average (35%)
    elif roll < 0.95:
        return rng.uniform(0.55, 0.75) # Irregular (10%)
    else:
        return rng.uniform(0.40, 0.60) # Chronic (5%)

def get_calendar_days():
    days = []
    curr = START_DATE
    while curr <= END_DATE:
        days.append(curr)
        curr += timedelta(days=1)
    return days

def seed_attendance():
    db = SessionLocal()
    try:
        # Load active semesters
        active_sems = db.query(Semester).filter(Semester.name.in_(ACTIVE_SEMESTER_NAMES)).all()
        active_sem_ids = [s.id for s in active_sems]

        # Load all valid assignments
        assignments = db.query(FacultySubjectAssignment).filter(
            FacultySubjectAssignment.semester_id.in_(active_sem_ids),
            FacultySubjectAssignment.division_id.isnot(None)
        ).all()
        
        logger.info(f"Found {len(assignments)} valid active assignments.")

        # Load all student enrollments mapped by division
        enrollments = db.query(StudentEnrollment).filter(
            StudentEnrollment.semester_id.in_(active_sem_ids),
            StudentEnrollment.is_active == True
        ).all()
        
        div_students = {}
        student_profiles = {}
        for enr in enrollments:
            if enr.division_id not in div_students:
                div_students[enr.division_id] = []
            div_students[enr.division_id].append(enr.student_id)
            if enr.student_id not in student_profiles:
                student_profiles[enr.student_id] = generate_student_profile(enr.student_id)

        calendar_days = get_calendar_days()
        working_days = [d for d in calendar_days if is_working_day(d)]
        
        logger.info(f"Total Calendar Days: {len(calendar_days)}")
        logger.info(f"Total Working Days: {len(working_days)}")
        
        # Check idempotency marker
        # We check if there's any session from our specific exact working days
        # We will deterministically set start_time so we can find them
        
        # Track counts
        sessions_created = 0
        records_created = 0
        
        for day in working_days:
            # Seed the RNG deterministically for this day
            day_rng = random.Random(f"schedule_{day.isoformat()}")
            
            # Group assignments by division so we can schedule 2-3 sessions per division
            div_assignments = {}
            for a in assignments:
                if a.division_id not in div_assignments:
                    div_assignments[a.division_id] = []
                div_assignments[a.division_id].append(a)
                
            for div_id, div_assigns in div_assignments.items():
                # Randomly pick 2 to 3 assignments for today for this division
                num_sessions = day_rng.randint(2, 3)
                if len(div_assigns) < num_sessions:
                    num_sessions = len(div_assigns)
                    
                selected_assignments = day_rng.sample(div_assigns, num_sessions)
                
                # Base time starts at 09:00 UTC
                base_hour = 9
                for idx, assignment in enumerate(selected_assignments):
                    # Deterministic exact start time for idempotency check
                    dt_start = datetime.combine(day, datetime.min.time()).replace(hour=base_hour + (idx*2), minute=0, tzinfo=timezone.utc)
                    dt_end = dt_start + timedelta(hours=1)
                    
                    # Idempotency check: Does this exact session exist?
                    existing = db.query(AttendanceSession).filter(
                        AttendanceSession.faculty_id == assignment.faculty_id,
                        AttendanceSession.subject_id == assignment.subject_id,
                        AttendanceSession.division_id == div_id,
                        AttendanceSession.start_time == dt_start
                    ).first()
                    
                    if existing:
                        continue # Skip, already seeded
                        
                    # Create session
                    session = AttendanceSession(
                        faculty_id=assignment.faculty_id,
                        subject_id=assignment.subject_id,
                        division_id=div_id,
                        start_time=dt_start,
                        end_time=dt_end,
                        is_active=False # completed historical session
                    )
                    db.add(session)
                    db.flush() # get session ID
                    sessions_created += 1
                    
                    # Generate student attendance records
                    students = div_students.get(div_id, [])
                    records_to_add = []
                    for s_id in students:
                        prob = student_profiles.get(s_id, 0.75)
                        # Deterministic attendance roll for this exact session + student
                        att_rng = random.Random(f"att_{session.id}_{s_id}_{dt_start.isoformat()}")
                        
                        if att_rng.random() < prob:
                            # Present
                            records_to_add.append(
                                AttendanceRecord(
                                    attendance_session_id=session.id,
                                    student_id=s_id,
                                    marked_at=dt_start + timedelta(minutes=att_rng.randint(2, 10)),
                                    status="PRESENT"
                                )
                            )
                    
                    db.bulk_save_objects(records_to_add)
                    records_created += len(records_to_add)
                    
            db.commit() # Commit daily to avoid huge transactions
            
        logger.info("--- SEEDING COMPLETE ---")
        logger.info(f"Sessions Created: {sessions_created}")
        logger.info(f"Records Created: {records_created}")
        
    except Exception as e:
        logger.error(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_attendance()
