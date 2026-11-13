# Email Automation & Newsletter Sender

Send personalised bulk emails from a CSV contact list, with templates, a
pre-send spam check, rate limiting and a full send log. **Dry-run is the
default** — nothing is ever sent unless you pass `--send` with SMTP
credentials in environment variables.

## Features

- **Templates** with per-recipient variables (`$name`, `$company`, `$plan`)
  using Python's `string.Template` — no heavy dependency
- **CSV contacts** with email validation and deduplication
- **Spam-score check** — flags missing subjects, ALL CAPS, too many links and
  spammy words *before* sending; anything scoring 70+ is blocked
- **Dry-run mode** (default) that prints the rendered messages
- **Rate limiting** (`--delay`) and **retries** on transient SMTP failures
- **Send log** — one JSON line per recipient with timestamp-free status,
  subject and spam score

## Tech stack

Python 3 standard library only (`smtplib`, `csv`, `string.Template`).
No third-party packages to install.

## How to run

```bash
# Dry run with the bundled sample contacts (safe — sends nothing)
python3 src/email_sender.py --demo

# Dry run with your own list and template
python3 src/email_sender.py --contacts assets/contacts.csv \
    --template assets/templates/welcome.txt

# Extra template variables
python3 src/email_sender.py --contacts assets/contacts.csv \
    --template assets/templates/newsletter.txt --extra month=November

# Actually send (needs SMTP env vars)
export SMTP_HOST=smtp.example.com SMTP_PORT=587
export SMTP_USER=you@example.com SMTP_PASSWORD='...'
export SMTP_FROM=you@example.com
python3 src/email_sender.py --contacts assets/contacts.csv \
    --template assets/templates/welcome.txt --send --delay 1
```

Templates live in `assets/templates/`. The first line must be
`Subject: ...`; the rest is the body. Any `$column` from the CSV is a
variable.

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## Tests

```bash
python3 -m pytest tests/ -v
```

## License

MIT — see `LICENSE`. Copyright (c) 2026 Clamor.
