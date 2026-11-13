#!/usr/bin/env python3
"""System Health Monitor — live CPU/memory/disk/network in the terminal,
CSV logging, threshold alerts, and PNG summary charts.

Usage:
    python3 src/monitor.py --demo            # one-shot report + sample chart
    python3 src/monitor.py --live            # live terminal view (Ctrl+C to stop)
    python3 src/monitor.py --live --duration 60 --interval 5
    python3 src/monitor.py --report          # PNG chart from the CSV log
    python3 src/monitor.py --config assets/config.json --live
"""
import argparse
import csv
import json
import sys
import time
from collections import deque
from datetime import datetime
from pathlib import Path

try:
    import psutil
except ImportError:  # pragma: no cover
    print("psutil is required: pip install -r requirements.txt", file=sys.stderr)
    raise

DEFAULT_THRESHOLDS = {"cpu_percent": 80, "memory_percent": 85, "disk_percent": 90}


def load_config(path):
    if path and Path(path).exists():
        with open(path, encoding="utf-8") as fh:
            cfg = json.load(fh)
        return cfg
    return {"interval_seconds": 5, "log_file": "health_log.csv",
            "alerts_log": "alerts.log", **DEFAULT_THRESHOLDS}


def snapshot():
    """One reading of CPU, memory, disk and network."""
    cpu = psutil.cpu_percent(interval=0.1)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    net = psutil.net_io_counters()
    boot = datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M")
    return {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "cpu_percent": cpu,
        "memory_percent": mem.percent,
        "memory_used_gb": round(mem.used / 1024 ** 3, 2),
        "memory_total_gb": round(mem.total / 1024 ** 3, 2),
        "disk_percent": disk.percent,
        "disk_used_gb": round(disk.used / 1024 ** 3, 2),
        "disk_total_gb": round(disk.total / 1024 ** 3, 2),
        "net_sent_mb": round(net.bytes_sent / 1024 ** 2, 2),
        "net_recv_mb": round(net.bytes_recv / 1024 ** 2, 2),
        "boot_time": boot,
    }


def check_thresholds(snap, thresholds):
    """Return a list of (metric, value, limit) triples that are over the limit."""
    breaches = []
    for key, limit_key in (("cpu_percent", "cpu_percent"),
                           ("memory_percent", "memory_percent"),
                           ("disk_percent", "disk_percent")):
        limit = thresholds.get(limit_key)
        if limit is not None and snap[key] >= limit:
            breaches.append((key, snap[key], limit))
    return breaches


def top_processes(n=5):
    """Top n processes by CPU — captured automatically when an alert fires."""
    procs = []
    for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
        try:
            info = proc.info
            info["cpu_percent"] = proc.cpu_percent(interval=0.0)
            procs.append(info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    procs.sort(key=lambda p: p.get("cpu_percent") or 0, reverse=True)
    return procs[:n]


def bar(value, width=20):
    filled = int(round(value / 100 * width))
    return "#" * filled + "-" * (width - filled)


def format_snapshot(snap):
    lines = [
        f"[{snap['timestamp']}]  boot: {snap['boot_time']}",
        f"  CPU    [{bar(snap['cpu_percent'])}] {snap['cpu_percent']:5.1f}%",
        f"  Memory [{bar(snap['memory_percent'])}] {snap['memory_percent']:5.1f}%  "
        f"({snap['memory_used_gb']} / {snap['memory_total_gb']} GB)",
        f"  Disk   [{bar(snap['disk_percent'])}] {snap['disk_percent']:5.1f}%  "
        f"({snap['disk_used_gb']} / {snap['disk_total_gb']} GB)",
        f"  Net    sent {snap['net_sent_mb']} MB   recv {snap['net_recv_mb']} MB",
    ]
    return "\n".join(lines)


def log_snapshot(log_path, snap):
    path = Path(log_path)
    exists = path.exists()
    with open(path, "a", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(snap.keys()))
        if not exists:
            writer.writeheader()
        writer.writerow(snap)


def log_alert(alerts_path, snap, breaches, top):
    entry = (f"{snap['timestamp']} ALERT " +
             ", ".join(f"{m}={v}% (limit {lim}%)" for m, v, lim in breaches))
    with open(alerts_path, "a", encoding="utf-8") as fh:
        fh.write(entry + "\n")
        fh.write("  Top processes at alert time:\n")
        for proc in top:
            fh.write(f"    pid {proc['pid']:>6}  {proc['name'] or '?':<25}  "
                     f"cpu {proc['cpu_percent']:5.1f}%  mem {proc['memory_percent']:.1f}%\n")
    return entry


def handle_alerts(snap, thresholds, alerts_path):
    breaches = check_thresholds(snap, thresholds)
    if not breaches:
        return []
    top = top_processes()
    entry = log_alert(alerts_path, snap, breaches, top)
    print("  !! " + entry)
    print("  Top processes right now:")
    for proc in top:
        print(f"     pid {proc['pid']:>6}  {proc['name'] or '?':<25}  "
              f"cpu {proc['cpu_percent']:5.1f}%  mem {proc['memory_percent']:.1f}%")
    try:
        from plyer import notification  # optional desktop notification
        notification.notify(title="System Health Alert",
                            message=", ".join(f"{m} {v}%" for m, v, _ in breaches),
                            timeout=5)
    except Exception:
        pass
    return breaches


def live_loop(config, duration=None):
    interval = config.get("interval_seconds", 5)
    log_path = config.get("log_file", "health_log.csv")
    alerts_path = config.get("alerts_log", "alerts.log")
    thresholds = {k: config.get(k) for k in DEFAULT_THRESHOLDS}
    print(f"Monitoring every {interval}s (Ctrl+C to stop). "
          f"Thresholds: CPU {thresholds['cpu_percent']}%, "
          f"MEM {thresholds['memory_percent']}%, DISK {thresholds['disk_percent']}%.")
    print(f"Logging to {log_path}; alerts to {alerts_path}.\n")
    start = time.time()
    try:
        while True:
            snap = snapshot()
            print(format_snapshot(snap))
            log_snapshot(log_path, snap)
            handle_alerts(snap, thresholds, alerts_path)
            print()
            if duration and time.time() - start >= duration:
                break
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\nStopped. Log saved to", log_path)
    return 0


def make_report(log_path, out_path):
    """Hourly/daily-style summary: PNG chart of CPU/memory/disk over time."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    times, cpu, mem, disk = [], [], [], []
    with open(log_path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            times.append(row["timestamp"][11:19])
            cpu.append(float(row["cpu_percent"]))
            mem.append(float(row["memory_percent"]))
            disk.append(float(row["disk_percent"]))
    if not times:
        print("Log is empty — nothing to chart.", file=sys.stderr)
        return 1
    fig, axes = plt.subplots(3, 1, figsize=(10, 8), sharex=True)
    for ax, series, label, color in ((axes[0], cpu, "CPU %", "tab:red"),
                                     (axes[1], mem, "Memory %", "tab:blue"),
                                     (axes[2], disk, "Disk %", "tab:green")):
        ax.plot(times, series, color=color, marker="o", markersize=2)
        ax.set_ylabel(label)
        ax.set_ylim(0, 100)
        ax.grid(True, alpha=0.3)
    axes[2].set_xlabel("Time")
    fig.suptitle(f"System Health — {len(times)} samples from {log_path}")
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    print(f"Report chart saved -> {out_path} ({len(times)} samples)")
    print(f"  CPU avg {sum(cpu)/len(cpu):.1f}% max {max(cpu):.1f}% | "
          f"MEM avg {sum(mem)/len(mem):.1f}% max {max(mem):.1f}% | "
          f"DISK {disk[-1]:.1f}%")
    return 0


def run_demo():
    snap = snapshot()
    print("== DEMO: one-shot system health report ==\n")
    print(format_snapshot(snap))
    breaches = check_thresholds(snap, DEFAULT_THRESHOLDS)
    if breaches:
        print("\nThresholds crossed:", breaches)
    else:
        print("\nAll metrics within default thresholds "
              f"(CPU {DEFAULT_THRESHOLDS['cpu_percent']}%, "
              f"MEM {DEFAULT_THRESHOLDS['memory_percent']}%, "
              f"DISK {DEFAULT_THRESHOLDS['disk_percent']}%).")
    demo_dir = Path(__file__).resolve().parent.parent / "demo_output"
    demo_dir.mkdir(exist_ok=True)
    log_path = demo_dir / "health_log.csv"
    for _ in range(12):
        log_snapshot(log_path, snapshot())
        time.sleep(0.2)
    make_report(log_path, demo_dir / "health_report.png")
    print(f"\nDemo log + chart are in {demo_dir}")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="monitor.py",
        description="Live system health monitor: CPU/memory/disk/network, "
                    "CSV logging, threshold alerts and PNG reports.")
    parser.add_argument("--demo", action="store_true",
                        help="One-shot report + sample chart (no long run).")
    parser.add_argument("--live", action="store_true", help="Live terminal monitoring.")
    parser.add_argument("--duration", type=float, default=None,
                        help="Stop the live loop after N seconds.")
    parser.add_argument("--interval", type=float, default=None,
                        help="Seconds between samples (overrides config).")
    parser.add_argument("--config", type=Path, default=None,
                        help="JSON config with thresholds and interval.")
    parser.add_argument("--report", action="store_true",
                        help="Build a PNG chart from the CSV log and exit.")
    parser.add_argument("--log", type=Path, default=None, help="CSV log file.")
    parser.add_argument("--out", type=Path, default=Path("health_report.png"),
                        help="PNG output for --report.")
    args = parser.parse_args(argv)
    config = load_config(args.config)
    if args.interval:
        config["interval_seconds"] = args.interval
    if args.log:
        config["log_file"] = str(args.log)
    if args.demo:
        return run_demo()
    if args.report:
        return make_report(config.get("log_file", "health_log.csv"), args.out)
    if args.live:
        return live_loop(config, duration=args.duration)
    parser.error("Choose one of --demo, --live or --report (try --help).")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
