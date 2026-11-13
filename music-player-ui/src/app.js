// Music player: tracks are melodies synthesized with the Web Audio API + AnalyserNode visualiser.
// Each track: a tempo and a sequence of [MIDI note, beats]. No audio files are needed.
const TRACKS = [
  { title: "Morning Fiber Run", artist: "Clamor", bpm: 112, hue: 199, notes: [[72, 1], [76, 1], [79, 1], [76, 1], [74, .5], [76, .5], [77, 2], [74, 1], [72, 1]] },
  { title: "Splice & Shine", artist: "Clamor", bpm: 96, hue: 280, notes: [[69, 1], [72, 1], [74, 1], [76, 2], [74, 1], [72, 1], [69, 2]] },
  { title: "Night Shift Groove", artist: "Clamor", bpm: 128, hue: 150, notes: [[60, .5], [60, .5], [63, 1], [65, 1], [67, 1], [65, .5], [63, .5], [60, 2]] },
  { title: "OTDR Blues", artist: "Clamor", bpm: 84, hue: 25, notes: [[67, 1.5], [65, .5], [64, 1], [62, 1], [60, 2], [62, 1], [64, 1]] },
  { title: "Duct Road Drive", artist: "Clamor", bpm: 120, hue: 340, notes: [[74, .5], [74, .5], [76, .5], [79, 1], [81, 1], [79, .5], [76, .5], [74, 2]] },
  { title: "Patch Panel Waltz", artist: "Clamor", bpm: 90, hue: 45, notes: [[72, 1], [71, 1], [72, 1], [76, 1], [74, 1], [72, 2], [69, 1], [72, 1]] },
];
const BEAT = t => 60 / t.bpm;
const dur = t => t.notes.reduce((a, [, b]) => a + b, 0) * BEAT(t);
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
let ctx = null, analyser = null, gain = null, oscNodes = [], timer = null;
let idx = 0, playing = false, startAt = 0, elapsed = 0, shuffle = false, repeat = 0; // 0 off, 1 all, 2 one
let queue = [];
const $ = id => document.getElementById(id);
const fmt = s => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
function ensureCtx() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = ctx.createAnalyser(); analyser.fftSize = 256;
  gain = ctx.createGain(); gain.gain.value = $("vol").value / 100;
  gain.connect(analyser); analyser.connect(ctx.destination);
  drawViz();
}
function stopOsc() { oscNodes.forEach(o => { try { o.stop(); } catch (e) {} }); oscNodes = []; }
function schedule(track, fromSec) {
  stopOsc();
  let t = ctx.currentTime + 0.05, played = 0;
  for (const [note, beats] of track.notes) {
    const len = beats * BEAT(track);
    if (played + len <= fromSec) { played += len; continue; }
    const start = Math.max(t, t + (fromSec - played));
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = midi(note);
    o2.type = "sine"; o2.frequency.value = midi(note) / 2;
    const on = start, off = start + (played + len - Math.max(fromSec, played));
    g.gain.setValueAtTime(0, on); g.gain.linearRampToValueAtTime(0.5, on + 0.02); g.gain.setValueAtTime(0.5, off - 0.05); g.gain.linearRampToValueAtTime(0, off);
    o.connect(g); o2.connect(g); g.connect(gain);
    o.start(on); o.stop(off); o2.start(on); o2.stop(off);
    oscNodes.push(o, o2); played += len;
  }
}
function play(i, fromSec = 0) {
  ensureCtx(); ctx.resume();
  idx = i; elapsed = fromSec; startAt = ctx.currentTime - fromSec;
  schedule(TRACKS[idx], fromSec); playing = true;
  $("playBtn").textContent = "⏸";
  $("nowTitle").textContent = TRACKS[idx].title;
  $("nowArtist").textContent = TRACKS[idx].artist + " · " + TRACKS[idx].bpm + " BPM";
  $("tTot").textContent = fmt(dur(TRACKS[idx]));
  $("cover").style.background = `linear-gradient(135deg,hsl(${TRACKS[idx].hue} 90% 55%),hsl(${(TRACKS[idx].hue + 60) % 360} 90% 55%))`;
  renderList();
  clearInterval(timer);
  timer = setInterval(() => {
    elapsed = ctx.currentTime - startAt;
    const total = dur(TRACKS[idx]);
    $("seek").value = Math.min(100, (elapsed / total) * 100);
    $("tCur").textContent = fmt(Math.min(elapsed, total));
    if (elapsed >= total) next(true);
  }, 200);
}
function pause() { if (!ctx) return; stopOsc(); playing = false; clearInterval(timer); $("playBtn").textContent = "▶"; }
function toggle() { playing ? pause() : play(idx, elapsed); }
function next(auto) {
  if (repeat === 2 && auto) return play(idx, 0);
  if (queue.length) { const q = queue.shift(); renderQueue(); return play(TRACKS.indexOf(q), 0); }
  let n = shuffle ? Math.floor(Math.random() * TRACKS.length) : (idx + 1) % TRACKS.length;
  if (auto && !shuffle && !repeat && idx === TRACKS.length - 1) { pause(); elapsed = 0; return; }
  play(n, 0);
}
function prev() { play((idx - 1 + TRACKS.length) % TRACKS.length, 0); }
function renderList() {
  const q = $("search").value.toLowerCase(), sort = $("sort").value;
  let list = TRACKS.map((t, i) => ({ ...t, i })).filter(t => (t.title + t.artist).toLowerCase().includes(q));
  if (sort === "title") list.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "bpm") list.sort((a, b) => b.bpm - a.bpm);
  if (sort === "dur") list.sort((a, b) => dur(b) - dur(a));
  const ul = $("trackList"); ul.innerHTML = "";
  list.forEach(t => {
    const li = document.createElement("li");
    li.className = t.i === idx && playing ? "playing" : "";
    li.innerHTML = `<span>${t.i === idx && playing ? "▶" : "♪"}</span><span class="t"><strong>${t.title}</strong><br><small>${t.artist} · ${t.bpm} BPM</small></span><span class="dur">${fmt(dur(t))}</span><button class="qbtn" title="Add to queue">+ Queue</button>`;
    li.onclick = e => { if (e.target.classList.contains("qbtn")) return; play(t.i, 0); };
    li.querySelector(".qbtn").onclick = () => { queue.push(TRACKS[t.i]); renderQueue(); };
    ul.appendChild(li);
  });
}
function renderQueue() {
  const ol = $("queueList"); ol.innerHTML = "";
  queue.forEach((t, i) => { const li = document.createElement("li"); li.textContent = t.title + " — " + t.artist; ol.appendChild(li); });
  if (!queue.length) ol.innerHTML = "<li>Queue is empty — use + Queue on any track.</li>";
}
function drawViz() {
  const c = $("viz"), x = c.getContext("2d");
  const data = new Uint8Array(analyser.frequencyBinCount);
  (function frame() {
    requestAnimationFrame(frame);
    x.clearRect(0, 0, c.width, c.height);
    if (!analyser) return;
    analyser.getByteFrequencyData(data);
    const bw = c.width / data.length;
    for (let i = 0; i < data.length; i++) {
      const h = (data[i] / 255) * c.height;
      x.fillStyle = `hsl(${200 + (i / data.length) * 120} 90% 55%)`;
      x.fillRect(i * bw, c.height - h, bw - 1, h);
    }
    if (!playing) { x.fillStyle = "#64748b"; x.font = "16px sans-serif"; x.fillText("Press play — the visualiser draws live from the Web Audio analyser node.", 16, 24); }
  })();
}
$("playBtn").onclick = toggle;
$("nextBtn").onclick = () => next(false);
$("prevBtn").onclick = prev;
$("shuffleBtn").onclick = e => { shuffle = !shuffle; e.currentTarget.classList.toggle("on", shuffle); };
$("repeatBtn").onclick = e => { repeat = (repeat + 1) % 3; e.currentTarget.classList.toggle("on", repeat > 0); e.currentTarget.textContent = repeat === 2 ? "🔂" : "🔁"; e.currentTarget.title = ["Repeat off", "Repeat all", "Repeat one"][repeat]; };
$("vol").addEventListener("input", e => { if (gain) gain.gain.value = e.target.value / 100; });
$("seek").addEventListener("change", e => { if (!ctx) return; const total = dur(TRACKS[idx]); play(idx, (e.target.value / 100) * total); });
$("search").addEventListener("input", renderList);
$("sort").addEventListener("change", renderList);
$("clearQueue").onclick = () => { queue = []; renderQueue(); };
$("miniBtn").onclick = () => { document.body.classList.toggle("mini"); $("miniBtn").textContent = document.body.classList.contains("mini") ? "Full player mode" : "Mini-player mode"; };
document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  if (e.code === "Space") { e.preventDefault(); toggle(); }
  if (e.code === "ArrowRight") { if (ctx) play(idx, Math.min(elapsed + 5, dur(TRACKS[idx]))); }
  if (e.code === "ArrowLeft") { if (ctx) play(idx, Math.max(0, elapsed - 5)); }
  if (e.code === "ArrowUp") { e.preventDefault(); $("vol").value = Math.min(100, +$("vol").value + 10); $("vol").dispatchEvent(new Event("input")); }
  if (e.code === "ArrowDown") { e.preventDefault(); $("vol").value = Math.max(0, +$("vol").value - 10); $("vol").dispatchEvent(new Event("input")); }
  if (e.code === "KeyN") next(false);
});
$("tTot").textContent = fmt(dur(TRACKS[0]));
renderList(); renderQueue(); drawViz();
