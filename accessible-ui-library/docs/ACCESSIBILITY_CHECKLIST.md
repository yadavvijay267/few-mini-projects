# Accessibility Checklist (WCAG 2.1 AA)

Run this checklist on every component before release. Automated checks live in `tests/a11y.test.js`; the items below need a human + a screen reader.

## Keyboard
- [ ] Every interactive element is reachable by Tab in a logical order.
- [ ] No keyboard traps except the modal (which traps focus intentionally and releases on Escape/close).
- [ ] Modal: Escape closes, focus returns to the trigger.
- [ ] Tabs: Arrow Left/Right move, Home/End jump, Tab enters the panel.
- [ ] Toggle: Space and Enter flip it.
- [ ] Tooltip: appears on focus as well as hover; Escape hides it.
- [ ] Focus is always visible (`:focus-visible` outline, never `outline: none` without a replacement).

## Screen reader
- [ ] Modal announces as a dialog with its name and description.
- [ ] Tabs announce selected state (`aria-selected`) and panel association.
- [ ] Accordion buttons announce expanded/collapsed state.
- [ ] Toggle announces as a switch with its on/off state.
- [ ] Toasts are announced via the `aria-live="polite"` region without stealing focus.
- [ ] All images have alt text; decorative images have empty alt.

## Visual / motion
- [ ] Colour contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text and UI components.
- [ ] Information is never conveyed by colour alone.
- [ ] `prefers-reduced-motion` disables animation/transitions.
- [ ] Layout works at 200% zoom and at 320px width.

## Automated (CI)
Every component ships with an automated check in `tests/a11y.test.js` — in a full CI setup this is where an axe-core run belongs (see `docs/ARCHITECTURE.md`). Accessibility is proven by tests, not claimed in a README.
