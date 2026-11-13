"""Generate the synthetic sample dataset (3 classes, 32x32 PNGs). Original code."""
import argparse, os, random
from PIL import Image, ImageDraw

CLASSES = ["cable_ok", "cable_defect", "connector"]

def make_image(cls, rng):
    img = Image.new("RGB", (32, 32), (245, 245, 240))
    d = ImageDraw.Draw(img)
    if cls == "cable_ok":
        for i in range(3):
            y = 8 + i * 8 + rng.randint(-1, 1)
            col = (30, 80, 160) if i == 1 else (60, 60, 60)
            d.line([(2, y), (30, y)], fill=col, width=2)
    elif cls == "cable_defect":
        x, y = 2, 10
        while x < 30:
            nx, ny = x + rng.randint(3, 6), y + rng.randint(-5, 5)
            d.line([(x, y), (nx, ny)], fill=(180, 40, 30), width=2)
            x, y = nx, max(3, min(29, ny))
        d.ellipse([rng.randint(18, 24), rng.randint(18, 24), 30, 30], outline=(180, 40, 30), width=2)
    else:  # connector
        d.ellipse([8, 6, 24, 22], fill=(40, 110, 180), outline=(20, 50, 90), width=2)
        for px in (12, 16, 20):
            d.rectangle([px, 24, px + 1, 29], fill=(200, 170, 60))
    # light noise
    for _ in range(40):
        d.point((rng.randint(0, 31), rng.randint(0, 31)), fill=(rng.randint(180, 230),) * 3)
    return img

def main():
    ap = argparse.ArgumentParser(description="Generate the synthetic image dataset.")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "assets", "samples"))
    ap.add_argument("--per-class", type=int, default=60)
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()
    rng = random.Random(a.seed)
    os.makedirs(a.out, exist_ok=True)
    for cls in CLASSES:
        for i in range(a.per_class):
            make_image(cls, rng).save(os.path.join(a.out, f"{cls}_{i:02d}.png"))
    print(f"Wrote {len(CLASSES) * a.per_class} images to {a.out}")

if __name__ == "__main__":
    main()
