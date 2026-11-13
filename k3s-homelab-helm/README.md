# 84. Kubernetes Homelab (K3s) + Helm Chart

A K3s homelab: a reusable Helm chart for a demo web app, with per-environment
values files, ingress + TLS, Prometheus/Grafana monitoring values, and a
runbook for everyday operations. Nothing here needs a real cluster to validate
— `helm template` rendering is checked locally by the test suite.

## Features

- Reusable Helm chart (`charts/demo-app`) — one chart, values per environment
- `values-dev.yaml` and `values-prod.yaml` (replicas, resources, ingress)
- Deployment, Service, Ingress (TLS via cert-manager), ConfigMap, HPA
- Prometheus + Grafana monitoring stack values (`monitoring/`)
- Runbook: scale, rollback, debug, upgrade (`docs/RUNBOOK.md`)
- `helm template` validation script — renders every environment offline

## Tech stack

K3s, Helm 3, kubectl, Prometheus + Grafana, cert-manager, Let's Encrypt

## How to run

```bash
# 1. Install K3s on a node (see docs/INSTALL.md)
curl -sfL https://get.k3s.io | sh -
# 2. Install the chart
helm install demo-app ./charts/demo-app -f charts/demo-app/values-dev.yaml
# 3. Prod values
helm upgrade demo-app ./charts/demo-app -f charts/demo-app/values-prod.yaml
# Validate without a cluster:
python3 tests/test_chart.py
```

## Screenshots

See [`screenshots/`](screenshots/).

## License

MIT — see [LICENSE](LICENSE).
