# Phase 7 Attendance Test Scenarios

## 1) Valid QR attendance mark
- Given a valid student token and active session QR token.
- And student location is within allowed radius.
- When `POST /api/attendance/mark` is called.
- Then API returns success and creates one attendance row with:
  - `entryType = QR`
  - `markedBy = Student`
  - `status = Present` or `Late` based on grace period.

## 2) Duplicate mark prevention
- Given a student already marked for a session.
- When the same student calls `POST /api/attendance/mark` again for that session.
- Then API returns `409 conflict` and no extra row is inserted.

## 3) Expired or invalid QR token
- Given no matching active session for token, or `expiresAt` is in the past.
- When student calls `POST /api/attendance/mark`.
- Then API returns `400` with category `expired`.

## 4) Location out of allowed range
- Given valid QR but distance from faculty location is greater than configured max.
- When student calls `POST /api/attendance/mark`.
- Then API returns `403` with category `forbidden`.

## 5) Late status assignment
- Given session start time + grace period has passed.
- When student marks attendance successfully.
- Then attendance record status is `Late`.

## 6) Manual faculty upsert / override
- Given faculty owns the session and sends valid `sessionId`, `studentId`, and `status`.
- When `PUT /api/attendance/update` is called.
- Then record is upserted with:
  - `entryType = Manual`
  - `markedBy = Faculty`
  - `updatedBy = facultyId`
  - optional `remarks` when provided.

## 7) Unauthorized manual update blocked
- Given faculty does not own the session.
- When `PUT /api/attendance/update` is called.
- Then API returns `403` and record is not changed.

## 8) Reporting reads
- Student range endpoint: `GET /api/attendance/my-records/range?startDate=...&endDate=...`
- Faculty range endpoint: `GET /api/attendance/faculty/records?startDate=...&endDate=...&status=...`
- Verify returned rows are scoped to requesting user role and include expected filters.
