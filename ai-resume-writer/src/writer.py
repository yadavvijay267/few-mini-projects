"""AI Resume Writer: template-based bullet enhancement + ATS gap analysis,
with an optional Gemini LLM mode (key from GEMINI_API_KEY env var only).
"""
import argparse, json, os, re, sys, urllib.request

WEAK_TO_STRONG = [
    (r"^\s*did\b", "Delivered"), (r"^\s*worked on\b", "Built"),
    (r"^\s*helped with\b", "Supported"), (r"^\s*was responsible for\b", "Owned"),
    (r"^\s*made\b", "Created"), (r"^\s*checked\b", "Validated"),
    (r"^\s*did .*analysis", "Analysed"),
]
TOPIC_VERBS = [
    ("dashboard", "Built"), ("report", "Produced"), ("sql", "Wrote"),
    ("data", "Analysed"), ("presentation", "Presented"), ("quality", "Validated"),
    ("machine learning", "Developed"), ("automat", "Automated"),
]
RESULT_SUFFIX = {
    "concise": "", "detailed": " — improving stakeholder decision-making",
}


def enhance_bullet(bullet, tone="concise"):
    """Rule-based enhancement: strong verb + tidy structure. Honest template mode."""
    text = bullet.strip().rstrip(".")
    lower = text.lower()
    for pattern, verb in WEAK_TO_STRONG:
        if re.match(pattern, lower):
            text = re.sub(pattern, verb, text, count=1, flags=re.IGNORECASE)
            break
    else:
        for keyword, verb in TOPIC_VERBS:
            if keyword in lower:
                text = verb + " " + text[0].lower() + text[1:] if text else text
                break
    text = text[0].upper() + text[1:] if text else text
    if tone == "detailed" and "improving" not in lower:
        text += RESULT_SUFFIX["detailed"]
    return text + "."


def extract_keywords(job_text, keyword_list):
    norm = " " + re.sub(r"[^a-z0-9\s]", " ", job_text.lower()) + " "
    found = []
    for kw in keyword_list:
        kw = kw.strip().lower()
        if kw and (" " + kw + " ") in norm:
            found.append(kw)
    return found


def ats_gap(job_text, bullets, keyword_list):
    required = extract_keywords(job_text, keyword_list)
    combined = " ".join(bullets).lower()
    matched = [k for k in required if k in combined]
    missing = [k for k in required if k not in combined]
    pct = round(100 * len(matched) / len(required), 1) if required else 100.0
    return {"required": required, "matched": matched, "missing": missing, "match_pct": pct}


def llm_rewrite(bullets, job_text):
    """Optional Gemini rewrite. Returns None (caller falls back) on any failure."""
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return None
    payload = json.dumps({
        "contents": [{"parts": [{"text": (
            "Rewrite these resume bullet points to be strong, concise and "
            "tailored to this job description. Keep every fact unchanged; "
            "only improve wording. Return one bullet per line, no preamble.\n\n"
            f"Job: {job_text}\n\nBullets:\n" + "\n".join(bullets))}]}]
    }).encode()
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key,
        data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        lines = [ln.strip(" -•") for ln in text.splitlines() if ln.strip()]
        return lines or None
    except Exception as exc:  # noqa: BLE001 - fall back to template mode
        print(f"LLM call failed ({exc}); falling back to template mode.", file=sys.stderr)
        return None


def main(argv=None):
    parser = argparse.ArgumentParser(description="Improve resume bullets and check ATS keyword coverage.")
    parser.add_argument("--bullet", action="append", help="A resume bullet to improve (repeatable).")
    parser.add_argument("--bullets-file", help="File with one bullet per line.")
    parser.add_argument("--job", help="Job description text file.")
    parser.add_argument("--tone", choices=["concise", "detailed"], default="concise")
    parser.add_argument("--max-words", type=int, default=25, help="Trim bullets to at most this many words.")
    parser.add_argument("--llm", action="store_true", help="Use Gemini (GEMINI_API_KEY env var) if available; else template mode.")
    parser.add_argument("--out", help="Write improved bullets to this text file.")
    parser.add_argument("--demo", action="store_true", help="Run with the bundled sample bullets and job description.")
    args = parser.parse_args(argv)
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if args.demo:
        bullets = [ln.strip() for ln in open(os.path.join(base, "assets", "sample_bullets.txt")) if ln.strip()]
        job_text = open(os.path.join(base, "assets", "sample_job.txt")).read()
    else:
        bullets = list(args.bullet or [])
        if args.bullets_file:
            bullets += [ln.strip() for ln in open(args.bullets_file) if ln.strip()]
        if not bullets:
            parser.error("Give --bullet, --bullets-file, or --demo.")
        job_text = open(args.job).read() if args.job else ""
    keywords = [ln.strip() for ln in open(os.path.join(base, "assets", "ats_keywords.txt")) if ln.strip()]
    mode = "template"
    improved = None
    if args.llm:
        improved = llm_rewrite(bullets, job_text)
        if improved:
            mode = "llm (Gemini)"
    if improved is None:
        improved = [enhance_bullet(b, args.tone) for b in bullets]
    trimmed = []
    for bullet in improved:
        words = bullet.split()
        trimmed.append(" ".join(words[: args.max_words]) + ("." if not bullet.endswith(".") else "") if len(words) > args.max_words else bullet)
    print(f"Mode: {mode}")
    for bullet in trimmed:
        print(f"  • {bullet}")
    if job_text:
        gap = ats_gap(job_text, trimmed, keywords)
        print(f"\nATS keyword match: {gap['match_pct']}% ({len(gap['matched'])}/{len(gap['required'])})")
        print(f"  Matched: {', '.join(gap['matched']) or 'none'}")
        print(f"  Missing: {', '.join(gap['missing']) or 'none'}")
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write("\n".join(trimmed) + "\n")
        print(f"Wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
