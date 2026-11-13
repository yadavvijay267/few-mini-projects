"""Rack capacity planning logic (DCIM Lite). Original code."""
import argparse, json

RACK_U = 42
RACK_POWER_LIMIT_KW = 8.0
RACK_WEIGHT_LIMIT_KG = 1000.0

def rack_totals(devices):
    """devices: list of dicts with u_size, power_kw, weight_kg."""
    used_u = sum(d["u_size"] for d in devices)
    power = sum(d["power_kw"] for d in devices)
    weight = sum(d["weight_kg"] for d in devices)
    return {"used_u": used_u, "free_u": RACK_U - used_u,
            "power_kw": round(power, 2), "weight_kg": weight,
            "u_pct": round(used_u / RACK_U * 100, 1),
            "power_pct": round(power / RACK_POWER_LIMIT_KW * 100, 1),
            "over_power": power > RACK_POWER_LIMIT_KW,
            "over_weight": weight > RACK_WEIGHT_LIMIT_KG}

def stranded_u(devices, typical_device_kw=0.5, typical_device_u=2):
    """Free U that cannot be used because remaining power is too small."""
    t = rack_totals(devices)
    remaining_power = RACK_POWER_LIMIT_KW - t["power_kw"]
    if remaining_power < typical_device_kw:
        return t["free_u"]
    usable_u = int(remaining_power // typical_device_kw) * typical_device_u
    return max(0, t["free_u"] - usable_u)

def room_summary(racks, room_power_kw=100.0):
    total_power = sum(rack_totals(r)["power_kw"] for r in racks)
    total_stranded = sum(stranded_u(r) for r in racks)
    return {"racks": len(racks), "total_power_kw": round(total_power, 2),
            "headroom_kw": round(room_power_kw - total_power, 2),
            "stranded_u": total_stranded}

def main():
    p = argparse.ArgumentParser(description="Rack capacity planner (DCIM Lite)")
    p.add_argument("--devices", default='[{"u_size": 2, "power_kw": 0.5, "weight_kg": 25}]',
                   help="JSON list of devices")
    a = p.parse_args()
    devices = json.loads(a.devices)
    print(json.dumps({**rack_totals(devices), "stranded_u": stranded_u(devices)}, indent=2))

if __name__ == "__main__":
    main()
