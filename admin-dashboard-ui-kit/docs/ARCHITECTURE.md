# Architecture — Dashboard UI Kit

- `src/index.html` — app shell: sidebar, topbar with breadcrumbs, page container.
- `src/styles.css` — the theme-token system: every colour is a CSS variable (`--bg`, `--panel`, `--accent`, ...). `[data-theme]` overrides re-skin the kit; accent presets (blue/teal/violet) swap `--accent` only.
- `src/app.js` — `prefs` (theme, accent, collapsed sidebar, density, role) persist in `localStorage`. Pages render from data arrays (`ORDERS`, `USERS`); charts are hand-drawn on `<canvas>` so the kit has zero dependencies. The Users page is admin-only; switching to Viewer hides it from the nav.
- Clone this folder to start any admin project: replace the data arrays and add nav entries.
