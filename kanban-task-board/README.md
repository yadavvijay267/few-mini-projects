# Kanban Task Board (Drag & Drop)

A Trello-style Kanban board with draggable cards, labels, due dates, checklists, search and filter, and full persistence across reloads.

## Features

- Drag cards between columns and reorder within a column (HTML5 Drag & Drop)
- WIP (work-in-progress) limit per column with a visible warning when exceeded
- Card labels, due dates with overdue highlighting, and checklists
- Search and filter by label or assignee
- Full state persistence in localStorage — the board survives a refresh

## Tech Stack

HTML, CSS, vanilla JavaScript, HTML5 Drag and Drop API, localStorage

## How to Run

Open `src/index.html` in a browser. Drag any card to another column; click a card to tick off its next checklist item; add cards with the **+ New card** button.

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
