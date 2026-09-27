import os
import sys
import random
from typing import List, Dict

# Add the api directory to the path so we can import from database and models
sys.path.append(os.path.join(os.path.dirname(__file__)))

from database import SessionLocal
from models import Department, AcademicYear, Semester, Division, Role, RoleName, User, Student, StudentEnrollment
from security import get_password_hash

FIRST_NAMES = [
    "Aditya", "Atharva", "Harsh", "Omkar", "Rohan", "Yash", "Aniket", "Siddhant", "Ayush", "Shubham",
    "Abhishek", "Akshay", "Amey", "Amit", "Amol", "Ankit", "Anurag", "Aryan", "Ashwin", "Chetan",
    "Chinmay", "Darshan", "Deepak", "Dhananjay", "Dinesh", "Ganesh", "Gaurav", "Harshal", "Hrishikesh", "Jay",
    "Jayesh", "Kalpesh", "Karan", "Kaushal", "Kiran", "Kunal", "Mahesh", "Manish", "Mayur", "Mihir",
    "Neeraj", "Nikhil", "Nilesh", "Ninad", "Nishant", "Nitin", "Pankaj", "Parag", "Pawan", "Piyush",
    "Pranav", "Prasad", "Prathamesh", "Pratik", "Pravin", "Pritam", "Rahul", "Raj", "Rajat", "Rajesh",
    "Aditi", "Aishwarya", "Akanksha", "Amruta", "Anagha", "Anjali", "Ankita", "Anuja", "Aparna", "Aarti",
    "Ashwini", "Bhagyashree", "Bhavana", "Chaitrali", "Chetana", "Deepali", "Dhanashree", "Diksha", "Divya", "Gauri",
    "Gayatri", "Gitanjali", "Harshada", "Ishwari", "Janhavi", "Jayashree", "Jyoti", "Kajal", "Kalyani", "Kamini",
    "Kanchan", "Karishma", "Kavita", "Ketaki", "Kiran", "Kirti", "Komal", "Krutika", "Leena", "Madhavi",
    "Madhuri", "Manasi", "Manisha", "Mayuri", "Megha", "Minakshi", "Mohini", "Monika", "Mrunal", "Mukta"
]

LAST_NAMES = [
    "Deshmukh", "Patil", "Wankhede", "Zade", "Meshram", "Tiwari", "Borkar", "Mahajan", "Sahu", "Verma",
    "Kulkarni", "Joshi", "Deshpande", "Kale", "More", "Shinde", "Pawar", "Jadhav", "Kamble", "Chavan",
    "Gaikwad", "Bhalerao", "Kadam", "Mane", "Sharma", "Singh", "Gupta", "Mishra", "Dubey", "Pandey",
    "Shukla", "Yadav", "Soni", "Jain", "Agrawal", "Rathod", "Thakur", "Khandekar", "Dange", "Wagh",
    "Raut", "Gawande", "Thakre", "Bhoyar", "Mankar", "Kapse", "Dhote", "Jichkar", "Pande", "Gokhale",
    "Vaidya", "Bhat", "Agarkar", "Kanitkar", "Apte", "Godbole", "Gadgil", "Bhagwat", "Dixit", "Khedkar",
    "Shirke", "Mohite", "Surve", "Sawant", "Desai", "Rane", "Dalvi", "Ghadge", "Salunkhe", "Thorat",
    "Bhonsle", "Sutar", "Kumbhar", "Lohar", "Nhavi", "Parit", "Sonar", "Koshti", "Sali", "Gavali"
]

def generate_students_for_division(
    db: SessionLocal, 
    role_id: int, 
    dept_id: int, 
    ay_id: int, 
    semester_id: int, 
    division_id: int, 
    div_name: str,
    year_prefix: str, 
    target_count: int = 60
):
    # 23A001, 23B001, etc.
    div_letter = div_name.replace("Division ", "").strip()
    
    # Check how many students already exist for this division in this semester
    existing_enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.semester_id == semester_id,
        StudentEnrollment.division_id == division_id,
        StudentEnrollment.is_active == True
    ).all()
    
    existing_count = len(existing_enrollments)
    print(f"[{year_prefix}{div_letter}] Found {existing_count} existing students. Target: {target_count}")
    
    needed = target_count - existing_count
    if needed <= 0:
        return
        
    print(f"[{year_prefix}{div_letter}] Generating {needed} new students...")
    
    # Generate needed students
    # Default password for all seed students
    pwd_hash = get_password_hash("Student@123!")
    
    # Determine the starting sequence number based on existing roll numbers
    # To keep it simple and deterministic, we'll just check existence per roll number
    seq = 1
    added = 0
    
    while added < needed:
        roll_number = f"{year_prefix}{div_letter}{seq:03d}"
        email = f"student{roll_number.lower()}@secureattend.demo"
        
        # Check if user email or roll number exists to ensure idempotency across runs
        existing_user = db.query(User).filter(User.email == email).first()
        existing_student = db.query(Student).filter(Student.roll_number == roll_number).first()
        
        if not existing_user and not existing_student:
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            
            user = User(
                email=email,
                password_hash=pwd_hash,
                role_id=role_id,
                is_active=True
            )
            db.add(user)
            db.flush()
            
            student = Student(
                user_id=user.id,
                roll_number=roll_number,
                first_name=first_name,
                last_name=last_name,
                department_id=dept_id,
                face_profile_active=False
            )
            db.add(student)
            db.flush()
            
            enrollment = StudentEnrollment(
                student_id=student.user_id,
                semester_id=semester_id,
                division_id=division_id,
                is_active=True
            )
            db.add(enrollment)
            added += 1
            
        elif existing_student and not any(e.student_id == existing_student.user_id for e in existing_enrollments):
            # Student exists but is not enrolled in this division (maybe a previous partial run failed)
            enrollment = StudentEnrollment(
                student_id=existing_student.user_id,
                semester_id=semester_id,
                division_id=division_id,
                is_active=True
            )
            db.add(enrollment)
            added += 1
            
        seq += 1
        
    db.commit()


def seed_phase2():
    print("Starting Phase 2 Student Seed...")
    db = SessionLocal()
    try:
        # Get required master data
        role = db.query(Role).filter(Role.name == RoleName.STUDENT).first()
        dept = db.query(Department).filter(Department.code == "CSE-AIML").first()
        ay = db.query(AcademicYear).filter(AcademicYear.name == "2026-2027").first()
        
        if not role or not dept or not ay:
            print("Missing master data. Run Phase 1 seed first.")
            return

        # Target distribution
        # 2nd Year (Sem 3) -> 23
        # 3rd Year (Sem 5) -> 22
        # 4th Year (Sem 7) -> 21
        targets = [
            {"sem_num": 3, "prefix": "23"},
            {"sem_num": 5, "prefix": "22"},
            {"sem_num": 7, "prefix": "21"}
        ]
        
        for t in targets:
            sem = db.query(Semester).filter(Semester.number == t["sem_num"], Semester.academic_year_id == ay.id).first()
            if not sem:
                print(f"Semester {t['sem_num']} not found. Skipping.")
                continue
                
            divisions = db.query(Division).filter(Division.semester_id == sem.id).all()
            for div in divisions:
                generate_students_for_division(
                    db=db,
                    role_id=role.id,
                    dept_id=dept.id,
                    ay_id=ay.id,
                    semester_id=sem.id,
                    division_id=div.id,
                    div_name=div.name,
                    year_prefix=t["prefix"],
                    target_count=60
                )

        print("Phase 2 Student Seed complete.")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Ensure reproducible random names for idempotency consistency (optional, but good practice)
    random.seed(42)
    seed_phase2()
