"""Tests — run with: python3 -m pytest tests/ -v"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest
from aqi import aqi_for_pollutant, compute_aqi, category, ventilation_advice, PM25_BP, co2_verdict

def test_epa_breakpoints_pm25():
    assert aqi_for_pollutant(12.0, PM25_BP) == 50
    assert aqi_for_pollutant(35.4, PM25_BP) == 100
    assert aqi_for_pollutant(55.4, PM25_BP) == 150
    assert aqi_for_pollutant(0.0, PM25_BP) == 0

def test_aqi_interpolation():
    # midpoint of 12.1-35.4 band (51-100): conc 23.75 -> ~75
    assert aqi_for_pollutant(23.75, PM25_BP) == pytest.approx(75, abs=1)

def test_overall_aqi_is_max_and_driver_named():
    aqi, driver = compute_aqi(pm25=86, pm10=140)
    assert driver == "PM2.5"  # 86 -> ~172, 140 -> ~91
    assert aqi == aqi_for_pollutant(86, PM25_BP)

def test_categories():
    assert category(42)[0] == "Good"
    assert category(120)[0] == "Unhealthy for sensitive groups"
    assert category(320)[0] == "Hazardous"

def test_ventilation_advice():
    assert "Open windows" in ventilation_advice(150, 60)
    assert "purifier" in ventilation_advice(60, 180)
    assert "similar" in ventilation_advice(80, 85).lower()

def test_co2_verdict():
    assert "Good" in co2_verdict(700)
    assert "ventilate" in co2_verdict(1600).lower()
