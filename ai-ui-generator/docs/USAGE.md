# Usage — AI UI Generator

```bash
python3 src/generator.py --prompt "a pricing page for a gym" --out output.html
python3 src/generator.py --prompt "a pricing page for a gym" --refine "make the header darker" --out output.html
GEMINI_API_KEY=<redacted>
python3 src/generator.py --prompt "a dashboard for a cafe" --out output.html
python3 -m pytest tests/ -q
```

Web UI: open `src/index.html` — type a prompt, **Generate**, toggle
Desktop/Mobile preview, refine in the box, **Export .html**.

LLM mode needs a Gemini key from the environment only. Without a key
(or if the API is unreachable) the template generator runs instead —
the mockup is still a real, working page.
