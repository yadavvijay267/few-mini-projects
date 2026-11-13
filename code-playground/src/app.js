// Code Playground — three-pane HTML/CSS/JS editor with sandboxed live preview.
// Console output is captured inside the iframe and forwarded to the parent via postMessage.
const htmlEd = document.getElementById('htmlEd');
const cssEd = document.getElementById('cssEd');
const jsEd = document.getElementById('jsEd');
const preview = document.getElementById('preview');
const consoleOut = document.getElementById('consoleOut');

function buildDocument(html, css, js) {
  const consoleShim = `<script>
    (function () {
      function send(level, args) {
        var text = args.map(function (a) {
          try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch (e) { return String(a); }
        }).join(' ');
        parent.postMessage({ type: 'console', level: level, text: text }, '*');
      }
      ['log','info','warn','error'].forEach(function (level) {
        var orig = console[level].bind(console);
        console[level] = function () { send(level, Array.prototype.slice.call(arguments)); orig.apply(null, arguments); };
      });
      window.addEventListener('error', function (e) { send('error', ['Uncaught: ' + e.message]); });
    })();
  <\/script>`;
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>'
    + html + consoleShim + '<script>' + js + '<\/script></body></html>';
}
function run() {
  preview.srcdoc = buildDocument(htmlEd.value, cssEd.value, jsEd.value);
}
let debounce;
[htmlEd, cssEd, jsEd].forEach(ed => ed.addEventListener('input', () => {
  clearTimeout(debounce);
  if (document.getElementById('autoRun').checked) debounce = setTimeout(run, 400);
}));
document.getElementById('runBtn').addEventListener('click', run);
window.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'console') return;
  const line = document.createElement('div');
  if (e.data.level === 'error') line.className = 'err';
  if (e.data.level === 'warn') line.className = 'warn';
  line.textContent = '[' + e.data.level + '] ' + e.data.text;
  consoleOut.appendChild(line);
  consoleOut.scrollTop = consoleOut.scrollHeight;
});
document.getElementById('clearConsoleBtn').addEventListener('click', () => { consoleOut.textContent = ''; });
// --- Snippets: localStorage save/load ---
const KEY = 'code-playground-snippets';
function loadSnippets() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function refreshSavedList() {
  const sel = document.getElementById('savedList');
  const names = Object.keys(loadSnippets());
  sel.innerHTML = '<option value="">Saved snippets…</option>' + names.map(n => `<option>${n}</option>`).join('');
}
document.getElementById('saveBtn').addEventListener('click', () => {
  const name = document.getElementById('snippetName').value.trim() || 'Untitled';
  const all = loadSnippets();
  all[name] = { html: htmlEd.value, css: cssEd.value, js: jsEd.value, savedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(all));
  refreshSavedList();
  document.getElementById('shareMsg').textContent = 'Saved "' + name + '"';
});
document.getElementById('savedList').addEventListener('change', (e) => {
  const s = loadSnippets()[e.target.value]; if (!s) return;
  htmlEd.value = s.html; cssEd.value = s.css; jsEd.value = s.js;
  document.getElementById('snippetName').value = e.target.value; run();
});
// --- Share: encode whole snippet into the URL hash (no backend, no account) ---
document.getElementById('shareBtn').addEventListener('click', () => {
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ html: htmlEd.value, css: cssEd.value, js: jsEd.value }))));
  const url = location.origin + location.pathname + '#snippet=' + payload;
  history.replaceState(null, '', '#snippet=' + payload);
  if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
  document.getElementById('shareMsg').textContent = 'Share link copied to clipboard (also in the address bar).';
});
(function loadFromHash() {
  const m = location.hash.match(/#snippet=(.+)/);
  if (!m) return;
  try {
    const s = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    htmlEd.value = s.html || ''; cssEd.value = s.css || ''; jsEd.value = s.js || '';
  } catch { /* ignore bad hash */ }
})();
refreshSavedList();
run();
if (typeof module !== 'undefined') module.exports = { buildDocument };
