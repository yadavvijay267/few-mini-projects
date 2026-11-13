"""UPS and battery backup sizing. Original code (IEEE 485 simplified)."""
import argparse, json, math

BATTERIES = {
    "VRLA": {"cell_v": 2.0, "dod": 0.8, "cell_ah": 100, "cost_per_kwh_inr": 18000,
             "life_years": 5, "footprint_m2_per_kwh": 0.08},
    "Li-ion": {"cell_v": 3.2, "dod": 0.9, "cell_ah": 100, "cost_per_kwh_inr": 42000,
               "life_years": 12, "footprint_m2_per_kwh": 0.03},
}
INVERTER_EFF = 0.92
AGEING_FACTOR = 1.25  # battery loses capacity with age; most calculators ignore this

def ups_rating_kva(load_kva, headroom=1.25):
    return math.ceil(load_kva * headroom)

def battery_ah(load_kw, autonomy_min, dc_bus_v=480, battery="VRLA", temp_factor=1.11):
    """Required usable Ah at the DC bus, with ageing + temperature derating."""
    spec = BATTERIES[battery]
    energy_wh = load_kw * 1000 * (autonomy_min / 60.0) / INVERTER_EFF
    ah = energy_wh / dc_bus_v * AGEING_FACTOR * temp_factor / spec["dod"]
    return {"required_ah": round(ah, 1), "energy_kwh": round(energy_wh / 1000, 2),
            "cells_series": math.ceil(dc_bus_v / spec["cell_v"]),
            "strings_parallel": max(1, math.ceil(ah / spec["cell_ah"]))}

def runtime_minutes(load_kw, installed_ah, dc_bus_v=480, battery="VRLA"):
    spec = BATTERIES[battery]
    usable_wh = installed_ah * dc_bus_v * spec["dod"] / AGEING_FACTOR
    return round(usable_wh * INVERTER_EFF / (load_kw * 1000) * 60, 1)

def compare(load_kw, autonomy_min, dc_bus_v=480):
    out = {}
    for name in BATTERIES:
        b = battery_ah(load_kw, autonomy_min, dc_bus_v, name)
        out[name] = {**b, "cost_inr": round(b["energy_kwh"] * BATTERIES[name]["cost_per_kwh_inr"]),
                     "footprint_m2": round(b["energy_kwh"] * BATTERIES[name]["footprint_m2_per_kwh"], 2),
                     "life_years": BATTERIES[name]["life_years"]}
    return out

def main():
    p = argparse.ArgumentParser(description="UPS and battery backup sizing tool")
    p.add_argument("--kva", type=float, default=20.0, help="critical load kVA")
    p.add_argument("--pf", type=float, default=0.9)
    p.add_argument("--autonomy", type=float, default=30.0, help="autonomy minutes")
    p.add_argument("--dc-bus", type=float, default=480.0)
    p.add_argument("--battery", choices=list(BATTERIES), default="VRLA")
    a = p.parse_args()
    kw = a.kva * a.pf
    print(json.dumps({"ups_kva": ups_rating_kva(a.kva), "load_kw": kw,
                      **battery_ah(kw, a.autonomy, a.dc_bus, a.battery)}, indent=2))

if __name__ == "__main__":
    main()
