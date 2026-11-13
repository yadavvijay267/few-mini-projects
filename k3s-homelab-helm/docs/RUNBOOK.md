# Runbook — common operations

| Task | Command |
|---|---|
| Scale | `kubectl scale deploy/demo-app-demo-app --replicas=5` (or edit `replicaCount` in values) |
| Rollback | `helm rollback demo-app 1` / `helm history demo-app` |
| Upgrade | `helm upgrade demo-app ./charts/demo-app -f charts/demo-app/values-prod.yaml` |
| Debug pod | `kubectl describe pod <name>` then `kubectl logs <name> --previous` |
| Check ingress | `kubectl get ingress -A` and `curl -k https://<host>` |
| Node disk full | `kubectl describe node` — check ephemeral storage; prune images with `k3s crictl` |
| etcd snapshot | `k3s etcd-snapshot save` (schedule nightly; copy off-node) |

## Alerts

Prometheus alerts (error rate, pod restarts) route to the webhook receiver;
each alert links back to this runbook.
