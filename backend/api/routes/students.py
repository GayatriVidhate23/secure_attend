from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import csv
import io
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from database import get_db
from models import Student, User, Role, RoleName, Department, AuditLog, Division, StudentEnrollment
from security import get_password_hash
from dependencies import require_role, require_admin, require_admin_or_faculty, get_current_user, get_faculty_scopes

router = APIRouter(prefix="/students", tags=["students"], dependencies=[Depends(require_admin_or_faculty())])

class StudentCreate(BaseModel):
    email: EmailStr
    password: str
    roll_number: str
    first_name: str
    last_name: str
    department_id: Optional[int] = None
    semester_id: Optional[int] = None
    division_id: Optional[int] = None

class StudentResponse(BaseModel):
    user_id: int
    email: str
    roll_number: str
    first_name: str
    last_name: str
    is_active: bool
    department_id: Optional[int]
    semester_id: Optional[int] = None
    division_id: Optional[int] = None

    model_config = {"from_attributes": True}

@router.post("/", response_model=StudentResponse, dependencies=[Depends(require_admin())])
def create_student(student: StudentCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == student.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Student).filter(Student.roll_number == student.roll_number).first():
        raise HTTPException(status_code=400, detail="Roll number already exists")
        
    student_role = db.query(Role).filter(Role.name == RoleName.STUDENT).first()
    
    new_user = User(
        email=student.email,
        password_hash=get_password_hash(student.password),
        role_id=student_role.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    new_student = Student(
        user_id=new_user.id,
        roll_number=student.roll_number,
        first_name=student.first_name,
        last_name=student.last_name,
        department_id=student.department_id
    )
    db.add(new_student)
    
    if student.semester_id and student.division_id:
        new_enrollment = StudentEnrollment(
            student_id=new_user.id,
            semester_id=student.semester_id,
            division_id=student.division_id,
            is_active=True
        )
        db.add(new_enrollment)
        
    db.add(AuditLog(action="CREATE_STUDENT", target_resource="students", target_id=str(new_user.id)))
    db.commit()
    
    return {
        "user_id": new_user.id,
        "email": new_user.email,
        "roll_number": new_student.roll_number,
        "first_name": new_student.first_name,
        "last_name": new_student.last_name,
        "is_active": new_user.is_active,
        "department_id": new_student.department_id,
        "semester_id": student.semester_id,
        "division_id": student.division_id
    }

@router.get("/", response_model=List[StudentResponse])
def list_students(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    semester_id: Optional[int] = None,
    division_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if semester_id and division_id:
        div = db.query(Division).filter(Division.id == division_id).first()
        if not div or div.semester_id != semester_id:
            raise HTTPException(status_code=400, detail="Invalid semester and division combination")

    query = db.query(Student).join(User)
    query = query.join(Student.enrollments).filter(StudentEnrollment.is_active == True)

    if current_user.role.name == RoleName.FACULTY:
        scopes = get_faculty_scopes(db, current_user.id)
        allowed_divisions = scopes["divisions"]
        if division_id and division_id not in allowed_divisions:
            raise HTTPException(status_code=403, detail="Not authorized to access this division")
        if semester_id and semester_id not in scopes["semesters"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this semester")
        
        # Enforce scoping unconditionally for faculty
        query = query.filter(StudentEnrollment.division_id.in_(allowed_divisions))

    if semester_id:
        query = query.filter(StudentEnrollment.semester_id == semester_id)
    if division_id:
        query = query.filter(StudentEnrollment.division_id == division_id)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Student.first_name.ilike(search_pattern)) |
            (Student.last_name.ilike(search_pattern)) |
            (Student.roll_number.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )

    students = query.offset(skip).limit(limit).all()
    result = []
    for s in students:
        active_enrollment = next((e for e in s.enrollments if e.is_active), None)
        result.append({
            "user_id": s.user_id,
            "email": s.user.email,
            "roll_number": s.roll_number,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "is_active": s.user.is_active,
            "department_id": s.department_id,
            "semester_id": active_enrollment.semester_id if active_enrollment else None,
            "division_id": active_enrollment.division_id if active_enrollment else None
        })
    return result

@router.get("/{user_id}", response_model=StudentResponse)
def get_student(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    active_enrollment = next((e for e in student.enrollments if e.is_active), None)
    
    if current_user.role.name == RoleName.FACULTY:
        scopes = get_faculty_scopes(db, current_user.id)
        allowed_divisions = scopes["divisions"]
        if not active_enrollment or active_enrollment.division_id not in allowed_divisions:
            raise HTTPException(status_code=404, detail="Student not found")
    return {
        "user_id": student.user_id,
        "email": student.user.email,
        "roll_number": student.roll_number,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "is_active": student.user.is_active,
        "department_id": student.department_id,
        "semester_id": active_enrollment.semester_id if active_enrollment else None,
        "division_id": active_enrollment.division_id if active_enrollment else None
    }

@router.post("/{user_id}/toggle-status", dependencies=[Depends(require_admin())])
def toggle_student_status(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role.name != RoleName.STUDENT:
        raise HTTPException(status_code=404, detail="Student not found")
        
    user.is_active = not user.is_active
    db.add(AuditLog(action="TOGGLE_STUDENT_STATUS", target_resource="users", target_id=str(user.id), details=f"Active: {user.is_active}"))
    db.commit()
    return {"status": "success", "is_active": user.is_active}


class StudentProfileUpdate(BaseModel):
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None

@router.put("/profile")
def update_student_profile(profile_data: StudentProfileUpdate, current_user: User = Depends(require_role(RoleName.STUDENT)), db: Session = Depends(get_db)):
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    if profile_data.phone is not None:
        student.phone = profile_data.phone
    if profile_data.blood_group is not None:
        student.blood_group = profile_data.blood_group
    if profile_data.address is not None:
        student.address = profile_data.address
        
    db.commit()
    db.refresh(student)
    return {"status": "ok", "message": "Profile updated successfully"}


@router.post("/bulk-import", dependencies=[Depends(require_admin())])
def bulk_import_students(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
    content = file.file.read()
    try:
        decoded_content = content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            decoded_content = content.decode('iso-8859-1')
        except:
            raise HTTPException(status_code=400, detail="Invalid file encoding. Please use UTF-8.")

    csv_reader = csv.DictReader(io.StringIO(decoded_content))
    
    # Required columns
    required_columns = {"first_name", "last_name", "email", "password", "roll_number"}
    if not csv_reader.fieldnames or not required_columns.issubset(set(csv_reader.fieldnames)):
        raise HTTPException(status_code=400, detail=f"Missing required columns. Required: {', '.join(required_columns)}")

    success_count = 0
    duplicate_count = 0
    errors = []
    
    student_role = db.query(Role).filter(Role.name == RoleName.STUDENT).first()

    # Use nested transaction to validate everything
    try:
        with db.begin_nested():
            for row_num, row in enumerate(csv_reader, start=2): # header is 1
                email = row.get('email', '').strip()
                roll_number = row.get('roll_number', '').strip()
                first_name = row.get('first_name', '').strip()
                last_name = row.get('last_name', '').strip()
                password = row.get('password', '').strip()
                
                if not email or not roll_number or not first_name or not password:
                    errors.append({"row": row_num, "reason": "Missing required data fields (email, roll_number, first_name, password)"})
                    continue
                    
                # Check duplicates in DB
                if db.query(User).filter(User.email == email).first():
                    duplicate_count += 1
                    errors.append({"row": row_num, "reason": f"Email '{email}' already registered"})
                    continue
                    
                if db.query(Student).filter(Student.roll_number == roll_number).first():
                    duplicate_count += 1
                    errors.append({"row": row_num, "reason": f"Roll number '{roll_number}' already exists"})
                    continue
                    
                new_user = User(
                    email=email,
                    password_hash=get_password_hash(password),
                    role_id=student_role.id
                )
                db.add(new_user)
                db.flush() # flush to get user.id
                
                new_student = Student(
                    user_id=new_user.id,
                    roll_number=roll_number,
                    first_name=first_name,
                    last_name=last_name,
                    department_id=None # Optional
                )
                db.add(new_student)
                db.add(AuditLog(action="BULK_IMPORT_STUDENT", target_resource="students", target_id=str(new_user.id)))
                success_count += 1
                
            if errors:
                # If there are any errors, rollback the nested transaction
                db.rollback()
                raise ValueError("Validation failed")
                
        db.commit() # Commit outer transaction
    except ValueError:
        db.rollback()
        return {
            "success": False,
            "total_processed": row_num - 1,
            "success_count": 0,
            "duplicate_count": duplicate_count,
            "errors": errors,
            "message": "Import failed due to validation errors. No students were created."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {
        "success": True,
        "total_processed": row_num - 1,
        "success_count": success_count,
        "duplicate_count": duplicate_count,
        "errors": errors,
        "message": f"Successfully imported {success_count} students."
    }

