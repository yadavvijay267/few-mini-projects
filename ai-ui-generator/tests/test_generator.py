import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from generator import build_mockup, refine_mockup, detect_kind, detect_business, generate


def test_pricing_page_for_gym():
    html = build_mockup("a pricing page for a gym")
    assert "Gym" in html and "Pricing" in html
    assert "999" in html and "tailwindcss" in html.lower()


def test_kind_detection():
    assert detect_kind("a dashboard for a cafe") == "dashboard"
    assert detect_kind("a sign up form") == "form"
    assert detect_kind("a landing page") == "landing"


def test_business_detection():
    assert detect_business("a pricing page for a gym") == "gym"
    assert detect_business("something generic") == "business"


def test_refine_header_darker():
    html = refine_mockup(build_mockup("a pricing page for a gym"), "make the header darker")
    assert "bg-slate-900" in html and "bg-blue-600" not in html


def test_generate_without_key_uses_template():
    html = generate("a pricing page for a gym", api_key=None)
    assert "Gym" in html and html.startswith("<!doctype html>")
