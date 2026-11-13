/* Hand-built SVG charts (no chart library). Data comes from window.RENEWABLE_DATA. */
const COLORS = { hydro: "#3182ce", wind: "#38b2ac", solar: "#ecc94b", other: "#9f7aea" };
function total(d) { return d.hydro + d.wind + d.solar + d.other; }
function svgOpen(w, h) { return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img">`; }
function yAxis(max) {
  let ticks = "";
  for (let v = 0; v <= max; v += 10) {
    const y = 330 - (v / max) * 300;
    ticks += `<line x1="40" y1="${y}" x2="560" y2="${y}" stroke="#e2e8f0"/><text x="34" y="${y + 4}" text-anchor="end" font-size="11">${v}%</text>`;
  }
  return ticks;
}
function drawBar(data, year) {
  const d = data.find(r => r.year === year) || data[data.length - 1];
  const parts = [["Hydro", d.hydro], ["Wind", d.wind], ["Solar", d.solar], ["Other", d.other]];
  const max = 20; let bars = "";
  parts.forEach(([label, val], i) => {
    const h = (val / max) * 300, x = 70 + i * 120;
    bars += `<rect x="${x}" y="${330 - h}" width="70" height="${h}" fill="${COLORS[label.toLowerCase()]}" rx="4"/>` +
            `<text x="${x + 35}" y="${350}" text-anchor="middle" font-size="13">${label}</text>` +
            `<text x="${x + 35}" y="${320 - h}" text-anchor="middle" font-size="13" font-weight="bold">${val.toFixed(1)}%</text>`;
  });
  return svgOpen(600, 370) + yAxis(max) + bars + "</svg>";
}
function linePath(data, key, max) {
  return data.map((d, i) => `${i === 0 ? "M" : "L"}${40 + (i / (data.length - 1)) * 520},${330 - (d[key] / max) * 300}`).join(" ");
}
function drawLine(data, year) {
  const max = 20; let paths = "";
  for (const key of ["hydro", "wind", "solar"]) {
    paths += `<path d="${linePath(data, key, max)}" fill="none" stroke="${COLORS[key]}" stroke-width="3"/>`;
  }
  const idx = data.findIndex(r => r.year === year);
  const d = data[Math.max(0, idx)];
  const cx = 40 + (Math.max(0, idx) / (data.length - 1)) * 520;
  const cy = 330 - (total(d) / max) * 300;
  const legend = ["hydro", "wind", "solar"].map((k, i) =>
    `<circle cx="60" cy="${20 + i * 20}" r="6" fill="${COLORS[k]}"/><text x="72" y="${24 + i * 20}" font-size="12">${k}</text>`).join("");
  return svgOpen(600, 370) + yAxis(max) + paths + legend +
    `<circle cx="${cx}" cy="${cy}" r="7" fill="#e53e3e"/><text x="${cx}" y="${cy - 14}" text-anchor="middle" font-size="13" font-weight="bold">${year}: ${total(d).toFixed(1)}% total</text></svg>`;
}
function drawArea(data) {
  const max = 40; const keys = ["hydro", "wind", "solar", "other"];
  let layers = ""; const cum = data.map(() => 0);
  keys.forEach(key => {
    const top = [], bottom = [];
    data.forEach((d, i) => {
      const x = 40 + (i / (data.length - 1)) * 520;
      const base = cum[i];
      top.push([x, 330 - ((base + d[key]) / max) * 300]);
      bottom.push([x, 330 - (base / max) * 300]);
      cum[i] += d[key];
    });
    const pts = top.map(p => p.join(",")).join(" ") + " " + bottom.reverse().map(p => p.join(",")).join(" ");
    layers += `<polygon points="${pts}" fill="${COLORS[key]}" opacity="0.85"/>`;
  });
  const legend = keys.map((k, i) =>
    `<circle cx="60" cy="${20 + i * 20}" r="6" fill="${COLORS[k]}"/><text x="72" y="${24 + i * 20}" font-size="12">${k}</text>`).join("");
  return svgOpen(600, 370) + yAxis(max) + layers + legend + "</svg>";
}
function drawTrend(data) {
  const max = 40;
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${40 + (i / (data.length - 1)) * 520},${330 - (total(d) / max) * 300}`).join(" ");
  const last = data[data.length - 1];
  const proj = `M${40 + 520},${330 - (total(last) / max) * 300} L560,${330 - (45 / max) * 300}`;
  return svgOpen(600, 370) + yAxis(max) +
    `<path d="${path}" fill="none" stroke="#059669" stroke-width="3"/>` +
    `<path d="${proj}" fill="none" stroke="#059669" stroke-width="3" stroke-dasharray="6 5"/>` +
    `<text x="470" y="60" font-size="12">projected → ~45% by 2032</text></svg>`;
}
window.drawChart = function (view, year) {
  const data = window.RENEWABLE_DATA;
  if (view === "bar") return drawBar(data, year);
  if (view === "area") return drawArea(data);
  if (view === "trend") return drawTrend(data);
  return drawLine(data, year);
};
