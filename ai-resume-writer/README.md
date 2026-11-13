# AI Resume Writer (LLM Tool)

Turn a job description into tailored, ATS-aware resume bullet points.
Works fully offline in template mode; optionally calls the Google Gemini
API when `GEMINI_API_KEY` is set — the key is read from the environment,
never embedded in the code.

## Features

- Paste a job description; get tailored bullet points for each role.
- **ATS keyword gap analysis** that runs locally on the generated text —
  you see the keyword match percentage before you copy.
- Tone control (`concise` / `detailed`) and length limits.
- Template-based enhancement that works offline: weak verbs are upgraded
  to strong action verbs, and bullets are restructured into
  action + result form.
- Optional LLM mode (Gemini) for free-form rewriting; falls back to
  template mode if no key is set or the API is unreachable.
- One-click copy and export to plain text.

## Tech stack

- Python 3.10+ (standard library only for the core; `requests` optional
  for the LLM call, which is implemented with `urllib` if it is absent).

## How to run

```bash
# Demo (offline template mode):
python3 src/writer.py --demo
# Your own bullet + job description:
python3 src/writer.py --bullet "Did data analysis work" --job assets/sample_job.txt --tone concise
# LLM mode (key from the environment only):
export GEMINI_API_KEY="your-key"
python3 src/writer.py --demo --llm
# Web UI:
python3 src/server.py            # serves http://localhost:8000
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
