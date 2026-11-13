// Drag & Drop Form Builder — original vanilla JS implementation.
// State is a JSON schema: { title, fields: [{id,type,label,placeholder,required,options,validation}] }
const FIELD_DEFS = {
  text: { label: 'Text Input', placeholder: 'Enter text' },
  email: { label: 'Email', placeholder: 'you@example.com' },
  textarea: { label: 'Message', placeholder: 'Write something…' },
  select: { label: 'Choose an option', options: ['Option A', 'Option B', 'Option C'] },
  checkbox: { label: 'I agree' },
  radio: { label: 'Pick one', options: ['Choice 1', 'Choice 2'] },
  date: { label: 'Date' },
  file: { label: 'Upload a file' },
  number: { label: 'Number', placeholder: '0' },
};
let schema = { title: 'Contact Form', fields: [] };
let selectedId = null;
let counter = 0;
const canvas = document.getElementById('canvas');

function makeField(type) {
  counter += 1;
  const def = FIELD_DEFS[type];
  return { id: 'f' + Date.now() + '_' + counter, type, label: def.label,
    placeholder: def.placeholder || '', required: false,
    options: def.options ? [...def.options] : undefined,
    validation: type === 'email' ? { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' } : {} };
}
function render() {
  document.getElementById('count').textContent = schema.fields.length ? `(${schema.fields.length} fields)` : '';
  canvas.innerHTML = schema.fields.length ? '' : '<p class="empty">Drop fields here to build your form.</p>';
  schema.fields.forEach((f, i) => {
    const el = document.createElement('div');
    el.className = 'canvas-field' + (f.id === selectedId ? ' selected' : '');
    el.draggable = true; el.dataset.id = f.id;
    el.innerHTML = `<span class="tools">
      <button data-act="up" aria-label="Move up">↑</button><button data-act="down" aria-label="Move down">↓</button>
      <button data-act="dup" aria-label="Duplicate">⧉</button><button data-act="del" aria-label="Delete">✕</button></span>
      <strong>${i + 1}. ${escapeHtml(f.label)}</strong> <small>(${f.type}${f.required ? ', required' : ''})</small>`;
    el.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (act === 'del') { schema.fields = schema.fields.filter(x => x.id !== f.id); selectedId = null; }
      else if (act === 'dup') { const c = { ...f, id: 'f' + Date.now() + '_d', options: f.options ? [...f.options] : undefined }; schema.fields.splice(i + 1, 0, c); }
      else if (act === 'up' && i > 0) { [schema.fields[i - 1], schema.fields[i]] = [schema.fields[i], schema.fields[i - 1]]; }
      else if (act === 'down' && i < schema.fields.length - 1) { [schema.fields[i + 1], schema.fields[i]] = [schema.fields[i], schema.fields[i + 1]]; }
      else { selectedId = f.id; renderSettings(); }
      render(); syncJson();
    });
    el.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', JSON.stringify({ move: f.id })));
    canvas.appendChild(el);
  });
  syncJson();
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function syncJson() { document.getElementById('jsonOut').value = JSON.stringify(schema, null, 2); }

function renderSettings() {
  const f = schema.fields.find(x => x.id === selectedId);
  const body = document.getElementById('settingsBody');
  if (!f) { body.innerHTML = '<p>Select a field on the canvas to edit it.</p>'; return; }
  body.innerHTML = `
    <label>Label <input id="sLabel" value="${escapeHtml(f.label)}"></label>
    <label>Placeholder <input id="sPh" value="${escapeHtml(f.placeholder || '')}"></label>
    <label><input type="checkbox" id="sReq" ${f.required ? 'checked' : ''} style="width:auto"> Required</label>
    ${f.options ? `<label>Options (one per line)<textarea id="sOpts" rows="4">${escapeHtml(f.options.join('\n'))}</textarea></label>` : ''}
    <label>Min length <input id="sMin" type="number" value="${f.validation.minLength || ''}"></label>
    <label>Max length <input id="sMax" type="number" value="${f.validation.maxLength || ''}"></label>
    <label>Pattern (regex) <input id="sPat" value="${escapeHtml(f.validation.pattern || '')}"></label>`;
  const upd = () => {
    f.label = document.getElementById('sLabel').value;
    f.placeholder = document.getElementById('sPh').value;
    f.required = document.getElementById('sReq').checked;
    if (f.options) f.options = document.getElementById('sOpts').value.split('\n').map(s => s.trim()).filter(Boolean);
    f.validation.minLength = document.getElementById('sMin').value ? +document.getElementById('sMin').value : undefined;
    f.validation.maxLength = document.getElementById('sMax').value ? +document.getElementById('sMax').value : undefined;
    f.validation.pattern = document.getElementById('sPat').value || undefined;
    render(); // re-render keeps selection; settings inputs are rebuilt, so only re-render canvas via sync below
  };
  body.querySelectorAll('input,textarea').forEach(el => el.addEventListener('change', upd));
}
function validateField(f, value) {
  if (f.required && !String(value).trim()) return 'This field is required.';
  if (f.validation) {
    if (f.validation.minLength && String(value).length < f.validation.minLength) return `Minimum ${f.validation.minLength} characters.`;
    if (f.validation.maxLength && String(value).length > f.validation.maxLength) return `Maximum ${f.validation.maxLength} characters.`;
    if (f.validation.pattern && value && !(new RegExp(f.validation.pattern).test(value))) return 'Value does not match the required format.';
  }
  return '';
}
function renderPreview() {
  const sec = document.getElementById('previewSection');
  const form = document.getElementById('previewForm');
  sec.hidden = false;
  form.innerHTML = `<h3>${escapeHtml(schema.title || 'Form')}</h3>`;
  schema.fields.forEach(f => {
    const wrap = document.createElement('div');
    let input = '';
    if (f.type === 'textarea') input = `<textarea name="${f.id}" placeholder="${escapeHtml(f.placeholder)}"></textarea>`;
    else if (f.type === 'select') input = `<select name="${f.id}">${(f.options || []).map(o => `<option>${escapeHtml(o)}</option>`).join('')}</select>`;
    else if (f.type === 'checkbox') input = `<label><input type="checkbox" name="${f.id}" style="width:auto"> ${escapeHtml(f.label)}</label>`;
    else if (f.type === 'radio') input = (f.options || []).map(o => `<label><input type="radio" name="${f.id}" value="${escapeHtml(o)}" style="width:auto"> ${escapeHtml(o)}</label>`).join('<br>');
    else input = `<input type="${f.type}" name="${f.id}" placeholder="${escapeHtml(f.placeholder || '')}">`;
    if (f.type !== 'checkbox') wrap.innerHTML = `<label>${escapeHtml(f.label)}${f.required ? ' *' : ''}</label>${input}<div class="error" id="err-${f.id}"></div>`;
    else wrap.innerHTML = `${input}<div class="error" id="err-${f.id}"></div>`;
    form.appendChild(wrap);
  });
  const btn = document.createElement('button'); btn.type = 'submit'; btn.textContent = 'Submit'; form.appendChild(btn);
  form.onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(form); let ok = true;
    schema.fields.forEach(f => {
      const v = f.type === 'checkbox' ? (data.get(f.id) ? 'on' : '') : (data.get(f.id) || '');
      const err = validateField(f, v);
      document.getElementById('err-' + f.id).textContent = err;
      if (err) ok = false;
    });
    document.getElementById('previewResult').textContent = ok
      ? '✓ Valid! Submitted data: ' + JSON.stringify(Object.fromEntries(data.entries()))
      : 'Please fix the highlighted errors.';
  };
  sec.scrollIntoView({ behavior: 'smooth' });
}
function exportStandaloneHtml() {
  // Standout twist: export a standalone HTML file of the built form.
  const fieldsHtml = schema.fields.map(f => {
    const req = f.required ? ' required' : '';
    if (f.type === 'textarea') return `<label>${escapeHtml(f.label)}<textarea name="${f.id}"${req}></textarea></label>`;
    if (f.type === 'select') return `<label>${escapeHtml(f.label)}<select name="${f.id}"${req}>${(f.options || []).map(o => `<option>${escapeHtml(o)}</option>`).join('')}</select></label>`;
    return `<label>${escapeHtml(f.label)}<input type="${f.type}" name="${f.id}" placeholder="${escapeHtml(f.placeholder || '')}"${req}></label>`;
  }).join('\n');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(schema.title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:560px;margin:2rem auto;padding:0 1rem}label{display:block;margin:.8rem 0}input,select,textarea{width:100%;padding:.5rem;margin-top:.3rem}</style></head>
<body><h1>${escapeHtml(schema.title)}</h1><form onsubmit="event.preventDefault();alert('Submitted!')">${fieldsHtml}<button>Submit</button></form>
<!-- Form generated by drag-drop-form-builder. Schema: ${escapeHtml(JSON.stringify(schema))} --></body></html>`;
  download('form.html', html, 'text/html');
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  URL.revokeObjectURL(a.href);
}
// Palette drag & drop + click-to-add
document.querySelectorAll('.field-item').forEach(item => {
  item.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', JSON.stringify({ type: item.dataset.type })));
  item.addEventListener('click', () => { schema.fields.push(makeField(item.dataset.type)); render(); });
});
canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.classList.add('drag-over'); });
canvas.addEventListener('dragleave', () => canvas.classList.remove('drag-over'));
canvas.addEventListener('drop', (e) => {
  e.preventDefault(); canvas.classList.remove('drag-over');
  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
  if (data.type) schema.fields.push(makeField(data.type));
  else if (data.move) { const idx = schema.fields.findIndex(f => f.id === data.move); const [f] = schema.fields.splice(idx, 1); schema.fields.push(f); }
  render();
});
document.getElementById('formTitle').addEventListener('input', (e) => { schema.title = e.target.value; syncJson(); });
document.getElementById('previewBtn').addEventListener('click', renderPreview);
document.getElementById('exportJsonBtn').addEventListener('click', () => download('form-schema.json', JSON.stringify(schema, null, 2), 'application/json'));
document.getElementById('exportHtmlBtn').addEventListener('click', exportStandaloneHtml);
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  file.text().then(t => { const parsed = JSON.parse(t); if (!Array.isArray(parsed.fields)) throw new Error('Schema needs a fields array'); schema = parsed; selectedId = null; render(); renderSettings(); });
});
document.getElementById('clearBtn').addEventListener('click', () => { schema = { title: document.getElementById('formTitle').value, fields: [] }; selectedId = null; render(); renderSettings(); });
// Persist draft in localStorage
window.addEventListener('beforeunload', () => localStorage.setItem('form-builder-draft', JSON.stringify(schema)));
try { const d = localStorage.getItem('form-builder-draft'); if (d) { schema = JSON.parse(d); document.getElementById('formTitle').value = schema.title || ''; } } catch { /* ignore corrupt draft */ }
render();
if (typeof module !== 'undefined') module.exports = { validateField, makeField };
