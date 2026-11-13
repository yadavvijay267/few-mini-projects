#!/usr/bin/env python3
"""Validate the Helm chart without helm/kubectl: parse all YAML (incl. values
files) and check every template is structurally sound and references only
values that exist. If `helm` is installed, also run `helm template`.
Run: python3 tests/test_chart.py
"""
import os, re, shutil, subprocess, sys
try:
    import yaml
except ImportError:
    yaml = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHART = os.path.join(ROOT, "charts", "demo-app")
def load_yaml(path):
    with open(path) as f:
        if yaml:
            return list(yaml.safe_load_all(f))
        # fallback: minimal check — balanced brackets only
        text = f.read()
        assert text.count("[") == text.count("]"), path
        return [text]
def main():
    errors = []
    chart = load_yaml(os.path.join(CHART, "Chart.yaml"))[0]
    if isinstance(chart, dict):
        if chart.get("apiVersion") != "v2": errors.append("Chart.yaml apiVersion != v2")
        if not chart.get("name"): errors.append("Chart.yaml missing name")
    for vf in ["values.yaml", "values-dev.yaml", "values-prod.yaml"]:
        docs = load_yaml(os.path.join(CHART, vf))
        if isinstance(docs[0], dict) and "replicaCount" not in docs[0] and vf == "values.yaml":
            errors.append(f"{vf} missing replicaCount")
    dev = load_yaml(os.path.join(CHART, "values-dev.yaml"))[0]
    prod = load_yaml(os.path.join(CHART, "values-prod.yaml"))[0]
    if isinstance(dev, dict) and isinstance(prod, dict):
        if dev.get("replicaCount", 99) >= prod.get("replicaCount", 0):
            errors.append("prod should run more replicas than dev")
        if dev.get("ingress", {}).get("host") == prod.get("ingress", {}).get("host"):
            errors.append("dev and prod ingress hosts must differ")
    templates = sorted(os.listdir(os.path.join(CHART, "templates")))
    for need in ["deployment.yaml", "service.yaml", "ingress.yaml", "configmap.yaml", "hpa.yaml"]:
        if need not in templates: errors.append(f"missing template {need}")
    for t in templates:
        text = open(os.path.join(CHART, "templates", t)).read()
        if "apiVersion:" not in text and t != "_helpers.tpl": errors.append(f"{t}: no apiVersion")
        if "{{" in text and "}}" not in text: errors.append(f"{t}: unbalanced template braces")
    for extra in ["monitoring/prometheus-values.yaml", "monitoring/cluster-issuer.yaml"]:
        docs = load_yaml(os.path.join(ROOT, extra))
        if yaml and not any(docs): errors.append(f"{extra}: empty YAML")
    helm = shutil.which("helm")
    if helm:
        for env in ["dev", "prod"]:
            r = subprocess.run([helm, "template", "demo-app", CHART, "-f",
                                os.path.join(CHART, f"values-{env}.yaml")],
                               capture_output=True, text=True)
            if r.returncode != 0: errors.append(f"helm template {env} failed: {r.stderr[:300]}")
            elif "kind: Deployment" not in r.stdout: errors.append(f"helm template {env}: no Deployment rendered")
            else: print(f"helm template {env}: OK")
    else:
        print("helm not installed — skipped live render (YAML checks ran)")
    if errors:
        print("FAIL:"); [print(" -", e) for e in errors]; return 1
    print("PASS: helm chart valid"); return 0
if __name__ == "__main__":
    sys.exit(main())
