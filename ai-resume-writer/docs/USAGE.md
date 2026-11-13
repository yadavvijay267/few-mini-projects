# Usage — AI Resume Writer

## How template enhancement works

Template mode is honest, rule-based rewriting — it does **not** pretend
to be an LLM:

1. **Weak verbs upgraded**: "did / worked on / helped with / was
   responsible for" become strong action verbs ("Delivered", "Built",
   "Led", "Automated") chosen from the bullet's keywords.
2. **Action + result structure**: the bullet is rephrased as
   "<Action verb> <what> <measurable result, if given>".
3. **Keyword injection**: missing ATS keywords from the job description
   that genuinely match the bullet's topic are woven in (e.g. "pandas"
   when the bullet mentions data analysis). No keyword is invented for
   experience the bullet does not describe.

## ATS gap analysis

Keywords are extracted from the job description (a curated keyword list
in `assets/ats_keywords.txt` plus capitalised skill phrases). The gap
report lists which keywords appear in the generated bullets and which
are missing, with a match percentage. It runs locally, on your text.

## LLM mode

When `--llm` is passed and `GEMINI_API_KEY` is set, bullets are sent to
the Gemini API (`gemini-2.0-flash`) for free-form rewriting. The prompt
instructs the model to keep facts unchanged and only improve wording.
If the key is missing or the request fails, the tool falls back to
template mode and says so. The API key is never written to disk.
