# SecureAttend AI — System Overview

SecureAttend AI is a robust, mobile-first attendance management system designed to eliminate proxy attendance and streamline the process of recording student presence in academic institutions. It combines several layers of modern security and validation to ensure that attendance data is absolutely trustworthy.

## Core Value Proposition

Traditional attendance systems (like manual roll calls or static QR codes) are vulnerable to proxy attendance, buddy-punching, and time manipulation. SecureAttend AI solves this by enforcing a **Multi-Factor Proof of Presence**:
1. **Identity Proof**: Validated through on-device or server-side Facial Recognition.
2. **Location Proof**: Validated via GPS Geo-Fencing.
3. **Time & Session Proof**: Validated via HMAC-signed, time-rotating Dynamic QR Codes.

## High-Level Architecture

The system is composed of three primary components:

1. **FastAPI Backend (Python)**: The core engine of the system. It handles database interactions (SQLite/PostgreSQL), face embedding extraction and comparison (InsightFace), JWT authentication, geographic distance calculations (Haversine), and attendance record keeping.
2. **Flutter Mobile App**: The primary interface for Students and Faculty. Students use it to scan QR codes, verify their faces, and submit attendance payloads. Faculty use it to manage sessions and display dynamic QR codes in the classroom.
3. **React Web Admin Panel**: A dashboard for administrators and faculty to manage academic data (semesters, divisions, subjects), enroll users, review aggregate attendance statistics, and override records if necessary.

## Tech Stack Summary

- **Backend Framework**: FastAPI (Python 3.10+)
- **Database**: SQLite (Development) / PostgreSQL (Production) with SQLAlchemy ORM and Alembic Migrations.
- **AI/ML**: InsightFace (`buffalo_sc` model) with ONNX Runtime for face detection and embedding.
- **Mobile**: Flutter & Dart (Android & iOS).
- **Web Frontend**: React, Vite, TailwindCSS.
- **Security**: JWT (Access/Refresh), HMAC (QR Payloads), bcrypt (Passwords).
