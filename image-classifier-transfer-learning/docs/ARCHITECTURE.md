# Architecture

## Baseline model (shipped)

1. `src/generate_data.py` synthesises 32x32 RGB images in 3 classes:
   - `cable_ok` — clean straight cable runs (parallel lines)
   - `cable_defect` — broken / kinked / frayed runs (jagged, interrupted lines)
   - `connector` — a circular connector head with pins
2. `src/features.py` extracts features: 16x16 downscaled grayscale pixels (256)
   + a 3x8 colour histogram (24) = 280 features, standardised.
3. `src/train.py` trains `LogisticRegression(max_iter=1000)` on a stratified
   80/20 split, reports accuracy, per-class precision/recall, a confusion
   matrix and training curves (accuracy vs training-set size), and saves
   `models/model.pkl` (scaler + classifier) and `models/metrics.json`.

## Production path: real transfer learning

Swap the feature extractor for a frozen MobileNetV2 backbone
(`tf.keras.applications.MobileNetV2(weights='imagenet', include_top=False)`),
take the pooled 1280-d embedding, add a small classification head, and
fine-tune the top layers on a real labelled dataset (100+ images per class,
real site photos, with augmentation: flips, brightness, rotation). Evaluate
with the same `metrics.json` format so results stay comparable. Export as
`.h5` / `.pt` and serve behind the same `predict.py` interface.

## What production would need

- A real labelled dataset (not synthetic), with a held-out test set.
- Class-balance checks and per-class thresholds tuned for QC (recall on
  `cable_defect` matters more than overall accuracy).
- Model versioning, a validation gate before deployment, and monitoring for
  data drift (new cable types, lighting conditions).
