import os, sys, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from runbooks import load_runbooks, run_runbook, run_step, audit, read_audit

ASSETS = os.path.join(os.path.dirname(__file__), "..", "assets")


def test_library_has_three_runbooks():
    rbs = load_runbooks()
    assert {r["id"] for r in rbs} == {"ups-on-battery", "crac-failure", "network-flap"}


def test_dry_run_executes_nothing():
    rbs = load_runbooks()
    res = run_runbook(rbs, "ups-on-battery", dry_run=True)
    assert all(s["status"] == "dry-run-skipped" for s in res["steps"])
    assert "check_exit" not in str(res)


def test_execute_runs_checks_and_flags_confirmations():
    rbs = load_runbooks()
    res = run_runbook(rbs, "ups-on-battery", dry_run=False)
    by_id = {s["step"]: s for s in res["steps"]}
    assert by_id["check-runtime"]["check_exit"] == 0
    assert by_id["confirm-gen"]["status"] == "awaiting-confirmation"


def test_unknown_runbook_raises():
    try:
        run_runbook(load_runbooks(), "nope", dry_run=True)
    except ValueError as e:
        assert "unknown runbook" in str(e)
    else:
        raise AssertionError("expected ValueError")


def test_audit_log_records_runs():
    path = os.path.join(tempfile.mkdtemp(), "audit.jsonl")
    audit({"event": "test", "runbook": "x"}, path=path)
    assert read_audit(path)[0]["event"] == "test"
