// Demo job handlers — realistic background work, no external services.
const handlers = {
  // Simulated email send (fails if payload.failTimes remains).
  async sendEmail(payload) {
    await sleep(120);
    if (payload.failTimes > 0) { payload.failTimes--; throw new Error('SMTP transient failure (simulated)'); }
    return { sentTo: payload.to, subject: payload.subject || '(no subject)' };
  },
  // Simulated report generation.
  async generateReport(payload) {
    await sleep(200);
    const rows = payload.rows || 10;
    return { report: payload.name || 'report', rows, generatedAt: new Date().toISOString() };
  },
  // Simulated image processing.
  async processImage(payload) {
    await sleep(150);
    return { file: payload.file, thumbnails: ['small', 'medium', 'large'] };
  },
  // A job that always fails — useful for demonstrating the dead-letter queue.
  async alwaysFail() { await sleep(50); throw new Error('Deliberate failure'); },
};
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
module.exports = handlers;
