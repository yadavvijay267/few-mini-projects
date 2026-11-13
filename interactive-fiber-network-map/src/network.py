"""Fiber loss-budget engine (the maths behind the map).

Loss (dB) = length_km * 0.35 (1310 nm single-mode) + splices * 0.1
+ connectors * 0.5. A link passes when measured loss <= budget.
Fault simulation: removing a link affects every customer downstream
of it; the backup path is the shortest alternative route (BFS).
"""
import json, os
from collections import deque

ATTENUATION_DB_PER_KM = 0.35
SPLICE_DB = 0.1
CONNECTOR_DB = 0.5


def loss_budget(link):
    p = link["properties"]
    return round(p["length_km"] * ATTENUATION_DB_PER_KM
                 + p["splices"] * SPLICE_DB + p["connectors"] * CONNECTOR_DB, 2)


def link_passes(link, measured_db):
    return measured_db <= loss_budget(link)


def load_network(path=None):
    path = path or os.path.join(os.path.dirname(__file__), "..", "assets", "network.geojson")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def links(geojson):
    return [f for f in geojson["features"] if f["properties"]["kind"] == "link"]


def downstream_customers(geojson, broken_link_id):
    """Customers whose only path from the POP uses the broken link.

    Builds the graph, then checks reachability from POP-1 with the
    broken link removed.
    """
    graph = {}
    for link in links(geojson):
        p = link["properties"]
        graph.setdefault(p["from"], []).append((p["to"], p["id"]))
        graph.setdefault(p["to"], []).append((p["from"], p["id"]))
    seen, q = {"POP-1"}, deque(["POP-1"])
    while q:
        node = q.popleft()
        for nxt, lid in graph.get(node, []):
            if lid != broken_link_id and nxt not in seen:
                seen.add(nxt)
                q.append(nxt)
    affected = []
    for f in geojson["features"]:
        if f["properties"]["kind"] == "customer" and f["properties"]["id"] not in seen:
            affected.append(f["properties"]["name"])
    return affected


def backup_path(geojson, broken_link_id, target):
    """Shortest node path from POP to target avoiding the broken link (BFS)."""
    graph = {}
    for link in links(geojson):
        p = link["properties"]
        graph.setdefault(p["from"], []).append((p["to"], p["id"]))
        graph.setdefault(p["to"], []).append((p["from"], p["id"]))
    q = deque([("POP-1", ["POP-1"])])
    seen = {"POP-1"}
    while q:
        node, path = q.popleft()
        if node == target:
            return path
        for nxt, lid in graph.get(node, []):
            if lid != broken_link_id and nxt not in seen:
                seen.add(nxt)
                q.append((nxt, path + [nxt]))
    return []
