#!/usr/bin/env python3
"""Air Quality Monitor — US EPA AQI from pollutant concentrations."""
import argparse, sys

# (C_lo, C_hi, I_lo, I_hi) per EPA breakpoint band
PM25_BP = [(0.0, 12.0, 0, 50), (12.1, 35.4, 51, 100), (35.5, 55.4, 101, 150),
           (55.5, 150.4, 151, 200), (150.5, 250.4, 201, 300), (250.5, 500.4, 301, 500)]
PM10_BP = [(0, 54, 0, 50), (55, 154, 51, 100), (155, 254, 101, 150),
           (255, 354, 151, 200), (355, 424, 201, 300), (425, 604, 301, 500)]

CATEGORIES = [(50, "Good", "#00e400", "Air quality is satisfactory."),
              (100, "Moderate", "#ffff00", "Acceptable; unusually sensitive people should consider reducing prolonged exertion."),
              (150, "Unhealthy for sensitive groups", "#ff7e00", "Sensitive groups should reduce prolonged or heavy exertion."),
              (200, "Unhealthy", "#ff0000", "Everyone may experience health effects; sensitive groups should avoid prolonged exertion."),
              (300, "Very unhealthy", "#8f3f97", "Health alert: everyone may experience more serious health effects."),
              (500, "Hazardous", "#7e0023", "Health warning: emergency conditions; avoid all outdoor exertion.")]

def aqi_for_pollutant(conc, table):
    for c_lo, c_hi, i_lo, i_hi in table:
        if c_lo <= conc <= c_hi:
            return round((i_hi - i_lo) / (c_hi - c_lo) * (conc - c_lo) + i_lo)
    return 500 if conc > table[-1][1] else 0

def compute_aqi(pm25=None, pm10=None):
    vals = []
    if pm25 is not None: vals.append((aqi_for_pollutant(pm25, PM25_BP), "PM2.5"))
    if pm10 is not None: vals.append((aqi_for_pollutant(pm10, PM10_BP), "PM10"))
    if not vals: raise ValueError("give at least one pollutant")
    aqi, driver = max(vals)
    return aqi, driver

def category(aqi):
    for limit, name, colour, advice in CATEGORIES:
        if aqi <= limit:
            return name, colour, advice
    return CATEGORIES[-1][1], CATEGORIES[-1][2], CATEGORIES[-1][3]

def ventilation_advice(indoor_aqi, outdoor_aqi):
    if outdoor_aqi < indoor_aqi - 10:
        return "Open windows — outdoor air is cleaner than indoor air right now."
    if outdoor_aqi > indoor_aqi + 10:
        return "Keep windows shut and run the purifier — outdoor air is worse."
    return "Air is similar inside and out — run the purifier on low, ventilate briefly."

def co2_verdict(ppm):
    if ppm < 800: return "Good — well ventilated"
    if ppm < 1000: return "Acceptable"
    if ppm < 1500: return "Stuffy — ventilate"
    return "Poor — ventilate now"

def main(argv=None):
    ap = argparse.ArgumentParser(description="Air Quality Monitor: compute US EPA AQI from PM2.5 / PM10, with health advice and ventilation recommendation.")
    ap.add_argument("--pm25", type=float, help="PM2.5 ug/m3")
    ap.add_argument("--pm10", type=float, help="PM10 ug/m3")
    ap.add_argument("--co2", type=float, help="CO2 ppm (indoor)")
    ap.add_argument("--indoor-pm25", type=float, help="Indoor PM2.5 for ventilation advice")
    ap.add_argument("--outdoor-pm25", type=float, help="Outdoor PM2.5 for ventilation advice")
    a = ap.parse_args(argv)
    if a.pm25 is None and a.pm10 is None:
        ap.error("give --pm25 and/or --pm10")
    aqi, driver = compute_aqi(a.pm25, a.pm10)
    name, colour, advice = category(aqi)
    print(f"AQI {aqi} ({name}) — driven by {driver}")
    print(f"Health advice: {advice}")
    if a.co2 is not None:
        print(f"CO2 {a.co2:.0f} ppm: {co2_verdict(a.co2)}")
    if a.indoor_pm25 is not None and a.outdoor_pm25 is not None:
        ia, _ = compute_aqi(a.indoor_pm25)
        oa, _ = compute_aqi(a.outdoor_pm25)
        print(f"Indoor AQI {ia} vs outdoor AQI {oa}: {ventilation_advice(ia, oa)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
