# Dashboard UI Kit (Admin Panel)

A reusable admin dashboard shell — collapsible sidebar, dark/light mode, stat cards, canvas charts, a sortable data table, persisted settings, and role-based menus.

## Features

- Collapsible sidebar, dark/light mode, and breadcrumb navigation
- Stat cards, line/bar/donut charts, and a sortable data table
- Settings page with working preferences (persisted in localStorage)
- Role-based menu items (admin vs viewer)
- Theme-token system — change one file and the whole dashboard re-skins

## Tech Stack

HTML, CSS, vanilla JavaScript, Canvas charts (no chart library needed)

## How to Run

Open `src/index.html`. Switch pages from the sidebar, toggle dark mode, collapse the sidebar, sort the Orders table by clicking headers, switch role to Viewer to see the Users page disappear, and re-skin from Settings.

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
