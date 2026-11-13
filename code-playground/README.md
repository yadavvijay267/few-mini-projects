# Code Playground (Mini CodePen)

An in-browser editor for HTML/CSS/JS with live preview, console output, and snippet saving — a mini CodePen built with original vanilla JavaScript.

## Features
- Three-pane editor (HTML / CSS / JS)
- Live preview in a sandboxed iframe, updating as you type, plus a Run button
- Console panel capturing `log`, `warn`, `error`, and uncaught errors from the preview
- Save/load snippets via localStorage
- **Standout:** a Share button that encodes the whole snippet into the URL hash — no backend, no account, instant sharing

## Tech Stack
HTML, CSS, vanilla JavaScript. No dependencies, no build step.

## How to Run
Open `src/index.html` in a browser, or serve the folder:
```bash
python3 -m http.server --directory src 8000
```

## Tests
```bash
node tests/validate.js
```

## Screenshots
See `screenshots/` — add `editor.png` and `console.png`.

## License
MIT — see `LICENSE`. Copyright (c) 2026 Clamor.
