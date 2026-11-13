"""Object detection dashboard (offline demo).

Demo detector: threshold a PPM image, label connected bright components
(flood fill) and report each as a bounding box with a confidence derived
from its size. Swap `detect` for Ultralytics YOLOv8 (see docs/USAGE.md)
and the log / zone-count / threshold API is unchanged.
"""
import argparse, csv, datetime, json, os, sys
from collections import deque

LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "detection_log.csv")


def read_ppm(path):
    with open(path, "rb") as f:
        magic = f.readline().strip()
        if magic != b"P6":
            raise ValueError("only binary P6 PPM images are supported")
        line = f.readline()
        while line.startswith(b"#"):
            line = f.readline()
        w, h = (int(x) for x in line.split())
        f.readline()
        data = f.read(w * h * 3)
    return w, h, data


def detect(path, threshold=0.5):
    """Return list of detections: {x, y, w, h, area, confidence, class}."""
    w, h, data = read_ppm(path)
    cut = int(threshold * 255)
    bright = [data[(y * w + x) * 3] > cut for y in range(h) for x in range(w)]
    seen = [False] * (w * h)
    detections = []
    for start in range(w * h):
        if not bright[start] or seen[start]:
            continue
        q, seen[start] = deque([start]), True
        xs, ys, area = [], [], 0
        while q:
            i = q.popleft()
            x, y = i % w, i // w
            xs.append(x); ys.append(y); area += 1
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if bright[j] and not seen[j]:
                        seen[j] = True
                        q.append(j)
        if area < 4:
            continue
        detections.append({"class": "object", "x": min(xs), "y": min(ys),
                           "w": max(xs) - min(xs) + 1, "h": max(ys) - min(ys) + 1,
                           "area": area,
                           "confidence": round(min(0.99, 0.5 + area / (w * h) * 4), 3)})
    return sorted(detections, key=lambda d: -d["area"])


def count_by_zone(detections, zone):
    """Count detections whose centre falls inside zone {x, y, w, h}."""
    x0, y0, x1, y1 = zone["x"], zone["y"], zone["x"] + zone["w"], zone["y"] + zone["h"]
    return sum(1 for d in detections
               if x0 <= d["x"] + d["w"] / 2 < x1 and y0 <= d["y"] + d["h"] / 2 < y1)


def log_detections(detections, image, log_path=LOG_PATH):
    exists = os.path.exists(log_path)
    with open(log_path, "a", newline="") as f:
        w = csv.writer(f)
        if not exists:
            w.writerow(["timestamp", "image", "class", "x", "y", "w", "h", "confidence"])
        ts = datetime.datetime.now().isoformat(timespec="seconds")
        for d in detections:
            w.writerow([ts, image, d["class"], d["x"], d["y"], d["w"], d["h"], d["confidence"]])
    return log_path


def main(argv=None):
    p = argparse.ArgumentParser(description="Object detection dashboard (demo)")
    p.add_argument("--demo", action="store_true")
    p.add_argument("--image")
    p.add_argument("--threshold", type=float, default=0.5)
    p.add_argument("--zone", help="x,y,w,h — count only inside this zone")
    args = p.parse_args(argv)
    path = args.image or os.path.join(os.path.dirname(__file__), "..", "assets", "sample.ppm")
    dets = detect(path, args.threshold)
    print(json.dumps(dets, indent=2))
    print("count:", len(dets))
    if args.zone:
        x, y, w, h = (int(v) for v in args.zone.split(","))
        print("count in zone:", count_by_zone(dets, {"x": x, "y": y, "w": w, "h": h}))
    if not args.demo:
        print("logged to", log_detections(dets, os.path.basename(path)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
