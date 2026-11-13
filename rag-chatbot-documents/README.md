# RAG Chatbot — Answers From Your Own Documents

A chatbot that answers questions from your own documents using
retrieval-augmented generation (RAG): documents are chunked, embedded
locally, and the best chunks are cited in every answer.

## Features

- Upload PDFs / text docs; they are chunked and embedded locally.
- Ask questions; answers cite the source document and chunk.
- Conversation history with follow-up questions.
- "I don't know" fallback when the answer is not in the documents.
- Every answer shows its source chunk — no hallucinated citations —
  plus a visible confidence indicator.

## Tech stack

- Python 3.10+, standard library only for the demo retriever
  (TF-IDF over word overlap — no downloads, no API key).
- Real-LLM path: LangChain, ChromaDB, OpenAI or Google Gemini API
  (free tier), Streamlit — see `docs/USAGE.md`.

## How to run

```bash
python3 src/rag.py --ask "What is the PUE target?" --docs assets/
python3 src/rag.py --serve            # web UI on http://localhost:8000
python3 -m pytest tests/ -q
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
