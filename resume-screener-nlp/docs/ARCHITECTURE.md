# Architecture — Resume Screener

## Pipeline

1. **Load** the job description and each resume as plain text.
   (PDF support: convert the PDF to text first; only plain text is
   scored, so the pipeline stays dependency-light.)
2. **Normalise** text: lowercase, strip punctuation, collapse whitespace.
3. **Skill extraction**: the job description is scanned against the
   curated skill list in `assets/skills.txt`. A skill counts as required
   if it appears in the job description. A resume "has" a skill if the
   skill string appears in the resume text. Multi-word skills
   ("machine learning") are matched as phrases.
4. **Skill coverage** = matched required skills / required skills.
5. **TF-IDF cosine similarity**: a `TfidfVectorizer` (English stop words,
   1-2 grams) is fit on the job description + all resumes; cosine
   similarity between the job vector and each resume vector measures
   overall topical overlap, including terms outside the skill list.
6. **Final score** = 0.6 * skill coverage + 0.4 * cosine similarity,
   scaled to 0-100.

## Why this split?

Pure keyword matching misses paraphrases; pure TF-IDF rewards long
resumes that repeat the job ad. The 60/40 blend keeps the score
interpretable (a recruiter can read the missing-skills list) while
letting wording overlap count.

## Honesty note

This is a transparent rule-based + TF-IDF scorer. It is **not** a trained
ranking model and it does not claim semantic understanding. Keep a human
in the loop for final decisions.
