# Usage — Image Classifier

## Demo (offline)

```bash
python3 src/classifier.py --demo
python3 -m pytest tests/ -q
```

## Train on your own data

1. Make a CSV like `assets/sample_features.csv`: one `label` column
   plus 12 feature columns (quadrant RGB means — see `extract_features`).
   Or generate features from PPM images with a small script that calls
   `extract_features(path)` per image.
2. `python3 src/classifier.py --train my_features.csv --out models/model.json`
3. `python3 src/classifier.py --predict photo.ppm --model models/model.json`

PPM images: export from GIMP / ImageMagick (`convert photo.jpg photo.ppm`).

## Real MobileNetV2 path (when you have the weights)

Replace `extract_features` with a MobileNetV2 backbone
(`tensorflow.keras.applications.MobileNetV2(include_top=False, pooling="avg")`),
freeze it, and train only the centroid head — or a small dense head —
on your labelled images. Export with `model.save("model.h5")`.
Streamlit dashboard: upload an image, show top-3 predictions, training
curves (from the CSV log) and the confusion matrix printed by `--demo`.
