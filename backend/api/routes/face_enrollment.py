from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Dict, Any
import json

from database import get_db
from models import User, Student, FaceTemplate, RoleName
from dependencies import require_role, require_admin_or_faculty, get_faculty_scopes
from services.face_service import face_service, FaceProcessingError

router = APIRouter(prefix="/students", tags=["Face Enrollment"])

@router.get("/{student_id}/face-enrollment/status")
def get_face_enrollment_status(
    student_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_faculty())
):
    student = db.query(Student).filter(Student.user_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role.name == RoleName.FACULTY:
        scopes = get_faculty_scopes(db, current_user.id)
        active_enrollment = next((e for e in student.enrollments if e.is_active), None)
        if not active_enrollment or active_enrollment.division_id not in scopes["divisions"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this student")

    template = db.query(FaceTemplate).filter(
        FaceTemplate.student_id == student_id,
        FaceTemplate.is_active == True
    ).first()

    if not template:
        return {
            "face_enrolled": False
        }

    return {
        "face_enrolled": True,
        "enrolled_at": template.enrolled_at,
        "model_name": template.model_name
    }


@router.post("/{student_id}/face-enrollment")
async def enroll_student_face(
    student_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role(RoleName.ADMIN))
):
    student = db.query(Student).filter(Student.user_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if not student.user.is_active:
        raise HTTPException(status_code=400, detail="Cannot enroll face for inactive student.")

    # Read image bytes
    try:
        image_bytes = await image.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read uploaded image.")

    # Process face
    try:
        embedding, metadata = face_service.detect_and_get_embedding(image_bytes)
    except FaceProcessingError as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.detail})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal face processing error: {str(e)}")

    # Store new template
    raw_embedding_bytes = embedding.tobytes()
    
    existing_template = db.query(FaceTemplate).filter(FaceTemplate.student_id == student_id).first()
    if existing_template:
        existing_template.embedding = raw_embedding_bytes
        existing_template.embedding_dimension = metadata["embedding_dimension"]
        existing_template.model_name = metadata["model_name"]
        existing_template.is_active = True
    else:
        new_template = FaceTemplate(
            student_id=student_id,
            embedding=raw_embedding_bytes,
            embedding_dimension=metadata["embedding_dimension"],
            model_name=metadata["model_name"],
            is_active=True
        )
        db.add(new_template)
    
    student.face_profile_active = True
    db.commit()

    return {
        "success": True,
        "student_id": student_id,
        "face_enrolled": True,
        "model_name": metadata["model_name"]
    }

@router.delete("/{student_id}/face-enrollment")
def remove_face_enrollment(
    student_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role(RoleName.ADMIN))
):
    student = db.query(Student).filter(Student.user_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    templates = db.query(FaceTemplate).filter(FaceTemplate.student_id == student_id).all()
    for t in templates:
        t.is_active = False
        
    student.face_profile_active = False
    
    db.commit()
    
    return {"success": True, "message": "Face enrollment removed"}
