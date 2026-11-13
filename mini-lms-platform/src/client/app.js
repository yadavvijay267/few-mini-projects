'use strict';
// Generic SPA: renders one tab per collection from window.SCHEMA, plus a
// project-specific "standout" panel driven by window.CUSTOM_TAB.
const SCHEMA = window.SCHEMA;
let token = localStorage.getItem('token') || '';
let me = null;
const $ = s => document.querySelector(s);
async function api(path, opts) {
  opts = opts || {};
  opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (token) opts.headers.Authorization = 'Bearer ' + token;
  const r = await fetch(path, opts);
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch (e) { j = { raw: t }; }
  if (!r.ok) throw new Error((j && j.error) || ('HTTP ' + r.status));
  return j;
}
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function fieldInput(f, val) {
  val = val == null ? '' : val;
  if (f.type === 'select') return '<select name="' + f.key + '">' + f.options.map(o => '<option value="' + esc(o) + '"' + (String(val) === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
  if (f.type === 'textarea') return '<textarea name="' + f.key + '" placeholder="' + esc(f.label) + '">' + esc(val) + '</textarea>';
  return '<input name="' + f.key + '" type="' + (f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text') + '" step="any" placeholder="' + esc(f.label) + '" value="' + esc(val) + '">';
}
let currentTab = Object.keys(SCHEMA)[0];
function renderTabs() {
  const tabs = Object.keys(SCHEMA).map(c => '<button data-tab="' + c + '" class="' + (c === currentTab ? 'active' : '') + '">' + esc(SCHEMA[c].label) + '</button>').join('');
  $('#tabs').innerHTML = tabs;
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { currentTab = b.dataset.tab; renderTabs(); renderPanel(); });
}
async function renderPanel() {
  const coll = currentTab, meta = SCHEMA[coll];
  let rows = [];
  try { rows = await api('/api/' + coll); } catch (e) { $('#panel').innerHTML = '<p>Log in to load data (' + esc(e.message) + ').</p>'; return; }
  const cols = meta.fields.map(f => '<th>' + esc(f.label) + '</th>').join('');
  const body = rows.map(r => '<tr>' + meta.fields.map(f => '<td>' + esc(r[f.key]) + '</td>').join('') +
    '<td><button data-edit="' + r.id + '">Edit</button> <button data-del="' + r.id + '" class="secondary">Delete</button></td></tr>').join('');
  const form = '<form id="add-form">' + meta.fields.map(f => fieldInput(f)).join('') + '<button type="submit">Add ' + esc(meta.singular) + '</button></form>';
  $('#panel').innerHTML = '<h2>' + esc(meta.label) + '</h2>' + form +
    '<table><thead><tr>' + cols + '<th>Actions</th></tr></thead><tbody>' + (body || '<tr><td colspan="99" class="muted">No records yet.</td></tr>') + '</tbody></table>';
  $('#add-form').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target), data = {};
    meta.fields.forEach(f => { data[f.key] = fd.get(f.key); if (f.type === 'number' && data[f.key] !== '') data[f.key] = Number(data[f.key]); });
    await api('/api/' + coll, { method: 'POST', body: JSON.stringify(data) });
    renderPanel();
  };
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await api('/api/' + coll + '/' + b.dataset.del, { method: 'DELETE' }); renderPanel(); });
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => {
    const r = rows.find(x => x.id === b.dataset.edit);
    const updates = {};
    for (const f of meta.fields) {
      const v = prompt('Set ' + f.label + ' (current: ' + (r[f.key] == null ? '' : r[f.key]) + ')', r[f.key] == null ? '' : r[f.key]);
      if (v === null) return;
      updates[f.key] = f.type === 'number' && v !== '' ? Number(v) : v;
    }
    await api('/api/' + coll + '/' + r.id, { method: 'PUT', body: JSON.stringify(updates) });
    renderPanel();
  });
}
async function refreshAuth() {
  $('#btn-logout').hidden = !token;
  if (!token) { $('#auth-status').textContent = 'Not signed in.'; return; }
  try { const r = await api('/api/auth/me'); me = r.user; $('#auth-status').textContent = 'Signed in as ' + me.name + ' (' + me.email + ').'; }
  catch (e) { token = ''; localStorage.removeItem('token'); $('#auth-status').textContent = 'Session expired — please log in.'; }
}
$('#btn-login').onclick = async () => {
  try {
    const r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: $('#auth-email').value, password: $('#auth-pass').value }) });
    token = r.token; localStorage.setItem('token', token); await refreshAuth(); renderPanel(); if (window.CUSTOM_TAB) window.CUSTOM_TAB.run();
  } catch (e) { $('#auth-status').textContent = 'Login failed: ' + e.message; }
};
$('#btn-register').onclick = async () => {
  try {
    const r = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: $('#auth-name').value, email: $('#auth-email').value, password: $('#auth-pass').value }) });
    token = r.token; localStorage.setItem('token', token); await refreshAuth(); renderPanel();
  } catch (e) { $('#auth-status').textContent = 'Register failed: ' + e.message; }
};
$('#btn-logout').onclick = () => { token = ''; me = null; localStorage.removeItem('token'); refreshAuth(); renderPanel(); };
refreshAuth().then(() => { renderTabs(); renderPanel(); if (window.CUSTOM_TAB) window.CUSTOM_TAB.run(); });
