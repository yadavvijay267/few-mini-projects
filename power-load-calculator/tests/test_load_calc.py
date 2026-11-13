import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from load_calc import load_demand_kw, group_demand_kw, total_demand, recommend_transformer_kva

def test_load_demand():
    assert load_demand_kw(15, 0.8) == 12.0

def test_group_diversity():
    # (15 kW x 0.8) + (20 kW x 0.9) = 30, x diversity 0.85 = 25.5
    assert group_demand_kw([(15, 0.8), (20, 0.9)], 0.85) == 25.5

def test_total_and_transformer():
    t = total_demand({"hvac": ([(15, 0.8), (15, 0.8)], 0.85)}, pf=0.9)
    assert t["total_demand_kw"] == 20.4
    assert abs(t["total_demand_kva"] - 22.67) < 0.01
    assert recommend_transformer_kva(22.67) == 50  # 22.67 x 1.25 = 28.3 -> next size 50

def test_transformer_sizes():
    assert recommend_transformer_kva(100) == 160  # 125 -> 160
    assert recommend_transformer_kva(400) == 500
