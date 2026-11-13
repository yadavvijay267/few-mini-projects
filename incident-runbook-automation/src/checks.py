"""Named checks, evaluated against the simulated facility state.
In production each check would query the real BMS / monitoring API."""
import json, os

STATE = os.path.join(os.path.dirname(__file__), "..", "assets", "simulated_state.json")

def load_state():
    with open(STATE) as f:
        return json.load(f)

def check_ups_on_battery(state):
    return state.get("ups_on_battery") is True, f"UPS on battery={state.get('ups_on_battery')}, load={state.get('ups_load_pct')}%"

def check_ups_runtime_ok(state):
    mins = state.get("ups_runtime_minutes", 0)
    return mins > 10, f"remaining runtime {mins} min (need > 10)"

def check_temperature_rising(state):
    temp = state.get("hottest_inlet_c", 0)
    # A CRAC failure is confirmed by a hot inlet; the check passes when the
    # condition the runbook expects is present and measurable.
    return temp > 27, f"hottest inlet {temp} C (alert above 27 C)"

def check_link_flapping(state):
    return state.get("core_link_flapping") is True, f"core link flapping={state.get('core_link_flapping')}"

def check_power_stable(state):
    return state.get("power_stable") is True, f"power stable={state.get('power_stable')}"

CHECKS = {"ups_on_battery": check_ups_on_battery, "ups_runtime_ok": check_ups_runtime_ok,
          "temperature_rising": check_temperature_rising, "link_flapping": check_link_flapping,
          "power_stable": check_power_stable}

def run_check(name, state=None):
    if name not in CHECKS:
        return False, f"unknown check: {name}"
    return CHECKS[name](state or load_state())
