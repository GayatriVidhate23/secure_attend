from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import Department, Subject, AcademicYear, Semester, Division, RoleName
from dependencies import require_role, get_current_user, get_faculty_scopes, require_admin_or_faculty
from models import User

router = APIRouter(prefix="/academic", tags=["academic"], dependencies=[Depends(require_role(RoleName.ADMIN, RoleName.FACULTY))])

# Models
class DepartmentCreate(BaseModel):
    code: str
    name: str

class DepartmentResponse(DepartmentCreate):
    id: int
    model_config = {"from_attributes": True}

class SubjectCreate(BaseModel):
    code: Optional[str] = None
    name: str
    department_id: int
    semester_id: Optional[int] = None
    is_active: bool = True
    subject_type: Optional[str] = None

class SubjectResponse(SubjectCreate):
    id: int
    model_config = {"from_attributes": True}

class DivisionResponse(BaseModel):
    id: int
    name: str
    semester_id: Optional[int] = None
    department_id: Optional[int] = None
    is_active: bool = True
    model_config = {"from_attributes": True}

class SemesterResponse(BaseModel):
    id: int
    academic_year_id: int
    name: str
    number: Optional[int] = None
    is_active: bool = True
    model_config = {"from_attributes": True}

# Endpoints
@router.post("/departments", response_model=DepartmentResponse)
def create_department(dept: DepartmentCreate, db: Session = Depends(get_db)):
    if db.query(Department).filter(Department.code == dept.code).first():
        raise HTTPException(status_code=400, detail="Department code already exists")
    db_dept = Department(**dept.model_dump())
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()

@router.post("/subjects", response_model=SubjectResponse)
def create_subject(subj: SubjectCreate, db: Session = Depends(get_db)):
    if db.query(Subject).filter(Subject.code == subj.code).first():
        raise HTTPException(status_code=400, detail="Subject code already exists")
    db_subj = Subject(**subj.model_dump())
    db.add(db_subj)
    db.commit()
    db.refresh(db_subj)
    return db_subj

@router.get("/subjects", response_model=List[SubjectResponse])
def list_subjects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Subject)
    if current_user.role.name == RoleName.FACULTY:
        scopes = get_faculty_scopes(db, current_user.id)
        query = query.filter(Subject.id.in_(scopes["subjects"]))
    return query.all()

@router.get("/divisions", response_model=List[DivisionResponse])
def list_divisions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Division)
    if current_user.role.name == RoleName.FACULTY:
        scopes = get_faculty_scopes(db, current_user.id)
        query = query.filter(Division.id.in_(scopes["divisions"]))
    return query.all()

@router.get("/semesters", response_model=List[SemesterResponse])
def list_semesters(db: Session = Depends(get_db)):
    return db.query(Semester).all()
