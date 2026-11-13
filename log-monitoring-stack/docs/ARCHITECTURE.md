# Architecture

Local mode (no infra): `generate_logs.py` -> `assets/sample.log` ->
`shipper.py` -> `data/parsed.jsonl` -> dashboard (static site).

Production mode: app logs -> Promtail -> Loki; app metrics -> Prometheus;
Grafana dashboards (errors, latency, request rate) read both; Alertmanager
fires `src/alerts.yaml` rules to a webhook, each alert linking to `docs/RUNBOOK.md`.

Production needs: persistent volumes for Loki/Prometheus, Grafana auth (not
the default admin/admin), and an Alertmanager receiver that pages a human.
