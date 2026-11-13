# Accessibility-First Component Library

A small, documented UI component library built to WCAG 2.1 AA: buttons, modals, tabs, accordions, tooltips, toggles, and toasts — with proper ARIA roles, keyboard navigation, and focus management.

## Components
- **Button** — native button semantics, disabled state
- **Modal** — focus trap, Escape to close, focus restored to trigger
- **Tabs** — arrow-key navigation, Home/End, roving tabindex
- **Accordion** — `aria-expanded` / `aria-controls`, region panels
- **Tooltip** — shows on hover *and* focus, Escape hides
- **Toggle** — `role="switch"` with `aria-checked`, Space/Enter
- **Toast** — announced via `aria-live="polite"` without stealing focus

## Features
- Visible `:focus-visible` styles; `prefers-reduced-motion` respected
- Skip link and landmarks in the demo page
- Accessibility checklist in `docs/ACCESSIBILITY_CHECKLIST.md`
- **Standout:** every component ships with an automated accessibility test — accessibility is proven, not claimed

## Tech Stack
Vanilla JavaScript + CSS. No dependencies, no build step (the guide's React/TypeScript/Storybook stack is documented as the production path in `docs/ARCHITECTURE.md`).

## How to Run
Open `src/index.html` in a browser. Try it keyboard-only: Tab to the modal, open it, Tab around (focus stays inside), press Escape.

## Tests
```bash
node tests/a11y.test.js
```

## Screenshots
See `screenshots/` — add `demo.png` and `keyboard-focus.png`.

## License
MIT — see `LICENSE`. Copyright (c) 2026 Clamor.
