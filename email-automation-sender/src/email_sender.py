#!/usr/bin/env python3
"""Email Automation & Newsletter Sender.

Personalised bulk mail from a CSV list, with templates, a spam-score check,
dry-run by default, rate limiting, retries and a send log.

Safety: NOTHING is sent unless you pass --send, and SMTP credentials come
only from environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER,
SMTP_PASSWORD, SMTP_FROM). The default mode is a dry run that prints the
rendered messages instead of sending them.

Usage:
    python3 src/email_sender.py --contacts assets/contacts.csv \
        --template assets/templates/welcome.txt
    python3 src/email_sender.py --contacts assets/contacts.csv \
        --template assets/templates/newsletter.txt --extra month=November
    python3 src/email_sender.py --contacts assets/contacts.csv \
        --template assets/templates/welcome.txt --send
    python3 src/email_sender.py --demo
"""
import argparse
import csv
import json
import os
import re
import smtplib
import sys
import time
from email.message import EmailMessage
from pathlib import Path
from string import Template

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
SPAMMY_WORDS = ("free", "winner", "urgent", "act now", "click here", "guaranteed")


def load_contacts(path):
    """Read a CSV, validate emails, deduplicate by lowercase email address."""
    contacts, seen, skipped = [], set(), []
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            email = (row.get("email") or "").strip().lower()
            if not EMAIL_RE.match(email):
                skipped.append((row, "invalid email"))
                continue
            if email in seen:
                skipped.append((row, "duplicate"))
                continue
            seen.add(email)
            contacts.append({k: (v or "").strip() for k, v in row.items()})
    return contacts, skipped


def load_template(path):
    """A template file whose first line is 'Subject: ...'; the rest is the body."""
    text = Path(path).read_text(encoding="utf-8")
    lines = text.splitlines()
    subject = ""
    body_start = 0
    if lines and lines[0].lower().startswith("subject:"):
        subject = lines[0][len("subject:"):].strip()
        body_start = 1
    return subject, "\n".join(lines[body_start:]).strip() + "\n"


def render(template_text, variables):
    """Render a $variable template; unknown variables are left as-is."""
    return Template(template_text).safe_substitute(variables)


def spam_score(subject, body):
    """Stand-out feature: a pre-send spam check. Returns (score 0-100, issues)."""
    issues = []
    score = 0
    if not subject:
        issues.append("missing subject")
        score += 40
    if subject and subject == subject.upper() and len(subject) > 3:
        issues.append("subject is ALL CAPS")
        score += 20
    if subject and subject.count("!") >= 2:
        issues.append("too many exclamation marks in subject")
        score += 10
    links = len(re.findall(r"https?://", body))
    if links > 3:
        issues.append(f"too many links ({links})")
        score += 15
    lowered = (subject + " " + body).lower()
    hits = [w for w in SPAMMY_WORDS if w in lowered]
    if hits:
        issues.append("spammy words: " + ", ".join(hits))
        score += 10 * len(hits)
    if len(body) < 20:
        issues.append("body is very short")
        score += 5
    return min(score, 100), issues


def build_message(sender, contact, subject_tpl, body_tpl, extra):
    variables = dict(contact)
    variables.update(extra)
    subject = render(subject_tpl, variables)
    body = render(body_tpl, variables)
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = contact["email"]
    msg["Subject"] = subject
    msg.set_content(body)
    return msg, subject, body


def send_one(msg, host, port, user, password, use_tls=True, retries=2):
    """Send one message, retrying transient SMTP errors with backoff."""
    last_error = None
    for attempt in range(retries + 1):
        try:
            with smtplib.SMTP(host, port, timeout=30) as server:
                if use_tls:
                    server.starttls()
                if user:
                    server.login(user, password or "")
                server.send_message(msg)
            return True, None
        except (smtplib.SMTPException, OSError) as exc:
            last_error = str(exc)
            time.sleep(2 ** attempt)
    return False, last_error


def log_entry(log_path, record):
    with open(log_path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(record) + "\n")


def run(contacts_path, template_path, extra, send, delay, log_path, sender):
    contacts, skipped = load_contacts(contacts_path)
    subject_tpl, body_tpl = load_template(template_path)
    print(f"Loaded {len(contacts)} valid contact(s); skipped {len(skipped)} row(s).")
    for row, reason in skipped:
        print(f"  skipped {row.get('email')}: {reason}")
    results = {"dry_run": not send, "sent": 0, "failed": 0, "blocked": 0, "total": len(contacts)}
    for contact in contacts:
        msg, subject, body = build_message(sender, contact, subject_tpl, body_tpl, extra)
        score, issues = spam_score(subject, body)
        record = {"email": contact["email"], "subject": subject, "spam_score": score,
                  "issues": issues, "status": None}
        if score >= 70:
            record["status"] = "blocked-spam-score"
            results["blocked"] += 1
            print(f"[BLOCKED spam={score}] {contact['email']}: {'; '.join(issues)}")
        elif not send:
            record["status"] = "dry-run"
            print(f"[DRY-RUN spam={score}] To: {contact['email']} | Subject: {subject}")
            print("---")
            print(body.rstrip())
            print("---")
        else:
            host = os.environ.get("SMTP_HOST", "")
            port = int(os.environ.get("SMTP_PORT", "587"))
            ok, err = send_one(msg, host, port, os.environ.get("SMTP_USER", ""),
                               os.environ.get("SMTP_PASSWORD", ""))
            record["status"] = "sent" if ok else f"failed: {err}"
            if ok:
                results["sent"] += 1
                print(f"[SENT] {contact['email']}")
            else:
                results["failed"] += 1
                print(f"[FAILED] {contact['email']}: {err}")
        log_entry(log_path, record)
        if delay:
            time.sleep(delay)
    print(f"\nDone: {results['sent']} sent, {results['failed']} failed, "
          f"{results['blocked']} blocked by spam check, {results['total']} total. "
          f"Log: {log_path}")
    return 0 if results["failed"] == 0 else 1


def run_demo():
    base = Path(__file__).resolve().parent.parent
    print("== DEMO: dry run with the bundled sample contacts and welcome template ==\n")
    return run(base / "assets" / "contacts.csv",
               base / "assets" / "templates" / "welcome.txt",
               {}, send=False, delay=0, log_path=base / "send_log.jsonl",
               sender="demo@example.com")


def main(argv=None):
    import os  # local import so tests can import the module cleanly
    globals()["os"] = os
    parser = argparse.ArgumentParser(
        prog="email_sender.py",
        description="Personalised bulk email sender. Dry-run by default; "
                    "pass --send to actually send via SMTP (env credentials).")
    parser.add_argument("--contacts", type=Path, help="CSV with name,email,... columns.")
    parser.add_argument("--template", type=Path, help="Template file (first line: Subject: ...).")
    parser.add_argument("--extra", nargs="*", default=[],
                        help="Extra template variables as key=value.")
    parser.add_argument("--send", action="store_true",
                        help="Actually send. Without this, dry-run only.")
    parser.add_argument("--delay", type=float, default=0.5,
                        help="Seconds between sends (rate limiting).")
    parser.add_argument("--log", type=Path, default=Path("send_log.jsonl"),
                        help="JSON-lines send log.")
    parser.add_argument("--from", dest="sender", default="newsletter@example.com",
                        help="Sender address (also SMTP_FROM env).")
    parser.add_argument("--demo", action="store_true",
                        help="Dry-run demo with the bundled sample data.")
    args = parser.parse_args(argv)
    if args.demo:
        return run_demo()
    if not args.contacts or not args.template:
        parser.error("--contacts and --template are required (or use --demo).")
    if args.send and not os.environ.get("SMTP_HOST"):
        print("Refusing to send: set SMTP_HOST (and SMTP_USER/SMTP_PASSWORD) in the "
              "environment first.", file=sys.stderr)
        return 2
    extra = {}
    for item in args.extra:
        if "=" in item:
            key, value = item.split("=", 1)
            extra[key] = value
    sender = os.environ.get("SMTP_FROM", args.sender)
    return run(args.contacts, args.template, extra, args.send, args.delay,
               args.log, sender)


if __name__ == "__main__":
    raise SystemExit(main())
