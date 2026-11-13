"""Power load and demand calculator. Original code."""
import argparse, json

STANDARD_TRANSFORMERS_KVA = [25, 50, 100, 160, 200, 250, 315, 400, 500, 630,
                             800, 1000, 1250, 1600, 2000]

def load_demand_kw(connected_kw, demand_factor):
    return connected_kw * demand_factor

def group_demand_kw(loads, diversity_factor):
    """loads: list of (connected_kw, demand_factor)."""
    return sum(load_demand_kw(c, df) for c, df in loads) * diversity_factor

def total_demand(loads_by_group, pf=0.9):
    """loads_by_group: {group: (loads, diversity_factor)} -> dict with kW/kVA."""
    total_kw = sum(group_demand_kw(loads, div) for loads, div in loads_by_group.values())
    return {"total_demand_kw": round(total_kw, 2), "total_demand_kva": round(total_kw / pf, 2)}

def recommend_transformer_kva(demand_kva, growth_margin=1.25):
    needed = demand_kva * growth_margin
    for size in STANDARD_TRANSFORMERS_KVA:
        if size >= needed:
            return size
    return None

def main():
    p = argparse.ArgumentParser(description="Power load and demand calculator")
    p.add_argument("--kw", type=float, default=100.0, help="total connected load kW")
    p.add_argument("--demand-factor", type=float, default=0.7)
    p.add_argument("--diversity", type=float, default=0.85)
    p.add_argument("--pf", type=float, default=0.9)
    a = p.parse_args()
    t = total_demand({"all": ([(a.kw, a.demand_factor)], a.diversity)}, a.pf)
    t["recommended_transformer_kva"] = recommend_transformer_kva(t["total_demand_kva"])
    print(json.dumps(t, indent=2))

if __name__ == "__main__":
    main()
