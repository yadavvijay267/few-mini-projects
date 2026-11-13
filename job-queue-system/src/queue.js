// Background Job Queue — in-memory queue with JSON persistence (jobs.json).
// Production path: swap the store for Redis + BullMQ (documented in docs/ARCHITECTURE.md).
// No external dependencies; Node built-ins only.
const fs = require('fs');
const path = require('path');
const DATA_FILE = process.env.JOBS_FILE || path.join(__dirname, '..', 'jobs.json');
const MAX_ATTEMPTS = 3;

class Queue {
  constructor() {
    this.jobs = [];
    this.handlers = {};
    this.timers = new Set();
    this.running = false;
    this.load();
  }
  load() {
    try { const raw = fs.readFileSync(DATA_FILE, 'utf8'); this.jobs = JSON.parse(raw); } catch { this.jobs = []; }
  }
  save() {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(this.jobs, null, 2)); } catch (e) { console.error('persist failed', e.message); }
  }
  register(type, handler) { this.handlers[type] = handler; }
  enqueue(type, payload, opts = {}) {
    if (!this.handlers[type] && !opts.allowUnknown) throw new Error('Unknown job type: ' + type);
    const job = {
      id: 'job_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      type, payload: payload || {},
      priority: opts.priority || 0,
      status: 'queued',
      attempts: 0, maxAttempts: opts.maxAttempts || MAX_ATTEMPTS,
      runAt: opts.delayMs ? Date.now() + opts.delayMs : Date.now(),
      repeatMs: opts.repeatMs || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastError: null, result: null, history: [],
    };
    this.jobs.push(job);
    this.jobs.sort((a, b) => b.priority - a.priority || a.runAt - b.runAt);
    this.save();
    return job;
  }
  get(id) { return this.jobs.find(j => j.id === id); }
  list(status) { return status ? this.jobs.filter(j => j.status === status) : [...this.jobs]; }
  counts() {
    const c = { queued: 0, running: 0, completed: 0, failed: 0, dead: 0 };
    for (const j of this.jobs) if (c[j.status] !== undefined) c[j.status]++;
    return c;
  }
  replayDead(id) {
    const job = this.get(id);
    if (!job || job.status !== 'dead') return null;
    job.status = 'queued'; job.attempts = 0; job.lastError = null; job.runAt = Date.now();
    job.history.push({ at: new Date().toISOString(), event: 'replayed from dead-letter' });
    this.save();
    return job;
  }
  // Exponential backoff: 1s, 2s, 4s, … (base 1000ms, capped at 30s)
  backoffMs(attempt) { return Math.min(30000, 1000 * Math.pow(2, attempt - 1)); }

  start(intervalMs = 250) {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      this.processDue().finally(() => {
        if (this.running) { const t = setTimeout(tick, intervalMs); this.timers.add(t); }
      });
    };
    tick();
  }
  async processDue() {
    const now = Date.now();
    const due = this.jobs.filter(j => j.status === 'queued' && j.runAt <= now)
      .sort((a, b) => b.priority - a.priority || a.runAt - b.runAt);
    for (const job of due) await this.runJob(job);
  }
  async runJob(job) {
    const handler = this.handlers[job.type];
    if (!handler) { job.status = 'dead'; job.lastError = 'No handler for type ' + job.type; this.save(); return; }
    job.status = 'running'; job.attempts++; job.updatedAt = new Date().toISOString(); this.save();
    try {
      const result = await handler(job.payload, job);
      job.status = 'completed'; job.result = result ?? null;
      job.history.push({ at: new Date().toISOString(), event: 'completed' });
      if (job.repeatMs) {
        const next = this.enqueue(job.type, job.payload, { priority: job.priority, maxAttempts: job.maxAttempts, delayMs: job.repeatMs, repeatMs: job.repeatMs });
        job.history.push({ at: new Date().toISOString(), event: 'repeat scheduled as ' + next.id });
      }
    } catch (err) {
      job.lastError = err.message;
      job.history.push({ at: new Date().toISOString(), event: 'attempt ' + job.attempts + ' failed: ' + err.message });
      if (job.attempts < job.maxAttempts) {
        job.status = 'queued';
        job.runAt = Date.now() + this.backoffMs(job.attempts);
      } else {
        job.status = 'dead'; // dead-letter queue
      }
    }
    job.updatedAt = new Date().toISOString();
    this.save();
  }
  async shutdown() {
    this.running = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    // Graceful shutdown: finish in-flight jobs — runJob is awaited in processDue;
    // wait a tick for any running job, then re-queue jobs stuck in 'running'.
    await new Promise(r => setTimeout(r, 300));
    for (const j of this.jobs) if (j.status === 'running') { j.status = 'queued'; j.runAt = Date.now(); }
    this.save();
  }
}
module.exports = { Queue, DATA_FILE };
