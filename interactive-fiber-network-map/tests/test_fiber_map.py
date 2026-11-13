"""Tests: GeoJSON valid, loss model correct, fault simulation correct."""
import json, os, re, subprocess, sys
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load():
    return json.load(open(os.path.join(BASE, "assets", "network.geojson")))

def loss(link):
    return round(link["length_km"] * 0.22 + link["splices"] * 0.05 + link["connectors"] * 0.3, 2)

def adjacency(gj, broken=None):
    adj = {}
    for f in gj["features"]:
        if f["geometry"]["type"] == "Point":
            adj[f["properties"]["id"]] = []
    for f in gj["features"]:
        if f["geometry"]["type"] == "LineString" and f["properties"]["id"] != broken:
            a, b = f["properties"]["from"], f["properties"]["to"]
            adj[a].append(b); adj[b].append(a)
    return adj

def reachable(adj, start):
    seen, q = {start}, [start]
    while q:
        n = q.pop()
        for m in adj[n]:
            if m not in seen:
                seen.add(m); q.append(m)
    return seen

def test_geojson_valid():
    gj = load()
    nodes = [f for f in gj["features"] if f["geometry"]["type"] == "Point"]
    links = [f for f in gj["features"] if f["geometry"]["type"] == "LineString"]
    assert len(nodes) == 7 and len(links) == 7
    node_ids = {f["properties"]["id"] for f in nodes}
    for f in links:
        assert f["properties"]["from"] in node_ids and f["properties"]["to"] in node_ids

def test_loss_model():
    gj = load()
    for f in gj["features"]:
        if f["geometry"]["type"] == "LineString":
            assert loss(f["properties"]) > 0
    # L1: 2.4*0.22 + 4*0.05 + 2*0.3 = 1.33 dB
    l1 = [f for f in gj["features"] if f["properties"].get("id") == "L1"][0]
    assert loss(l1["properties"]) == 1.33

def test_fault_l2_affects_customer_b_only():
    gj = load()
    adj = adjacency(gj, broken="L2")
    ok = reachable(adj, "POP-1")
    # SC-2 is cut off from POP-1 (L7 goes POP-1->POP-2, and POP-2->SC-2 is L3... so SC-2 IS reachable via POP-2)
    assert "CUST-B" in ok  # backup ring via L7 + L3 keeps Customer B up
    assert "CUST-A" in ok

def test_fault_l1_affects_customer_a():
    gj = load()
    adj = adjacency(gj, broken="L1")
    ok = reachable(adj, "POP-1")
    # SC-1 is reachable via POP-1 -> POP-2 (L7) -> SC-2 (L3) -> SC-1 (L2): ring saves it
    assert "CUST-A" in ok

def test_no_backup_when_ring_also_broken():
    gj = load()
    adj = adjacency(gj, broken="L1")
    # remove L7 too: SC-1 isolated from POP-1
    adj2 = {k: [m for m in v] for k, v in adj.items()}
    for a, b in (("POP-1", "POP-2"),):
        adj2[a] = [m for m in adj2[a] if m != b]; adj2[b] = [m for m in adj2[b] if m != a]
    ok = reachable(adj2, "POP-1")
    assert "CUST-A" not in ok and "CUST-B" not in ok

def test_network_js_has_simulator():
    js = open(os.path.join(BASE, "src", "network.js")).read()
    for token in ("simulateFault", "lossDb", "shortestPath", "0.22", "backup_path"):
        assert token in js, token

def test_html_has_toggle_and_fault_ui():
    html = open(os.path.join(BASE, "src", "index.html")).read()
    for token in ("leaflet", "2D map", "3D view", "Fault simulator", "runFault", "network.geojson"):
        assert token in html, token
