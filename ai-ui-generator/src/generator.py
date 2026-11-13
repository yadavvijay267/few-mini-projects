"""AI UI generator: prompt -> HTML/Tailwind mockup.

Offline mode (default): keyword-driven templates — pricing / landing /
dashboard / form — composed into a Tailwind page. LLM mode: when
GEMINI_API_KEY is set, the prompt is sent to Gemini and the returned
HTML is used instead (template mode is the fallback). Refinements
("make the header darker") patch the generated page.
"""
import argparse, json, os, re, urllib.request

TEMPLATES = {
    "pricing": {"title": "Pricing", "sections": ["hero", "pricing-cards", "faq"]},
    "landing": {"title": "Landing", "sections": ["hero", "features", "cta"]},
    "dashboard": {"title": "Dashboard", "sections": ["sidebar", "stats", "chart"]},
    "form": {"title": "Sign up", "sections": ["hero", "form"]},
}


def detect_kind(prompt):
    p = prompt.lower()
    for kind in ("pricing", "dashboard", "form"):
        if kind in p:
            return kind
    return "landing"


def detect_business(prompt):
    for word in ("gym", "cafe", "salon", "school", "clinic", "saas", "shop", "studio"):
        if word in prompt.lower():
            return word
    return "business"


def build_mockup(prompt):
    kind, biz = detect_kind(prompt), detect_business(prompt)
    title = f"{biz.title()} — {TEMPLATES[kind]['title']}"
    cards = ""
    if kind == "pricing":
        cards = "".join(
            f'<div class="p-6 bg-white rounded-xl shadow"><h3 class="text-xl font-bold">{n}</h3>'
            f'<p class="text-3xl font-bold my-2">₹{price}</p><p>{desc}</p>'
            f'<button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Choose {n}</button></div>'
            for n, price, desc in (("Basic", "499/mo", "For starters"),
                                   ("Pro", "999/mo", "Most popular"),
                                   ("Team", "1999/mo", "For teams")))
    body = f"""<header class="bg-blue-600 text-white p-6"><h1 class="text-3xl font-bold">{title}</h1>
<p class="opacity-80">Generated from: {prompt}</p></header>
<main class="p-6 max-w-5xl mx-auto"><section class="grid md:grid-cols-3 gap-4">{cards or '<p>Welcome to your ' + biz + ' page.</p>'}</section></main>"""
    return ("<!doctype html><html><head><meta charset='utf-8'>"
            '<script src="https://cdn.tailwindcss.com"></script></head><body>'
            + body + "</body></html>")


def refine_mockup(html, instruction):
    ins = instruction.lower()
    if "darker" in ins and "header" in ins:
        html = html.replace("bg-blue-600", "bg-slate-900")
    if "bigger" in ins and ("title" in ins or "heading" in ins):
        html = html.replace("text-3xl", "text-5xl")
    if "green" in ins:
        html = html.replace("bg-blue-600", "bg-green-700")
    return html


def llm_generate(prompt, api_key):
    """Gemini free tier. Returns HTML string or None on any failure."""
    url = ("https://generativelanguage.googleapis.com/v1beta/models/"
           "gemini-3.5-flash-lite:generateContent?key=" + api_key)
    body = json.dumps({"contents": [{"parts": [{"text":
        "Generate a complete single-file HTML page with Tailwind CSS for: "
        + prompt + ". Return ONLY the HTML code, no markdown."}]}]}).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            text = json.load(r)["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        return None
    m = re.search(r"```html(.*?)```", text, re.S)
    return (m.group(1) if m else text).strip()


def generate(prompt, refine=None, api_key=None):
    html = llm_generate(prompt, api_key) if api_key else None
    if html is None:
        html = build_mockup(prompt)
    if refine:
        html = refine_mockup(html, refine)
    return html


def main(argv=None):
    p = argparse.ArgumentParser(description="AI UI generator")
    p.add_argument("--prompt", required=True)
    p.add_argument("--refine")
    p.add_argument("--out")
    args = p.parse_args(argv)
    html = generate(args.prompt, args.refine, os.environ.get("GEMINI_API_KEY"))
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(html)
        print("wrote", args.out, f"({len(html)} bytes)")
    else:
        print(html)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


# ---- Prompt-parsing API (rule-based templates) ----
import re as _re

_PAGE_TYPES = ["pricing", "portfolio", "contact", "dashboard", "landing", "form"]
_SECTIONS = {
    "pricing": ["hero", "features", "pricing", "faq"],
    "landing": ["hero", "features", "cta"],
    "portfolio": ["hero", "gallery", "about"],
    "contact": ["hero", "form", "info"],
    "dashboard": ["sidebar", "stats", "chart"],
    "form": ["hero", "form"],
}


def parse_prompt(prompt):
    """Parse a natural-language UI request into a spec dict."""
    p = prompt.lower()
    page_type = next((t for t in _PAGE_TYPES if t in p), "landing")
    if "sign up" in p or "signup" in p:
        page_type = "form"
    m = _re.search(r"for an?\s+([A-Za-z]+)", prompt)
    business = m.group(1).capitalize() if m else "Business"
    tone = "playful" if "playful" in p else ("professional" if "professional" in p else "clean")
    colour = next((c for c in ("green", "blue", "dark", "purple", "orange") if c in p), "blue")
    return {"page_type": page_type, "business": business, "tone": tone,
            "colour": colour, "header_dark": False,
            "sections": list(_SECTIONS[page_type])}


def apply_refinement(spec, instruction):
    """Apply a follow-up instruction to a spec dict (returns the spec)."""
    ins = instruction.lower()
    if "testimonial" in ins and "testimonials" not in spec["sections"]:
        spec["sections"].append("testimonials")
    if "darker" in ins and "header" in ins:
        spec["header_dark"] = True
    return spec


def generate_html(spec):
    """Render a spec dict into a complete single-file HTML page."""
    biz = spec["business"]
    header_bg = "#06121f" if spec.get("header_dark") else "#2563eb"
    hero_title = (f"Simple pricing for {biz}" if spec["page_type"] == "pricing"
                  else f"{biz} — {spec['page_type'].title()}")
    parts = [f"<!DOCTYPE html><html><head><meta charset='utf-8'>"
             f"<script src='https://cdn.tailwindcss.com'></script></head><body>",
             f"<header style='background:{header_bg}' class='text-white p-6'>"
             f"<h1 class='text-3xl font-bold'>{hero_title}</h1></header>",
             "<main class='p-6 max-w-5xl mx-auto'>"]
    if "features" in spec["sections"]:
        parts.append("<section><h2 class='text-2xl font-bold'>Features</h2>"
                     "<p>Fast, simple, and built for your business.</p></section>")
    if spec["page_type"] == "pricing" or "pricing" in spec["sections"]:
        parts.append("<section class='grid md:grid-cols-3 gap-4 mt-4'>"
                     "<div class='p-6 border rounded'><h3>Basic</h3><p class='text-3xl'>\u20b9499/mo</p></div>"
                     "<div class='p-6 border rounded'><h3>Pro</h3><p class='text-3xl'>\u20b9999/mo</p></div>"
                     "<div class='p-6 border rounded'><h3>Team</h3><p class='text-3xl'>\u20b91999/mo</p></div>"
                     "</section>")
    if "testimonials" in spec["sections"]:
        parts.append("<section class='mt-6'><h2 class='text-2xl font-bold'>What customers say</h2>"
                     "<p>\u201cBest decision we made.\u201d \u2014 a happy customer</p></section>")
    parts.append("<footer class='mt-8 text-sm text-gray-500'>"
                 "Built with rule-based templates \u2014 set GEMINI_API_KEY for LLM generation.</footer>")
    parts.append("</main></body></html>")
    return "".join(parts)
