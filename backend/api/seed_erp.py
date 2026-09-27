import asyncio
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from security import get_password_hash
import random

db = SessionLocal()

# Roles
role_fac = db.query(models.Role).filter_by(name=models.RoleName.FACULTY).first()
role_stu = db.query(models.Role).filter_by(name=models.RoleName.STUDENT).first()
role_par = db.query(models.Role).filter_by(name=models.RoleName.PARENT).first()

ay = db.query(models.AcademicYear).filter_by(name="2023-2024").first()
div_a = db.query(models.Division).filter_by(name="A").first()
div_b = db.query(models.Division).filter_by(name="B").first()
sem_se = db.query(models.Semester).filter_by(name="SE Sem 3").first()
sem_te = db.query(models.Semester).filter_by(name="TE Sem 5").first()
sem_be = db.query(models.Semester).filter_by(name="BE Sem 7").first()

counts = {"SE": 120, "TE": 74, "BE": 77}
roll_prefix = {"SE": "23", "TE": "22", "BE": "21"}
sem_map = {"SE": sem_se, "TE": sem_te, "BE": sem_be}

total_students_created = 0
for year, count in counts.items():
    for i in range(1, count + 1):
        email = f"student_{year.lower()}_{i}@depterp.ai"
        
        # Check if exists
        if db.query(models.User).filter_by(email=email).first():
            continue
            
        s_user = models.User(
            email=email,
            password_hash=get_password_hash("Student123!"),
            is_active=True,
            role_id=role_stu.id
        )
        db.add(s_user)
        db.commit()
        db.refresh(s_user)
        
        # Mix NULL fields
        r_phone = f"98765{random.randint(10000, 99999)}" if random.random() > 0.3 else None
        r_blood = random.choice(["A+", "B+", "O+", "AB+"]) if random.random() > 0.4 else None
        r_addr = f"Street {i}, City" if random.random() > 0.2 else None
        
        student = models.Student(
            user_id=s_user.id,
            roll_number=f"{roll_prefix[year]}COMP{i:03d}",
            first_name=f"Student{i}",
            last_name=f"({year})",
            phone=r_phone,
            blood_group=r_blood,
            address=r_addr,
            face_profile_active=False
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        total_students_created += 1
        
        # Enroll
        # Assign TE and BE to Div A since DB requires a division_id
        div_id = div_a.id if (year == "SE" and i <= 60) else (div_b.id if year == "SE" else div_a.id)
        enr = models.StudentEnrollment(
            student_id=student.user_id,
            semester_id=sem_map[year].id,
            division_id=div_id
        )
        db.add(enr)
        
        # Parent mapping
        if random.random() > 0.2:
            p_email = f"parent_of_{s_user.id}@depterp.ai"
            p_user = models.User(
                email=p_email,
                password_hash=get_password_hash("Parent123!"),
                is_active=True,
                role_id=role_par.id
            )
            db.add(p_user)
            db.commit()
            db.refresh(p_user)
            
            parent = models.Parent(
                user_id=p_user.id,
                first_name=f"ParentOf{i}",
                last_name="Family"
            )
            db.add(parent)
            db.commit()
            
            link = models.ParentStudentLink(
                parent_id=p_user.id,
                student_id=student.user_id,
                relation="Parent"
            )
            db.add(link)
            db.commit()

print(f"Done! Created {total_students_created} students.")
