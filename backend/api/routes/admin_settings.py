from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import CampusSettings, User
from schemas import CampusSettingsCreate, CampusSettingsResponse
from dependencies import require_role, RoleName

router = APIRouter(tags=["Admin Settings"])

@router.get("/settings/geofence", response_model=CampusSettingsResponse)
def get_geofence_settings(
    current_user: User = Depends(require_role(RoleName.ADMIN)),
    db: Session = Depends(get_db)
):
    settings = db.query(CampusSettings).filter(CampusSettings.id == 1).first()
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campus geofence settings not found."
        )
    return settings

@router.post("/settings/geofence", response_model=CampusSettingsResponse)
def update_geofence_settings(
    request: CampusSettingsCreate,
    current_user: User = Depends(require_role(RoleName.ADMIN)),
    db: Session = Depends(get_db)
):
    if request.latitude < -90 or request.latitude > 90:
        raise HTTPException(status_code=422, detail="Invalid latitude. Must be between -90 and 90.")
    if request.longitude < -180 or request.longitude > 180:
        raise HTTPException(status_code=422, detail="Invalid longitude. Must be between -180 and 180.")
    if request.radius_meters <= 0:
        raise HTTPException(status_code=422, detail="Radius must be strictly positive.")
    if request.radius_meters > 50000:
        raise HTTPException(status_code=422, detail="Radius exceeds maximum allowed limit (50km).")

    settings = db.query(CampusSettings).filter(CampusSettings.id == 1).first()
    if not settings:
        settings = CampusSettings(
            id=1,
            latitude=request.latitude,
            longitude=request.longitude,
            radius_meters=request.radius_meters,
            qr_duration_seconds=request.qr_duration_seconds,
            enforce_liveness=request.enforce_liveness
        )
        db.add(settings)
    else:
        settings.latitude = request.latitude
        settings.longitude = request.longitude
        settings.radius_meters = request.radius_meters
        settings.qr_duration_seconds = request.qr_duration_seconds
        settings.enforce_liveness = request.enforce_liveness

    db.commit()
    db.refresh(settings)
    return settings
