// Voice-controlled dashboard: Web Speech API + typed-command fallback.
// Command matching is a pure function (matchCommand) so it is unit-testable.
const COMMANDS = [
  { pattern: /show (sales|users|revenue)/, action: (m) => ({ type: "panel", panel: m[1] }) },
  { pattern: /next (panel|slide)/, action: () => ({ type: "next" }) },
  { pattern: /(previous|prev) (panel|slide)/, action: () => ({ type: "prev" }) },
  { pattern: /dark mode/, action: () => ({ type: "theme", dark: true }) },
  { pattern: /light mode/, action: () => ({ type: "theme", dark: false }) },
  { pattern: /read (values|numbers|stats)/, action: () => ({ type: "read" }) },
  { pattern: /stop listening/, action: () => ({ type: "stop" }) },
];
const PANELS = ["sales", "users", "revenue"];
function matchCommand(text) {
  const t = text.toLowerCase().trim();
  for (const c of COMMANDS) { const m = t.match(c.pattern); if (m) return c.action(m); }
  return null;
}
function didYouMean(text) {
  // cheap suggestion: closest command phrase by shared words
  const phrases = ["show sales", "show users", "show revenue", "next panel", "previous panel", "dark mode", "light mode", "read values", "stop listening"];
  const words = new Set(text.toLowerCase().split(/\W+/));
  let best = null, bestScore = 0;
  for (const p of phrases) {
    const score = p.split(" ").filter((w) => words.has(w)).length;
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return bestScore > 0 ? best : null;
}
const $ = (id) => document.getElementById(id);
const state = { panel: "sales", listening: false };
function showPanel(name) {
  state.panel = name;
  document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === name));
}
function setTheme(dark) { document.body.classList.toggle("dark", dark); $("theme").textContent = dark ? "☀️ Light mode" : "🌙 Dark mode"; }
function readValues() {
  const text = `Sales ${$("v-sales").textContent}. Users ${$("v-users").textContent}. Revenue ${$("v-revenue").textContent}.`;
  if ("speechSynthesis" in window) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(text)); }
  $("transcript").textContent = "🔊 " + text;
}
function runCommand(text, confidence) {
  $("transcript").textContent = `Heard: "${text}"`;
  $("confidence").textContent = confidence != null ? Math.round(confidence * 100) + "%" : "typed (no confidence)";
  const cmd = matchCommand(text);
  $("didyoumean").textContent = "";
  if (!cmd) {
    const guess = didYouMean(text);
    $("didyoumean").textContent = guess ? `Did you mean "${guess}"?` : "Command not recognised — try one from the list.";
    return false;
  }
  if (cmd.type === "panel") showPanel(cmd.panel);
  else if (cmd.type === "next") showPanel(PANELS[(PANELS.indexOf(state.panel) + 1) % PANELS.length]);
  else if (cmd.type === "prev") showPanel(PANELS[(PANELS.indexOf(state.panel) + PANELS.length - 1) % PANELS.length]);
  else if (cmd.type === "theme") setTheme(cmd.dark);
  else if (cmd.type === "read") readValues();
  else if (cmd.type === "stop") stopListening();
  return true;
}
// --- charts (Chart.js if available; values are in the DOM regardless) ---
function drawCharts() {
  if (!window.Chart) return;
  const mk = (id, label, data, color) => new Chart(document.getElementById(id), { type: "line",
    data: { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], datasets: [{ label, data, borderColor: color, fill: false }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
  mk("chart-sales", "Sales", [4200, 5800, 5100, 6900, 7300, 8100, 6700], "#0ea5e9");
  mk("chart-users", "Users", [900, 1100, 1050, 1300, 1250, 1400, 1350], "#059669");
  mk("chart-revenue", "Revenue", [12000, 15000, 14200, 17800, 19000, 21000, 18400], "#ea580c");
}
drawCharts();
// --- speech recognition ---
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
$("support").textContent = SR
  ? "Speech recognition is available in this browser."
  : "Speech recognition is NOT available in this browser — use the typed command box below (it works offline).";
function startListening() {
  if (!SR) { $("transcript").textContent = "Speech recognition is not supported here — type a command below."; return; }
  rec = new SR(); rec.lang = "en-US"; rec.interimResults = true; rec.continuous = true;
  rec.onresult = (e) => {
    const res = e.results[e.results.length - 1];
    if (res.isFinal) runCommand(res[0].transcript, res[0].confidence);
    else $("transcript").textContent = `Hearing: "${res[0].transcript}"…`;
  };
  rec.onerror = (e) => { $("transcript").textContent = "Microphone error: " + e.error + ". Check permission and try again."; stopListening(); };
  rec.onend = () => { if (state.listening) rec.start(); };
  rec.start(); state.listening = true;
  $("mic").textContent = "⏹ Stop listening"; $("mic").classList.add("listening");
}
function stopListening() {
  state.listening = false;
  if (rec) { try { rec.stop(); } catch { /* already stopped */ } }
  $("mic").textContent = "🎙 Start listening"; $("mic").classList.remove("listening");
}
$("mic").addEventListener("click", () => (state.listening ? stopListening() : startListening()));
$("read").addEventListener("click", readValues);
$("theme").addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));
$("typed-form").addEventListener("submit", (e) => { e.preventDefault(); const t = $("typed").value; if (t.trim()) runCommand(t, null); $("typed").value = ""; });
