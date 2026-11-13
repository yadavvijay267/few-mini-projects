// Liquid UI playground: live-tuned morphing blob, gooey SVG-filter demos, copy-code snippets.
const blob = document.getElementById("blob");
const state = { round: 55, speed: 8, color: "#0ea5e9", blur: 30, size: 240 };
const PRESETS = {
  calm: { round: 60, speed: 14, color: "#0ea5e9", blur: 24, size: 220 },
  playful: { round: 42, speed: 5, color: "#ec4899", blur: 40, size: 260 },
  energetic: { round: 30, speed: 2, color: "#f59e0b", blur: 55, size: 280 },
};
function apply() {
  blob.style.width = state.size + "px"; blob.style.height = state.size + "px";
  blob.style.background = state.color;
  blob.style.boxShadow = `0 0 ${state.blur}px ${state.color}`;
  blob.style.animationDuration = state.speed + "s";
  document.getElementById("roundVal").textContent = state.round + "%";
  document.getElementById("speedVal").textContent = state.speed + "s";
  document.getElementById("blurVal").textContent = state.blur + "px";
  document.getElementById("sizeVal").textContent = state.size + "px";
  renderCode();
}
function renderCode() {
  document.getElementById("codeOut").textContent =
`.blob {
  width: ${state.size}px; height: ${state.size}px;
  background: ${state.color};
  border-radius: ${state.round}% ${100 - state.round}% ${100 - state.round + 5}% ${state.round - 15}% / ${state.round}% ${100 - state.round - 15}% ${state.round + 5}% ${100 - state.round}%;
  box-shadow: 0 0 ${state.blur}px ${state.color};
  animation: morph ${state.speed}s ease-in-out infinite;
}
@keyframes morph {
  0%, 100% { border-radius: 55% 45% 60% 40% / 55% 40% 60% 45%; }
  33% { border-radius: 40% 60% 45% 55% / 60% 45% 55% 40%; }
  66% { border-radius: 60% 40% 55% 45% / 45% 60% 40% 55%; }
}`;
}
function bind(id, key, num) {
  const el = document.getElementById(id);
  el.addEventListener("input", () => { state[key] = num ? +el.value : el.value; apply(); });
}
bind("round", "round", true); bind("speed", "speed", true); bind("color", "color", false); bind("blur", "blur", true); bind("size", "size", true);
document.querySelectorAll("[data-preset]").forEach(b => b.onclick = () => {
  Object.assign(state, PRESETS[b.dataset.preset]);
  document.getElementById("round").value = state.round; document.getElementById("speed").value = state.speed;
  document.getElementById("color").value = state.color; document.getElementById("blur").value = state.blur; document.getElementById("size").value = state.size;
  apply();
});
async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); } catch (e) {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
  }
  const old = btn.textContent; btn.textContent = "✓ Copied!"; setTimeout(() => btn.textContent = old, 1500);
}
document.getElementById("copyBlob").onclick = e => copyText(document.getElementById("codeOut").textContent, e.currentTarget);
const SNIPPETS = {
  goo: `<svg width="0" height="0"><defs><filter id="goo">
  <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
  <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
  <feComposite in="SourceGraphic" in2="goo" operator="atop" />
</filter></defs></svg>
<!-- Apply with: style="filter:url(#goo)" on the container -->`,
  bg: `.liquid-bg { position: relative; overflow: hidden; background: #111827; }
.liquid-bg .drop { position: absolute; border-radius: 50%; opacity: .7;
  transition: transform 1s; }
/* Spawn .drop divs with random size/colour and animate them with JS on pointermove. */`,
};
document.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => copyText(SNIPPETS[b.dataset.copy], b));
document.getElementById("gooToggle").onclick = e => { document.querySelector(".goo-menu").classList.toggle("open"); e.currentTarget.textContent = document.querySelector(".goo-menu").classList.contains("open") ? "×" : "+"; };
// Liquid background: drifting drops that follow the pointer.
const bg = document.getElementById("liquidBg");
const drops = [];
for (let i = 0; i < 6; i++) {
  const d = document.createElement("div"); d.className = "drop";
  const s = 30 + Math.random() * 60;
  d.style.width = d.style.height = s + "px";
  d.style.background = ["#0ea5e9", "#7c3aed", "#ec4899"][i % 3];
  d.style.left = (10 + Math.random() * 70) + "%"; d.style.top = (10 + Math.random() * 60) + "%";
  bg.appendChild(d); drops.push(d);
}
bg.addEventListener("pointermove", e => {
  const r = bg.getBoundingClientRect();
  drops.forEach((d, i) => { const dx = (e.clientX - r.left - r.width / 2) * (0.1 + i * 0.05); const dy = (e.clientY - r.top - r.height / 2) * (0.1 + i * 0.05); d.style.transform = `translate(${dx}px, ${dy}px)`; });
});
apply();
