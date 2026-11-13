# Architecture — Smart Attendance System

`src/attendance.py` — SQLite-backed CLI:

- Tables: `employees(id, name, rfid_uid, face_enrolled, created_at)`,
  `attendance(id, employee_id, date, in_time, out_time, method)`
- `enrol(name, rfid)` / `checkin(rfid|name)` / `checkout(...)` /
  `daily_report(date)` — late if first check-in after 09:30, absent if no
  record; hours worked = out − in
- `recognise_face(image_path)` — integration point for real face
  recognition: documented stub that raises a clear error until
  `face_recognition` (dlib) is installed; the enrol flow stores only a
  128-d embedding locally, never a photo, and `delete_face_data(id)`
  removes it.

Privacy policy (enforced in code and documented in the README):

- Face embeddings are stored ONLY in the local SQLite file; nothing is
  uploaded or sent anywhere.
- Photos are never stored — only the numeric embedding.
- Any employee can have their face data deleted on request
  (`attendance.py delete-face --id N`); RFID/manual check-in keeps working.
- Attendance records are kept for reporting; no location tracking.

`src/index.html` — browser demo: tap an RFID card (simulated), see the
live log and the daily report update; the face tab explains the camera +
model requirement and simulates a recognition with a confidence score.

Tests use a temporary SQLite database and assert enrol → check-in →
check-out → report hours, late flags and duplicate-check-in handling.
