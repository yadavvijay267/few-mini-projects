# Usage — Data Storytelling Page

## The story

The page tells the rise of renewable energy in five steps:

1. **2000: renewables were a niche** — about 19% of global electricity,
   almost all of it hydropower.
2. **Solar and wind arrive** — from near-zero in 2000 to double digits
   by the 2010s.
3. **The crossover decade** — wind and solar overtake the growth of
   fossil generation.
4. **2024: renewables pass 30%** — the chart switches to a stacked
   area showing the mix.
5. **What comes next** — the trend line and what it would take to
   keep it going.

## Data

`assets/renewable_energy.csv` gives the share (%) of global electricity
generation from hydro, wind, solar and other renewables, 2000-2024.
The figures are rounded, illustrative values compiled from public energy
statistics (EMBER / IEA style reporting). They are accurate enough to
tell the story honestly and are labelled as rounded on the page itself —
do not cite them as exact official statistics.

## How it works

- `src/index.html` holds the story steps and a sticky chart panel.
- `src/charts.js` draws bar, line and stacked-area charts as inline SVG
  from the CSV data embedded as JSON.
- `src/app.js` wires an `IntersectionObserver` (threshold 0.6) to the
  steps: when a step becomes active, the chart transitions to that
  step's view and highlights the relevant data point.
- With `prefers-reduced-motion: reduce`, transitions are instant.
- The "Replay story" button scrolls back to step 1.
