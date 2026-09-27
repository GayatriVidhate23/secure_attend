from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import hashlib
import uuid
import jwt
from datetime import datetime, timezone, timedelta

from database import get_db
from models import User, RefreshToken, AuditLog
from schemas import Token, LoginRequest, RefreshRequest
from security import verify_password, create_access_token, create_refresh_token
from config import get_settings
from dependencies import get_current_user

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        db.add(AuditLog(action="FAILED_LOGIN", target_resource="users", target_id=request.email))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Generate tokens
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.name.value})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "role": user.role.name.value})
    
    family_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    
    db_token = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh_token),
        family_id=family_id,
        expires_at=expires_at
    )
    
    db.add(db_token)
    db.add(AuditLog(user_id=user.id, action="LOGIN", target_resource="users", target_id=str(user.id)))
    db.commit()

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh", response_model=Token)
def refresh_token(request: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(
            request.refresh_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = int(payload.get("sub"))
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_hash = hash_token(request.refresh_token)
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    
    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    if db_token.revoked:
        # Token reuse detected! Revoke entire family.
        db.query(RefreshToken).filter(RefreshToken.family_id == db_token.family_id).update({"revoked": True})
        db.add(AuditLog(user_id=user_id, action="SECURITY_ALERT", details="Refresh token reuse detected"))
        db.commit()
        raise HTTPException(status_code=401, detail="Token revoked")
        
    if db_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or deleted")

    # Rotate tokens
    db_token.revoked = True
    
    new_access = create_access_token(data={"sub": str(user.id), "role": user.role.name.value})
    new_refresh = create_refresh_token(data={"sub": str(user.id), "role": user.role.name.value})
    
    new_db_token = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(new_refresh),
        family_id=db_token.family_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    )
    
    db.add(new_db_token)
    db.add(AuditLog(user_id=user.id, action="REFRESH_TOKEN", target_resource="users", target_id=str(user.id)))
    db.commit()
    
    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}

@router.post("/logout")
def logout(request: RefreshRequest, db: Session = Depends(get_db)):
    token_hash = hash_token(request.refresh_token)
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    
    if db_token and not db_token.revoked:
        db_token.revoked = True
        db.add(AuditLog(user_id=db_token.user_id, action="LOGOUT", target_resource="users"))
        db.commit()
        
    return {"status": "ok", "message": "Logged out successfully"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    profile = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.name.value,
        "is_active": current_user.is_active,
        "first_name": "",
        "last_name": ""
    }
    
    if hasattr(current_user, 'student_profile') and current_user.student_profile:
        profile["first_name"] = current_user.student_profile.first_name
        profile["last_name"] = current_user.student_profile.last_name
        profile["student_id"] = current_user.student_profile.roll_number
        profile["face_profile_active"] = current_user.student_profile.face_profile_active
    elif hasattr(current_user, 'faculty_profile') and current_user.faculty_profile:
        profile["first_name"] = current_user.faculty_profile.first_name
        profile["last_name"] = current_user.faculty_profile.last_name
        
    return profile
