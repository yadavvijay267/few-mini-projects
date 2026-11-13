# 88. Cost Optimisation Dashboard (Cloud Spend)

Track cloud spend across services, find waste (idle resources, oversized
instances), and estimate savings. Ingests an AWS-style billing CSV, applies
rule-based waste detection, and shows the results in a dashboard that ends
with a dollar figure: **"you can save $X/month"**.

## Features

- Spend by service, region, and tag over time (from `assets/billing.csv`)
- Idle-resource detection: unattached volumes, stopped instances, unused IPs
- Rightsizing suggestions with estimated monthly savings
- Budget alerts at 50 / 80 / 100% of a monthly limit
- Dashboard (`src/dashboard/`) with charts + a ranked savings list

## Tech stack

Python 3 (stdlib), HTML/CSS/JS dashboard (Chart.js via CDN, graceful fallback)

## How to run

```bash
python3 src/analyzer.py                       # prints the report + savings
python3 src/analyzer.py --budget 500          # budget alerts at 50/80/100%
python3 -m http.server 8000 --directory src/dashboard   # open http://localhost:8000
python3 tests/test_cost.py
```

To use real data: export a Cost Explorer CSV and replace `assets/billing.csv`
(same columns), and `assets/resources.csv` with your resource inventory.

## Screenshots

See [`screenshots/`](screenshots/).

## License

MIT — see [LICENSE](LICENSE).
