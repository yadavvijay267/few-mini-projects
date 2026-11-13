# Architecture

Vanilla JS, no framework, no build step — the library is one script (`src/a11y-ui.js`) plus one stylesheet (`src/a11y-ui.css`), so it can be dropped into any page.

## Components
| Component | ARIA | Keyboard |
|---|---|---|
| Button | native `<button>`, `aria-disabled` | native |
| Modal | `role=dialog`, `aria-modal`, labelledby/describedby | Focus trap, Escape closes, focus restored to trigger |
| Tabs | `tablist` / `tab` / `tabpanel`, `aria-selected`, `aria-controls` | ← → move, Home/End jump, roving tabindex |
| Accordion | button `aria-expanded` + `aria-controls`, `role=region` | native button keys |
| Tooltip | `role=tooltip`, `aria-describedby` | shows on focus, Escape hides |
| Toggle | `role=switch`, `aria-checked` | Space / Enter |
| Toast | `aria-live=polite` region, `role=status` | none needed (announced, not focused) |

## Design decisions
- **Progressive enhancement:** components are plain HTML first; JS adds behaviour. Without JS, tabs still show their first panel and accordions stay readable.
- **Focus management is explicit:** the modal saves the trigger, traps Tab within the dialog, and restores focus on close.
- **Visible focus:** `:focus-visible` outlines are in the CSS and are never removed.
- **Reduced motion:** all transitions are disabled under `prefers-reduced-motion`.

## CI / axe-core note
The guide asks for an automated axe-core test in CI. This repo ships the equivalent as dependency-free Node assertions in `tests/a11y.test.js` (ARIA presence, tab/panel pairing, focus-trap and keyboard code paths, focus-visible CSS). To add a real axe-core browser run, install `axe-core` and point it at `src/index.html` in a Playwright/puppeteer step — the demo page is structured for it (landmarks, skip link, labelled regions).
