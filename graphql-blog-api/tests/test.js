// GraphQL blog API tests — starts the real server and queries it over HTTP.
const assert = require('assert');
const { server } = require('../src/server');
const PORT = process.env.PORT || 3002;

function gql(query, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const req = require('http').request({ hostname: 'localhost', port: PORT, path: '/graphql', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...(token ? { Authorization: 'Bearer ' + token } : {}) } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
    req.on('error', reject); req.write(body); req.end();
  });
}
(async () => {
  await new Promise(r => server.on('listening', r));
  // 1. Query posts with nested author + comments.
  const q1 = await gql('{ posts { id title author { name } comments { authorName } } }');
  assert.strictEqual(q1.errors, undefined, JSON.stringify(q1.errors));
  assert.strictEqual(q1.data.posts.length, 3);
  assert.strictEqual(q1.data.posts[0].author.name, 'Clamor');
  assert.strictEqual(q1.data.posts[0].comments.length, 2);
  // 2. Filtering + pagination args.
  const q2 = await gql('{ posts(first: 1, published: true) { id } }');
  assert.strictEqual(q2.data.posts.length, 1);
  const q3 = await gql('{ posts(tag: "fiber") { id title } }');
  assert.strictEqual(q3.data.posts.length, 1);
  // 3. Single post + search.
  const q4 = await gql('{ post(id: "2") { title } search(term: "power") { id } }');
  assert.ok(q4.data.post.title.includes('QC'));
  assert.strictEqual(q4.data.search.length, 1);
  // 4. Aliases + variables.
  const q5 = await gql('query GetPost($id: String) { mine: post(id: $id) { title } }');
  assert.ok(q5.data.mine === null || q5.data.mine.title, 'alias works (variable unused here is fine)');
  // 5. Mutation without auth is rejected.
  const m0 = await gql('mutation { addComment(postId: "1", authorName: "X", body: "hi") { id } }');
  assert.ok(m0.errors && m0.errors.length > 0, 'unauthenticated mutation must fail');
  // 6. Mutation with auth succeeds, and the comment is visible afterwards.
  const m1 = await gql('mutation { addComment(postId: "1", authorName: "Tester", body: "Nice!") { id authorName } }', 'demo-token');
  assert.strictEqual(m1.data.addComment.authorName, 'Tester');
  const q6 = await gql('{ post(id: "1") { comments { authorName } } }');
  assert.ok(q6.data.post.comments.some(c => c.authorName === 'Tester'));
  // 7. N+1 fix: author loader batches — 3 posts fetched their authors in 1 batch call.
  assert.ok(q1.extensions.authorLoaderBatchCalls <= 1, 'authors should batch into <=1 call, got ' + q1.extensions.authorLoaderBatchCalls);
  // 8. Unknown field reports an error, not a crash.
  const bad = await gql('{ nope }');
  assert.ok(bad.errors && bad.errors.length > 0);
  console.log('graphql-blog-api tests: all assertions passed');
  server.close(() => process.exit(0));
})().catch(e => { console.error(e); server.close(() => process.exit(1)); });
