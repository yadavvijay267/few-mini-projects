"""Image classifier: frozen-feature backbone + trainable centroid head.

Demo backbone: a PPM image -> 2x2 quadrant mean-RGB features (12 floats).
This stands in for MobileNetV2 features so the project runs offline with
no downloads. Swap `extract_features` for a real backbone (see docs/USAGE.md)
and the train / predict / export API is unchanged.
"""
import argparse, csv, json, math, os, sys

CLASSES = ["good", "defect-scratch", "defect-stain"]


def read_ppm(path):
    """Read a binary P6 PPM file. Returns (width, height, bytes)."""
    with open(path, "rb") as f:
        magic = f.readline().strip()
        if magic != b"P6":
            raise ValueError("only binary P6 PPM images are supported")
        # skip comments
        line = f.readline()
        while line.startswith(b"#"):
            line = f.readline()
        w, h = (int(x) for x in line.split())
        maxval = int(f.readline().strip())
        if maxval != 255:
            raise ValueError("only maxval 255 PPM images are supported")
        data = f.read(w * h * 3)
    if len(data) != w * h * 3:
        raise ValueError("truncated PPM data")
    return w, h, data


def extract_features(path):
    """12 features: mean R, G, B of each quadrant of the image."""
    w, h, data = read_ppm(path)
    feats = []
    for qy in (0, 1):
        for qx in (0, 1):
            rs = gs = bs = n = 0
            for y in range(qy * h // 2, (qy + 1) * h // 2):
                for x in range(qx * w // 2, (qx + 1) * w // 2):
                    i = (y * w + x) * 3
                    rs += data[i]; gs += data[i + 1]; bs += data[i + 2]; n += 1
            feats += [rs / n / 255.0, gs / n / 255.0, bs / n / 255.0]
    return feats


def train(rows):
    """rows: list of (label, features). Returns {label: centroid} model."""
    sums, counts = {}, {}
    for label, feats in rows:
        sums.setdefault(label, [0.0] * len(feats))
        counts[label] = counts.get(label, 0) + 1
        for i, v in enumerate(feats):
            sums[label][i] += v
    return {label: [v / counts[label] for v in vec] for label, vec in sums.items()}


def _dist(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def predict(model, feats, top_n=3):
    """Top-N predictions with softmax-over-distance confidence."""
    scored = []
    for label, centroid in model.items():
        dist = _dist(feats, centroid)
        scored.append((label, 1.0 / (1.0 + dist)))
    total = sum(s for _, s in scored) or 1.0
    scored = [(label, s / total) for label, s in scored]
    return sorted(scored, key=lambda x: -x[1])[:top_n]


def confusion_matrix(model, rows):
    labels = sorted(model)
    matrix = {a: {b: 0 for b in labels} for a in labels}
    for true, feats in rows:
        pred = predict(model, feats, top_n=1)[0][0]
        if true in matrix and pred in matrix[true]:
            matrix[true][pred] += 1
    return matrix


def accuracy(model, rows):
    if not rows:
        return 0.0
    ok = sum(1 for true, feats in rows if predict(model, feats, 1)[0][0] == true)
    return ok / len(rows)


def load_csv(path):
    rows = []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            label = row.pop("label")
            rows.append((label, [float(v) for v in row.values()]))
    return rows


def main(argv=None):
    p = argparse.ArgumentParser(description="Image classifier (transfer-learning demo)")
    p.add_argument("--demo", action="store_true")
    p.add_argument("--train")
    p.add_argument("--predict")
    p.add_argument("--model")
    p.add_argument("--out")
    args = p.parse_args(argv)
    if args.demo:
        rows = load_csv(os.path.join(os.path.dirname(__file__), "..", "assets", "sample_features.csv"))
        model = train(rows)
        print("trained on", len(rows), "samples; accuracy on train set:",
              round(accuracy(model, rows), 3))
        print("confusion matrix:", json.dumps(confusion_matrix(model, rows)))
        for label in CLASSES:
            print(label, "-> centroid[:3]", [round(v, 2) for v in model.get(label, [])[:3]])
        return 0
    if args.train:
        rows = load_csv(args.train)
        model = train(rows)
        if args.out:
            os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
            with open(args.out, "w") as f:
                json.dump(model, f, indent=2)
            print("saved model to", args.out)
        print("accuracy:", round(accuracy(model, rows), 3))
        return 0
    if args.predict:
        if not args.model:
            print("--model is required with --predict", file=sys.stderr)
            return 2
        with open(args.model) as f:
            model = json.load(f)
        feats = extract_features(args.predict)
        for label, conf in predict(model, feats):
            print(f"{label}: {conf:.1%}")
        return 0
    p.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
