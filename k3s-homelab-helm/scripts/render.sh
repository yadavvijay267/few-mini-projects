#!/bin/bash
# Render the chart for every environment without a cluster (helm template).
set -euo pipefail
cd "$(dirname "$0")/.."
for env in dev prod; do
  echo "== $env =="
  helm template demo-app ./charts/demo-app -f charts/demo-app/values-$env.yaml
done
echo "Render OK. (If helm is not installed, run: python3 tests/test_chart.py)"
