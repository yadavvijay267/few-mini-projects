# Form Builder — Usage

Open `src/index.html` in a browser (or serve the `src/` folder with any static server).

## Workflow
1. Drag a field from the palette onto the canvas (or click it to append).
2. Click a field on the canvas to select it, then edit label, placeholder, required flag, options, min/max length, and regex pattern in the Field Settings panel.
3. Reorder with ↑ / ↓, duplicate with ⧉, delete with ✕. Fields can also be dragged within the canvas to move them to the end.
4. **Live Preview** renders the form and runs the validation rules on submit.
5. **Export JSON** downloads the form schema; **Import JSON** loads one back (paste into the JSON box and use the file picker, or edit the box and import the file).
6. **Export Standalone HTML** downloads a self-contained HTML file of the finished form — the standout feature: the builder builds something you can actually ship.

## Schema format
```json
{ "title": "Contact Form",
  "fields": [{ "id": "f1", "type": "email", "label": "Email", "placeholder": "", "required": true,
               "validation": { "pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" } }] }
```
Field types: text, email, textarea, select, checkbox, radio, date, file, number.
Drafts auto-save to `localStorage` (`form-builder-draft`) and restore on reload.
