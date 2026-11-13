// Job queue tests — real behaviour: enqueue, retry with backoff, delayed jobs, dead-letter + replay.
const assert = require('assert');
const fs = require('fs');
process.env.JOBS_FILE = require('path').join(__dirname, 'test-jobs.json');
const { Queue } = require('../src/queue');
try { fs.unlinkSync(process.env.JOBS_FILE); } catch {}

(async () => {
  const q = new Queue();
  let calls = 0;
  q.register('flaky', async () => { calls++; if (calls < 3) throw new Error('boom ' + calls); return { ok: true }; });
  q.register('slow', async () => 'done');
  q.register('dead', async () => { throw new Error('always'); });

  // 1. Enqueue + process success path
  const j1 = q.enqueue('slow', { a: 1 }, { priority: 5 });
  assert.strictEqual(j1.status, 'queued');
  await q.processDue();
  assert.strictEqual(q.get(j1.id).status, 'completed');
  assert.strictEqual(q.get(j1.id).result, 'done');

  // 2. Retry with exponential backoff: flaky fails twice, then succeeds.
  const j2 = q.enqueue('flaky', {});
  await q.processDue();
  assert.strictEqual(q.get(j2.id).status, 'queued', 'should be re-queued after failure 1');
  assert.ok(q.get(j2.id).runAt > Date.now(), 'backoff delay applied');
  assert.strictEqual(q.backoffMs(1), 1000); assert.strictEqual(q.backoffMs(2), 2000); assert.strictEqual(q.backoffMs(3), 4000);
  q.get(j2.id).runAt = Date.now(); await q.processDue();
  q.get(j2.id).runAt = Date.now(); await q.processDue();
  assert.strictEqual(q.get(j2.id).status, 'completed');
  assert.strictEqual(calls, 3);

  // 3. Delayed job does not run early.
  const j3 = q.enqueue('slow', {}, { delayMs: 60000 });
  await q.processDue();
  assert.strictEqual(q.get(j3.id).status, 'queued', 'delayed job must not run early');

  // 4. Dead-letter after max attempts + replay.
  const j4 = q.enqueue('dead', {}, { maxAttempts: 2 });
  await q.processDue();
  q.get(j4.id).runAt = Date.now(); await q.processDue();
  assert.strictEqual(q.get(j4.id).status, 'dead');
  assert.strictEqual(q.counts().dead, 1);
  const replayed = q.replayDead(j4.id);
  assert.ok(replayed && replayed.status === 'queued' && replayed.attempts === 0);

  // 5. Persistence: a fresh Queue instance reloads jobs from disk.
  const q2 = new Queue();
  assert.ok(q2.get(j1.id), 'jobs persist to JSON file');
  assert.strictEqual(q2.get(j1.id).status, 'completed');

  try { fs.unlinkSync(process.env.JOBS_FILE); } catch {}
  console.log('job-queue tests: all assertions passed');
})().catch(e => { console.error(e); process.exit(1); });
