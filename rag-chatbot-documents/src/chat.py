"""RAG chatbot CLI. Usage: python3 src/chat.py --question "..." [--llm] [--interactive]"""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ingest import load_documents
from retriever import Retriever
from answer import extractive_answer, gemini_rewrite

THRESHOLD = 0.08
HISTORY = []

def ask(retriever, question, use_llm=False):
    chunks = retriever.retrieve(question, top_k=3)
    best_score = chunks[0]["score"] if chunks else 0.0
    if best_score < THRESHOLD:
        return {"answer": "I don't know — the documents do not cover that question.",
                "confidence": round(best_score, 3), "sources": [], "retrieved": chunks}
    answer, sources = extractive_answer(question, chunks)
    if not answer:
        return {"answer": "I don't know — the documents do not cover that question.",
                "confidence": round(best_score, 3), "sources": [], "retrieved": chunks}
    text = answer
    if use_llm:
        rewritten = gemini_rewrite(question, chunks, answer)
        if rewritten:
            text = rewritten
    return {"answer": text, "confidence": round(min(0.99, best_score * 2), 3),
            "sources": sources, "retrieved": chunks}

def main():
    ap = argparse.ArgumentParser(description="Ask the RAG chatbot a question from your documents.")
    ap.add_argument("--question", help="Question to ask")
    ap.add_argument("--interactive", action="store_true", help="Chat loop")
    ap.add_argument("--llm", action="store_true", help="Use Gemini to rewrite the answer (needs GEMINI_API_KEY)")
    ap.add_argument("--docs", default=os.path.join(os.path.dirname(__file__), "..", "assets", "docs"))
    a = ap.parse_args()
    docs = load_documents(a.docs)
    if not docs:
        print("No documents found in", a.docs); raise SystemExit(1)
    retriever = Retriever(docs)
    print(f"Indexed {len(docs)} chunks from {a.docs}")
    import json as _json
    def handle(q):
        res = ask(retriever, q, use_llm=a.llm)
        HISTORY.append((q, res["answer"]))
        print(_json.dumps({k: v for k, v in res.items() if k != "retrieved"}, indent=2))
        for c in res["retrieved"]:
            print(f"  [retrieved {c['score']:.3f}] {c['source']}#{c['chunk_id']}: {c['text'][:120]}...")
    if a.interactive:
        print("Type 'exit' to quit.")
        while True:
            try: q = input("You: ").strip()
            except (EOFError, KeyboardInterrupt): break
            if q.lower() in ("exit", "quit"): break
            if q: handle(q)
    elif a.question:
        handle(a.question)
    else:
        ap.error("give --question or --interactive")

if __name__ == "__main__":
    main()
