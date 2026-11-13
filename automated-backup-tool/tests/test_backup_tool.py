"""Tests for backup_tool.py — real files, real zips, real hashes."""
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import backup_tool as bt


def make_source(tmp_path, files=("a.txt", "sub/b.txt")):
    src = tmp_path / "src"
    for rel in files:
        p = src / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(f"contents of {rel}\n", encoding="utf-8")
    return src


def test_backup_then_restore_roundtrip(tmp_path):
    src = make_source(tmp_path)
    dest = tmp_path / "backups"
    rec, changed = bt.backup(src, dest)
    assert rec["files"] == 2 and (dest / rec["name"]).exists()
    target = tmp_path / "restored"
    names = bt.restore(dest / rec["name"], target)
    assert sorted(names) == ["a.txt", "sub/b.txt"]
    assert (target / "sub" / "b.txt").read_text(encoding="utf-8") == "contents of sub/b.txt\n"


def test_incremental_only_copies_changed(tmp_path):
    src = make_source(tmp_path)
    dest = tmp_path / "backups"
    bt.backup(src, dest)
    (src / "a.txt").write_text("changed!\n", encoding="utf-8")
    rec, changed = bt.backup(src, dest)
    assert changed == ["a.txt"]
    assert rec["files"] == 1


def test_verify_detects_good_and_corrupt(tmp_path):
    src = make_source(tmp_path)
    dest = tmp_path / "backups"
    rec, _ = bt.backup(src, dest)
    ok, msg = bt.verify_backup(dest / rec["name"])
    assert ok, msg
    corrupt = dest / "bad.zip"
    corrupt.write_bytes(b"this is not a zip at all")
    ok, _ = bt.verify_backup(corrupt)
    assert not ok


def test_encrypted_backup_roundtrip(tmp_path):
    src = make_source(tmp_path)
    dest = tmp_path / "backups"
    rec, _ = bt.backup(src, dest, encrypt=True, password="correct horse")
    assert rec["name"].endswith(".enc")
    ok, msg = bt.verify_backup(dest / rec["name"], password="correct horse")
    assert ok, msg
    target = tmp_path / "restored"
    names = bt.restore(dest / rec["name"], target, password="correct horse")
    assert len(names) == 2


def test_prune_keeps_newest(tmp_path):
    src = make_source(tmp_path)
    dest = tmp_path / "backups"
    for _ in range(3):
        (src / "a.txt").write_text(f"v{_}\n", encoding="utf-8")
        bt.backup(src, dest)
    removed = bt.prune(dest, keep=1)
    assert len(removed) == 2
    assert len(list(dest.glob("*.zip"))) == 1
