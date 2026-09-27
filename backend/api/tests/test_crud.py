import pytest
from fastapi.testclient import TestClient
from models import Department

def test_create_list_departments(client: TestClient, seeded_db):
    admin_login = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "testpass"})
    admin_token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create Department
    res = client.post("/api/v1/academic/departments", json={"code": "CS", "name": "Computer Science"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["code"] == "CS"
    
    # Duplicate Department
    res_dup = client.post("/api/v1/academic/departments", json={"code": "CS", "name": "Duplicate"}, headers=headers)
    assert res_dup.status_code == 400
    
    # List Departments
    res_list = client.get("/api/v1/academic/departments", headers=headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) > 0
    assert res_list.json()[0]["code"] == "CS"

def test_student_crud(client: TestClient, seeded_db):
    admin_login = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "testpass"})
    admin_token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    student_data = {
        "email": "new_student@test.com",
        "password": "pass",
        "roll_number": "12345",
        "first_name": "Test",
        "last_name": "Student"
    }
    
    # Create Student
    res = client.post("/api/v1/students/", json=student_data, headers=headers)
    assert res.status_code == 200
    user_id = res.json()["user_id"]
    
    # List Students
    res_list = client.get("/api/v1/students/", headers=headers)
    assert res_list.status_code == 200
    assert any(s["roll_number"] == "12345" for s in res_list.json())
    
    # Toggle Status
    res_toggle = client.post(f"/api/v1/students/{user_id}/toggle-status", headers=headers)
    assert res_toggle.status_code == 200
    assert res_toggle.json()["is_active"] is False
