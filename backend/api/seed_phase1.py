import os
import sys
from datetime import date

# Add the api directory to the path so we can import from database and models
sys.path.append(os.path.join(os.path.dirname(__file__)))

from database import SessionLocal
from models import Department, AcademicYear, Semester, Subject, Division

def seed_phase1():
    db = SessionLocal()
    try:
        # 1. Department
        dept_name = "CSE (AI & ML)"
        dept_code = "CSE-AIML"
        dept = db.query(Department).filter(Department.name == dept_name).first()
        if not dept:
            dept = Department(name=dept_name, code=dept_code)
            db.add(dept)
            db.flush()

        # 2. Academic Year
        ay_name = "2026-2027"
        ay = db.query(AcademicYear).filter(AcademicYear.name == ay_name).first()
        if not ay:
            ay = AcademicYear(
                name=ay_name, 
                start_date=date(2026, 7, 1), 
                end_date=date(2027, 6, 30), 
                is_active=True
            )
            db.add(ay)
            db.flush()

        # 3. Semesters
        semester_data = [
            {"number": 3, "is_active": True},
            {"number": 4, "is_active": False},
            {"number": 5, "is_active": True},
            {"number": 6, "is_active": False},
            {"number": 7, "is_active": True},
            {"number": 8, "is_active": False},
        ]
        
        sem_objects = {}
        for s_data in semester_data:
            sem_name = f"Semester {s_data['number']}"
            sem = db.query(Semester).filter(
                Semester.academic_year_id == ay.id,
                Semester.name == sem_name
            ).first()
            if not sem:
                sem = Semester(
                    academic_year_id=ay.id,
                    name=sem_name,
                    number=s_data["number"],
                    is_active=s_data["is_active"]
                )
                db.add(sem)
                db.flush()
            else:
                sem.is_active = s_data["is_active"]
                sem.number = s_data["number"]
            sem_objects[s_data["number"]] = sem

        # 4. Subjects
        subjects_data = [
            # SEMESTER 3 (ACTIVE)
            {"sem": 3, "name": "Data Structures & Algorithms", "code": "N-PCCCM30IT", "type": "Core"},
            {"sem": 3, "name": "Data Structures & Algorithms Lab", "code": "N-PCCCM301I", "type": "Lab"},
            {"sem": 3, "name": "Object Oriented Programming", "code": "N-PCCCM302T", "type": "Core"},
            {"sem": 3, "name": "Object Oriented Programming Lab", "code": "N-PCCCM302P", "type": "Lab"},
            {"sem": 3, "name": "Mathematics for Machine Learning", "code": "N-PCCCM3O3T", "type": "Core"},
            {"sem": 3, "name": "Python Programming Lab", "code": "N-PCCCM3O4P", "type": "Lab"},
            {"sem": 3, "name": "Fundamentals of Artificial Intelligence", "code": "N-PCCCM4O3T", "type": "Core"},
            
            # SEMESTER 4 (INACTIVE)
            {"sem": 4, "name": "Operating System", "code": None, "type": "Core"},
            {"sem": 4, "name": "Operating System Lab", "code": None, "type": "Lab"},
            {"sem": 4, "name": "Database Management System", "code": None, "type": "Core"},
            {"sem": 4, "name": "Database Management System Lab", "code": None, "type": "Lab"},
            {"sem": 4, "name": "Advance Data Analysis using Spreadsheet Lab", "code": None, "type": "Lab"},
            {"sem": 4, "name": "Business Communication", "code": None, "type": "Core"},
            {"sem": 4, "name": "Entrepreneurship Development", "code": None, "type": "Core"},
            {"sem": 4, "name": "Environmental Studies", "code": None, "type": "Core"},
            {"sem": 4, "name": "Multidisciplinary Minor Course-2", "code": None, "type": "Elective"},
            {"sem": 4, "name": "Open Elective Course-2", "code": None, "type": "Elective"},

            # SEMESTER 5 (ACTIVE)
            {"sem": 5, "name": "Theory of Computation", "code": "PCCAM501T", "type": "Core"},
            {"sem": 5, "name": "Design & Analysis of Algorithms", "code": "PCCAM502T", "type": "Core"},
            {"sem": 5, "name": "Design & Analysis of Algorithms Lab", "code": "PCCAM502P", "type": "Lab"},
            {"sem": 5, "name": "Software Engineering & Project Management", "code": "PCCAM503T", "type": "Core"},
            {"sem": 5, "name": "Foundation of Machine Learning", "code": "PCCAM504T", "type": "Core"},
            {"sem": 5, "name": "Foundation of Machine Learning Lab", "code": "PCCAM504P", "type": "Lab"},
            {"sem": 5, "name": "Program Elective-1", "code": None, "type": "Elective"},
            {"sem": 5, "name": "Program Elective-1 Lab", "code": None, "type": "Elective Lab"},
            {"sem": 5, "name": "Multidisciplinary Minor Course-3", "code": None, "type": "Elective"},
            {"sem": 5, "name": "Open Elective Course-3", "code": None, "type": "Elective"},

            # SEMESTER 6 (INACTIVE)
            {"sem": 6, "name": "Compiler Design", "code": "PCCAM601T", "type": "Core"},
            {"sem": 6, "name": "Deep Learning", "code": "PCCAM602T", "type": "Core"},
            {"sem": 6, "name": "Deep Learning Lab", "code": "PCCAM602P", "type": "Lab"},
            {"sem": 6, "name": "Optimization Techniques in ML", "code": "PECAM601T", "type": "Elective"},
            {"sem": 6, "name": "Optimization Techniques in ML Lab", "code": "PECAM601P", "type": "Elective Lab"},
            {"sem": 6, "name": "Digital Image & Video Processing", "code": "PECAM602T", "type": "Elective"},
            {"sem": 6, "name": "Digital Image & Video Processing Lab", "code": "PECAM602P", "type": "Elective Lab"},
            {"sem": 6, "name": "Data Mining and Predictive Modeling", "code": "PECAM603T", "type": "Elective"},
            {"sem": 6, "name": "Data Mining and Predictive Modeling Lab", "code": "PECAM603P", "type": "Elective Lab"},
            {"sem": 6, "name": "GPU Computing", "code": "PECAM604T", "type": "Elective"},
            {"sem": 6, "name": "GPU Computing Lab", "code": "PECAM604P", "type": "Elective Lab"},
            {"sem": 6, "name": "IoT & Machine Learning", "code": "PECAM606T", "type": "Elective"},
            {"sem": 6, "name": "IoT & Machine Learning Lab", "code": "PECAM606P", "type": "Elective Lab"},

            # SEMESTER 7 (ACTIVE)
            {"sem": 7, "name": "Machine Learning Operations (MLOPS)", "code": None, "type": "Core"},
            # Notice "Deep Learning" is already in Sem 6 with code PCCAM602T. We must create a separate record if it belongs to Sem 7. 
            {"sem": 7, "name": "Deep Learning", "code": None, "type": "Core"},
            {"sem": 7, "name": "Professional Elective", "code": None, "type": "Elective Category"},
            {"sem": 7, "name": "Cyber Security", "code": None, "type": "Elective Option"},
            {"sem": 7, "name": "Generative AI", "code": None, "type": "Elective Option"},
            {"sem": 7, "name": "IoT and 5G Technology", "code": None, "type": "Elective Option"},
            {"sem": 7, "name": "Virtual & Augmented Reality", "code": None, "type": "Elective Option"},
            {"sem": 7, "name": "Open Elective", "code": None, "type": "Elective Category"},
            {"sem": 7, "name": "Data Analytics with R", "code": None, "type": "Elective Option"},
            {"sem": 7, "name": "Introduction to Machine Learning", "code": None, "type": "Elective Option"},
            {"sem": 7, "name": "Introduction to Big Data", "code": None, "type": "Elective Option"},
            {"sem": 7, "name": "Cloud Services in AI", "code": None, "type": "Elective Option"},
            # Software Eng is also in Sem 5, but we create it for Sem 7 without code
            {"sem": 7, "name": "Software Engineering & Project Management", "code": None, "type": "Core"},
            {"sem": 7, "name": "Project Phase II", "code": None, "type": "Project"},

            # SEMESTER 8 (INACTIVE)
            {"sem": 8, "name": "Self-Learning Course-1 (NPTEL)", "code": None, "type": "Self Learning"},
            {"sem": 8, "name": "Self-Learning Course-2 (NPTEL)", "code": None, "type": "Self Learning"},
            {"sem": 8, "name": "Industrial Internship", "code": None, "type": "Internship"},
        ]

        for s_data in subjects_data:
            sem_id = sem_objects[s_data["sem"]].id
            is_active = sem_objects[s_data["sem"]].is_active
            
            # Since some subjects like 'Deep Learning' might exist in multiple semesters,
            # we check by name AND semester_id.
            subject = db.query(Subject).filter(
                Subject.name == s_data["name"],
                Subject.semester_id == sem_id,
                Subject.department_id == dept.id
            ).first()

            if not subject:
                # To avoid unique constraint errors on code if code is duplicated across semesters
                # The user's provided codes are unique per semester, except where None
                subject = Subject(
                    name=s_data["name"],
                    code=s_data["code"],
                    department_id=dept.id,
                    semester_id=sem_id,
                    is_active=is_active,
                    subject_type=s_data["type"]
                )
                db.add(subject)
            else:
                subject.is_active = is_active
                subject.code = s_data["code"]
                subject.subject_type = s_data["type"]

        db.flush()

        # 5. Divisions (A and B for active semesters 3, 5, 7)
        divisions_data = [
            {"name": "Division A", "sem": 3},
            {"name": "Division B", "sem": 3},
            {"name": "Division A", "sem": 5},
            {"name": "Division B", "sem": 5},
            {"name": "Division A", "sem": 7},
            {"name": "Division B", "sem": 7},
        ]

        for d_data in divisions_data:
            sem_id = sem_objects[d_data["sem"]].id
            div = db.query(Division).filter(
                Division.name == d_data["name"],
                Division.semester_id == sem_id,
                Division.department_id == dept.id
            ).first()

            if not div:
                div = Division(
                    name=d_data["name"],
                    semester_id=sem_id,
                    department_id=dept.id,
                    is_active=True
                )
                db.add(div)
            else:
                div.is_active = True

        db.commit()
        print("Phase 1 Academic Master Data seeded successfully.")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_phase1()
