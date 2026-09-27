import sys
import os

# Add the api directory to the path so we can import from database and models
sys.path.append(os.path.join(os.path.dirname(__file__)))

from database import SessionLocal
from models import User, Faculty, Department, Subject, Role, RoleName
from security import get_password_hash

def seed_data():
    db = SessionLocal()
    try:
        # Get Faculty Role
        faculty_role = db.query(Role).filter_by(name=RoleName.FACULTY).first()
        if not faculty_role:
            print("Faculty role not found!")
            return

        # 1. Add Departments
        departments = [
            {"name": "Computer Science & Engineering", "code": "CSE"},
            {"name": "Electronics & Communication", "code": "ECE"},
            {"name": "Mechanical Engineering", "code": "ME"}
        ]
        
        dept_objects = []
        for d_data in departments:
            existing = db.query(Department).filter_by(code=d_data["code"]).first()
            if not existing:
                new_dept = Department(name=d_data["name"], code=d_data["code"])
                db.add(new_dept)
                db.flush()
                dept_objects.append(new_dept)
            else:
                dept_objects.append(existing)

        # 2. Add Subjects
        cse_dept = next((d for d in dept_objects if d.code == "CSE"), None)
        if cse_dept:
            subjects = [
                {"name": "Data Structures & Algorithms", "code": "CS201"},
                {"name": "Operating Systems", "code": "CS302"},
                {"name": "Artificial Intelligence", "code": "CS401"}
            ]
            for s_data in subjects:
                existing = db.query(Subject).filter_by(code=s_data["code"]).first()
                if not existing:
                    db.add(Subject(name=s_data["name"], code=s_data["code"], department_id=cse_dept.id))

        # 3. Add Faculty Members
        faculties = [
            {"email": "dr.smith@example.com", "first": "Alan", "last": "Smith", "emp_id": "F1001"},
            {"email": "prof.jones@example.com", "first": "Sarah", "last": "Jones", "emp_id": "F1002"}
        ]
        
        for f_data in faculties:
            existing_user = db.query(User).filter_by(email=f_data["email"]).first()
            if not existing_user:
                new_user = User(
                    email=f_data["email"],
                    password_hash=get_password_hash("Password123!"),
                    role_id=faculty_role.id,
                    is_active=True
                )
                db.add(new_user)
                db.flush()
                
                new_profile = Faculty(
                    user_id=new_user.id,
                    first_name=f_data["first"],
                    last_name=f_data["last"],
                    employee_id=f_data["emp_id"],
                    department_id=cse_dept.id if cse_dept else None
                )
                db.add(new_profile)

        db.commit()
        print("Demo data seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
