# Image Classifier (Transfer Learning)

Classify images with a pre-trained model fine-tuned on a small custom
dataset — here with a lightweight, fully offline demo backbone so the
project runs anywhere without downloading weights.

## What it does

- Upload an image and get top-3 predictions with confidence.
- Fine-tune on your own small dataset (e.g. 100 images per class).
- Training curves and a confusion matrix in the dashboard.
- Export the trained model as a JSON file (`.h5`/`.pt` export path
  documented in `docs/USAGE.md` for the real MobileNetV2 version).

## Standout feature — defect-detection mode

The same pipeline is wired for QC work: train on a small, realistic
dataset of site photos / drawings and it flags likely defects. This is
the idea behind spotting defects in fiber design drawings or site photos.

## Tech stack

- Python 3.10+, standard library only for the demo (no downloads).
- Real-model path: TensorFlow/Keras or PyTorch, MobileNetV2
  (transfer learning), Streamlit — see `docs/USAGE.md`.

## How to run

```bash
python3 src/classifier.py --demo
python3 src/classifier.py --train assets/sample_features.csv --out models/model.json
python3 src/classifier.py --predict assets/sample.ppm --model models/model.json
python3 -m pytest tests/ -q
```

## How it works

The demo backbone reads a PPM image, splits it into a 2x2 grid and
takes the mean RGB of each quadrant as features (12 numbers) — a tiny
stand-in for a frozen pre-trained backbone. The trainable head is a
nearest-centroid classifier: each class is the mean of its training
features. Fine-tuning = recomputing the centroids on your data.

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
