// Network model: loss computation + fault simulation. Shared by the 2D and 3D views.
window.FIBER = (function () {
  const ATTEN_DB_KM = 0.22, SPLICE_DB = 0.05, CONNECTOR_DB = 0.3;
  function lossDb(link) {
    return +(link.length_km * ATTEN_DB_KM + link.splices * SPLICE_DB + link.connectors * CONNECTOR_DB).toFixed(2);
  }
  function lossColour(loss) { return loss <= 3 ? "#2ecc71" : loss <= 6 ? "#f1c40f" : "#e74c3c"; }
  function parseGeojson(gj) {
    const nodes = {}, links = [];
    gj.features.forEach(f => {
      if (f.geometry.type === "Point") nodes[f.properties.id] = { ...f.properties, coords: f.geometry.coordinates };
      if (f.geometry.type === "LineString") links.push({ ...f.properties, coords: f.geometry.coordinates, loss_db: lossDb(f.properties) });
    });
    return { nodes, links };
  }
  function adjacency(nodes, links, brokenId) {
    const adj = {}; Object.keys(nodes).forEach(id => adj[id] = []);
    links.forEach(l => {
      if (l.id === brokenId) return;
      adj[l.from].push(l.to); adj[l.to].push(l.from);
    });
    return adj;
  }
  function reachable(adj, start) {
    const seen = new Set([start]), queue = [start];
    while (queue.length) { const n = queue.shift(); adj[n].forEach(m => { if (!seen.has(m)) { seen.add(m); queue.push(m); } }); }
    return seen;
  }
  function shortestPath(adj, from, to) {
    if (from === to) return [from];
    const prev = { [from]: null }, queue = [from];
    while (queue.length) {
      const n = queue.shift();
      for (const m of adj[n]) if (!(m in prev)) { prev[m] = n; if (m === to) { const path = [to]; let c = to; while (prev[c]) { c = prev[c]; path.unshift(c); } return path; } queue.push(m); }
    }
    return null;
  }
  function simulateFault(net, brokenId) {
    const broken = net.links.find(l => l.id === brokenId);
    if (!broken) return { error: "unknown link " + brokenId };
    const adj = adjacency(net.nodes, net.links, brokenId);
    const ok = reachable(adj, "POP-1");
    const customers = Object.values(net.nodes).filter(n => n.kind === "customer");
    const affected = customers.filter(c => !ok.has(c.id)).map(c => c.id);
    const backup = shortestPath(adj, broken.from, broken.to);
    return { broken: brokenId, broken_name: broken.name, loss_db: broken.loss_db,
             affected, unaffected: customers.filter(c => ok.has(c.id)).map(c => c.id),
             backup_path: backup };
  }
  return { lossDb, lossColour, parseGeojson, simulateFault, shortestPath, ATTEN_DB_KM, SPLICE_DB, CONNECTOR_DB };
})();
