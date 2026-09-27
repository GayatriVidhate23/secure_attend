import asyncio
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Role, Permission, RolePermission, User, RoleName, Department
from security import get_password_hash

# Pre-defined permissions mapped by role
ROLE_PERMISSIONS = {
    RoleName.ADMIN: [
        "admin:dashboard:view", "admin:students:manage", "admin:faculty:manage",
        "admin:academic:manage", "admin:attendance:view", "admin:attendance:correct",
        "admin:face-enrollment:manage", "admin:reports:view", "admin:settings:manage",
        "admin:audit:view"
    ],
    RoleName.FACULTY: [
        "faculty:sessions:create", "faculty:sessions:manage", "faculty:sessions:view",
        "faculty:schedule:view", "student:profile:view"
    ],
    RoleName.STUDENT: [
        "student:attendance:mark", "student:face-verification:perform",
        "student:schedule:view", "student:profile:view", "student:notifications:view"
    ]
}

def seed_db():
    print("Starting database seed...")
    db = SessionLocal()
    
    try:
        # Seed Permissions
        all_perms = set()
        for perms in ROLE_PERMISSIONS.values():
            all_perms.update(perms)
            
        db_perms = {}
        for code in all_perms:
            perm = db.query(Permission).filter(Permission.code == code).first()
            if not perm:
                perm = Permission(code=code, description=f"Permission for {code}")
                db.add(perm)
                db.commit()
                db.refresh(perm)
            db_perms[code] = perm
            
        # Seed Roles and RoleMappings
        for role_name, perms in ROLE_PERMISSIONS.items():
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name, description=f"{role_name.value} Role")
                db.add(role)
                db.commit()
                db.refresh(role)
                
            # Sync permissions
            current_role_perms = db.query(RolePermission).filter(RolePermission.role_id == role.id).all()
            current_codes = {rp.permission.code for rp in current_role_perms}
            
            for code in perms:
                if code not in current_codes:
                    db.add(RolePermission(role_id=role.id, permission_id=db_perms[code].id))
                    
            db.commit()

        # Seed Admin User
        admin_email = "admin@secureattend.ai"
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            admin_role = db.query(Role).filter(Role.name == RoleName.ADMIN).first()
            hashed_pwd = get_password_hash("Admin@123!") # Default password for DEV
            admin_user = User(
                email=admin_email,
                password_hash=hashed_pwd,
                role_id=admin_role.id,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print(f"Created Admin user: {admin_email}")
            
        # Optional: Seed a default department for development testing
        dept = db.query(Department).filter(Department.code == "CS").first()
        if not dept:
            db.add(Department(code="CS", name="Computer Science"))
            db.commit()
            
        print("Seed completed successfully.")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
