# Interactive Resume (Web Experience)

Clamor's resume as an interactive web experience: a clickable career timeline, skill bars that animate on scroll, filterable projects, and a print stylesheet so the same page becomes a clean one-page PDF.

## Features

- Animated career timeline with role details on click
- Skill bars that animate when scrolled into view
- Project filter by technology and a 'download PDF' button
- Print stylesheet so it still prints as a clean one-page resume
- Dark/light toggle for comfortable reading

## Tech Stack

HTML, CSS, vanilla JavaScript, print stylesheet (window.print for PDF)

## How to Run

Open `src/index.html`. Click timeline roles to expand them, scroll to watch skill bars fill, filter projects by category, and use 'Download PDF (Print)' to save the same page as a PDF.

No build step and no API key are needed. Open `src/index.html` in any modern
browser, or serve the folder:

```bash
cd src
python3 -m http.server 8000
# then open http://localhost:8000
```

## Screenshots

See [`screenshots/SCREENSHOTS.md`](screenshots/SCREENSHOTS.md) for where to
place captures of the running app.

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Clamor.
