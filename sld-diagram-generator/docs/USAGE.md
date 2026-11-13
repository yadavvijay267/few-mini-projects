# Usage — SLD Generator

## JSON format

```json
{
  "name": "Commercial Building",
  "incomer": { "voltage_kv": 11, "source": "Utility grid", "breaker_a": 630 },
  "transformer": { "kva": 1000, "primary_kv": 11, "secondary_v": 415 },
  "panels": [
    { "name": "Main DB", "breaker_a": 800, "loads": [
      { "name": "HVAC", "kw": 120 }, { "name": "Lighting", "kw": 45 } ] }
  ]
}
```

## Editing

- Click any symbol in the diagram to edit its rating/name in the side panel.
- Press **Redraw** after editing the JSON directly.
- **Load sample** restores the bundled commercial-building system.

## Export

- **Export SVG** downloads the diagram as a vector file.
- **Export PNG** rasterises the same SVG at 2x scale.
