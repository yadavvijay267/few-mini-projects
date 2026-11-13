"""Energy consumption calculations. Original code."""
import argparse, json

def energy_kwh(power_w, hours):
    return round(power_w * hours / 1000.0, 3)

def cost_inr(energy_kwh, tariff_inr_per_kwh):
    return round(energy_kwh * tariff_inr_per_kwh, 2)

def vampire_report(devices):
    """devices: [{name, standby_w, idle}] -> standby waste per month."""
    out = []
    for d in devices:
        if d.get("idle") and d["standby_w"] > 2:
            monthly_kwh = d["standby_w"] * 24 * 30 / 1000.0
            out.append({"name": d["name"], "standby_w": d["standby_w"],
                        "monthly_kwh": round(monthly_kwh, 2)})
    return sorted(out, key=lambda x: -x["monthly_kwh"])

def alert_check(device, live_w):
    """True when live power exceeds 1.5x typical power."""
    return live_w > 1.5 * device["typical_w"]

def biggest_consumer(devices):
    """devices: [{name, kwh}] -> the name with the highest kWh."""
    return max(devices, key=lambda d: d["kwh"])["name"]

def main():
    p = argparse.ArgumentParser(description="Energy consumption monitor")
    p.add_argument("--watts", type=float, default=1500.0)
    p.add_argument("--hours", type=float, default=4.0)
    p.add_argument("--tariff", type=float, default=8.0)
    a = p.parse_args()
    e = energy_kwh(a.watts, a.hours)
    print(json.dumps({"energy_kwh": e, "cost_inr": cost_inr(e, a.tariff)}, indent=2))

if __name__ == "__main__":
    main()
