"""TF-IDF retriever over document chunks."""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class Retriever:
    def __init__(self, docs):
        self.docs = docs
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
        self.matrix = self.vectorizer.fit_transform([d["text"] for d in docs])

    def retrieve(self, query, top_k=3):
        q = self.vectorizer.transform([query])
        sims = cosine_similarity(q, self.matrix)[0]
        order = np.argsort(-sims)[:top_k]
        return [{"score": float(sims[i]), **self.docs[i]} for i in order]
