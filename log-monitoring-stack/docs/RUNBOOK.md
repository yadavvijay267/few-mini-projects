# Runbook

## High error rate
1. Open the dashboard, filter level=ERROR, note the top failing path/status.
2. Check the deploy that went out in the last hour (`kubectl rollout history`).
3. If a bad deploy: `kubectl rollout undo deployment/<app>`.
4. If a dependency is down: check its health endpoint; page the owner.

## High latency
1. Filter p95 by path — is one endpoint slow or all of them?
2. Check DB/CPU saturation in Grafana; look for a slow query in the logs.
3. Scale the deployment temporarily while you investigate.

## Service down
1. `kubectl get pods` — is the pod CrashLooping? Read `kubectl logs --previous`.
2. If the node is down, cordon it and reschedule pods elsewhere.
