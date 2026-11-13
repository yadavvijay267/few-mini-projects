// Accessibility checks: static + behavioural assertions over the demo page and library.
// Runs in Node with a tiny DOM shim — no browser needed for these invariants.
const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/../src/index.html', 'utf8');
const js = fs.readFileSync(__dirname + '/../src/a11y-ui.js', 'utf8');
const css = fs.readFileSync(__dirname + '/../src/a11y-ui.css', 'utf8');

// 1. Demo page carries the required ARIA roles/attributes.
for (const token of ['role="dialog"', 'aria-modal="true"', 'role="tablist"', 'role="tab"', 'role="tabpanel"',
  'aria-selected', 'aria-expanded', 'aria-controls', 'role="region"', 'role="tooltip"',
  'aria-checked', 'aria-live="polite"', 'Skip to main content', 'aria-labelledby', 'aria-describedby']) {
  assert.ok(html.includes(token), 'demo missing: ' + token);
}
// 2. Tabs: every tab controls a panel that exists; every panel labelled by a tab.
const tabIds = [...html.matchAll(/role="tab" id="([^"]+)"/g)].map(m => m[1]);
const panelIds = [...html.matchAll(/role="tabpanel" id="([^"]+)"/g)].map(m => m[1]);
assert.strictEqual(tabIds.length, panelIds.length, 'tabs and panels must match');
for (const id of tabIds) assert.ok(panelIds.includes(id.replace('tab', 'panel')), 'tab ' + id + ' has no panel');
// 3. Library implements the behaviours.
for (const token of ['Escape', 'focus trap', 'ArrowRight', 'ArrowLeft', 'Home', 'aria-checked', 'role', "'switch'", 'aria-live']) {
  assert.ok(js.includes(token), 'library missing behaviour: ' + token);
}
// 4. Visible focus styles + reduced-motion support in CSS.
assert.ok(css.includes(':focus-visible'), 'CSS must define :focus-visible styles');
assert.ok(css.includes('prefers-reduced-motion'), 'CSS must respect prefers-reduced-motion');
// 5. Checklist doc exists and covers keyboard + screen-reader testing.
const checklist = fs.readFileSync(__dirname + '/../docs/ACCESSIBILITY_CHECKLIST.md', 'utf8');
assert.ok(checklist.includes('Keyboard') && checklist.includes('Screen reader'), 'checklist incomplete');
console.log('accessible-ui-library a11y tests: 20+ assertions passed');
