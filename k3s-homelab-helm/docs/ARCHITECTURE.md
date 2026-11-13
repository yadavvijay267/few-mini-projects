# Architecture

One reusable chart (`charts/demo-app`) + one values file per environment.
K3s ships Traefik as the ingress controller; cert-manager issues Let's
Encrypt certificates; kube-prometheus-stack provides Prometheus + Grafana.

```
Internet -> Traefik (Ingress, TLS) -> Service -> Deployment (nginx pods)
                                        |
                              Prometheus scrapes metrics
                              Grafana dashboards + alerts
```
