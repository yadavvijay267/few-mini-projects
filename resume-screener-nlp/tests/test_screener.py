import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from screener import extract_skills, normalise, score_resumes

SKILLS = ["python", "sql", "machine learning", "pandas"]
JOB = "We need Python and SQL. Pandas and machine learning are a plus."


def test_normalise_lowercases_and_strips_punctuation():
    assert normalise("Python, SQL!") == "python sql"


def test_extract_skills_finds_phrases():
    assert extract_skills("I know machine learning and python.", SKILLS) == {"machine learning", "python"}


def test_ranking_puts_best_match_first():
    resumes = [
        {"name": "weak", "text": "I like cooking and gardening."},
        {"name": "strong", "text": "Python developer, SQL expert, pandas daily, machine learning projects."},
    ]
    results = score_resumes(JOB, resumes, SKILLS)
    assert results[0]["candidate"] == "strong"
    assert results[0]["score"] > results[1]["score"]
    assert results[0]["missing_skills"] == []
    assert "python" in results[1]["missing_skills"]


def test_scores_are_bounded():
    resumes = [{"name": "x", "text": "python sql"}]
    results = score_resumes(JOB, resumes, SKILLS)
    assert 0 <= results[0]["score"] <= 100
