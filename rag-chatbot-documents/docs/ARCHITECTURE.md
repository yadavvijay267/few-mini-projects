# Architecture

## Pipeline

1. **Ingest** (`src/ingest.py`): read `.md`/`.txt` files from `assets/docs/`,
   split into overlapping chunks (~400 chars, 80-char overlap), keep
   `source` + `chunk_id` metadata.
2. **Index** (`src/retriever.py`): `TfidfVectorizer` (word 1-2 grams, English
   stop words) over all chunks; cosine similarity at query time.
3. **Retrieve**: top-k chunks above a relevance threshold (default 0.08).
   Below threshold -> "I don't know" with the best score shown.
4. **Generate** (`src/answer.py`): extractive — rank sentences in the top
   chunks by query-term overlap, return the best 2-3 with citations.
   If `GEMINI_API_KEY` is set and `--llm` is passed, the retrieved chunks
   are sent to Gemini with an instruction to answer *only* from them;
   the extractive answer is always kept as a fallback and the sources
   are still shown.
5. **Chat** (`src/chat.py`): CLI + interactive loop, keeps history so
   follow-ups can reuse the previous question's context.

## Production path

Replace TF-IDF with embeddings (e.g. a sentence-transformer or Gemini
embeddings) stored in ChromaDB, add PDF parsing, re-ranking, and a
Streamlit UI. Keep the citation + "I don't know" contract unchanged —
that is what makes a RAG answer trustworthy.
