// SLD Generator — renders a single-line diagram (SVG) from a JSON system description.
// Symbols: breaker = square + diagonal, transformer = two overlapping circles,
// busbar = thick horizontal line, earth = ground symbol, load = labelled circle.
let system = null, selected = null;
const SAMPLE_URL = '../assets/sample-system.json';

function el(n, attrs, parent) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', n);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function text(x, y, s, parent, size) {
  const t = el('text', { x, y, 'font-size': size || 13, fill: '#0f172a', 'font-family': 'system-ui,sans-serif' }, parent);
  t.textContent = s; return t;
}
function wire(x1, y1, x2, y2, parent) { el('line', { x1, y1, x2, y2, stroke: '#0f172a', 'stroke-width': 2 }, parent); }

function breaker(x, y, parent, onClick) {
  const g = el('g', { style: 'cursor:pointer' }, parent);
  el('rect', { x: x - 11, y: y - 11, width: 22, height: 22, fill: '#fff', stroke: '#0f172a', 'stroke-width': 2 }, g);
  el('line', { x1: x - 11, y1: y + 11, x2: x + 11, y2: y - 11, stroke: '#0f172a', 'stroke-width': 2 }, g);
  g.addEventListener('click', onClick); return g;
}
function transformer(x, y, parent, onClick) {
  const g = el('g', { style: 'cursor:pointer' }, parent);
  el('circle', { cx: x, cy: y - 9, r: 16, fill: '#fff', stroke: '#0f172a', 'stroke-width': 2 }, g);
  el('circle', { cx: x, cy: y + 9, r: 16, fill: '#fff', stroke: '#0f172a', 'stroke-width': 2 }, g);
  g.addEventListener('click', onClick); return g;
}
function earth(x, y, parent) {
  const g = el('g', {}, parent);
  el('line', { x1: x, y1: y, x2: x, y2: y + 14, stroke: '#0f172a', 'stroke-width': 2 }, g);
  [0, 1, 2].forEach(i => el('line', { x1: x - 12 + i * 6, y1: y + 16 + i * 5, x2: x + 12 - i * 6, y2: y + 16 + i * 5, stroke: '#0f172a', 'stroke-width': 2 }, g));
  return g;
}

function render() {
  const svg = document.getElementById('sld');
  svg.innerHTML = '';
  const warn = document.getElementById('warn'); warn.textContent = '';
  if (!system) return;
  const cx = 450;
  text(20, 30, system.name || 'Single-Line Diagram', svg, 18);
  // Incomer
  let y = 70;
  text(cx + 30, y - 4, (system.incomer.source || 'Incomer') + ' ' + system.incomer.voltage_kv + ' kV', svg);
  wire(cx, y - 24, cx, y, svg);
  breaker(cx, y, svg, () => select('incomer', 'Incomer breaker'));
  text(cx + 30, y + 18, system.incomer.breaker_a + ' A', svg);
  // Transformer
  wire(cx, y + 11, cx, y + 46, svg);
  transformer(cx, y + 62, svg, () => select('transformer', 'Transformer'));
  text(cx + 30, y + 56, system.transformer.kva + ' kVA', svg);
  text(cx + 30, y + 74, system.transformer.primary_kv + ' kV / ' + system.transformer.secondary_v + ' V', svg);
  const flc = (system.transformer.kva * 1000 / (Math.sqrt(3) * system.transformer.secondary_v)).toFixed(0);
  text(cx + 30, y + 92, 'FLC ' + flc + ' A', svg, 11);
  // Busbar
  const busY = y + 122;
  wire(cx, y + 78, cx, busY, svg);
  const panels = system.panels || [];
  const span = Math.min(760, Math.max(300, panels.length * 220));
  el('line', { x1: cx - span / 2, y1: busY, x2: cx + span / 2, y2: busY, stroke: '#0f172a', 'stroke-width': 6 }, svg);
  text(cx - span / 2 - 8, busY - 10, '415 V busbar', svg, 11);
  earth(cx + span / 2 + 24, busY - 4, svg);
  text(cx + span / 2 + 8, busY + 44, 'Earth', svg, 11);
  panels.forEach((p, i) => {
    const px = panels.length === 1 ? cx : cx - span / 2 + (span * (i + 0.5) / panels.length);
    let py = busY;
    wire(px, py, px, py + 26, svg);
    breaker(px, py + 37, svg, () => select('panel:' + i, p.name + ' breaker'));
    text(px + 16, py + 32, p.breaker_a + ' A', svg, 11);
    text(px, py + 66, p.name, svg, 12);
    if (p.breaker_a > system.incomer.breaker_a) warn.textContent = '⚠ ' + p.name + ' breaker (' + p.breaker_a + ' A) exceeds incomer breaker rating.';
    let ly = py + 84;
    (p.loads || []).forEach(l => {
      wire(px, ly - 14, px, ly, svg);
      const c = el('circle', { cx: px, cy: ly + 10, r: 12, fill: '#dbeafe', stroke: '#0f172a', 'stroke-width': 2, style: 'cursor:pointer' }, svg);
      c.addEventListener('click', () => select('load:' + i + ':' + (p.loads.indexOf(l)), l.name));
      text(px + 18, ly + 8, l.name + ' — ' + l.kw + ' kW', svg, 12);
      ly += 34;
    });
  });
}

function select(key, label) {
  selected = key;
  const panel = document.getElementById('editPanel');
  let target, field, value;
  if (key === 'incomer') { target = system.incomer; field = 'breaker_a'; value = target.breaker_a; }
  else if (key === 'transformer') { target = system.transformer; field = 'kva'; value = target.kva; }
  else if (key.startsWith('panel:')) { const i = +key.split(':')[1]; target = system.panels[i]; field = 'breaker_a'; value = target.breaker_a; }
  else { const [, i, j] = key.split(':'); target = system.panels[+i].loads[+j]; field = 'kw'; value = target.kw; }
  panel.innerHTML = '<label>' + label + ' — ' + field + '</label>' +
    '<input id="editVal" type="number" value="' + value + '">' +
    '<button onclick="applyEdit()">Apply</button>';
  window._editTarget = target; window._editField = field;
}
function applyEdit() {
  const v = parseFloat(document.getElementById('editVal').value);
  if (isNaN(v)) return;
  window._editTarget[window._editField] = v;
  document.getElementById('json').value = JSON.stringify(system, null, 2);
  render();
}
function redraw() {
  try { system = JSON.parse(document.getElementById('json').value); render(); }
  catch (e) { document.getElementById('warn').textContent = 'Invalid JSON: ' + e.message; }
}
async function loadSample() {
  try {
    const r = await fetch(SAMPLE_URL); system = await r.json();
  } catch (e) {
    system = JSON.parse(document.getElementById('json').value || '{}');
  }
  document.getElementById('json').value = JSON.stringify(system, null, 2);
  render();
}
function exportSVG() {
  const svg = document.getElementById('sld');
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'sld.svg'; a.click(); URL.revokeObjectURL(a.href);
}
function exportPNG() {
  const svg = document.getElementById('sld');
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = 1800; c.height = 1280;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'sld.png'; a.click();
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
}
loadSample();
