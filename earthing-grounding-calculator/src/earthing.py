#!/usr/bin/env python3
"""Earthing & grounding calculator (IEEE 80 simplified) — CLI."""
import argparse, csv, math, sys

def wenner_resistivity(spacing_m, resistance_ohm):
    return 2 * math.pi * spacing_m * resistance_ohm

def rod_resistance(rho, length_m, diameter_m):
    # R = rho/(2*pi*L) * ln(4L/d)
    return rho / (2 * math.pi * length_m) * math.log(4 * length_m / diameter_m)

def rods_resistance(rho, length_m, diameter_m, n_rods, spacing_m):
    # parallel rods with spacing efficiency: closer rods interfere
    single = rod_resistance(rho, length_m, diameter_m)
    efficiency = 0.65 + 0.35 * min(spacing_m / (2 * length_m), 1.0)
    return single / (n_rods * efficiency)

def grid_resistance(rho, area_m2, total_length_m, depth_m):
    # IEEE 80 simplified (Schwarz): Rg = rho * [1/Lt + 1/sqrt(20A) * (1 + 1/(1 + h*sqrt(20/A)))]
    term = 1 / total_length_m + (1 / math.sqrt(20 * area_m2)) * (1 + 1 / (1 + depth_m * math.sqrt(20 / area_m2)))
    return rho * term

def tolerable_touch(rho_surface, cs=1.0, duration_s=0.5):
    return (1000 + 1.5 * cs * rho_surface) * 0.116 / math.sqrt(duration_s)

def tolerable_step(rho_surface, cs=1.0, duration_s=0.5):
    return (1000 + 6.0 * cs * rho_surface) * 0.116 / math.sqrt(duration_s)

def design_check(rho, grid_r, fault_current_a, duration_s=0.5, rho_surface=3000.0, cs=0.7):
    """Actual voltages are estimated conservatively: mesh voltage ~ 0.4*Ig*Rg,
    step voltage ~ 0.25*Ig*Rg (simplified factors; a full IEEE 80 mesh/step
    factor calculation needs the detailed grid geometry)."""
    gpr = fault_current_a * grid_r  # ground potential rise
    e_touch = 0.4 * gpr
    e_step = 0.25 * gpr
    return {"grid_resistance_ohm": round(grid_r, 2), "gpr_v": round(gpr, 0),
            "touch_v": round(e_touch, 0), "touch_limit_v": round(tolerable_touch(rho_surface, cs, duration_s), 0),
            "step_v": round(e_step, 0), "step_limit_v": round(tolerable_step(rho_surface, cs, duration_s), 0),
            "touch_ok": e_touch < tolerable_touch(rho_surface, cs, duration_s),
            "step_ok": e_step < tolerable_step(rho_surface, cs, duration_s)}

def main(argv=None):
    ap = argparse.ArgumentParser(description="Earthing & grounding calculator (IEEE 80 simplified): soil resistivity, rod/grid resistance, step & touch voltage checks.")
    ap.add_argument("--rho", type=float, help="Soil resistivity ohm-m")
    ap.add_argument("--wenner", help="CSV with spacing_m,resistance_ohm (Wenner 4-point data)")
    ap.add_argument("--rod", nargs=2, type=float, metavar=("LENGTH_M", "DIA_M"), help="Single rod length and diameter")
    ap.add_argument("--rods", nargs=3, type=float, metavar=("N", "LENGTH_M", "SPACING_M"), help="N rods of length, spacing")
    ap.add_argument("--grid", nargs=2, type=float, metavar=("LENGTH_M", "WIDTH_M"), help="Grid dimensions")
    ap.add_argument("--depth", type=float, default=0.5, help="Burial depth m (default 0.5)")
    ap.add_argument("--fault-current", type=float, default=5000.0, help="Earth fault current A (default 5000)")
    ap.add_argument("--duration", type=float, default=0.5, help="Fault duration s (default 0.5)")
    ap.add_argument("--surface-rho", type=float, default=3000.0, help="Surface layer resistivity ohm-m (default 3000, crushed rock)")
    a = ap.parse_args(argv)
    rho = a.rho
    if a.wenner:
        vals = []
        with open(a.wenner, newline="") as f:
            for r in csv.DictReader(f):
                vals.append(wenner_resistivity(float(r["spacing_m"]), float(r["resistance_ohm"])))
        rho = sum(vals) / len(vals)
        print(f"Wenner readings: {[round(v,1) for v in vals]} ohm-m -> mean rho = {rho:.1f} ohm-m")
    if rho is None:
        ap.error("give --rho or --wenner")
    if a.rod:
        print(f"Single rod {a.rod[0]} m x {a.rod[1]} m dia: R = {rod_resistance(rho, a.rod[0], a.rod[1]):.2f} ohm")
    if a.rods:
        n, L, s = a.rods
        print(f"{int(n)} rods, {L} m, spacing {s} m: R = {rods_resistance(rho, L, 0.016, int(n), s):.2f} ohm")
    if a.grid:
        L, W = a.grid
        area = L * W
        # perimeter conductors + cross meshes every 5 m
        lt = 2 * (L + W) + (int(L // 5) * W) + (int(W // 5) * L)
        rg = grid_resistance(rho, area, lt, a.depth)
        chk = design_check(rho, rg, a.fault_current, a.duration, a.surface_rho)
        print(f"Grid {L} m x {W} m ({area:.0f} m2, {lt:.0f} m conductor): Rg = {chk['grid_resistance_ohm']} ohm")
        print(f"GPR = {chk['gpr_v']:.0f} V | touch {chk['touch_v']:.0f} V vs limit {chk['touch_limit_v']:.0f} V -> {'PASS' if chk['touch_ok'] else 'FAIL'}")
        print(f"          step  {chk['step_v']:.0f} V vs limit {chk['step_limit_v']:.0f} V -> {'PASS' if chk['step_ok'] else 'FAIL'}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
