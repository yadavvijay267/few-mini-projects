# Architecture — Kanban Task Board

- `src/index.html` — board shell, top bar (search / label filter / actions), new-card modal.
- `src/styles.css` — dark theme, 4-column responsive grid, card and modal styles.
- `src/app.js` — single source of truth: a `cards` array persisted to `localStorage` under `kanban-board-v1`. `render()` rebuilds columns from state; drag events move a card's `col` field and re-render. WIP limits live in the `COLUMNS` table and are checked on drop (warning, not a hard block — a real agile practice is to warn, not forbid).
- No framework, no build step, no backend.
