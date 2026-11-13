"""Tests — run with: python3 -m pytest tests/ -v"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest
from datetime import date
from forecast import ols, run_out_date

def test_ols_exact_line():
    f = ols([0, 1, 2, 3], [10, 12, 14, 16])
    assert f["slope"] == pytest.approx(2.0)
    assert f["intercept"] == pytest.approx(10.0)
    assert f["r2"] == pytest.approx(1.0)

def test_run_out_date_arithmetic():
    # 100,110,120,... slope 10/mo; capacity 200 -> t*=10 -> 7 months after last (index 2)
    d, ahead, fit = run_out_date([date(2026,1,1), date(2026,2,1), date(2026,3,1)],
                                 [100, 110, 120], 200, last_date=date(2026, 3, 1))
    assert fit["slope"] == pytest.approx(10.0)
    assert ahead == pytest.approx(8.0)
    assert d == date(2026, 11, 1)

def test_faster_growth_moves_runout_earlier():
    vals = [420, 440, 460, 480, 500, 520]
    d1, a1, _ = run_out_date([date(2026,1,1)]*6, vals, 1000, growth=1.0, last_date=date(2026, 6, 1))
    d2, a2, _ = run_out_date([date(2026,1,1)]*6, vals, 1000, growth=1.5, last_date=date(2026, 6, 1))
    assert a2 < a1 and d2 < d1

def test_flat_load_never_runs_out():
    d, ahead, fit = run_out_date([date(2026,1,1)]*6, [500]*6, 1000, last_date=date(2026, 6, 1))
    assert d is None and ahead is None

def test_sample_csv_slopes_positive():
    import csv, os
    p = os.path.join(os.path.dirname(__file__), "..", "assets", "sample-utilisation.csv")
    rows = list(csv.DictReader(open(p)))
    for key in ("power_kw", "racks", "cooling_kw"):
        vals = [float(r[key]) for r in rows]
        assert ols(list(range(len(vals))), vals)["slope"] > 0
        assert ols(list(range(len(vals))), vals)["r2"] > 0.95
