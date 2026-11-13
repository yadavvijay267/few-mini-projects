import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from writer import enhance_bullet, ats_gap

KEYWORDS = ["python", "sql", "pandas", "dashboards"]


def test_weak_verb_upgraded():
    out = enhance_bullet("Did data analysis work for the sales team")
    assert not out.lower().startswith("did")
    assert out[0].isupper()
    assert out.endswith(".")


def test_detailed_tone_adds_result():
    out = enhance_bullet("Worked on dashboards", tone="detailed")
    assert "improving" in out


def test_ats_gap_reports_missing():
    job = "We need Python and SQL and pandas dashboards."
    gap = ats_gap(job, ["Built dashboards with SQL."], KEYWORDS)
    assert gap["match_pct"] == 50.0
    assert "python" in gap["missing"]
    assert "sql" in gap["matched"]


def test_ats_gap_full_match_is_100():
    job = "Python SQL pandas dashboards."
    gap = ats_gap(job, ["Python, SQL, pandas dashboards."], KEYWORDS)
    assert gap["match_pct"] == 100.0
    assert gap["missing"] == []
