"""Cable sizing and voltage drop calculator. Original code."""
import argparse, json, math, os

def _tables():
    with open(os.path.join(os.path.dirname(__file__), "cable_tables.json")) as f:
        return json.load(f)["copper_pvc"]

def load_current_a(power_kw, voltage_v, pf, phases=3):
    p = power_kw * 1000
    return p / (voltage_v * pf) if phases == 1 else p / (math.sqrt(3) * voltage_v * pf)

def voltage_drop_v(length_m, current_a, r_ohm_km, x_ohm_km, pf, phases=3):
    import math as m
    sin_phi = m.sqrt(max(0.0, 1 - pf * pf))
    per_km = r_ohm_km * pf + x_ohm_km * sin_phi
    return (2 if phases == 1 else m.sqrt(3)) * length_m * current_a * per_km / 1000.0

def derated_ampacity(base_a, temp_factor=1.0, grouping_factor=1.0, burial_factor=1.0):
    return base_a * temp_factor * grouping_factor * burial_factor

def select_cable(power_kw, voltage_v, pf, length_m, phases=3, vd_limit_pct=5.0,
                 temp_factor=1.0, grouping_factor=1.0, burial_factor=1.0):
    """Return the smallest cable passing both ampacity and voltage-drop checks."""
    current = load_current_a(power_kw, voltage_v, pf, phases)
    for c in _tables():
        amp = derated_ampacity(c["ampacity_a"], temp_factor, grouping_factor, burial_factor)
        if current > amp:
            continue
        vd = voltage_drop_v(length_m, current, c["r_ohm_km"], c["x_ohm_km"], pf, phases)
        vd_pct = vd / voltage_v * 100
        if vd_pct <= vd_limit_pct:
            return {"size_mm2": c["size_mm2"], "current_a": round(current, 2),
                    "derated_ampacity_a": round(amp, 1), "voltage_drop_v": round(vd, 2),
                    "voltage_drop_pct": round(vd_pct, 2), "cost_per_m_inr": c["cost_per_m_inr"]}
    return {"size_mm2": None, "current_a": round(current, 2),
            "voltage_drop_pct": None, "note": "No listed size passes — increase size or shorten run."}

def main():
    p = argparse.ArgumentParser(description="Cable sizing and voltage drop calculator")
    p.add_argument("--kw", type=float, default=15.0, help="load kW")
    p.add_argument("--voltage", type=float, default=415.0)
    p.add_argument("--pf", type=float, default=0.85)
    p.add_argument("--length", type=float, default=60.0, help="run length m")
    p.add_argument("--phases", type=int, choices=[1, 3], default=3)
    p.add_argument("--vd-limit", type=float, default=5.0, help="voltage drop limit percent")
    a = p.parse_args()
    print(json.dumps(select_cable(a.kw, a.voltage, a.pf, a.length, a.phases, a.vd_limit), indent=2))

if __name__ == "__main__":
    main()
