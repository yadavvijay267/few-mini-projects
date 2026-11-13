# RTO / RPO — measured, not hoped

| Metric | Target | Measured (local drill, `python3 src/drill.py --demo`) |
|---|---|---|
| RTO — time from disaster to restored + verified DB | < 15 min | **< 1 s** locally (small DB; scales with size) |
| RPO — data lost = writes after the last backup | < 1 hour | **5 rows** in the demo (the writes made after the backup) |

## How to improve RPO in production

- Backups every hour (cron) instead of daily -> RPO < 1 h.
- PostgreSQL WAL archiving / continuous archiving -> RPO near zero.
- restic to S3 with `--copy-chunk-size` and snapshot pruning (`restic forget --keep-daily 7 --keep-weekly 4`).

## How to improve RTO in production

- Pre-provision the restore target (a warm standby container).
- Test the restore quarterly — a backup you never restored is not a backup.
- Keep the runbook (`docs/DRILL_CHECKLIST.md`) next to the alert that fires.
