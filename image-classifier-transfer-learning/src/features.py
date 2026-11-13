"""Feature extraction: downscaled pixels + colour histogram. Original code."""
import numpy as np
from PIL import Image

def extract_features(path, size=16):
    img = Image.open(path).convert("RGB").resize((size, size))
    arr = np.asarray(img, dtype=np.float32) / 255.0
    grey = arr.mean(axis=2).flatten()
    hist = []
    for ch in range(3):
        h, _ = np.histogram(arr[:, :, ch], bins=8, range=(0, 1))
        hist.append(h / max(h.sum(), 1))
    return np.concatenate([grey, np.concatenate(hist)])

def load_dataset(samples_dir):
    import glob, os
    X, y, names = [], [], []
    for path in sorted(glob.glob(os.path.join(samples_dir, "*.png"))):
        cls = os.path.basename(path).rsplit("_", 1)[0]
        X.append(extract_features(path)); y.append(cls); names.append(path)
    return np.array(X), np.array(y), names
