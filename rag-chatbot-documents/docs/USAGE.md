# Usage — RAG Chatbot

```bash
python3 src/rag.py --ask "What is the PUE target?" --docs assets/
python3 src/rag.py --serve   # then open http://localhost:8000
python3 -m pytest tests/ -q
```

Add your own documents: drop `.txt` / `.md` files into `assets/` (or any
folder passed with `--docs`). They are chunked at ~60 words.

## Real-LLM path

Replace the TF-IDF `retrieve` with ChromaDB embeddings and pass the top
chunks to an LLM (OpenAI / Gemini free tier) with an instruction to answer
only from the chunks and cite them. Keep the "I don't know" fallback:
if the top score is below threshold, do not call the LLM at all.
