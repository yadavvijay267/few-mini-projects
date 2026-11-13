# Smart Attendance System (Face / RFID)

An attendance system using face recognition (or RFID cards) with a
dashboard and reports. Offices, classrooms and site entry — attendance
without a register.

## Features

- Enrol employees with an RFID card UID (and a face-recognition slot)
- RFID check-in / check-out with in/out times and a daily report
- Manual check-in fallback for lost cards
- Late / absent flags (9:30 AM grace threshold, configurable)
- **Privacy-first**: face data stays on the local machine, with a delete
  option — see `docs/ARCHITECTURE.md` for the data-handling policy

## Face recognition — honest note

Real face recognition needs a camera plus a recognition model
(`face_recognition`/dlib or OpenCV). That stack is **not** bundled here:
it needs ~500 MB of native libraries and a camera. The full attendance
logic is implemented and working with RFID/manual check-in, and the web
demo walks through the face-enrolment flow with a clearly-labelled
simulation. `docs/ARCHITECTURE.md` explains exactly how to wire a real
camera + `face_recognition` model into `src/attendance.py`
(`recognise_face()` is the integration point).

## How to run

```bash
python3 src/attendance.py enrol --name "Asha Verma" --rfid A1B2C3D4
python3 src/attendance.py checkin --rfid A1B2C3D4
python3 src/attendance.py checkout --rfid A1B2C3D4
python3 src/attendance.py report --date 2026-11-12
python3 src/attendance.py --help
```

Web UI: open `src/index.html` — RFID simulation, live log, daily report.

## License

MIT — see `LICENSE`.
