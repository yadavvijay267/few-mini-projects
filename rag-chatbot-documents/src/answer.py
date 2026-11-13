"""Extractive answering from retrieved chunks, with optional Gemini rewrite."""
import json, os, re, urllib.request

def extractive_answer(query, chunks):
    """Pick the sentences in the retrieved chunks that best match the query."""
    terms = set(re.findall(r"[a-z0-9]+", query.lower()))
    sentences = []
    for c in chunks:
        for s in re.split(r"(?<=[.!?])\s+", c["text"]):
            s = s.strip()
            if not s:
                continue
            overlap = len(terms & set(re.findall(r"[a-z0-9]+", s.lower())))
            sentences.append((overlap, s, c["source"]))
    sentences.sort(key=lambda t: -t[0])
    best = [s for s in sentences if s[0] > 0][:3]
    if not best:
        return None, []
    answer = " ".join(s[1] for s in best)
    sources = sorted({s[2] for s in best})
    return answer, sources

def gemini_rewrite(query, chunks, answer):
    """Optional LLM rewrite. Returns None if no key / on any error."""
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return None
    context = "\n\n".join(f"[{c['source']}] {c['text']}" for c in chunks)
    prompt = ("Answer ONLY from the context below. If the answer is not in the context, say you do not know.\n\n"
              f"Context:\n{context}\n\nQuestion: {query}\nAnswer:")
    body = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode()
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}",
        data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        return None
