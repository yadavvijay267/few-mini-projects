"""PUE (Power Usage Effectiveness) calculations. Original code."""
import argparse, json

def pue(total_kw, it_kw):
    if it_kw <= 0:
        raise ValueError("IT load must be positive")
    return round(total_kw / it_kw, 3)

def breakdown(it_kw, cooling_kw, lighting_kw, losses_kw):
    total = it_kw + cooling_kw + lighting_kw + losses_kw
    return {"total_kw": round(total, 2), "pue": pue(total, it_kw),
            "cooling_kw": cooling_kw, "lighting_kw": lighting_kw,
            "losses_kw": losses_kw, "overhead_kw": round(total - it_kw, 2)}

def what_if_cooling(it_kw, cooling_kw, lighting_kw, losses_kw, reduction_pct):
    new_cooling = cooling_kw * (1 - reduction_pct / 100.0)
    return breakdown(it_kw, new_cooling, lighting_kw, losses_kw)

def energy_cost_inr(total_kw, hours, tariff_inr_per_kwh):
    return round(total_kw * hours * tariff_inr_per_kwh, 2)

def main():
    p = argparse.ArgumentParser(description="PUE monitoring calculator")
    p.add_argument("--it", type=float, default=500.0, help="IT load kW")
    p.add_argument("--cooling", type=float, default=180.0)
    p.add_argument("--lighting", type=float, default=15.0)
    p.add_argument("--losses", type=float, default=25.0)
    a = p.parse_args()
    print(json.dumps(breakdown(a.it, a.cooling, a.lighting, a.losses), indent=2))

if __name__ == "__main__":
    main()
