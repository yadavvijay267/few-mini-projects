#!/usr/bin/env python3
"""UPS & generator failover simulator — event-driven, 1-second ticks."""
import argparse, json, sys

def simulate(cfg):
    load = cfg["load_kw"]
    ups_kva = cfg["ups_kva"]; ups_runtime = cfg["ups_runtime_s"]
    gen_kva = cfg["gen_kva"]; gen_start = cfg["gen_start_s"]
    ramp = cfg.get("gen_ramp_s", 5); ats = cfg.get("ats_delay_s", 3)
    restore = cfg.get("restore_s", 300)
    shed = sorted((dict(s) for s in cfg.get("shed_loads", [])), key=lambda s: s["priority"], reverse=True)
    events, gaps, shed_log = [], [], []
    ups_soc = 1.0
    on_gen = False
    t = 0
    while t <= restore + 30:
        # capacity available at this second
        if t < restore:
            if t < gen_start + ramp:
                cap, source = ups_kva, "UPS battery"
            elif t < gen_start + ramp + ats:
                cap, source = min(ups_kva, gen_kva * (t - gen_start) / ramp), "Generator ramping"
            else:
                cap, source = gen_kva, "Generator"
                on_gen = True
        else:
            cap, source = 10 ** 9, "Mains restored"
        # UPS drains only while it is the source
        if source == "UPS battery":
            ups_soc -= (load / ups_kva) / ups_runtime if ups_runtime else 0
        # shed lowest-priority loads while overloaded
        while load > cap and shed:
            s = shed.pop(0)
            load -= s["kw"]
            shed_log.append({"t": t, "name": s["name"], "kw": s["kw"]})
            events.append({"t": t, "event": f"SHED {s['name']} ({s['kw']} kW) — load now {load} kW"})
        if load > cap:
            gaps.append({"t": t, "shortfall_kw": round(load - cap, 1), "source": source})
        if t in (0, gen_start, gen_start + ramp, gen_start + ramp + ats, restore):
            events.append({"t": t, "event": f"{source}: load {load} kW vs capacity {cap if cap < 10**9 else 'mains'} kW, UPS SoC {max(ups_soc,0)*100:.0f}%"})
        if ups_soc <= 0 and source == "UPS battery":
            events.append({"t": t, "event": "UPS BATTERY EXHAUSTED before generator ready — OUTAGE"})
            break
        t += 1
    return {"events": events, "gaps": gaps, "shed": shed_log,
            "final_load_kw": load, "ups_soc_end": round(max(ups_soc, 0), 3),
            "gap_seconds": len(gaps),
            "max_shortfall_kw": max((g["shortfall_kw"] for g in gaps), default=0)}

def what_breaks(sim):
    if not sim["gaps"]:
        return "No gap: load never exceeded available capacity."
    return (f"GAP: load exceeded capacity for {sim['gap_seconds']} s, "
            f"max shortfall {sim['max_shortfall_kw']} kW. "
            f"Shed loads: {', '.join(s['name'] for s in sim['shed']) or 'none — nothing left to shed!' }")

def main(argv=None):
    ap = argparse.ArgumentParser(description="UPS & generator failover simulator: mains failure, UPS pickup, generator start, ATS transfer, load shedding.")
    ap.add_argument("--scenario", help="JSON scenario file")
    ap.add_argument("--load", type=float, default=800, help="Load kW (default 800)")
    ap.add_argument("--ups-kva", type=float, default=1000, help="UPS rating kVA (default 1000)")
    ap.add_argument("--ups-runtime", type=float, default=900, help="UPS runtime at full load, seconds (default 900)")
    ap.add_argument("--gen-kva", type=float, default=900, help="Generator rating kVA (default 900)")
    ap.add_argument("--gen-start", type=float, default=15, help="Generator start delay s (default 15)")
    ap.add_argument("--ats-delay", type=float, default=3, help="ATS transfer delay s (default 3)")
    ap.add_argument("--restore", type=float, default=300, help="Mains restore time s (default 300)")
    a = ap.parse_args(argv)
    if a.scenario:
        cfg = json.load(open(a.scenario))
    else:
        cfg = {"load_kw": a.load, "ups_kva": a.ups_kva, "ups_runtime_s": a.ups_runtime,
               "gen_kva": a.gen_kva, "gen_start_s": a.gen_start, "gen_ramp_s": 5,
               "ats_delay_s": a.ats_delay, "restore_s": a.restore, "shed_loads": [
                   {"name": "Non-critical office load", "kw": 120, "priority": 3},
                   {"name": "Test lab", "kw": 80, "priority": 2}]}
    sim = simulate(cfg)
    for e in sim["events"]:
        print(f"t={e['t']:>4}s  {e['event']}")
    print("---")
    print(what_breaks(sim))
    print(f"Final load {sim['final_load_kw']} kW, UPS SoC at end {sim['ups_soc_end']*100:.0f}%")
    return 0

if __name__ == "__main__":
    sys.exit(main())
