from fastapi import FastAPI, Depends, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from config import get_settings
from database import get_db, Base, engine
from routes import auth, students, faculty, academic, face_enrollment, attendance, student_attendance, erp, admin_stats, admin_settings, reports

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api/v1")

@api_router.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.environment}

api_router.include_router(auth.router)
api_router.include_router(students.router)
api_router.include_router(faculty.router)
api_router.include_router(academic.router)
api_router.include_router(face_enrollment.router)
api_router.include_router(attendance.router, prefix="/admin")
api_router.include_router(student_attendance.router)
api_router.include_router(erp.router)
api_router.include_router(admin_stats.router, prefix="/admin")
api_router.include_router(admin_settings.router, prefix="/admin")
api_router.include_router(reports.router)
app.include_router(api_router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global Exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "system/internal-error", "message": str(exc)}}
    )

from fastapi.exceptions import RequestValidationError
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"Validation Error 422: {str(exc)}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )
