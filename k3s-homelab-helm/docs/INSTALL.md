# Install the K3s homelab

## 1. One node (local VM or cheap VPS)

```bash
curl -sfL https://get.k3s.io | sh -
sudo cat /etc/rancher/k3s/k3s.yaml > ~/.kube/config   # or export KUBECONFIG
kubectl get nodes
```

## 2. Helm + cert-manager

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.15.0/cert-manager.yaml
```

Create a `ClusterIssuer` for Let's Encrypt (see `monitoring/cluster-issuer.yaml`).

## 3. Monitoring

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack \
  -f monitoring/prometheus-values.yaml
```

## 4. The demo app

```bash
helm install demo-app ./charts/demo-app -f charts/demo-app/values-dev.yaml
kubectl get ingress
```

## Production needs

A second node for HA, etcd backups (`k3s etcd-snapshot`), a real domain with
DNS pointing at the node, and secrets in Sealed Secrets / External Secrets —
never plain values files.
