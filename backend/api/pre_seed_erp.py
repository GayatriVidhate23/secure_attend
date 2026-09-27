import sys
import os
import datetime
sys.path.append(os.path.join(os.path.dirname(__file__)))
from database import SessionLocal
import models

db = SessionLocal()

def get_or_create(model, **kwargs):
    instance = db.query(model).filter_by(name=kwargs.get("name")).first()
    if not instance:
        instance = model(**kwargs)
        db.add(instance)
        db.commit()
        db.refresh(instance)
    return instance

ay = get_or_create(models.AcademicYear, name="2023-2024", start_date=datetime.date(2023, 8, 1), end_date=datetime.date(2024, 5, 31), is_active=True)
get_or_create(models.Division, name="A")
get_or_create(models.Division, name="B")
get_or_create(models.Semester, name="SE Sem 3", academic_year_id=ay.id)
get_or_create(models.Semester, name="TE Sem 5", academic_year_id=ay.id)
get_or_create(models.Semester, name="BE Sem 7", academic_year_id=ay.id)
get_or_create(models.Role, name=models.RoleName.STUDENT, description="Student")
get_or_create(models.Role, name=models.RoleName.PARENT, description="Parent")
