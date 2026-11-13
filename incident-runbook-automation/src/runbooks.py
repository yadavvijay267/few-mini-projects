"""Incident runbook engine: library -> dry-run / execute -> audit log.

Steps are data (assets/runbooks.json), not code: each step has a check
(a shell command, run only outside dry-run), an action, and whether it
needs manual confirmation. Every run is appended to audit.jsonl.
"""
import argparse, datetime, json, os, subprocess, sys

BASE = os.path.dirname(__file__)
RUNBOOKS = os.path.join(BASE, "..", "assets", "runbooks.json")
AUDIT = os.path.join(BASE, "..", "assets", "audit.jsonl")


def load_runbooks(path=RUNBOOKS):
    with open(path, encoding="utf-8") as f:
        return json.load(f)["runbooks"]


def audit(event, path=AUDIT):
    event["ts"] = datetime.datetime.now().isoformat(timespec="seconds")
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(event) + "\n")
    return event


def read_audit(path=AUDIT):
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def run_step(step, dry_run, operator):
    """Execute one step. Dry-run never runs the check command."""
    result = {"step": step["id"], "title": step["title"], "dry_run": dry_run,
              "operator": operator, "status": "done"}
    if dry_run:
        result["status"] = "dry-run-skipped"
        result["note"] = "check/action NOT executed (dry run)"
        return result
    if step.get("check"):
        proc = subprocess.run(step["check"], shell=True, capture_output=True, text=True, timeout=30)
        result["check_exit"] = proc.returncode
        result["check_output"] = (proc.stdout + proc.stderr).strip()[:500]
        if proc.returncode != 0:
            result["status"] = "check-failed"
    if step.get("requires_confirmation"):
        result["status"] = "awaiting-confirmation"
        result["note"] = "operator must confirm this step in the UI/CLI"
    return result


def run_runbook(runbooks, runbook_id, dry_run=True, operator="operator"):
    rb = next((r for r in runbooks if r["id"] == runbook_id), None)
    if rb is None:
        raise ValueError(f"unknown runbook: {runbook_id}")
    results = [run_step(s, dry_run, operator) for s in rb["steps"]]
    audit({"event": "runbook_run", "runbook": runbook_id, "operator": operator,
           "dry_run": dry_run,
           "statuses": [r["status"] for r in results]})
    return {"runbook": rb["id"], "title": rb["title"], "dry_run": dry_run,
            "steps": results}


def main(argv=None):
    p = argparse.ArgumentParser(description="Incident runbook automation")
    sub = p.add_subparsers(dest="cmd")
    sub.add_parser("list")
    r = sub.add_parser("run")
    r.add_argument("id")
    r.add_argument("--dry-run", action="store_true", default=True)
    r.add_argument("--execute", action="store_true")
    r.add_argument("--operator", default="operator")
    sub.add_parser("audit")
    args = p.parse_args(argv)
    runbooks = load_runbooks()
    if args.cmd == "list" or args.cmd is None:
        for rb in runbooks:
            print(f"{rb['id']}: {rb['title']} ({len(rb['steps'])} steps)")
        return 0
    if args.cmd == "run":
        dry = not args.execute
        print(json.dumps(run_runbook(runbooks, args.id, dry_run=dry, operator=args.operator), indent=2))
        return 0
    if args.cmd == "audit":
        print(json.dumps(read_audit(), indent=2))
        return 0
    p.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
