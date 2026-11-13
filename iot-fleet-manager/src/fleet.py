#!/usr/bin/env python3
"""IoT device fleet manager — registry, telemetry, staged firmware rollouts, commands, audit log."""
import argparse, json, os, random, secrets, sys
from datetime import datetime, timedelta, timezone

STATE_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "fleet-state.json")
OFFLINE_AFTER_MIN = 10

def load(state_path):
    if os.path.exists(state_path):
        return json.load(open(state_path))
    return {"devices": [], "audit": [], "campaigns": []}

def save(state_path, st):
    json.dump(st, open(state_path, "w"), indent=2)

def audit(st, action, detail):
    st["audit"].append({"time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                        "action": action, "detail": detail})

def provision(st, name, group):
    if any(d["name"] == name for d in st["devices"]):
        raise ValueError(f"device {name} already exists")
    dev = {"device_id": f"dev-{len(st['devices'])+1:03d}", "name": name, "group": group,
           "provisioning_key": secrets.token_hex(16), "firmware": "2.3.1",
           "battery_pct": 80, "signal_dbm": -65, "temperature_c": 24.0,
           "last_seen": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "status": "online"}
    st["devices"].append(dev)
    audit(st, "provision", f"{name} in group {group} (key {dev['provisioning_key'][:8]}...)")
    return dev

def simulate_telemetry(st, rng=None):
    rng = rng or random
    now = datetime.now(timezone.utc)
    for d in st["devices"]:
        d["battery_pct"] = max(5, min(100, d["battery_pct"] + rng.randint(-2, 1)))
        d["signal_dbm"] = max(-95, min(-40, d["signal_dbm"] + rng.randint(-3, 3)))
        d["temperature_c"] = round(d["temperature_c"] + rng.uniform(-0.5, 0.5), 1)
        d["last_seen"] = now.isoformat(timespec="seconds")
        d["status"] = "online"
    audit(st, "telemetry", f"simulated telemetry for {len(st['devices'])} devices")

def offline_devices(st, now=None):
    now = now or datetime.now(timezone.utc)
    out = []
    for d in st["devices"]:
        last = datetime.fromisoformat(d["last_seen"])
        if now - last > timedelta(minutes=OFFLINE_AFTER_MIN):
            out.append(d)
    return out

def firmware_rollout(st, version, rollout_pct, rng=None):
    """Staged rollout: update the first rollout_pct% of devices (stable order).
    A failed update rolls that device back and pauses the campaign."""
    rng = rng or random
    devices = sorted(st["devices"], key=lambda d: d["device_id"])
    n = int(len(devices) * rollout_pct / 100)
    target = [d for d in devices if d["firmware"] != version][:n]
    updated, failed, rolled_back = [], [], []
    for d in target:
        old = d["firmware"]
        if rng.random() < 0.05:  # 5% simulated failure
            d["firmware"] = old
            failed.append(d["name"]); rolled_back.append(d["name"])
            audit(st, "firmware-failed", f"{d['name']} failed {version}, rolled back to {old}")
            break  # pause the campaign on first failure
        d["firmware"] = version
        updated.append(d["name"])
    st["campaigns"].append({"version": version, "rollout_pct": rollout_pct,
                            "updated": updated, "failed": failed,
                            "time": datetime.now(timezone.utc).isoformat(timespec="seconds")})
    audit(st, "firmware", f"v{version} rollout {rollout_pct}%: {len(updated)} updated, {len(failed)} failed")
    return {"updated": updated, "failed": failed, "rolled_back": rolled_back}

def send_command(st, device_name, cmd):
    dev = next((d for d in st["devices"] if d["name"] == device_name), None)
    if not dev:
        raise ValueError(f"unknown device {device_name}")
    if cmd not in ("reboot", "config-push", "ping"):
        raise ValueError(f"unknown command {cmd}")
    audit(st, "command", f"{cmd} -> {device_name} (accepted)")
    return f"{cmd} sent to {device_name}"

def main(argv=None):
    ap = argparse.ArgumentParser(description="IoT device fleet manager: provision, monitor, staged firmware rollouts, remote commands.")
    ap.add_argument("--state", default=STATE_DEFAULT, help="State file (JSON)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("provision"); p.add_argument("--name", required=True); p.add_argument("--group", default="default")
    sub.add_parser("list")
    sub.add_parser("telemetry")
    f = sub.add_parser("firmware"); f.add_argument("--version", required=True); f.add_argument("--rollout", type=int, default=10, help="Rollout percentage (default 10)")
    c = sub.add_parser("command"); c.add_argument("--device", required=True); c.add_argument("--cmd", required=True, choices=["reboot", "config-push", "ping"])
    sub.add_parser("audit")
    a = ap.parse_args(argv)
    st = load(a.state)
    if a.cmd == "provision":
        d = provision(st, a.name, a.group)
        print(f"Provisioned {d['name']} ({d['device_id']}) — key {d['provisioning_key']}")
    elif a.cmd == "list":
        for d in st["devices"]:
            print(f"{d['device_id']} {d['name']:<14} {d['group']:<10} fw {d['firmware']} batt {d['battery_pct']}% sig {d['signal_dbm']} dBm {d['status']}")
        off = offline_devices(st)
        if off: print(f"OFFLINE ALERT: {', '.join(d['name'] for d in off)} silent > {OFFLINE_AFTER_MIN} min")
    elif a.cmd == "telemetry":
        simulate_telemetry(st); print(f"Telemetry updated for {len(st['devices'])} devices")
    elif a.cmd == "firmware":
        r = firmware_rollout(st, a.version, a.rollout)
        print(f"Rollout v{a.version} @ {a.rollout}%: {len(r['updated'])} updated {r['updated']}")
        if r["failed"]: print(f"FAILED: {r['failed']} — rolled back, campaign paused")
    elif a.cmd == "command":
        print(send_command(st, a.device, a.cmd))
    elif a.cmd == "audit":
        for e in st["audit"][-20:]:
            print(f"{e['time']}  {e['action']:<16} {e['detail']}")
    save(a.state, st)
    return 0

if __name__ == "__main__":
    sys.exit(main())
