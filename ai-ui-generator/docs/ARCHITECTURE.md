# Architecture

## How generation works

1. **Parse** (`src/generator.js`, mirrored in `src/generate.py`):
   - Page type from keywords: `pricing`, `landing`, `portfolio`,
     `contact`, `dashboard`, `blog`, `signup` / `login`.
   - Business/domain: the words after "for a/an" (e.g. "for a gym").
   - Tone: `playful`, `professional`, `minimal`, `bold`.
   - Colour scheme: `dark`, `light`, `blue`, `green`, `purple`, or the
     default navy/cyan.
   - Sections requested: `testimonials`, `gallery`, `faq`, `form`.
2. **Spec**: a JSON spec `{page_type, business, tone, colours, sections}`.
3. **Assemble**: components from `src/components.js` (hero, features,
   pricing with 3 tiers, testimonials, gallery, FAQ, contact form,
   footer) are rendered into a full HTML document with Tailwind classes.
   Copy is generated from templates using the business name.
4. **Refine**: a follow-up prompt is parsed the same way and merged
   into the existing spec (e.g. "make the header darker" sets
   `header_dark: true`; "add testimonials" adds that section), then the
   page is re-rendered. The full prompt history is kept and shown.
5. **Preview / export**: the generated HTML is injected into an iframe
   (desktop 100% / mobile 390 px) and can be downloaded as a file.

## Optional LLM

If `GEMINI_API_KEY` is set, the app can ask Gemini to rewrite the
hero headline + feature copy, with the instruction to keep the same
meaning and length. The rewrite is applied to the copy only — the
layout spec is untouched, and a failed LLM call falls back silently
to the template copy.

## Production path

Replace the rule-based parser with an LLM that outputs the same JSON
spec (with a schema + validation), keep the component assembler
unchanged, and add user accounts + saved generations. The spec is the
contract: anything that can produce a valid spec can drive the UI.
