# Usage — Object Detection Dashboard

```bash
python3 src/detector.py --demo
python3 src/detector.py --image assets/sample.ppm --threshold 0.5
python3 src/detector.py --image assets/sample.ppm --zone 0,0,10,10
python3 -m pytest tests/ -q
```

Detections are appended to `assets/detection_log.csv` with timestamps.

## Real YOLOv8 path

```bash
pip install ultralytics opencv-python streamlit
```

Replace `detect()` with `YOLO("yolov8n.pt")` inference on the image,
map each YOLO box to the same dict shape, and keep the threshold slider,
zone counting and CSV log. Webcam mode: read frames with OpenCV, run
inference per frame, and show FPS = frames / elapsed seconds.
PPM images: `convert photo.jpg photo.ppm` (ImageMagick).
