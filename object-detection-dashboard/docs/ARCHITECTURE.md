# Architecture

## Baseline detector (shipped)

`src/detect.py`:
1. Load the image, convert to HSV, threshold the saturated coloured
   regions (the sample scenes use distinct colours per object class).
2. Find contours with OpenCV (`cv2.findContours`) — or, if OpenCV is not
   installed, a pure-NumPy connected-components labelling fallback in
   `src/fallback.py`.
3. Filter by minimum area (`--min-area`, the "confidence" control in the
   dashboard), classify each contour by its mean colour, and emit a
   bounding box + class + area.
4. Optionally restrict counting to a `--zone x,y,w,h` rectangle.
5. Write an annotated PNG, a JSON result, and append a row to
   `assets/detections/detection_log.csv`.

Classes in the sample scenes: `server` (blue), `switch` (green),
`cable` (orange). Colour is the class signal — that is the documented
limitation of the baseline.

## Production path: YOLOv8

```bash
pip install ultralytics
yolo predict model=yolov8n.pt source=<image> save=True
```

Replace `detect_objects()` in `src/detect.py` with a YOLOv8 call; keep the
output format (`{label, confidence, bbox}`) and the dashboard, zone
counting and CSV log unchanged. YOLOv8n runs on CPU for still images and
gives real class recognition (person, laptop, box, ...) with a true
confidence score — use the `--conf` threshold instead of `--min-area`.

## What production would need

- A labelled dataset of real site photos (racks, people, PPE) for
  fine-tuning, and a measured mAP on a held-out set.
- Video/webcam mode with FPS display (the dashboard has the slot for it).
- A real confidence threshold, NMS, and per-zone counting on video frames.
