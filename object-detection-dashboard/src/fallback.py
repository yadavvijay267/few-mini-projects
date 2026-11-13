"""Pure-NumPy connected-components labelling (used when OpenCV is unavailable)."""
import numpy as np
from PIL import Image

def label_components(mask):
    """4-connected labelling. Returns (labels, n)."""
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    current = 0
    for y in range(h):
        for x in range(w):
            if mask[y, x] and labels[y, x] == 0:
                current += 1
                stack = [(y, x)]
                labels[y, x] = current
                while stack:
                    cy, cx = stack.pop()
                    for ny, nx in ((cy-1, cx), (cy+1, cx), (cy, cx-1), (cy, cx+1)):
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and labels[ny, nx] == 0:
                            labels[ny, nx] = current
                            stack.append((ny, nx))
    return labels, current

def detect_numpy(path, min_area=200):
    from detect import COLOUR_CLASSES
    img = np.asarray(Image.open(path).convert("RGB")).astype(int)
    results = []
    for label, (r, g, b) in COLOUR_CLASSES.items():
        dist = np.abs(img - np.array([r, g, b])).sum(axis=2)
        mask = dist < 90
        labels, n = label_components(mask)
        for i in range(1, n + 1):
            ys, xs = np.where(labels == i)
            if len(xs) < min_area:
                continue
            results.append({"label": label, "confidence": 1.0,
                            "bbox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
                            "area": int(len(xs))})
    return results
