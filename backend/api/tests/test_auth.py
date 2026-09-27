import pytest
import jwt
from fastapi.testclient import TestClient
from models import User, RefreshToken, RoleName
from config import get_settings

settings = get_settings()

def test_login_success(client: TestClient, seeded_db):
    response = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "testpass"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_login_invalid_credentials(client: TestClient, seeded_db):
    response = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "wrong"})
    assert response.status_code == 401

def test_login_inactive_user(client: TestClient, seeded_db):
    user = seeded_db.query(User).filter(User.email == "admin@test.com").first()
    user.is_active = false = False
    seeded_db.commit()
    
    response = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "testpass"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Inactive user"

def test_refresh_token_success_and_rotation(client: TestClient, seeded_db):
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "testpass"})
    refresh_token = login_res.json()["refresh_token"]
    
    refresh_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200
    new_data = refresh_res.json()
    assert new_data["access_token"] != login_res.json()["access_token"]
    assert new_data["refresh_token"] != refresh_token
    
    # Old refresh token should now be revoked
    old_refresh_attempt = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert old_refresh_attempt.status_code == 401
    assert old_refresh_attempt.json()["detail"] == "Token revoked"

def test_refresh_token_reuse_revokes_family(client: TestClient, seeded_db):
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "testpass"})
    refresh_token = login_res.json()["refresh_token"]
    
    # First use (legitimate)
    client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    
    # Second use (malicious reuse)
    reuse_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert reuse_res.status_code == 401
    assert reuse_res.json()["detail"] == "Token revoked"
    
    # Entire family should be revoked, so the legitimate new token would fail (if we saved it, but we can check DB)
    tokens = seeded_db.query(RefreshToken).all()
    assert all(t.revoked for t in tokens)

def test_rbac_admin_endpoint_protection(client: TestClient, seeded_db):
    # Test with admin
    admin_login = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "testpass"})
    admin_token = admin_login.json()["access_token"]
    
    res = client.get("/api/v1/academic/departments", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    
    # Test with student
    student_login = client.post("/api/v1/auth/login", json={"email": "student@test.com", "password": "testpass"})
    student_token = student_login.json()["access_token"]
    
    res = client.get("/api/v1/academic/departments", headers={"Authorization": f"Bearer {student_token}"})
    assert res.status_code == 403
    assert res.json()["detail"] == "auth/insufficient-permissions"
