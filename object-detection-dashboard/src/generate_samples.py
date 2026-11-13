"""Generate synthetic sample scenes with coloured objects. Original code."""
import argparse, os, random
from PIL import Image, ImageDraw

SCENES = {
    "rack_scene": [("server", 20, 20, 90, 60), ("server", 110, 20, 90, 60), ("switch", 20, 100, 130, 40),
                   ("server", 220, 20, 90, 60), ("cable", 20, 160, 200, 18), ("switch", 220, 100, 90, 40)],
    "floor_scene": [("server", 30, 30, 80, 50), ("cable", 140, 40, 150, 16), ("switch", 30, 110, 110, 36),
                    ("server", 180, 110, 80, 50), ("cable", 30, 170, 180, 16)],
    "empty_rack": [("switch", 60, 60, 120, 40), ("cable", 60, 130, 160, 16)],
}
COLOURS = {"server": (30, 110, 200), "switch": (40, 170, 90), "cable": (230, 130, 30)}

def main():
    ap = argparse.ArgumentParser(description="Generate sample detection scenes.")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "assets", "samples"))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    for name, objects in SCENES.items():
        img = Image.new("RGB", (340, 220), (245, 245, 242))
        d = ImageDraw.Draw(img)
        for label, x, y, w, h in objects:
            d.rectangle([x, y, x + w, y + h], fill=COLOURS[label], outline=(40, 40, 40))
        img.save(os.path.join(a.out, f"{name}.png"))
        print(name, "->", len(objects), "objects")

if __name__ == "__main__":
    main()
