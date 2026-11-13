"""Chunk documents from assets/docs into overlapping text chunks."""
import glob, os

def chunk_text(text, size=400, overlap=80):
    chunks, i = [], 0
    while i < len(text):
        chunks.append(text[i:i + size])
        i += size - overlap
    return [c.strip() for c in chunks if c.strip()]

def load_documents(docs_dir):
    docs = []
    for path in sorted(glob.glob(os.path.join(docs_dir, "*.md")) + glob.glob(os.path.join(docs_dir, "*.txt"))):
        text = open(path, encoding="utf-8").read()
        for j, chunk in enumerate(chunk_text(text)):
            docs.append({"source": os.path.basename(path), "chunk_id": j, "text": chunk})
    return docs
