#!/usr/bin/env python3
"""Solar rooftop estimator — CLI. Generation: E = kWp x PSH x 365 x PR."""
import argparse, math, sys

PANEL_W = 550          # W per panel
PANEL_AREA = 2.2       # m2 per panel
USABLE_FRACTION = 0.70
PR = 0.78              # performance ratio
COST_PER_KWP = 55000   # Rs installed
CO2_PER_KWH = 0.82     # kg CO2 per grid kWh (India average)

CITY_PSH = {"noida": 5.1, "delhi": 5.0, "mumbai": 4.6, "bengaluru": 5.3,
            "chennai": 5.4, "jaipur": 5.5, "lucknow": 4.9, "kolkata": 4.5,
            "hyderabad": 5.4, "pune": 5.2}
CITY_LAT = {"noida": 28.54, "delhi": 28.61, "mumbai": 19.08, "bengaluru": 12.97,
            "chennai": 13.08, "jaipur": 26.91, "lucknow": 26.85, "kolkata": 22.57,
            "hyderabad": 17.39, "pune": 18.52}

def panel_count(area_m2):
    return int((area_m2 * USABLE_FRACTION) // PANEL_AREA)

def system_kwp(panels):
    return panels * PANEL_W / 1000.0

def tilt_factor(tilt_deg, latitude_deg):
    # best tilt ~= latitude; loss grows with |tilt - latitude|
    return max(0.70, math.cos(math.radians(abs(tilt_deg - latitude_deg))) ** 1.5)

def orientation_factor(azimuth_deg):
    # 180 = due south (northern hemisphere); loss ~ cos of deviation
    return max(0.70, math.cos(math.radians(azimuth_deg - 180)) ** 0.8)

def annual_generation(kwp, psh, pr=PR, tilt_f=1.0, orient_f=1.0):
    return kwp * psh * 365 * pr * tilt_f * orient_f

def estimate(area_m2, psh, tariff, tilt=28, latitude=28.5, azimuth=180):
    panels = panel_count(area_m2)
    kwp = system_kwp(panels)
    tf, of = tilt_factor(tilt, latitude), orientation_factor(azimuth)
    gen = annual_generation(kwp, psh, tilt_f=tf, orient_f=of)
    cost = kwp * COST_PER_KWP
    saving = gen * tariff
    return {"panels": panels, "kwp": round(kwp, 2), "usable_area_m2": round(area_m2 * USABLE_FRACTION, 1),
            "annual_kwh": round(gen), "monthly_kwh": round(gen / 12),
            "system_cost_rs": round(cost), "annual_saving_rs": round(saving),
            "payback_years": round(cost / saving, 1) if saving else float("inf"),
            "lifetime_25y_kwh": round(gen * 25), "co2_avoided_tonnes_25y": round(gen * 25 * CO2_PER_KWH / 1000, 1)}

def main(argv=None):
    ap = argparse.ArgumentParser(description="Solar rooftop estimator: panels, generation, savings and payback from roof area and location.")
    ap.add_argument("--area", type=float, required=True, help="Gross roof area in m2")
    ap.add_argument("--city", default="Noida", help="City (fallback PSH table)")
    ap.add_argument("--psh", type=float, help="Peak sun hours per day (overrides city table)")
    ap.add_argument("--tariff", type=float, default=8.0, help="Electricity tariff Rs/kWh (default 8)")
    ap.add_argument("--tilt", type=float, default=28.0, help="Panel tilt in degrees (default 28)")
    ap.add_argument("--azimuth", type=float, default=180.0, help="Azimuth: 180 = due south (default 180)")
    a = ap.parse_args(argv)
    psh = a.psh if a.psh is not None else CITY_PSH.get(a.city.lower(), 5.0)
    lat = CITY_LAT.get(a.city.lower(), 28.5)
    r = estimate(a.area, psh, a.tariff, tilt=a.tilt, latitude=lat, azimuth=a.azimuth)
    print(f"Roof {a.area:.0f} m2 ({r['usable_area_m2']:.0f} m2 usable) in {a.city} (PSH {psh})")
    print(f"Panels: {r['panels']} x 550 W = {r['kwp']} kWp  |  layout: ~{max(1, r['panels'] // 2)} rows of 2")
    print(f"Generation: {r['annual_kwh']:,} kWh/year (~{r['monthly_kwh']:,} kWh/month)")
    print(f"System cost: Rs {r['system_cost_rs']:,} | saves Rs {r['annual_saving_rs']:,}/year")
    print(f"Payback: {r['payback_years']} years | 25-year generation {r['lifetime_25y_kwh']:,} kWh, CO2 avoided {r['co2_avoided_tonnes_25y']} t")
    return 0

if __name__ == "__main__":
    sys.exit(main())
