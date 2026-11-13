import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from rag import load_docs, answer, retrieve, chunk_text

ASSETS = os.path.join(os.path.dirname(__file__), "..", "assets")


def _chunks():
    return load_docs(ASSETS)


def test_chunks_loaded_from_both_docs():
    docs = {c["doc"] for c in _chunks()}
    assert docs == {"dc-ops.txt", "fiber-sop.txt"}


def test_answer_cites_source_and_has_confidence():
    res = answer(_chunks(), "What is the PUE target?")
    assert "1.4" in res["answer"]
    assert res["sources"] and res["sources"][0]["doc"] == "dc-ops.txt"
    assert res["confidence"] > 0


def test_unknown_question_falls_back_honestly():
    res = answer(_chunks(), "What is the best recipe for biryani?")
    assert res["answer"].startswith("I don't know")
    assert res["sources"] == []


def test_chunking_respects_max_words():
    chunks = chunk_text("word " * 200)
    assert all(len(c.split()) <= 60 for c in chunks)
    assert len(chunks) >= 3


def test_retrieve_ranks_fiber_question_to_fiber_doc():
    top = retrieve(_chunks(), "splice loss connector OTDR")
    assert top and top[0][1]["doc"] == "fiber-sop.txt"
