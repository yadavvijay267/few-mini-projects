"""Executable runbook runner.
Usage: python3 src/runner.py --list | --runbook <id> [--dry-run] [--auto] [--operator NAME] | --history"""
import argparse, datetime, json, os, subprocess, sys, uuid
import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
RUNBOOKS = os.path.join(HERE, "..", "assets", "runbooks")
LOG = os.path.join(HERE, "..", "logs", "audit.jsonl")

# Allow-list: runbook command keys -> the (safe, simulated) shell command.
# Arbitrary shell is NEVER executed.
COMMAND_ALLOWLIST = {
    "shed-non-critical-load": ["echo", "SIMULATED: shedding non-critical load (lab servers, test racks)"],
    "start-standby-crac": ["echo", "SIMULATED: starting standby CRAC unit CRAC-02"],
    "failover-to-backup-link": ["echo", "SIMULATED: failing traffic over to backup link"],
}

def list_runbooks():
    out = []
    for name in sorted(os.listdir(RUNBOOKS)):
        if name.endswith((".yaml", ".yml")):
            with open(os.path.join(RUNBOOKS, name)) as f:
                rb = yaml.safe_load(f)
            out.append({"id": rb["id"], "title": rb["title"], "severity": rb.get("severity"),
                        "steps": len(rb.get("steps", [])), "file": name})
    return out

def load_runbook(runbook_id):
    for name in os.listdir(RUNBOOKS):
        path = os.path.join(RUNBOOKS, name)
        if not name.endswith((".yaml", ".yml")):
            continue
        with open(path) as f:
            rb = yaml.safe_load(f)
        if rb.get("id") == runbook_id:
            return rb
    return None

def audit(run_id, runbook, step, result):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    entry = {"run_id": run_id, "runbook": runbook, "timestamp": datetime.datetime.now().isoformat(timespec="seconds"),
             **result}
    if step:
        entry["step"] = step.get("id")
        entry["step_name"] = step.get("name")
        entry["step_type"] = step.get("type")
    with open(LOG, "a") as f:
        f.write(json.dumps(entry) + "\n")

def run_runbook(rb, dry_run=False, auto=False, operator="operator"):
    from checks import run_check
    run_id = str(uuid.uuid4())[:8]
    print(f"Run {run_id}: {rb['title']} (severity {rb.get('severity')}) dry_run={dry_run}")
    results = []
    for step in rb.get("steps", []):
        stype = step["type"]
        if stype == "check":
            ok, detail = run_check(step["check"])
            status = "passed" if ok else "failed"
            print(f"  [{'OK ' if ok else 'FAIL'}] check: {step['name']} — {detail}")
        elif stype == "command":
            cmd = COMMAND_ALLOWLIST.get(step["command"])
            if cmd is None:
                status, detail = "blocked", f"command not in allow-list: {step['command']}"
                print(f"  [BLOCKED] command: {step['name']} — {detail}")
            elif dry_run:
                status, detail = "dry-run", " ".join(cmd)
                print(f"  [DRY-RUN] command: {step['name']} — would run: {' '.join(cmd)}")
            else:
                out = subprocess.run(cmd, capture_output=True, text=True)
                status, detail = ("done" if out.returncode == 0 else "failed"), out.stdout.strip()
                print(f"  [DONE] command: {step['name']} — {detail}")
        elif stype == "notify":
            status, detail = "sent (simulated)", f"{step['channel']}: {step['message']}"
            print(f"  [SENT] notify {step['channel']}: {step['message']}")
        elif stype == "manual":
            if auto:
                status, detail = "confirmed (auto)", "auto-confirmed in drill mode"
                print(f"  [AUTO] manual: {step['name']} — confirmed automatically")
            else:
                ans = input(f"  [MANUAL] {step['name']} — {step.get('prompt', 'Confirm?')} ").strip().lower()
                status = "confirmed" if ans in ("y", "yes") else "not-confirmed"
                detail = f"operator answered: {ans}"
                print(f"  [{status.upper()}] manual: {step['name']}")
        else:
            status, detail = "skipped", f"unknown step type: {stype}"
        entry = {"status": status, "detail": detail, "operator": operator, "dry_run": dry_run}
        audit(run_id, rb["id"], step, entry)
        results.append({**entry, "step": step["id"]})
        if status in ("failed", "blocked", "not-confirmed") and not step.get("on_failure") == "continue":
            print(f"  Run stopped at step {step['id']} ({status}).")
            break
    summary = {"run_id": run_id, "runbook": rb["id"], "dry_run": dry_run,
               "steps_run": len(results), "statuses": [r["status"] for r in results]}
    print(json.dumps(summary, indent=2))
    return summary

def main():
    ap = argparse.ArgumentParser(description="Execute an incident runbook (or drill it in dry-run mode).")
    ap.add_argument("--list", action="store_true", help="List available runbooks")
    ap.add_argument("--runbook", help="Runbook id to execute")
    ap.add_argument("--dry-run", action="store_true", help="Drill mode: print commands, do not run them")
    ap.add_argument("--auto", action="store_true", help="Auto-confirm manual steps (drills / tests)")
    ap.add_argument("--operator", default="operator", help="Operator name for the audit log")
    ap.add_argument("--history", action="store_true", help="Show the audit log")
    a = ap.parse_args()
    if a.list:
        print(json.dumps(list_runbooks(), indent=2)); return
    if a.history:
        if os.path.exists(LOG):
            print(open(LOG).read(), end="")
        else:
            print("No runs yet.")
        return
    if not a.runbook:
        ap.error("give --runbook, --list or --history")
    rb = load_runbook(a.runbook)
    if not rb:
        print(f"Unknown runbook: {a.runbook}. Available: {[r['id'] for r in list_runbooks()]}")
        raise SystemExit(1)
    run_runbook(rb, dry_run=a.dry_run, auto=a.auto, operator=a.operator)

if __name__ == "__main__":
    main()
