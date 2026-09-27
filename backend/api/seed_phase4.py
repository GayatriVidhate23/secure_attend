import os
import sys
from typing import List, Dict

sys.path.append(os.path.join(os.path.dirname(__file__)))

from database import SessionLocal
from models import Faculty, Subject, Semester, Division, FacultySubjectAssignment

def seed_phase4():
    print("Starting Phase 4 Faculty Assignment Seed...")
    db = SessionLocal()
    try:
        # Get active semesters
        sem3 = db.query(Semester).filter(Semester.number == 3).first()
        sem5 = db.query(Semester).filter(Semester.number == 5).first()
        sem7 = db.query(Semester).filter(Semester.number == 7).first()

        if not sem3 or not sem5 or not sem7:
            print("Error: Missing active semesters. Did Phase 1 complete successfully?")
            return

        # Get divisions
        def get_divs(sem_id):
            return {
                "A": db.query(Division).filter(Division.semester_id == sem_id, Division.name == "Division A").first(),
                "B": db.query(Division).filter(Division.semester_id == sem_id, Division.name == "Division B").first()
            }
        
        divs3 = get_divs(sem3.id)
        divs5 = get_divs(sem5.id)
        divs7 = get_divs(sem7.id)

        # Get faculty
        faculty_list = db.query(Faculty).order_by(Faculty.employee_id).all()
        if len(faculty_list) < 20:
            print("Error: Not enough faculty found. Expected at least 20.")
            return

        # Simple faculty round-robin assigner
        fac_idx = 0
        def get_next_faculty():
            nonlocal fac_idx
            fac = faculty_list[fac_idx % len(faculty_list)]
            fac_idx += 1
            return fac

        added_assignments = 0
        skipped_assignments = 0

        def assign(subject_name: str, sem_id: int, division_name: str, fac: Faculty):
            nonlocal added_assignments, skipped_assignments
            subject = db.query(Subject).filter(Subject.name == subject_name, Subject.semester_id == sem_id).first()
            if not subject:
                print(f"Warning: Subject '{subject_name}' not found for semester {sem_id}.")
                return
            
            div = db.query(Division).filter(Division.semester_id == sem_id, Division.name == division_name).first()
            if not div:
                print(f"Warning: Division '{division_name}' not found for semester {sem_id}.")
                return

            existing = db.query(FacultySubjectAssignment).filter(
                FacultySubjectAssignment.faculty_id == fac.user_id,
                FacultySubjectAssignment.subject_id == subject.id,
                FacultySubjectAssignment.division_id == div.id
            ).first()

            if not existing:
                assignment = FacultySubjectAssignment(
                    faculty_id=fac.user_id,
                    subject_id=subject.id,
                    semester_id=sem_id,
                    division_id=div.id
                )
                db.add(assignment)
                added_assignments += 1
                print(f"Assigned {subject.name} to {fac.first_name} {fac.last_name} ({div.name})")
            else:
                skipped_assignments += 1

        def assign_both(subject_name: str, sem_id: int, fac: Faculty):
            assign(subject_name, sem_id, "Division A", fac)
            assign(subject_name, sem_id, "Division B", fac)

        # Semester 3 Assignments
        assign("Data Structures & Algorithms", sem3.id, "Division A", get_next_faculty())
        assign("Data Structures & Algorithms", sem3.id, "Division B", get_next_faculty())
        
        assign("Data Structures & Algorithms Lab", sem3.id, "Division A", get_next_faculty())
        assign("Data Structures & Algorithms Lab", sem3.id, "Division B", get_next_faculty())
        
        assign("Object Oriented Programming", sem3.id, "Division A", get_next_faculty())
        assign("Object Oriented Programming", sem3.id, "Division B", get_next_faculty())
        
        assign("Object Oriented Programming Lab", sem3.id, "Division A", get_next_faculty())
        assign("Object Oriented Programming Lab", sem3.id, "Division B", get_next_faculty())
        
        assign_both("Mathematics for Machine Learning", sem3.id, get_next_faculty())
        
        assign("Python Programming Lab", sem3.id, "Division A", get_next_faculty())
        assign("Python Programming Lab", sem3.id, "Division B", get_next_faculty())
        
        assign_both("Fundamentals of Artificial Intelligence", sem3.id, get_next_faculty())

        # Semester 5 Assignments
        assign("Theory of Computation", sem5.id, "Division A", get_next_faculty())
        assign("Theory of Computation", sem5.id, "Division B", get_next_faculty())
        
        assign_both("Design & Analysis of Algorithms", sem5.id, get_next_faculty())
        assign_both("Design & Analysis of Algorithms Lab", sem5.id, get_next_faculty())
        
        assign_both("Software Engineering & Project Management", sem5.id, get_next_faculty())
        
        assign("Foundation of Machine Learning", sem5.id, "Division A", get_next_faculty())
        assign("Foundation of Machine Learning", sem5.id, "Division B", get_next_faculty())
        assign_both("Foundation of Machine Learning Lab", sem5.id, get_next_faculty())
        
        assign_both("Program Elective-1", sem5.id, get_next_faculty())
        assign_both("Program Elective-1 Lab", sem5.id, get_next_faculty())
        assign_both("Multidisciplinary Minor Course-3", sem5.id, get_next_faculty())
        assign_both("Open Elective Course-3", sem5.id, get_next_faculty())

        # Semester 7 Assignments
        assign_both("Machine Learning Operations (MLOPS)", sem7.id, get_next_faculty())
        assign_both("Deep Learning", sem7.id, get_next_faculty())
        assign_both("Software Engineering & Project Management", sem7.id, get_next_faculty())
        assign_both("Project Phase II", sem7.id, get_next_faculty())

        # Semester 7 Electives (Options mapped directly to divisions)
        # Note: We do NOT assign the "Category" itself, only the specific option subjects
        assign("Cyber Security", sem7.id, "Division A", get_next_faculty())
        assign("Generative AI", sem7.id, "Division B", get_next_faculty())
        
        assign("Data Analytics with R", sem7.id, "Division A", get_next_faculty())
        assign("Cloud Services in AI", sem7.id, "Division B", get_next_faculty())

        db.commit()
        print(f"Phase 4 Seed Complete. Added: {added_assignments}, Skipped (Idempotent): {skipped_assignments}")

    except Exception as e:
        print(f"Error seeding assignments: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_phase4()
