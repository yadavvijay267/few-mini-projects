// Real-time chat UI: rooms, simulated live feed, typing indicator, read receipts, reactions, replies, search.
const ME = "Clamor";
const PEOPLE = ["Asha", "Rohan", "Meera", "Dev"];
const ROOMS = [
  { id: "general", name: "# general", desc: "Team-wide updates" },
  { id: "fiber", name: "# fiber-ops", desc: "Field work & QC" },
  { id: "random", name: "# random", desc: "Off-topic" },
];
const REPLIES = ["On it — will update the sheet by lunch.", "OTDR trace looks clean on this span.", "Can you share the route map link?", "Agreed, let's close this today.", "Nice catch, thanks!", "Checking with the site lead now."];
const KEY = "chat-ui-v1";
let state = load(), current = ROOMS[0].id, replyTo = null, unreadAnchor = null;
function seed() {
  const now = Date.now();
  const m = (room, who, text, mins, ticks) => ({ id: room + mins + who, room, who, text, ts: now - mins * 60000, ticks: ticks ?? 2, reactions: {}, replyTo: null });
  return { rooms: { general: [m("general", "Asha", "Morning all — weekly plan is in the drive.", 90), m("general", "Rohan", "Splicing at Sector 62 starts at 10.", 60, 2), m("general", ME, "I'll bring the OTDR kit.", 55, 2)],
    fiber: [m("fiber", "Meera", "Span 14 loss is 0.04 dB — within budget.", 120), m("fiber", "Dev", "Photos from the closure are uploaded.", 30, 1)],
    random: [m("random", "Rohan", "Anyone tried the new dosa place near the metro?", 200)] } };
}
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.rooms) return s; } catch (e) {} return seed(); }
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
const roomList = document.getElementById("roomList"), msgsEl = document.getElementById("messages");
function unread(roomId) { return state.rooms[roomId].filter(m => m.who !== ME && m.ticks < 2).length; }
function renderRooms() {
  roomList.innerHTML = "";
  ROOMS.forEach(r => {
    const u = unread(r.id), el = document.createElement("div");
    el.className = "room" + (r.id === current ? " active" : "");
    el.innerHTML = `<span>${r.name}<br><small>${r.desc}</small></span>${u ? `<span class="badge">${u}</span>` : ""}`;
    el.onclick = () => { current = r.id; markRead(); renderAll(); document.getElementById("sidebar").classList.remove("open"); };
    roomList.appendChild(el);
  });
}
function renderMessages(highlightId) {
  const room = ROOMS.find(r => r.id === current);
  document.getElementById("roomName").textContent = room.name;
  document.getElementById("roomMeta").textContent = room.desc + " · " + PEOPLE.length + " members online";
  msgsEl.innerHTML = "";
  state.rooms[current].forEach(m => {
    const el = document.createElement("div");
    el.className = "msg" + (m.who === ME ? " me" : ""); el.dataset.id = m.id;
    if (highlightId === m.id) el.classList.add("search-hit");
    const replied = m.replyTo ? state.rooms[current].find(x => x.id === m.replyTo) : null;
    el.innerHTML = `${m.who === ME ? "" : `<span class="who">${m.who}</span>`}
      ${replied ? `<div class="reply-to">↩ ${replied.who}: ${escapeHtml(replied.text.slice(0, 60))}</div>` : ""}
      <span>${escapeHtml(m.text)}</span>
      <span class="time">${new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      ${m.who === ME ? `<span class="ticks">${m.ticks === 2 ? "✓✓" : "✓"}</span>` : ""}
      <div class="reactions">${Object.entries(m.reactions).map(([e, n]) => `<button class="react" data-e="${e}">${e} ${n}</button>`).join("")}<button class="react" data-e="add">+ react</button><button class="react" data-e="reply">↩ reply</button></div>`;
    el.querySelectorAll(".react").forEach(b => b.onclick = () => {
      const e = b.dataset.e;
      if (e === "reply") { replyTo = m.id; document.getElementById("msgInput").placeholder = "Replying to " + m.who + "..."; document.getElementById("msgInput").focus(); return; }
      const emoji = e === "add" ? prompt("Emoji to react with:", "👍") : e;
      if (!emoji) return;
      m.reactions[emoji] = (m.reactions[emoji] || 0) + 1; save(); renderMessages();
    });
    msgsEl.appendChild(el);
  });
  msgsEl.scrollTop = msgsEl.scrollHeight;
  const u = unread(current);
  document.getElementById("jumpUnread").classList.toggle("hidden", !u);
}
function markRead() { state.rooms[current].forEach(m => { if (m.who !== ME) m.ticks = 2; }); save(); }
function renderAll() { renderRooms(); renderMessages(); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
document.getElementById("composer").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("msgInput"), text = input.value.trim();
  if (!text) return;
  state.rooms[current].push({ id: "m" + Date.now(), room: current, who: ME, text, ts: Date.now(), ticks: 1, reactions: {}, replyTo });
  replyTo = null; input.value = ""; input.placeholder = "Message..."; save(); renderAll();
  simulateReply();
});
function simulateReply() {
  const who = PEOPLE[Math.floor(Math.random() * PEOPLE.length)];
  const typing = document.getElementById("typing");
  setTimeout(() => { typing.textContent = who + " is typing..."; typing.classList.remove("hidden"); }, 900);
  setTimeout(() => {
    typing.classList.add("hidden");
    state.rooms[current].push({ id: "m" + Date.now() + "r", room: current, who, text: REPLIES[Math.floor(Math.random() * REPLIES.length)], ts: Date.now(), ticks: 0, reactions: {}, replyTo: null });
    save(); renderAll();
  }, 2600);
}
// Ambient simulated traffic in other rooms, so unread badges move.
setInterval(() => {
  if (Math.random() > 0.5) return;
  const other = ROOMS.filter(r => r.id !== current);
  const r = other[Math.floor(Math.random() * other.length)];
  state.rooms[r.id].push({ id: "m" + Date.now() + "a", room: r.id, who: PEOPLE[Math.floor(Math.random() * PEOPLE.length)], text: REPLIES[Math.floor(Math.random() * REPLIES.length)], ts: Date.now(), ticks: 0, reactions: {}, replyTo: null });
  save(); renderRooms();
}, 45000);
document.getElementById("jumpUnread").onclick = () => {
  const first = state.rooms[current].find(m => m.who !== ME && m.ticks < 2);
  if (first) { renderMessages(first.id); document.querySelector(`[data-id="${first.id}"]`)?.scrollIntoView({ block: "center" }); }
  markRead(); renderRooms();
};
document.getElementById("msgSearch").addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) { renderMessages(); return; }
  for (const r of ROOMS) {
    const hit = state.rooms[r.id].find(m => m.text.toLowerCase().includes(q));
    if (hit) { current = r.id; renderAll(); renderMessages(hit.id); document.querySelector(`[data-id="${hit.id}"]`)?.scrollIntoView({ block: "center" }); return; }
  }
});
const EMOJIS = ["😀", "😂", "👍", "❤️", "🎉", "🔥", "👏", "🙏"];
const bar = document.getElementById("emojiBar");
EMOJIS.forEach(e => { const b = document.createElement("button"); b.textContent = e; b.onclick = () => { document.getElementById("msgInput").value += e; document.getElementById("msgInput").focus(); }; bar.appendChild(b); });
document.getElementById("emojiBtn").onclick = () => bar.classList.toggle("hidden");
document.getElementById("menuBtn").onclick = () => document.getElementById("sidebar").classList.toggle("open");
msgsEl.addEventListener("scroll", () => { if (msgsEl.scrollTop + msgsEl.clientHeight > msgsEl.scrollHeight - 80) markRead(); });
renderAll();
