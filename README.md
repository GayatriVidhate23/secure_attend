# Secure Attend

Secure Attend is a comprehensive, modern attendance management system. It provides an efficient platform for managing student attendance, faculty sessions, and administrative tasks.

## 🏗️ Architecture
- **Backend:** Python FastAPI, SQLite Database, SQLAlchemy
- **Frontend:** React, Vite, Tailwind CSS

## ✨ Features
- **Role-Based Access Control:** Distinct roles for Admin, Faculty, and Students.
- **Admin Dashboard:** Comprehensive view for managing students, faculty, academic years, and attendance reports.
- **Attendance Tracking:** Real-time attendance marking and face-enrollment integrations.
- **Student Portal:** View schedules, track attendance, and manage profiles.

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 16+

### Setting up the Backend
1. Navigate to the API directory:
   ```bash
   cd backend/api
   ```
2. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the development server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
   *The backend will be available at http://localhost:8000*

### Setting up the Frontend
1. Navigate to the Admin directory:
   ```bash
   cd backend/admin
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The dashboard will be available at http://localhost:5173*

## 🔑 Default Credentials (Development)
- **Admin Email:** `admin@secureattend.ai`
- **Admin Password:** `Admin@123!`
