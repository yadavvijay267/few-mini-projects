# Quarterly DR drill checklist

- [ ] Pick a drill date and tell the team (no surprise drills in prod).
- [ ] Run `python3 src/drill.py --demo` locally; record RTO/RPO below.
- [ ] Restore the latest production backup to a *fresh* container and verify row counts.
- [ ] Confirm the backup actually ran in the last 24 h (`restic snapshots`).
- [ ] Confirm the restore target has enough disk for the full DB.
- [ ] Update `docs/RTO_RPO.md` with the measured numbers.
- [ ] File any fix found during the drill as an issue before closing the drill.

## Drill log

| Date | RTO | RPO | Verdict |
|---|---|---|---|
| 2026-11-12 (local demo) | < 1 s | 5 rows | PASS |
