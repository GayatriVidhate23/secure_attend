import os
import sys
import random

# Add the api directory to the path so we can import from database and models
sys.path.append(os.path.join(os.path.dirname(__file__)))

from database import SessionLocal
from models import Department, Role, RoleName, User, Faculty
from security import get_password_hash

FIRST_NAMES = [
    "Akshay", "Neha", "Rohit", "Priyanka", "Sagar", "Snehal", "Amit", "Pooja", "Nikhil", "Rutuja",
    "Vikas", "Shweta", "Tushar", "Pallavi", "Sandeep", "Sonali", "Pratik", "Rucha", "Rakesh", "Amruta",
    "Ashish", "Kalyani", "Rahul", "Mayuri", "Vishal", "Swati", "Saurabh", "Ankita", "Ajay", "Komal"
]

LAST_NAMES = [
    "Deshmukh", "Wankhede", "Zade", "Meshram", "Borkar", "Patil", "Sahu", "Kale", "Mahajan", "Shinde",
    "Joshi", "Kulkarni", "Jadhav", "Chavan", "Gaikwad", "Pawar", "Kadam", "Mane", "Sharma", "Tiwari",
    "Raut", "Bhalerao", "Thakre", "Deshpande", "Gawande", "Bhoyar", "Khandekar", "Mankar", "Kapse", "Dhote"
]

def seed_phase3():
    print("Starting Phase 3 Faculty Seed...")
    db = SessionLocal()
    try:
        # Get required master data
        role = db.query(Role).filter(Role.name == RoleName.FACULTY).first()
        dept = db.query(Department).filter(Department.code == "CSE-AIML").first()
        
        if not role or not dept:
            print("Missing master data. Run Phase 1 seed first.")
            return

        target_count = 20
        pwd_hash = get_password_hash("Faculty@123!")
        
        existing_faculty = db.query(Faculty).all()
        existing_count = len(existing_faculty)
        print(f"Found {existing_count} existing faculty in total.")
        
        added = 0
        seq = 1
        
        # We need exactly 20 synthetic faculty members
        # If we already have 20 seeded ones (e.g. from a previous run), we will skip.
        # We will use employee_id format: FAC001, FAC002, etc.
        
        while added < target_count:
            employee_id = f"FAC{seq:03d}"
            email = f"faculty{seq:03d}@secureattend.demo"
            
            existing_user = db.query(User).filter(User.email == email).first()
            existing_fac = db.query(Faculty).filter(Faculty.employee_id == employee_id).first()
            
            if not existing_user and not existing_fac:
                first_name = random.choice(FIRST_NAMES)
                last_name = random.choice(LAST_NAMES)
                
                user = User(
                    email=email,
                    password_hash=pwd_hash,
                    role_id=role.id,
                    is_active=True
                )
                db.add(user)
                db.flush()
                
                # Note: designation is not in the schema, so we omit it to avoid modifying the schema
                faculty = Faculty(
                    user_id=user.id,
                    employee_id=employee_id,
                    first_name=first_name,
                    last_name=last_name,
                    department_id=dept.id
                )
                db.add(faculty)
                added += 1
                print(f"Created Faculty: {first_name} {last_name} ({employee_id})")
                
            seq += 1
            # Failsafe if target count is reached from existing data
            if seq > target_count and added == 0:
                # This means we already iterated through FAC001-FAC020 and they exist.
                break
                
        db.commit()
        print(f"Phase 3 Faculty Seed complete. Added {added} new faculty.")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Ensure reproducible random names for idempotency consistency
    random.seed(123)
    seed_phase3()
