#!/usr/bin/env python3
"""Power factor correction analyzer — CLI.

kVAr correction:  kVAr = P * (tan(acos(pf_now)) - tan(acos(pf_target)))
"""
import argparse, csv, math, sys

def pf(kw, kva):
    if kva <= 0: raise ValueError("kVA must be positive")
    return kw / kva

def reactive_power(kw, kva):
    return math.sqrt(max(kva * kva - kw * kw, 0.0))

def correction_kvar(kw, pf_now, pf_target):
    if not (0 < pf_now < 1 and 0 < pf_target <= 1):
        raise ValueError("power factors must be in (0, 1]")
    if pf_target <= pf_now:
        return 0.0
    t1 = math.tan(math.acos(pf_now))
    t2 = math.tan(math.acos(pf_target))
    return kw * (t1 - t2)

def bank_size(kvar_needed, step=25.0):
    if kvar_needed <= 0: return 0.0, 0
    steps = math.ceil(kvar_needed / step)
    return steps * step, steps

def penalty_saved(kvar_needed, penalty_rate=150.0):
    """Monthly penalty avoided, Rs/month (rate per kVAr of excess reactive power)."""
    return kvar_needed * penalty_rate

def payback_months(bank_kvar, cost_per_kvar, monthly_saving):
    if monthly_saving <= 0: return float("inf")
    return (bank_kvar * cost_per_kvar) / monthly_saving

def analyze(kw, kva=None, kvar=None, pf_now=None, target=0.95, step=25.0,
            penalty_rate=150.0, cost_per_kvar=1200.0):
    if pf_now is None:
        if kva is None and kvar is not None:
            kva = math.sqrt(kw * kw + kvar * kvar)
        pf_now = pf(kw, kva)
    if kva is None:  # only PF given: derive kVA and kVAr from it
        kva = kw / pf_now
    if kvar is None:
        kvar = reactive_power(kw, kva)
    kvar_now = kvar if kvar is not None else reactive_power(kw, kva)
    need = correction_kvar(kw, pf_now, target)
    bank, nsteps = bank_size(need, step)
    saving = penalty_saved(need, penalty_rate)
    return {
        "kw": kw, "kva": kva, "kvar_now": round(kvar_now, 1),
        "pf_now": round(pf_now, 3), "pf_target": target,
        "kvar_needed": round(need, 1), "bank_kvar": bank, "steps": nsteps,
        "step_kvar": step, "monthly_saving_rs": round(saving, 0),
        "payback_months": round(payback_months(bank, cost_per_kvar, saving), 1),
    }

def main(argv=None):
    ap = argparse.ArgumentParser(description="Power factor correction analyzer: size a capacitor bank from load/billing data.")
    ap.add_argument("--kw", type=float, help="Active power in kW")
    ap.add_argument("--kva", type=float, help="Apparent power in kVA")
    ap.add_argument("--kvar", type=float, help="Reactive power in kVAr")
    ap.add_argument("--pf", type=float, help="Present power factor (alternative to kVA/kVAr)")
    ap.add_argument("--target-pf", type=float, default=0.95, help="Target power factor (default 0.95)")
    ap.add_argument("--csv", help="Billing CSV with columns month,kw,kvar,kva")
    ap.add_argument("--step", type=float, default=25.0, help="Standard capacitor step in kVAr (default 25)")
    ap.add_argument("--penalty-rate", type=float, default=150.0, help="Penalty Rs per kVAr per month (default 150)")
    ap.add_argument("--bank-cost", type=float, default=1200.0, help="Installed cost Rs per kVAr (default 1200)")
    a = ap.parse_args(argv)
    rows = []
    if a.csv:
        with open(a.csv, newline="") as f:
            for r in csv.DictReader(f):
                rows.append((r["month"], float(r["kw"]), float(r.get("kva") or 0) or None, float(r.get("kvar") or 0) or None))
    elif a.kw:
        rows = [("manual", a.kw, a.kva, a.kvar)]
    else:
        ap.error("give --kw (with --kva/--kvar/--pf) or --csv")
    for month, kw, kva, kvar in rows:
        r = analyze(kw, kva=kva, kvar=kvar, pf_now=a.pf, target=a.target_pf,
                    step=a.step, penalty_rate=a.penalty_rate, cost_per_kvar=a.bank_cost)
        print(f"{month}: {kw:.0f} kW, PF {r['pf_now']:.3f} -> {r['pf_target']:.2f} | "
              f"kVAr needed {r['kvar_needed']:.1f} | bank {r['bank_kvar']:.0f} kVAr "
              f"({r['steps']} x {r['step_kvar']:.0f}) | saves Rs {r['monthly_saving_rs']:.0f}/month | "
              f"payback {r['payback_months']:.1f} months")
    return 0

if __name__ == "__main__":
    sys.exit(main())
