import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from fiber_calc import loss_budget, evaluate

def test_10km_sm_1550():
    # 10 km x 0.22 = 2.2; 4 splices x 0.05 = 0.2; 2 connectors x 0.30 = 0.6; margin 3.0
    r = loss_budget(10, "SM", 1550, splices=4, connectors=2, margin_db=3.0)
    assert r["fiber_loss_db"] == 2.2
    assert r["splice_loss_db"] == 0.2
    assert r["connector_loss_db"] == 0.6
    assert r["total_loss_db"] == 6.0
    assert r["dominant"] == "margin"

def test_mm_850_short_link():
    r = loss_budget(0.5, "MM", 850, splices=2, connectors=2, margin_db=3.0)
    assert r["fiber_loss_db"] == 1.5
    assert r["total_loss_db"] == 5.7

def test_pass_fail():
    assert evaluate(6.0, 0.0, -28.0) == {"power_budget_db": 28.0, "budget_margin_db": 22.0, "passes": True}
    assert evaluate(30.0, 0.0, -28.0)["passes"] is False
