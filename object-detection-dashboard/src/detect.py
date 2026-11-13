"""Lightweight baseline object detector (contour/blob, NOT YOLO).
Usage: python3 src/detect.py --image <png> [--out DIR] [--min-area N] [--zone x,y,w,h]"""
import argparse, csv, json, os
from datetime import datetime

COLOUR_CLASSES = {"server": (30, 110, 200), "switch": (40, 170, 90), "cable": (230, 130, 30)}

def detect_opencv(path, min_area=200):
    import cv2
    import numpy as np
    img = cv2.imread(path)
    results = []
    for label, (r, g, b) in COLOUR_CLASSES.items():
        # BGR order for OpenCV
        lower = np.array([max(0, b - 45), max(0, g - 45), max(0, r - 45)], dtype=np.uint8)
        upper = np.array([min(255, b + 45), min(255, g + 45), min(255, r + 45)], dtype=np.uint8)
        mask = cv2.inRange(img, lower, upper)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            area = cv2.contourArea(c)
            if area < min_area:
                continue
            x, y, w, h = cv2.boundingRect(c)
            results.append({"label": label, "confidence": round(min(0.99, area / 20000 + 0.5), 3),
                            "bbox": [int(x), int(y), int(x + w), int(y + h)], "area": int(area)})
    return results

def detect_objects(path, min_area=200):
    try:
        return detect_opencv(path, min_area)
    except ImportError:
        from fallback import detect_numpy
        return detect_numpy(path, min_area)

def in_zone(bbox, zone):
    if not zone:
        return True
    zx, zy, zw, zh = zone
    cx = (bbox[0] + bbox[2]) / 2
    cy = (bbox[1] + bbox[3]) / 2
    return zx <= cx <= zx + zw and zy <= cy <= zy + zh

def annotate(path, detections, out_path):
    try:
        import cv2
        img = cv2.imread(path)
        colours = {"server": (200, 110, 30), "switch": (90, 170, 40), "cable": (30, 130, 230)}
        for d in detections:
            x1, y1, x2, y2 = d["bbox"]
            cv2.rectangle(img, (x1, y1), (x2, y2), colours[d["label"]], 2)
            cv2.putText(img, f"{d['label']} {d['confidence']:.2f}", (x1, max(12, y1 - 4)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, colours[d["label"]], 1)
        cv2.imwrite(out_path, img)
    except ImportError:
        from PIL import Image, ImageDraw
        img = Image.open(path).convert("RGB")
        d = ImageDraw.Draw(img)
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            d.rectangle([x1, y1, x2, y2], outline=(200, 30, 30), width=2)
            d.text((x1, max(0, y1 - 12)), f"{det['label']} {det['confidence']:.2f}", fill=(200, 30, 30))
        img.save(out_path)

def main():
    ap = argparse.ArgumentParser(description="Detect objects in an image (lightweight baseline detector, NOT YOLO).")
    ap.add_argument("--image", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "assets", "detections"))
    ap.add_argument("--min-area", type=int, default=200, help="Minimum contour area (the confidence control)")
    ap.add_argument("--zone", help="Count only objects inside x,y,w,h, e.g. 10,10,200,150")
    a = ap.parse_args()
    zone = tuple(int(v) for v in a.zone.split(",")) if a.zone else None
    detections = [d for d in detect_objects(a.image, a.min_area) if in_zone(d["bbox"], zone)]
    counts = {}
    for d in detections:
        counts[d["label"]] = counts.get(d["label"], 0) + 1
    os.makedirs(a.out, exist_ok=True)
    base = os.path.splitext(os.path.basename(a.image))[0]
    annotate(a.image, detections, os.path.join(a.out, base + "_annotated.png"))
    result = {"image": a.image, "detector": "contour/blob baseline (NOT YOLO)", "zone": zone,
              "counts": counts, "total": len(detections), "detections": detections}
    with open(os.path.join(a.out, base + ".json"), "w") as f:
        json.dump(result, f, indent=2)
    log = os.path.join(a.out, "detection_log.csv")
    new = not os.path.exists(log)
    with open(log, "a", newline="") as f:
        wr = csv.writer(f)
        if new:
            wr.writerow(["timestamp", "image", "total", "counts"])
        wr.writerow([datetime.now().isoformat(timespec="seconds"), a.image, len(detections), json.dumps(counts)])
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
