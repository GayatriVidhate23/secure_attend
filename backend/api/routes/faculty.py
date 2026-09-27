from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from database import get_db
from models import Faculty, User, Role, RoleName, Department, AuditLog, FacultySubjectAssignment, Subject, Division, Semester, AcademicYear
from security import get_password_hash
from dependencies import require_role, require_admin, require_admin_or_faculty, get_current_user

router = APIRouter(prefix="/faculty", tags=["faculty"], dependencies=[Depends(require_admin_or_faculty())])

class FacultyCreate(BaseModel):
    email: EmailStr
    password: str
    employee_id: str
    first_name: str
    last_name: str
    department_id: Optional[int] = None

class FacultyResponse(BaseModel):
    user_id: int
    email: str
    employee_id: str
    first_name: str
    last_name: str
    is_active: bool
    department_id: Optional[int]

@router.post("/", response_model=FacultyResponse, dependencies=[Depends(require_admin())])
def create_faculty(faculty: FacultyCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == faculty.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Faculty).filter(Faculty.employee_id == faculty.employee_id).first():
        raise HTTPException(status_code=400, detail="Employee ID already exists")
        
    faculty_role = db.query(Role).filter(Role.name == RoleName.FACULTY).first()
    
    new_user = User(
        email=faculty.email,
        password_hash=get_password_hash(faculty.password),
        role_id=faculty_role.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    new_faculty = Faculty(
        user_id=new_user.id,
        employee_id=faculty.employee_id,
        first_name=faculty.first_name,
        last_name=faculty.last_name,
        department_id=faculty.department_id
    )
    db.add(new_faculty)
    db.add(AuditLog(action="CREATE_FACULTY", target_resource="faculty", target_id=str(new_user.id)))
    db.commit()
    
    return {
        "user_id": new_user.id,
        "email": new_user.email,
        "employee_id": new_faculty.employee_id,
        "first_name": new_faculty.first_name,
        "last_name": new_faculty.last_name,
        "is_active": new_user.is_active,
        "department_id": new_faculty.department_id
    }

@router.get("/", response_model=List[FacultyResponse], dependencies=[Depends(require_admin())])
def list_faculty(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    faculty_list = db.query(Faculty).join(User).offset(skip).limit(limit).all()
    result = []
    for f in faculty_list:
        result.append({
            "user_id": f.user_id,
            "email": f.user.email,
            "employee_id": f.employee_id,
            "first_name": f.first_name,
            "last_name": f.last_name,
            "is_active": f.user.is_active,
            "department_id": f.department_id
        })
    return result

@router.get("/{user_id}", response_model=FacultyResponse)
def get_faculty(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.name == RoleName.FACULTY and user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Faculty not found")
        
    faculty = db.query(Faculty).filter(Faculty.user_id == user_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
        
    return {
        "user_id": faculty.user_id,
        "email": faculty.user.email,
        "employee_id": faculty.employee_id,
        "first_name": faculty.first_name,
        "last_name": faculty.last_name,
        "is_active": faculty.user.is_active,
        "department_id": faculty.department_id
    }

@router.post("/{user_id}/toggle-status", dependencies=[Depends(require_admin())])
def toggle_faculty_status(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role.name != RoleName.FACULTY:
        raise HTTPException(status_code=404, detail="Faculty not found")
        
    user.is_active = not user.is_active
    db.add(AuditLog(action="TOGGLE_FACULTY_STATUS", target_resource="users", target_id=str(user.id), details=f"Active: {user.is_active}"))
    db.commit()
    return {"status": "success", "is_active": user.is_active}

class AssignSubjectRequest(BaseModel):
    subject_id: int
    division_id: int

@router.post("/{user_id}/subjects", dependencies=[Depends(require_admin())])
def assign_subject(user_id: int, request: AssignSubjectRequest, db: Session = Depends(get_db)):
    faculty = db.query(Faculty).filter(Faculty.user_id == user_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
        
    existing = db.query(FacultySubjectAssignment).filter(
        FacultySubjectAssignment.faculty_id == user_id,
        FacultySubjectAssignment.subject_id == request.subject_id,
        FacultySubjectAssignment.division_id == request.division_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject and division already assigned to this faculty")
        
    semester = db.query(Semester).first()
    if not semester:
        academic_year = db.query(AcademicYear).first()
        if not academic_year:
            from datetime import date
            academic_year = AcademicYear(name="2026-2027", start_date=date(2026, 8, 1), end_date=date(2027, 5, 31), is_active=True)
            db.add(academic_year)
            db.commit()
            db.refresh(academic_year)
            
        semester = Semester(name="Fall 2026", is_active=True, academic_year_id=academic_year.id)
        db.add(semester)
        db.commit()
        db.refresh(semester)
        
    assignment = FacultySubjectAssignment(
        faculty_id=user_id,
        subject_id=request.subject_id,
        division_id=request.division_id,
        semester_id=semester.id
    )
    db.add(assignment)
    db.commit()
    return {"status": "success", "message": "Subject assigned"}

@router.get("/{user_id}/subjects")
def get_faculty_subjects(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.name == RoleName.FACULTY and user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
        
    assignments = db.query(FacultySubjectAssignment).filter(FacultySubjectAssignment.faculty_id == user_id).all()
    result = []
    for a in assignments:
        subject = db.query(Subject).filter(Subject.id == a.subject_id).first()
        division = db.query(Division).filter(Division.id == a.division_id).first()
        if subject and division:
            result.append({
                "assignment_id": a.id,
                "subject_id": subject.id,
                "subject_name": subject.name,
                "subject_code": subject.code,
                "semester_id": a.semester_id,
                "division_id": division.id,
                "division_name": division.name
            })
    return result
