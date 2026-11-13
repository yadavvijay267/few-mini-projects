# Architecture

Local lab: SQLite stands in for PostgreSQL so the drill runs anywhere.
`backup.py` = snapshot + checksum + manifest; `restore.py` = verify + copy
to a fresh directory; `drill.py` = the whole loop with timers.

Production path (same shape, real tools):

```
PostgreSQL (Docker) -> restic backup -> S3 (or local disk)
                          |
                    restore script -> fresh PostgreSQL container
```

- Schedule: `restic backup` via cron/systemd timer, hourly.
- Retention: `restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6`.
- Verify: `restic check` weekly; full restore drill quarterly.
- Secrets: restic repository password from the environment, never in the repo.
