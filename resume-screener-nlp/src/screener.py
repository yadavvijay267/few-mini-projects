"""Resume screener: score resumes against a job description.

Transparent rule-based skill matching + TF-IDF cosine similarity.
Not a trained ranking model -- see docs/ARCHITECTURE.md.
"""
import argparse, csv, glob, os, re, sys

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    HAVE_SKLEARN = True
except ImportError:
    HAVE_SKLEARN = False

SKILL_WEIGHT = 0.6
TFIDF_WEIGHT = 0.4


def normalise(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9+\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load_skills(path):
    with open(path, encoding="utf-8") as f:
        return [line.strip().lower() for line in f if line.strip()]


def extract_skills(text, skills):
    norm = " " + normalise(text) + " "
    return {s for s in skills if (" " + s + " ") in norm or s in normalise(text).split() or s in norm}


def score_resumes(job_text, resumes, skills):
    """Return a list of dicts, ranked best-first."""
    required = extract_skills(job_text, skills)
    if not required:
        required = set(skills)
    docs = [job_text] + [r["text"] for r in resumes]
    if HAVE_SKLEARN:
        vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        matrix = vec.fit_transform(docs)
        sims = cosine_similarity(matrix[0:1], matrix[1:]).flatten()
    else:
        # Graceful fallback: Jaccard overlap on word sets.
        job_words = set(normalise(job_text).split())
        sims = []
        for r in resumes:
            words = set(normalise(r["text"]).split())
            union = job_words | words
            sims.append(len(job_words & words) / len(union) if union else 0.0)
    results = []
    for resume, sim in zip(resumes, sims):
        matched = extract_skills(resume["text"], skills) & required
        missing = required - matched
        coverage = len(matched) / len(required) if required else 0.0
        score = round(100 * (SKILL_WEIGHT * coverage + TFIDF_WEIGHT * float(sim)), 1)
        results.append({
            "candidate": resume["name"], "score": score,
            "skill_coverage_pct": round(100 * coverage, 1),
            "tfidf_similarity": round(float(sim), 3),
            "matched_skills": sorted(matched), "missing_skills": sorted(missing),
        })
    return sorted(results, key=lambda r: r["score"], reverse=True)


def print_table(results):
    print(f"{'Rank':<5}{'Candidate':<22}{'Score':<8}{'Coverage':<10}Missing skills")
    for i, r in enumerate(results, 1):
        missing = ", ".join(r["missing_skills"]) or "none"
        print(f"{i:<5}{r['candidate']:<22}{r['score']:<8}{r['skill_coverage_pct']}%{'':<6}{missing}")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Score resumes against a job description (TF-IDF + skill matching).")
    parser.add_argument("--job", help="Path to the job description text file.")
    parser.add_argument("--resumes", nargs="+", help="Resume text files (globs allowed).")
    parser.add_argument("--skills", default=None, help="Skill list file (default: assets/skills.txt).")
    parser.add_argument("--out", help="Write the ranked table to this CSV file.")
    parser.add_argument("--compare", action="store_true", help="Show a side-by-side comparison of the top two candidates.")
    parser.add_argument("--demo", action="store_true", help="Run the demo with the bundled job description and sample resumes.")
    args = parser.parse_args(argv)
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if args.demo:
        job_path = os.path.join(base, "assets", "job_description.txt")
        resume_paths = sorted(glob.glob(os.path.join(base, "assets", "resumes", "*.txt")))
        skills_path = os.path.join(base, "assets", "skills.txt")
    else:
        if not args.job or not args.resumes:
            parser.error("--job and --resumes are required unless --demo is given.")
        job_path = args.job
        resume_paths = [p for pat in args.resumes for p in sorted(glob.glob(pat))]
        skills_path = args.skills or os.path.join(base, "assets", "skills.txt")
    with open(job_path, encoding="utf-8") as f:
        job_text = f.read()
    skills = load_skills(skills_path)
    resumes = []
    for path in resume_paths:
        with open(path, encoding="utf-8", errors="ignore") as f:
            resumes.append({"name": os.path.splitext(os.path.basename(path))[0], "text": f.read()})
    if not resumes:
        print("No resumes found.", file=sys.stderr)
        return 1
    if not HAVE_SKLEARN:
        print("Note: scikit-learn not installed; using Jaccard word-overlap instead of TF-IDF.", file=sys.stderr)
    results = score_resumes(job_text, resumes, skills)
    print_table(results)
    if args.compare and len(results) >= 2:
        a, b = results[0], results[1]
        print(f"\nTop-two comparison: {a['candidate']} ({a['score']}) vs {b['candidate']} ({b['score']})")
        print(f"  {a['candidate']} matched: {', '.join(a['matched_skills'])}")
        print(f"  {b['candidate']} matched: {', '.join(b['matched_skills'])}")
        print(f"  Only {a['candidate']} has: {', '.join(sorted(set(a['matched_skills']) - set(b['matched_skills']))) or 'nothing extra'}")
        print(f"  Only {b['candidate']} has: {', '.join(sorted(set(b['matched_skills']) - set(a['matched_skills']))) or 'nothing extra'}")
    if args.out:
        with open(args.out, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["candidate", "score", "skill_coverage_pct", "tfidf_similarity", "matched_skills", "missing_skills"])
            w.writeheader()
            for r in results:
                row = dict(r)
                row["matched_skills"] = "; ".join(r["matched_skills"])
                row["missing_skills"] = "; ".join(r["missing_skills"])
                w.writerow(row)
        print(f"\nWrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
