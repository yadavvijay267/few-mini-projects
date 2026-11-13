# Object Detection Dashboard (YOLO)

Detect and count objects in images and video streams with bounding
boxes and a live dashboard.

## Features

- Upload an image; get annotated output with counts per class.
- Live webcam detection with FPS display (real-model path).
- Detection log with timestamps, exportable to CSV.
- Confidence-threshold slider that updates results live.
- **Count-by-zone mode** — draw a box on the image and it counts
  only objects inside it.

## Tech stack

- Python 3.10+, standard library only for the demo detector
  (connected-components on thresholded PPM images — no downloads).
- Real-model path: Ultralytics YOLOv8 (open-source), OpenCV,
  Streamlit — see `docs/USAGE.md`.

## How to run

```bash
python3 src/detector.py --demo
python3 src/detector.py --image assets/sample.ppm --threshold 0.5
python3 -m pytest tests/ -q
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
