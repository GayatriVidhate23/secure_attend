from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session
from config import get_settings
from database import get_db
from models import User, RoleName
from pydantic import BaseModel, ValidationError

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

class TokenPayload(BaseModel):
    sub: str
    role: str
    type: str

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        token_data = TokenPayload(**payload)
        
        if token_data.type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
    except (jwt.PyJWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == int(token_data.sub)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return user

def require_role(*roles: RoleName):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role.name not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="auth/insufficient-permissions"
            )
        return current_user
    return role_checker

from models import FacultyResponsibility

def require_admin():
    return require_role(RoleName.ADMIN)

def require_faculty():
    return require_role(RoleName.FACULTY)

def require_admin_or_faculty():
    return require_role(RoleName.ADMIN, RoleName.FACULTY)

def get_faculty_scopes(db: Session, faculty_user_id: int) -> dict:
    from models import FacultySubjectAssignment
    assignments = db.query(FacultySubjectAssignment).filter(
        FacultySubjectAssignment.faculty_id == faculty_user_id
    ).all()
    
    allowed_divisions = set()
    allowed_subjects = set()
    allowed_semesters = set()
    
    for a in assignments:
        if a.division_id:
            allowed_divisions.add(a.division_id)
        if a.subject_id:
            allowed_subjects.add(a.subject_id)
        if a.semester_id:
            allowed_semesters.add(a.semester_id)
            
    return {
        "divisions": allowed_divisions,
        "subjects": allowed_subjects,
        "semesters": allowed_semesters
    }

def require_student():
    return require_role(RoleName.STUDENT)

def require_parent():
    return require_role(RoleName.PARENT)

def require_hod(current_user: User = Depends(require_faculty()), db: Session = Depends(get_db)):
    resp = db.query(FacultyResponsibility).filter_by(faculty_id=current_user.id).first()
    if not resp or not resp.is_hod:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requires HOD privileges")
    return current_user

def require_amc(current_user: User = Depends(require_faculty()), db: Session = Depends(get_db)):
    resp = db.query(FacultyResponsibility).filter_by(faculty_id=current_user.id).first()
    if not resp or not resp.is_amc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requires AMC privileges")
    return current_user

def require_gfm(current_user: User = Depends(require_faculty()), db: Session = Depends(get_db)):
    resp = db.query(FacultyResponsibility).filter_by(faculty_id=current_user.id).first()
    if not resp or not resp.is_gfm:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requires GFM privileges")
    return current_user
