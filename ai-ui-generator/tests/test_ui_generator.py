"""Tests: prompt parsing, spec refinement, HTML generation (Python mirror of the JS)."""
import os, subprocess, sys
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE, "src"))
import generator as G

def test_parse_pricing_gym():
    spec = G.parse_prompt("a pricing page for a gym")
    assert spec["page_type"] == "pricing"
    assert spec["business"] == "Gym"
    assert "features" in spec["sections"]

def test_parse_landing_bakery_playful():
    spec = G.parse_prompt("a landing page for a bakery, playful tone, green")
    assert spec["page_type"] == "landing"
    assert spec["business"] == "Bakery"
    assert spec["tone"] == "playful"
    assert spec["colour"] == "green"

def test_parse_portfolio():
    assert G.parse_prompt("a portfolio site for a photographer")["page_type"] == "portfolio"

def test_refinement_adds_testimonials_and_darkens():
    spec = G.parse_prompt("a landing page for a gym")
    spec = G.apply_refinement(spec, "add testimonials and make the header darker")
    assert "testimonials" in spec["sections"]
    assert spec["header_dark"] is True
    html = G.generate_html(spec)
    assert "What customers say" in html and "#06121f" in html

def test_generated_html_is_complete():
    spec = G.parse_prompt("a pricing page for a gym")
    html = G.generate_html(spec)
    assert html.startswith("<!DOCTYPE html>") and "</html>" in html
    assert "Simple pricing for Gym" in html
    assert "₹499/mo" in html and "Pro" in html
    assert "rule-based templates" in html  # honesty note present in output

def test_cli_generates_file(tmp_path):
    out = tmp_path / "out.html"
    r = subprocess.run([sys.executable, os.path.join(BASE, "src", "generate.py"),
                        "--prompt", "a pricing page for a gym", "--output", str(out)],
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    assert out.exists() and "Gym" in out.read_text()

def test_cli_spec_flag():
    r = subprocess.run([sys.executable, os.path.join(BASE, "src", "generate.py"),
                        "--prompt", "a contact page for a clinic", "--spec"],
                       capture_output=True, text=True)
    assert r.returncode == 0 and '"page_type": "contact"' in r.stdout

def test_help_exits_zero():
    r = subprocess.run([sys.executable, os.path.join(BASE, "src", "generate.py"), "--help"],
                       capture_output=True, text=True)
    assert r.returncode == 0
