'use strict';
// API test: starts the real server on a test port and exercises endpoints.
const { spawn } = require('child_process');
const path = require('path');
const PORT = 5034;
const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(cond, name) { if (!cond) throw new Error('FAIL: ' + name); passed++; console.log('ok - ' + name); }
async function req(p, opts) {
  opts = opts || {};
  opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  const r = await fetch('http://localhost:' + PORT + p, opts);
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch (e) { j = null; }
  return { status: r.status, body: j, text: t };
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
(async () => {
  // Fresh seed on every run so tests are repeatable.
  try { require('fs').unlinkSync(path.join(ROOT, 'data.json')); } catch (e) {}
  const srv = spawn(process.execPath, [path.join(ROOT, 'src', 'server', 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }), cwd: ROOT, stdio: 'ignore'
  });
  try {
    let up = false;
    for (let i = 0; i < 40 && !up; i++) { await wait(250); try { const r = await req('/api/ping'); up = r.status === 200 && r.body && r.body.ok; } catch (e) {} }
    ok(up, 'server starts and /api/ping responds');
    const login = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'demo@example.com', password: 'demo1234' }) });
    ok(login.status === 200 && login.body.token, 'demo login works');
    const H = { Authorization: 'Bearer ' + login.body.token };
    const bad = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'demo@example.com', password: 'wrong' }) });
    ok(bad.status === 401, 'wrong password rejected (401)');
    const anon = await req('/api/courses');
    ok(anon.status === 401, 'unauthenticated API access rejected (401)');

    const dash = await req('/api/instructor/dashboard', { headers: H });
    ok(dash.status === 200 && dash.body.perCourse.some(c => c.courseId === 'c1' && c.enrolments >= 1), 'instructor dashboard aggregates enrolments per course');
    const certEarly = await req('/api/certificates/e1', { headers: H });
    ok(certEarly.status === 400, 'certificate refused before course completion (400)');
    const done = await req('/api/enrollments/e1/complete-lesson', { method: 'POST', headers: H, body: JSON.stringify({ lessonId: 'l3' }) });
    ok(done.status === 200 && done.body.progress === 100 && done.body.status === 'Completed', 'completing last lesson reaches 100% + Completed');
    const quiz = await req('/api/quizzes/q1/submit', { method: 'POST', headers: H, body: JSON.stringify({ enrollmentId: 'e1', answers: [0, 0] }) });
    ok(quiz.status === 201 && quiz.body.attempt.score === 100 && quiz.body.attempt.passed === 'Yes', 'quiz graded 100% for correct answers');
    const quizBad = await req('/api/quizzes/q1/submit', { method: 'POST', headers: H, body: JSON.stringify({ enrollmentId: 'e1', answers: [1, 1] }) });
    ok(quizBad.body.attempt.score === 0 && quizBad.body.attempt.passed === 'No', 'quiz graded 0% for wrong answers');
    const cert = await req('/api/certificates/e1', { headers: H });
    ok(cert.status === 200 && cert.body.token && cert.body.verifyUrl, 'signed certificate issued with verification URL');
    const verify = await req('/api/verify/' + encodeURIComponent(cert.body.token), { headers: H });
    ok(verify.status === 200 && verify.body.valid === true && verify.body.certificate.student === 'Ana Sharma', 'verification URL confirms the certificate');
    const tampered = await req('/api/verify/' + encodeURIComponent(cert.body.token.slice(0, -2) + 'xx'), { headers: H });
    ok(tampered.body.valid === false, 'tampered certificate token fails verification');
    const wrongLesson = await req('/api/enrollments/e2/complete-lesson', { method: 'POST', headers: H, body: JSON.stringify({ lessonId: 'l1' }) });
    ok(wrongLesson.status === 400, 'lesson from another course cannot count toward enrolment');

  } finally { srv.kill(); }
  console.log('ALL ' + passed + ' TESTS PASSED');
})().catch(e => { console.error(e.message); process.exit(1); });
