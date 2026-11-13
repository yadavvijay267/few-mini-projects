# Architecture

```
src/backup_tool.py
├── scan_source()     walk a folder -> {relpath: {sha256, size, mtime}}
├── changed_files()   diff current scan vs manifest -> only new/changed
├── backup()          zip the changed files; optionally Fernet-encrypt
├── verify_backup()   checksum + full extract to a temp dir
├── restore()         decrypt if needed, extract to target
├── prune()           keep newest N records, delete older archives
└── manifest          .backup-manifest.json in the dest folder tracks
                      every known file hash and every backup record
```

## Design choices

- **Hash-based incrementals, not mtime**: a file that was touched but not
  changed is not re-backed-up; a file whose content changed but whose mtime
  was preserved is still caught.
- **Encryption key derivation**: the passphrase is SHA-256 hashed and
  base64-encoded into a Fernet key. The passphrase itself is never stored;
  it comes from `--password` or `BACKUP_PASSWORD`.
- **Verify is a real restore**: `testzip()` alone only checks CRCs of the
  compressed stream. Verify extracts everything to a temporary directory
  and counts the files, which is the only honest proof a backup works.
