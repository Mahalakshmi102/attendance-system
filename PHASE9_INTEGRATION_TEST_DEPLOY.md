# Phase 9: Final Integration, Testing, Deployment

## 1) Local integration setup

### Backend
1. Copy `backend/.env.example` to `backend/.env`.
2. Set:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `FRONTEND_URL=http://localhost:5173`
3. Start backend:
   - `cd backend`
   - `npm install`
   - `npm run dev`

### Frontend
1. Copy `frontend/.env.example` to `frontend/.env`.
2. Set:
   - `VITE_API_BASE_URL=http://localhost:5000`
3. Start frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## 2) End-to-end role testing checklist

### Auth flow
- Login works for `Admin`, `Faculty`, and `Student`.
- Role-based redirect goes to correct dashboard.

### Faculty flow
- Active session appears in dashboard with QR code.
- Faculty location lock updates successfully.
- Subject-wise report data renders.
- Attendance correction updates student status.
- CSV report download works from `Download Reports (CSV)`.

### Student flow
- Student scans/pastes QR token.
- Location check is enforced.
- Attendance status is marked (Present/Late).
- Detailed history view updates after marking.

### Admin flow
- Users/Subjects/Timetable/Calendar tabs work.
- Analytics tab loads:
  - overview metrics
  - class-wise analytics
  - department-wise analytics

## 3) Deployment (Render + Vercel)

### Deploy backend on Render
1. Create a new Web Service from `backend` directory.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add env vars:
   - `PORT=5000`
   - `MONGODB_URI=...`
   - `JWT_SECRET=...`
   - `FRONTEND_URL=https://your-frontend.vercel.app`
   - optional: `ATTENDANCE_LATE_GRACE_MIN`, `ATTENDANCE_MAX_DISTANCE_METERS`
5. Confirm health endpoint:
   - `https://your-backend.onrender.com/api/health`

### Deploy frontend on Vercel
1. Import `frontend` project in Vercel.
2. Add env var:
   - `VITE_API_BASE_URL=https://your-backend.onrender.com`
3. Deploy and verify route refresh works (SPA rewrite via `frontend/vercel.json`).

## 4) Production sanity checks
- Backend CORS allows your Vercel domain (`FRONTEND_URL`).
- All API calls from deployed frontend hit Render backend successfully.
- QR attendance, manual correction, CSV export, and analytics all work online.

## 5) Common fixes if something fails
- `401`: token missing/expired; login again.
- `403 CORS`: verify `FRONTEND_URL` in Render env vars.
- `500 export`: inspect Render logs for `downloadFacultyReportCsv error`.
- Empty analytics: ensure attendance records exist in database.
