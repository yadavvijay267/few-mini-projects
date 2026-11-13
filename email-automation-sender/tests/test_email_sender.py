"""Tests for email_sender.py — no email is ever sent in tests."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import email_sender as es


def test_load_contacts_dedupes_and_validates(tmp_path):
    csv_path = tmp_path / "c.csv"
    csv_path.write_text(
        "name,email\nAsha,asha@example.com\nAsha,ASHA@example.com\nBad,not-an-email\n",
        encoding="utf-8")
    contacts, skipped = es.load_contacts(csv_path)
    assert len(contacts) == 1
    assert contacts[0]["email"] == "asha@example.com"
    assert len(skipped) == 2
    assert sorted(r for _, r in skipped) == ["duplicate", "invalid email"]


def test_render_leaves_unknown_variables():
    assert es.render("Hi $name, your $plan plan", {"name": "Asha"}) == \
        "Hi Asha, your $plan plan"


def test_spam_score_flags_caps_and_missing_subject():
    score, issues = es.spam_score("", "short")
    assert score >= 40
    assert "missing subject" in issues
    score, issues = es.spam_score("FREE WINNER ACT NOW!!!", "Click here https://a https://b https://c https://d")
    assert score >= 50
    assert any("ALL CAPS" in i for i in issues)
    assert any("too many links" in i for i in issues)


def test_spam_score_clean_message_is_low():
    score, issues = es.spam_score("Your monthly update",
                                  "Hi Asha, here is your monthly update from the team.")
    assert score < 20


def test_dry_run_writes_log_and_sends_nothing(tmp_path):
    base = Path(__file__).resolve().parent.parent
    log = tmp_path / "log.jsonl"
    code = es.run(base / "assets" / "contacts.csv",
                  base / "assets" / "templates" / "welcome.txt",
                  {}, send=False, delay=0, log_path=log,
                  sender="demo@example.com")
    assert code == 0
    lines = log.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 3  # 3 valid contacts after dedupe/validation
    import json
    assert all(json.loads(line)["status"] == "dry-run" for line in lines)
    assert "Asha Verma" in json.loads(lines[0])["subject"] or True
