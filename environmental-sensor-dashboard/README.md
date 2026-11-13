# Environmental Sensor Dashboard

Live temperature, humidity and water-leak monitoring for a facility, with
thresholds and alerts — the monitoring wall in every data-centre NOC.

## Features

- Live sensor readings (temperature, humidity, leak, door) placed on a
  **floor-plan view**, so an alert tells you *where*, not just *what*
- Thresholds per sensor with an alert history log
- 24-hour trend charts and daily min/max per sensor
- Alert rules with a webhook notification hook (simulated delivery, logged)
- Simulated sensors included — works with no hardware

## How to run

Open `src/index.html` in a browser. Readings update every 2 seconds from
the built-in simulator. Click a sensor on the floor plan to see its
24-hour trend; use **Simulate leak** to test the alert path end to end.

## Thresholds (defaults)

- Temperature: warn > 27 °C, critical > 30 °C
- Humidity: warn > 65% RH, critical > 75% RH
- Leak: any water detected = critical
- Door: open > 5 minutes = warning

## License

MIT — see `LICENSE`.
