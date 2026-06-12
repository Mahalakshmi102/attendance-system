# Smart Academic Attendance Monitoring System

An automated, timetable-driven, and academic calendar-based platform for managing student attendance, class synchronization, and real-time academic compliance monitoring.

---

## Architecture Overview

The platform is designed around a fully synchronized relationship between three core structural pillars:
1. **Academic Calendar**: Determines valid college working days, exam periods, and holidays.
2. **Timetable**: Defines the department, year, semester, section, and periods for every slot, mapping them directly to faculty members, subjects, and classrooms.
3. **Session Generator**: Translates the active timetable slots on scheduled calendar days into live attendance sessions automatically.

---

## Attendance Monitoring System Workflow

### 1. Academic Calendar Management
* The Admin uploads the academic calendar for the semester.
* The calendar defines working days, holidays, examination days, events, study holidays, and semester schedules.
* The system automatically references this calendar to check whether attendance sessions should be active or generated for any particular date.

### 2. Timetable Management
* The Admin creates and maintains department-wise, semester-wise, and section-wise timetables.
* Each timetable slot establishes the designated subject, assigned faculty, classroom location, and period timing.

### 3. Automatic Attendance Session Generation
* Based on the academic calendar and timetable, the system automatically schedules and opens attendance sessions for each class and period.
* No manual creation of attendance sheets is required.

### 4. Faculty Attendance Access Control
* Faculty members can only view, access, and mark attendance for the classes and subjects explicitly assigned to them in the timetable.
* The attendance entry screen remains locked until the scheduled class period ends.
* Once the period ends, the system automatically unlocks attendance entry for the assigned faculty.

### 5. Automatic Attendance Locking
* Faculty are given a limited time window (e.g., 10–15 minutes) to submit attendance.
* After submission or after the allowed time expires, the attendance entry is automatically locked to maintain audit integrity.
* Any subsequent modifications require approval from the HOD or Admin.

### 6. Student Attendance Tracking
* Attendance is recorded period-wise and subject-wise in MongoDB.
* Students can view their overall attendance percentage, subject-wise attendance logs, and date-wise attendance history through their private dashboard.

### 7. HOD Monitoring
* HODs can monitor attendance activities within their specific department.
* They can view faculty compliance, real-time submission status, student attendance statistics, and attendance defaulters.

### 8. Admin Monitoring Dashboard
* The Admin dashboard provides a real-time, 12-section overview of the entire institution:
  * Total students & faculty count
  * Live classes running in real-time
  * Attendance submission compliance status
  * Defaulter students tracking
  * Attendance analytics and charts
  * Exportable academic reports

### 9. Defaulter Management
* The system automatically flags students falling below attendance thresholds (e.g., 75%).
* Warning notifications can be generated and broadcasted to students and parents.

### 10. Reports and Analytics
* The system generates daily, weekly, monthly, and semester attendance reports.
* Reports can be exported as Excel/CSV files directly from the dashboard.
* Attendance trends and performance analytics are visualised using graphs and statistics.

---

## Overall Flow Diagram

```text
       Academic Calendar
               ↓
      Timetable Management
               ↓
Automatic Attendance Session Generation
               ↓
     Faculty Attendance Unlock
               ↓
     Attendance Submission
               ↓
       Automatic Locking
               ↓
      Attendance Database
               ↓
 Student / Faculty / HOD Dashboards
               ↓
  Admin Monitoring & Analytics
```

---

## Getting Started Locally

For a step-by-step walkthrough of integration testing, see [PHASE9_INTEGRATION_TEST_DEPLOY.md](file:///c:/Users/maha5/OneDrive/Desktop/smart-attendance-system/PHASE9_INTEGRATION_TEST_DEPLOY.md).

### 1. Start the Backend Server
```bash
cd backend
npm install
npm run dev
```

### 2. Start the Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```

---

## Seeded Accounts for Testing
To test the full system workflow, the database has been seeded with standard demo accounts (Password: `password123`):

* **Admin**: `admin@example.com`
* **HOD CSE**: `hod.cse@example.com`
* **Faculty CSE**: `fac.cse.1@example.com`
* **Student CSE Y1**: `student.cse.1.1@example.com`
