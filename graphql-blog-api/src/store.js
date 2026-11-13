// In-memory blog store + a batching author loader (the DataLoader pattern).
// Seed data is original sample content about telecom, fiber design, and QC work.
const authors = [
  { id: '1', name: 'Clamor', bio: 'QC Engineer writing about fiber design and telecom.', email: 'author@example.invalid' },
  { id: '2', name: 'Guest Writer', bio: 'Occasional contributor on data centres and power.', email: 'guest@example.invalid' },
];
const posts = [
  { id: '1', authorId: '1', title: 'Fiber Design Basics: From Route Survey to Splicing', body: 'A practical walkthrough of fiber route planning, loss budgets, and QC checks.', tags: ['fiber', 'telecom'], published: true, createdAt: '2026-10-01' },
  { id: '2', authorId: '1', title: 'QC Checklists That Actually Catch Defects', body: 'How a short, honest checklist beats a long form nobody reads.', tags: ['qc', 'engineering'], published: true, createdAt: '2026-10-20' },
  { id: '3', authorId: '2', title: 'Data Centre Power: A Beginner Primer', body: 'UPS, PDU, and redundancy explained without jargon.', tags: ['datacentre', 'power'], published: false, createdAt: '2026-11-02' },
];
const comments = [
  { id: '1', postId: '1', authorName: 'Reader One', body: 'Clear explanation of loss budgets — thanks!', createdAt: '2026-10-02' },
  { id: '2', postId: '1', authorName: 'Reader Two', body: 'Would love a follow-up on splicing QC.', createdAt: '2026-10-03' },
];
let nextPostId = 4, nextCommentId = 3, nextAuthorId = 3;

// Batching loader: collects author ids requested during one execution tick and
// fetches them in a single pass. Without it, N posts = N author lookups (N+1).
// With it, N posts = 1 batched lookup. See README for the measured counts.
function createAuthorLoader() {
  let batchCalls = 0;
  let queue = null;
  function load(id) {
    if (!queue) {
      queue = new Map();
      queueMicrotask(() => {
        batchCalls++;
        const ids = [...queue.keys()];
        const found = new Map(authors.filter(a => ids.includes(a.id)).map(a => [a.id, a]));
        for (const [key, { resolve }] of queue) resolve(found.get(key) || null);
        queue = null;
      });
    }
    return new Promise(resolve => {
      if (queue.has(id)) { const prev = queue.get(id); queue.set(id, { resolve: (v) => { prev.resolve(v); resolve(v); } }); }
      else queue.set(id, { resolve });
    });
  }
  return { load, get batchCalls() { return batchCalls; } };
}
module.exports = { authors, posts, comments, createAuthorLoader,
  nextIds: () => ({ post: String(nextPostId++), comment: String(nextCommentId++), author: String(nextAuthorId++) }) };
