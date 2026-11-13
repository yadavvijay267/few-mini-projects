"""RAG chatbot (offline demo): chunk -> TF-IDF retrieve -> cite -> answer.

The demo retriever uses word-overlap TF-IDF implemented with the standard
library. Swap `retrieve` for ChromaDB embeddings + an LLM call (see
docs/USAGE.md) and the chunking / citation / fallback contract is unchanged.
"""
import argparse, json, math, os, re, sys
from collections import Counter

STOP = set("a an the is are was were of to in on for and or with by from at as it this that be has have not no do does".split())
LOW_CONFIDENCE = 0.08


def words(text):
    return [w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOP]


def chunk_text(text, max_words=60):
    """Split text into <=max_words chunks, preferring sentence boundaries.

    A single long sentence is hard-split so no chunk ever exceeds
    max_words words.
    """
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks, current = [], []
    for sent in sentences:
        ws = sent.split()
        while len(ws) > max_words:
            if current:
                chunks.append(" ".join(current))
                current = []
            chunks.append(" ".join(ws[:max_words]))
            ws = ws[max_words:]
        if len(current) + len(ws) > max_words and current:
            chunks.append(" ".join(current))
            current = []
        current += ws
    if current:
        chunks.append(" ".join(current))
    return [c for c in chunks if c.strip()]


def load_docs(docs_dir):
    docs = []
    for name in sorted(os.listdir(docs_dir)):
        if name.endswith((".txt", ".md")):
            with open(os.path.join(docs_dir, name), encoding="utf-8") as f:
                text = f.read()
            for i, chunk in enumerate(chunk_text(text)):
                docs.append({"doc": name, "chunk": i, "text": chunk})
    return docs


def _idf(chunks):
    n = len(chunks) or 1
    df = Counter()
    for c in chunks:
        for w in set(words(c["text"])):
            df[w] += 1
    return {w: math.log((n + 1) / (d + 1)) + 1.0 for w, d in df.items()}


def retrieve(chunks, query, top_n=3):
    idf = _idf(chunks)
    q = Counter(words(query))
    scored = []
    for c in chunks:
        cw = Counter(words(c["text"]))
        score = sum(q[w] * cw[w] * idf.get(w, 1.0) for w in q if w in cw)
        norm = math.sqrt(sum(v * v for v in cw.values())) or 1.0
        scored.append((score / norm, c))
    scored.sort(key=lambda x: -x[0])
    total = sum(s for s, _ in scored) or 1.0
    return [(s / total, c) for s, c in scored[:top_n] if s > 0]


def answer(chunks, query, history=None):
    """Return {answer, confidence, sources}. Falls back honestly."""
    results = retrieve(chunks, query)
    if not results:
        return {"answer": "I don't know — that isn't covered in the uploaded documents.",
                "confidence": 0.0, "sources": []}
    conf, best = results[0]
    if conf < LOW_CONFIDENCE:
        return {"answer": "I don't know — that isn't covered in the uploaded documents.",
                "confidence": round(conf, 3), "sources": []}
    sources = [{"doc": c["doc"], "chunk": c["chunk"]} for _, c in results]
    text = (f"Based on {best['doc']} (chunk {best['chunk']}): {best['text']}")
    if history:
        text += f"\n(Follow-up in a thread of {len(history)} earlier question(s).)"
    return {"answer": text, "confidence": round(conf, 3), "sources": sources}


def serve(chunks, port=8000):
    from http.server import BaseHTTPRequestHandler, HTTPServer
    import urllib.parse

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(open(os.path.join(os.path.dirname(__file__), "index.html"), "rb").read())

        def do_POST(self):
            n = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(n) or b"{}")
            result = answer(chunks, data.get("q", ""))
            body = json.dumps(result).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *a):
            pass

    print(f"RAG chatbot on http://localhost:{port}")
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()


def main(argv=None):
    p = argparse.ArgumentParser(description="RAG chatbot over local documents")
    p.add_argument("--docs", default=os.path.join(os.path.dirname(__file__), "..", "assets"))
    p.add_argument("--ask")
    p.add_argument("--serve", action="store_true")
    args = p.parse_args(argv)
    chunks = load_docs(args.docs)
    print(f"loaded {len(chunks)} chunks")
    if args.ask:
        print(json.dumps(answer(chunks, args.ask), indent=2))
        return 0
    if args.serve:
        serve(chunks)
        return 0
    p.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
