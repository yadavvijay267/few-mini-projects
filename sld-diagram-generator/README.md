# Single-Line Diagram (SLD) Generator

Generate a clean, professional electrical single-line diagram (SLD) from a
simple JSON description of the system — incomer → transformer → panels →
loads. Change a rating and the diagram redraws itself: the diagram is
generated from data, not drawn by hand.

## Features

- Describe the system in JSON (incomer, transformer, distribution panels, loads)
- Auto-layout SLD with standard symbols: breaker, transformer, busbar, earth
- Click any component to edit its rating; the diagram updates live
- Export as SVG and PNG
- Built-in sample systems (commercial building, small factory)

## Tech stack

- Vanilla JavaScript, SVG (no framework, no build step)
- `src/app.js` renders the diagram; `src/index.html` is the editor UI

## How to run

Open `src/index.html` in any modern browser, or serve the folder:

```bash
cd src && python3 -m http.server 8000
# then open http://localhost:8000
```

Edit the JSON on the left, or click a component in the diagram to change its
rating. Use **Export SVG** / **Export PNG** to save the drawing.

## Sample input

See `assets/sample-system.json` — a commercial building incomer at 11 kV,
1000 kVA transformer, three distribution panels and their loads.

## Formulas / conventions

- Transformer full-load current: `I = S / (√3 × V)` (three-phase)
- Breaker ratings are shown as entered; the generator checks that a panel
  breaker is not rated above its upstream breaker and warns if it is.

## License

MIT — see `LICENSE`.
