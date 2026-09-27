import numpy as np
import math
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Dict, Any

from database import get_db
from models import User, Student, AttendanceSession, AttendanceRecord, FaceTemplate, CampusSettings
from schemas import AttendanceMarkRequest, AttendanceSessionResponse
from dependencies import get_current_user, require_role, RoleName
from security import verify_attendance_qr_token, create_face_proof_token, verify_face_proof_token
from services.face_service import face_service

router = APIRouter(prefix="/student", tags=["Student Attendance"])

@router.post("/face-enrollment/enroll")
async def enroll_own_face(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(RoleName.STUDENT)),
    db: Session = Depends(get_db)
):
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found.")
        
    try:
        image_bytes = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read uploaded image.")

    try:
        embedding, metadata = face_service.detect_and_get_embedding(image_bytes)
    except Exception as e:
        msg = getattr(e, 'detail', str(e))
        print(f"Enroll Processing Error: {msg}")
        raise HTTPException(status_code=400, detail=msg)

    raw_embedding_bytes = embedding.tobytes()
    
    existing_template = db.query(FaceTemplate).filter(FaceTemplate.student_id == student.user_id).first()
    if existing_template:
        existing_template.embedding = raw_embedding_bytes
        existing_template.embedding_dimension = metadata["embedding_dimension"]
        existing_template.model_name = metadata["model_name"]
        existing_template.is_active = True
    else:
        new_template = FaceTemplate(
            student_id=student.user_id,
            embedding=raw_embedding_bytes,
            embedding_dimension=metadata["embedding_dimension"],
            model_name=metadata["model_name"],
            is_active=True
        )
        db.add(new_template)
    
    student.face_profile_active = True
    db.commit()

    return {
        "status": "success",
        "message": "Face enrolled successfully",
        "model_name": metadata["model_name"]
    }

@router.post("/face-verification/verify")
async def verify_student_face(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(RoleName.STUDENT)),
    db: Session = Depends(get_db)
):
    student = current_user.student_profile
    if not student or not student.face_profile_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student does not have an active face profile enrolled."
        )

    # 1. Fetch Enrolled Embedding
    template = db.query(FaceTemplate).filter(
        FaceTemplate.student_id == student.user_id,
        FaceTemplate.is_active == True
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active face template found."
        )
    
    enrolled_embedding = np.frombuffer(template.embedding, dtype=np.float32)

    # 2. Extract Embedding from Captured Image
    try:
        image_bytes = await file.read()
        captured_embedding, _ = face_service.detect_and_get_embedding(image_bytes)
    except Exception as e:
        print(f"Error during face detection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # 3. Compare Embeddings
    try:
        is_match = face_service.compare_faces(enrolled_embedding, captured_embedding, threshold=0.40) # Lowered threshold slightly just in case
        
        print(f"Match: {is_match}, Similarity: {np.dot(enrolled_embedding, captured_embedding)}")
            
        if not is_match:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Face verification failed. Similarity: {np.dot(enrolled_embedding, captured_embedding):.2f}"
            )
    except Exception as e:
        print(f"Error during comparison: {str(e)}")
        raise

    # 4. Generate Face Proof Token
    face_proof_token = create_face_proof_token(student.user_id)
    
    return {
        "status": "success",
        "message": "Face verified successfully",
        "face_proof_token": face_proof_token
    }

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Radius of earth in meters
    phi_1 = math.radians(lat1)
    phi_2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi_1) * math.cos(phi_2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.post("/attendance/mark")
def mark_attendance(
    request: AttendanceMarkRequest,
    current_user: User = Depends(require_role(RoleName.STUDENT)),
    db: Session = Depends(get_db)
):
    student = current_user.student_profile

    # 1. Validate Face Proof Token
    proof_student_id = verify_face_proof_token(request.face_proof_token)
    if not proof_student_id or proof_student_id != student.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired face proof token. Please verify your face again."
        )

    # 2. Validate QR Token
    session_id_str = verify_attendance_qr_token(request.qr_token)
    if not session_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired attendance QR code."
        )
    
    session_id = int(session_id_str)

    # 3. Validate Attendance Session
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance session not found."
        )
    
    if not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance session has already ended."
        )

    # 4. Check for duplicate attendance
    existing_record = db.query(AttendanceRecord).filter(
        AttendanceRecord.attendance_session_id == session.id,
        AttendanceRecord.student_id == student.user_id
    ).first()

    if existing_record:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance already marked for this session."
        )

    # 5. Validate Geofence
    campus_settings = db.query(CampusSettings).filter(CampusSettings.id == 1).first()
    if not campus_settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campus geofence configuration is missing. Please contact an Administrator."
        )
    
    if request.latitude < -90 or request.latitude > 90 or request.longitude < -180 or request.longitude > 180:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid GPS coordinates format."
        )

    distance = haversine_distance(
        request.latitude, request.longitude,
        campus_settings.latitude, campus_settings.longitude
    )
    
    if distance > campus_settings.radius_meters:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You are outside the campus geofence (Distance: {int(distance)} meters). Attendance denied."
        )

    # 6. Create Attendance Record
    new_record = AttendanceRecord(
        attendance_session_id=session.id,
        student_id=student.user_id,
        status="PRESENT"
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return {
        "status": "success",
        "message": "Attendance marked successfully",
        "record_id": new_record.id,
        "marked_at": new_record.marked_at,
        "subject_name": session.subject.name,
        "faculty_name": f"{session.faculty.first_name} {session.faculty.last_name}"
    }
