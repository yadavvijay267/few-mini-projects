# Usage

## Contact CSV

Columns are free-form; every column becomes a template variable. Required:
`email`. Rows with an invalid email are skipped and reported; duplicate
emails (case-insensitive) are sent to only once.

## Templates

Plain text files. Line 1 is `Subject: ...`, the rest is the body. Variables
use `$name` syntax (`string.Template.safe_substitute`, so an unknown variable
is left untouched instead of crashing the run).

## Spam score

| Check | Points |
| --- | --- |
| Missing subject | 40 |
| ALL CAPS subject | 20 |
| 2+ `!` in subject | 10 |
| More than 3 links | 15 |
| Spammy word (`free`, `winner`, `urgent`, ...) | 10 each |
| Very short body | 5 |

Score 70+ blocks that recipient and logs `blocked-spam-score`.

## Sending

`--send` reads `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`,
`SMTP_PASSWORD` and `SMTP_FROM` from the environment. Sends use STARTTLS.
Transient SMTP/OS errors are retried twice with exponential backoff.
Every outcome is appended to the JSON-lines log (`send_log.jsonl`).
