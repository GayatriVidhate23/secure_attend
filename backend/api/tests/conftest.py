import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from database import Base, get_db
from main import app
from seed import seed_db, ROLE_PERMISSIONS
from models import Role, User, RoleName
from security import get_password_hash

import os

# Use a local file SQLite database for testing to avoid connection scope issues
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_secureattend.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 15}
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    # Ensure all models are registered
    import models
    # Create the database schema
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    
    # We patch the default get_db to return our test session
    def override_get_db():
        try:
            yield db
        finally:
            db.close()
            
    app.dependency_overrides[get_db] = override_get_db
    
    yield db
    
    # Teardown
    db.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()
    # Optionally remove the test DB file
    if os.path.exists("./test_secureattend.db"):
        try:
            os.remove("./test_secureattend.db")
        except Exception:
            pass

@pytest.fixture(scope="function")
def client(db_session):
    return TestClient(app)

@pytest.fixture(scope="function")
def seeded_db(db_session):
    # Seed roles manually for testing to avoid running full seed script
    from models import RoleName, Role, Permission, RolePermission
    
    for r in RoleName:
        db_session.add(Role(name=r, description=f"{r.value} Role"))
    db_session.commit()
    
    admin_role = db_session.query(Role).filter(Role.name == RoleName.ADMIN).first()
    db_session.add(User(
        email="admin@test.com",
        password_hash=get_password_hash("testpass"),
        role_id=admin_role.id,
        is_active=True
    ))
    
    student_role = db_session.query(Role).filter(Role.name == RoleName.STUDENT).first()
    db_session.add(User(
        email="student@test.com",
        password_hash=get_password_hash("testpass"),
        role_id=student_role.id,
        is_active=True
    ))
    db_session.commit()
    
    return db_session
