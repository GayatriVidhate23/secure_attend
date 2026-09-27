from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Student, Faculty, Subject, Division, RoleName, StudentEnrollment
from dependencies import require_role

router = APIRouter(prefix="/stats", tags=["admin-stats"], dependencies=[Depends(require_role(RoleName.ADMIN))])

@router.get("/")
def get_admin_stats(db: Session = Depends(get_db)):
    total_students = db.query(Student).count()
    total_faculty = db.query(Faculty).count()
    total_subjects = db.query(Subject).count()
    total_divisions = db.query(Division).count()

    def get_count(sem_id: int, div_name: str = None):
        q = db.query(StudentEnrollment).filter(StudentEnrollment.semester_id == sem_id, StudentEnrollment.is_active == True)
        if div_name:
            div = db.query(Division).filter(Division.semester_id == sem_id, Division.name == div_name).first()
            if div:
                q = q.filter(StudentEnrollment.division_id == div.id)
            else:
                return 0
        return q.count()

    # Mapping based on DB: sem3=1, sem5=3, sem7=5
    sem3_id = 1
    sem5_id = 3
    sem7_id = 5

    return {
        "total_students": total_students,
        "total_faculty": total_faculty,
        "total_subjects": total_subjects,
        "total_divisions": total_divisions,
        "grouped_students": {
            "SE": {
                "total": get_count(sem3_id),
                "Division A": get_count(sem3_id, "Division A"),
                "Division B": get_count(sem3_id, "Division B")
            },
            "TE": {
                "total": get_count(sem5_id),
                "Division A": get_count(sem5_id, "Division A"),
                "Division B": get_count(sem5_id, "Division B")
            },
            "BE": {
                "total": get_count(sem7_id),
                "Division A": get_count(sem7_id, "Division A"),
                "Division B": get_count(sem7_id, "Division B")
            }
        }
    }
