# Architecture — Interactive Resume (Web Experience)

- `src/index.html` — hero, filter bar, profile, timeline, skills, projects, certifications.
- `src/app.js` — data-driven rendering: `SKILLS` (animated by an IntersectionObserver that sets each bar's width once visible) and `PROJECTS` (filtered by tag). Timeline roles toggle their detail body on click or keyboard. `window.print()` triggers the browser's Save-as-PDF.
- `src/styles.css` — `@media print` hides the filter bar, buttons and footer, expands all timeline bodies, and forces bar widths via the `--w` custom property so the printed PDF matches the interactive version.
