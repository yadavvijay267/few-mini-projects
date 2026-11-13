# Form Builder (Drag & Drop)

Build forms by dragging field types onto a canvas, configure each field, and preview/export the result — a mini Typeform / Google Forms built with original vanilla JavaScript.

## Features
- Drag-and-drop field palette: text, email, textarea, select, checkbox, radio, date, file, number
- Per-field settings: label, placeholder, required, options, min/max length, regex pattern
- Reorder, duplicate, and delete fields; drag to rearrange on the canvas
- Live preview mode with validation rules that run on submit
- JSON schema export/import; draft auto-save to localStorage
- **Standout:** Export produces a standalone HTML file of the form — the builder builds something you can actually ship

## Tech Stack
HTML, CSS, vanilla JavaScript (native HTML5 Drag and Drop API), JSON Schema. No dependencies, no build step.

## How to Run
Open `src/index.html` in a browser, or serve the folder:
```bash
npx serve src
# or
python3 -m http.server --directory src 8000
```

## Tests
```bash
node tests/validate.js
```

## Screenshots
See `screenshots/` — add `main-view.png` and `preview.png` of the builder in use.

## License
MIT — see `LICENSE`. Copyright (c) 2026 Clamor.
