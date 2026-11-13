#!/bin/bash
# Example hourly backup (install with: crontab -e, then add the line below).
# 0 * * * * cd /path/to/backup-disaster-recovery-lab && python3 src/backup.py --db data/app.db --out backups/ >> backups/backup.log 2>&1
echo "Add this cron line (edit the path first):"
echo "0 * * * * cd $(pwd) && python3 src/backup.py --db data/app.db --out backups/ >> backups/backup.log 2>&1"
