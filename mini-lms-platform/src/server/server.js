'use strict';
// Learning Management System (Mini LMS) — zero-dependency Node.js server (built-in http/crypto only).
// Persistence: JSON-file store (data.json, seeded from assets/seed.json).
// Production path: swap the load()/save() pair for PostgreSQL + Prisma;
// the REST shapes below stay the same.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4034;
const SECRET = process.env.SESSION_SECRET || 'mini-lms-platform-dev-secret-change-me';
const ROOT = path.join(__dirname, '..', '..');
const DATA = path.join(ROOT, 'data.json');
const SEED = path.join(ROOT, 'assets', 'seed.json');
const SCHEMA = {"courses": {"label": "Courses", "singular": "course", "fields": [{"key": "title", "label": "Title", "type": "text"}, {"key": "description", "label": "Description", "type": "textarea"}, {"key": "price", "label": "Price", "type": "number"}, {"key": "level", "label": "Level", "type": "select", "options": ["Beginner", "Intermediate", "Advanced"]}, {"key": "instructor", "label": "Instructor", "type": "text"}]}, "lessons": {"label": "Lessons", "singular": "lesson", "fields": [{"key": "courseId", "label": "Course ID", "type": "text"}, {"key": "title", "label": "Title", "type": "text"}, {"key": "contentType", "label": "Type", "type": "select", "options": ["video", "text"]}, {"key": "content", "label": "Content", "type": "textarea"}, {"key": "order", "label": "Order", "type": "number"}]}, "enrollments": {"label": "Enrolments", "singular": "enrolment", "fields": [{"key": "courseId", "label": "Course ID", "type": "text"}, {"key": "student", "label": "Student", "type": "text"}, {"key": "progress", "label": "Progress %", "type": "number"}, {"key": "status", "label": "Status", "type": "select", "options": ["Enrolled", "Completed"]}]}, "quizzes": {"label": "Quizzes", "singular": "quiz", "fields": [{"key": "courseId", "label": "Course ID", "type": "text"}, {"key": "title", "label": "Title", "type": "text"}, {"key": "questions", "label": "Questions (JSON: [{q, options[], answer}])", "type": "textarea"}]}, "quizAttempts": {"label": "Quiz attempts", "singular": "quiz attempt", "fields": [{"key": "enrollmentId", "label": "Enrolment ID", "type": "text"}, {"key": "quizId", "label": "Quiz ID", "type": "text"}, {"key": "score", "label": "Score", "type": "number"}, {"key": "passed", "label": "Passed", "type": "select", "options": ["Yes", "No"]}]}, "discussions": {"label": "Discussions", "singular": "discussion", "fields": [{"key": "lessonId", "label": "Lesson ID", "type": "text"}, {"key": "author", "label": "Author", "type": "text"}, {"key": "text", "label": "Comment", "type": "textarea"}]}};

let db = null;
function load() {
  if (fs.existsSync(DATA)) { db = JSON.parse(fs.readFileSync(DATA, 'utf8')); }
  else {
    db = JSON.parse(fs.readFileSync(SEED, 'utf8'));
    (db.users || []).forEach(u => {
      if (u.password && u.password.indexOf('plain:') === 0) {
        const s = crypto.randomBytes(8).toString('hex');
        u.salt = s;
        u.password = crypto.createHash('sha256').update(s + u.password.slice(6)).digest('hex');
      }
    });
    save();
  }
  Object.keys(SCHEMA).forEach(c => { if (!Array.isArray(db[c])) db[c] = []; });
  if (!Array.isArray(db.users)) db.users = [];
  return db;
}
function save() { fs.writeFileSync(DATA, JSON.stringify(db, null, 2)); }
load();
const sessions = new Map();
const uid = () => crypto.randomBytes(8).toString('hex');
const hash = (pw, salt) => crypto.createHash('sha256').update(salt + pw).digest('hex');
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => { d += c; });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); } });
  });
}
function authUser(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  return (t && sessions.has(t)) ? sessions.get(t) : null;
}
function serveStatic(res, file, ct) {
  const p = path.join(ROOT, 'src', 'client', file);
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': ct });
  fs.createReadStream(p).pipe(res);
}

function signCert(payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}
function verifyCert(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  const expect = crypto.createHmac('sha256', SECRET).update(parts[0]).digest('base64url');
  if (expect !== parts[1]) return null;
  try { return JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch (e) { return null; }
}

async function handleCustom(req, res, parts, parsed, user) {

  if (req.method === 'POST' && parts[1] === 'enrollments' && parts[3] === 'complete-lesson' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const enr = db.enrollments.find(e => e.id === parts[2]);
    if (!enr) return send(res, 404, { error: 'enrolment not found' }), true;
    const b = await readBody(req);
    const lesson = db.lessons.find(l => l.id === b.lessonId && l.courseId === enr.courseId);
    if (!lesson) return send(res, 400, { error: 'lesson does not belong to this course' }), true;
    if (!Array.isArray(enr.completedLessons)) enr.completedLessons = [];
    if (enr.completedLessons.indexOf(lesson.id) < 0) enr.completedLessons.push(lesson.id);
    const total = db.lessons.filter(l => l.courseId === enr.courseId).length;
    enr.progress = total ? Math.round((enr.completedLessons.length / total) * 100) : 0;
    if (enr.progress >= 100) enr.status = 'Completed';
    save();
    return send(res, 200, enr), true;
  }
  if (req.method === 'POST' && parts[1] === 'quizzes' && parts[3] === 'submit' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const quiz = db.quizzes.find(q => q.id === parts[2]);
    if (!quiz) return send(res, 404, { error: 'quiz not found' }), true;
    const b = await readBody(req);
    let qs = [];
    try { qs = JSON.parse(quiz.questions || '[]'); } catch (e) { qs = []; }
    const answers = Array.isArray(b.answers) ? b.answers : [];
    let correct = 0;
    qs.forEach((q, i) => { if (Number(answers[i]) === Number(q.answer)) correct++; });
    const score = qs.length ? Math.round((correct / qs.length) * 100) : 0;
    const attempt = { id: uid(), enrollmentId: b.enrollmentId || '', quizId: quiz.id, score: score, passed: score >= 60 ? 'Yes' : 'No', createdAt: new Date().toISOString() };
    db.quizAttempts.push(attempt); save();
    return send(res, 201, { attempt: attempt, correct: correct, total: qs.length }), true;
  }
  if (req.method === 'GET' && parts[1] === 'certificates' && parts.length === 3) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const enr = db.enrollments.find(e => e.id === parts[2]);
    if (!enr) return send(res, 404, { error: 'enrolment not found' }), true;
    if (enr.status !== 'Completed') return send(res, 400, { error: 'course not completed yet (progress ' + enr.progress + '%)' }), true;
    const course = db.courses.find(c => c.id === enr.courseId) || {};
    const cert = { student: enr.student, course: course.title || enr.courseId, instructor: course.instructor || '', completedAt: new Date().toISOString().slice(0, 10), enrollmentId: enr.id };
    const token = signCert(cert);
    return send(res, 200, { certificate: cert, token: token, verifyUrl: '/api/verify/' + token }), true;
  }
  if (req.method === 'GET' && parts[1] === 'verify' && parts.length === 3) {
    const payload = verifyCert(decodeURIComponent(parts[2]));
    if (!payload) return send(res, 200, { valid: false }), true;
    return send(res, 200, { valid: true, certificate: payload }), true;
  }
  if (req.method === 'GET' && parts[1] === 'instructor' && parts[2] === 'dashboard') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const perCourse = db.courses.map(c => {
      const enrs = db.enrollments.filter(e => e.courseId === c.id);
      const avg = enrs.length ? Math.round(enrs.reduce((s, e) => s + Number(e.progress || 0), 0) / enrs.length) : 0;
      return { courseId: c.id, title: c.title, lessons: db.lessons.filter(l => l.courseId === c.id).length, enrolments: enrs.length, completed: enrs.filter(e => e.status === 'Completed').length, avgProgress: avg };
    });
    return send(res, 200, { courses: db.courses.length, enrolments: db.enrollments.length, perCourse: perCourse }), true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const parts = u.pathname.split('/').filter(Boolean);
    if (req.method === 'GET' && u.pathname === '/') return serveStatic(res, 'index.html', 'text/html');
    if (req.method === 'GET' && u.pathname === '/app.js') return serveStatic(res, 'app.js', 'text/javascript');
    if (req.method === 'GET' && u.pathname === '/styles.css') return serveStatic(res, 'styles.css', 'text/css');
    if (parts[0] === 'api') {
      if (parts[1] === 'ping') return send(res, 200, { ok: true, app: 'mini-lms-platform' });
      if (parts[1] === 'auth') {
        if (req.method === 'POST' && parts[2] === 'register') {
          const b = await readBody(req);
          if (!b.email || !b.password) return send(res, 400, { error: 'email and password required' });
          if (db.users.find(x => x.email === b.email)) return send(res, 409, { error: 'email already registered' });
          const salt = crypto.randomBytes(8).toString('hex');
          const user = { id: uid(), name: b.name || b.email.split('@')[0], email: b.email, salt: salt, password: hash(b.password, salt), role: b.role || 'user', createdAt: new Date().toISOString() };
          db.users.push(user); save();
          const t = crypto.randomBytes(16).toString('hex'); sessions.set(t, user);
          return send(res, 201, { token: t, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        }
        if (req.method === 'POST' && parts[2] === 'login') {
          const b = await readBody(req);
          const user = db.users.find(x => x.email === b.email);
          if (!user || hash(b.password, user.salt) !== user.password) return send(res, 401, { error: 'invalid credentials' });
          const t = crypto.randomBytes(16).toString('hex'); sessions.set(t, user);
          return send(res, 200, { token: t, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        }
        if (req.method === 'GET' && parts[2] === 'me') {
          const user = authUser(req);
          if (!user) return send(res, 401, { error: 'unauthorized' });
          return send(res, 200, { user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        }
      }
      const user = authUser(req);
      const parsed = { query: Object.fromEntries(u.searchParams) };
      if (await handleCustom(req, res, parts, parsed, user)) return;
      if (!user) return send(res, 401, { error: 'unauthorized - please log in' });
      const coll = parts[1];
      if (!SCHEMA[coll]) return send(res, 404, { error: 'unknown collection' });
      if (req.method === 'GET' && parts.length === 2) {
        let rows = db[coll].slice();
        u.searchParams.forEach((v, k) => { rows = rows.filter(r => String(r[k] == null ? '' : r[k]) === v); });
        return send(res, 200, rows);
      }
      if (req.method === 'GET' && parts.length === 3) {
        const r = db[coll].find(x => x.id === parts[2]);
        return r ? send(res, 200, r) : send(res, 404, { error: 'not found' });
      }
      if (req.method === 'POST' && parts.length === 2) {
        const b = await readBody(req);
        const rec = Object.assign({ id: uid(), createdAt: new Date().toISOString() }, b);
        db[coll].push(rec);

        save();
        return send(res, 201, rec);
      }
      if (req.method === 'PUT' && parts.length === 3) {
        const b = await readBody(req);
        const r = db[coll].find(x => x.id === parts[2]);
        if (!r) return send(res, 404, { error: 'not found' });
        Object.assign(r, b, { updatedAt: new Date().toISOString() });

        save();
        return send(res, 200, r);
      }
      if (req.method === 'DELETE' && parts.length === 3) {
        const i = db[coll].findIndex(x => x.id === parts[2]);
        if (i < 0) return send(res, 404, { error: 'not found' });
        db[coll].splice(i, 1); save();
        return send(res, 200, { deleted: true });
      }
      return send(res, 404, { error: 'route not found' });
    }
    res.writeHead(404); res.end('not found');
  } catch (e) { console.error(e); send(res, 500, { error: String((e && e.message) || e) }); }
});
server.listen(PORT, () => console.log('mini-lms-platform listening on http://localhost:' + PORT));
module.exports = { server };
