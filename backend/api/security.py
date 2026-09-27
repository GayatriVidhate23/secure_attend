from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid
from passlib.context import CryptContext
import jwt
from config import get_settings

settings = get_settings()

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Default: 15 minutes (or from settings if added)
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access", "jti": str(uuid.uuid4())})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    if isinstance(encoded_jwt, bytes):
        return encoded_jwt.decode("utf-8")
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh", "jti": str(uuid.uuid4())})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    if isinstance(encoded_jwt, bytes):
        return encoded_jwt.decode("utf-8")
    return encoded_jwt

def create_attendance_qr_token(session_id: int, expires_in_seconds: int = 10) -> str:
    expire = datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds)
    to_encode = {
        "sub": "attendance_qr",
        "session_id": session_id,
        "exp": expire,
        "jti": str(uuid.uuid4())
    }
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

def create_face_proof_token(student_id: int) -> str:
    # 60 seconds validity to quickly scan the QR code
    expire = datetime.now(timezone.utc) + timedelta(seconds=60)
    to_encode = {
        "sub": str(student_id),
        "type": "face_proof",
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    if isinstance(encoded_jwt, bytes):
        return encoded_jwt.decode("utf-8")
    return encoded_jwt

def verify_face_proof_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "face_proof":
            return None
        return int(payload.get("sub"))
    except (jwt.PyJWTError, ValueError, TypeError):
        return None

def verify_attendance_qr_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("sub") != "attendance_qr":
            return None
        return payload.get("session_id")
    except jwt.PyJWTError:
        return None
