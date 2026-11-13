// Minimal GraphQL parser + executor, written from scratch (Node built-ins only).
// Supports: query/mutation operations, named operations, variables ($var),
// arguments (strings, ints, booleans, variables), nested selection sets,
// field aliases, and __typename. Returns { data, errors?, extensions? }.
function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c) || c === ',') { i++; continue; }
    if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if ('{}():!'.includes(c)) { tokens.push({ type: c }); i++; continue; }
    if (c === '$') { const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i + 1)); tokens.push({ type: 'var', value: m[0] }); i += 1 + m[0].length; continue; }
    if (c === '"') { let j = i + 1, s = ''; while (j < src.length && src[j] !== '"') { if (src[j] === '\\') { s += src[++j]; } else s += src[j]; j++; } tokens.push({ type: 'string', value: s }); i = j + 1; continue; }
    const m = /^-?\d+/.exec(src.slice(i));
    if (m) { tokens.push({ type: 'number', value: Number(m[0]) }); i += m[0].length; continue; }
    const w = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (w) { tokens.push({ type: 'name', value: w[0] }); i += w[0].length; continue; }
    throw new Error('Unexpected character: ' + c);
  }
  tokens.push({ type: 'eof' });
  return tokens;
}
class Parser {
  constructor(tokens) { this.t = tokens; this.p = 0; }
  peek() { return this.t[this.p]; }
  next() { return this.t[this.p++]; }
  expect(type) { const tok = this.next(); if (tok.type !== type) throw new Error(`Expected ${type}, got ${tok.type}`); return tok; }
  parseDocument() {
    const defs = [];
    while (this.peek().type !== 'eof') defs.push(this.parseOperation());
    return defs;
  }
  parseOperation() {
    let op = 'query', name = null;
    if (this.peek().type === 'name' && ['query', 'mutation'].includes(this.peek().value)) { op = this.next().value; }
    if (this.peek().type === 'name') name = this.next().value;
    const variables = {};
    if (this.peek().type === '(') {
      // Variable definitions, e.g. ($id: String, $n: Int = 3) — skip balanced parens;
      // actual values arrive in the request body's `variables` object.
      let depth = 0;
      do { const tok = this.next(); if (tok.type === '(') depth++; if (tok.type === ')') depth--; } while (depth > 0);
    }
    const selectionSet = this.parseSelectionSet();
    return { op, name, variables, selectionSet };
  }
  parseSelectionSet() {
    this.expect('{');
    const fields = [];
    while (this.peek().type !== '}') fields.push(this.parseField());
    this.expect('}');
    return fields;
  }
  parseField() {
    let alias = null, name = this.expect('name').value;
    if (this.peek().type === ':' ) { this.next(); alias = name; name = this.expect('name').value; }
    const args = {};
    if (this.peek().type === '(') {
      this.next();
      while (this.peek().type !== ')') {
        const key = this.expect('name').value; this.expect(':'); args[key] = this.parseValue();
      }
      this.expect(')');
    }
    let selectionSet = null;
    if (this.peek().type === '{') selectionSet = this.parseSelectionSet();
    return { alias, name, args, selectionSet };
  }
  parseValue() {
    const tok = this.next();
    if (tok.type === 'string' || tok.type === 'number') return tok.value;
    if (tok.type === 'var') return { __var: tok.value };
    if (tok.type === 'name') { if (tok.value === 'true') return true; if (tok.value === 'false') return false; if (tok.value === 'null') return null; return tok.value; }
    throw new Error('Unexpected value token: ' + tok.type);
  }
}
function resolveVars(value, variables) {
  if (value && typeof value === 'object' && value.__var) return variables[value.__var];
  return value;
}

// --- Resolvers over the in-memory store ---
const { posts, authors, comments, createAuthorLoader, nextIds } = require('./store');
const { EventEmitter } = require('events');
const commentEvents = new EventEmitter();

function postShape(p) { return { ...p, authorId: p.authorId }; }
const rootResolvers = {
  posts: ({ first, tag, published }) => {
    let out = posts.map(postShape);
    if (published !== undefined) out = out.filter(p => p.published === published);
    if (tag) out = out.filter(p => p.tags.includes(tag));
    if (first !== undefined) out = out.slice(0, first);
    return out;
  },
  post: ({ id }) => { const p = posts.find(x => x.id === id); return p ? postShape(p) : null; },
  authors: () => authors,
  author: ({ id }) => authors.find(a => a.id === id) || null,
  search: ({ term }) => posts.filter(p => (p.title + ' ' + p.body).toLowerCase().includes(String(term).toLowerCase())).map(postShape),
};
const mutationResolvers = {
  createPost: ({ input }) => {
    if (!input || !input.title || !input.authorId) throw new Error('createPost requires input { title, authorId }');
    const p = { id: nextIds().post, authorId: input.authorId, title: input.title, body: input.body || '', tags: input.tags || [], published: input.published ?? false, createdAt: new Date().toISOString().slice(0, 10) };
    posts.push(p); return postShape(p);
  },
  updatePost: ({ id, input }) => {
    const p = posts.find(x => x.id === id); if (!p) throw new Error('Post not found: ' + id);
    Object.assign(p, input || {}); return postShape(p);
  },
  deletePost: ({ id }) => { const i = posts.findIndex(x => x.id === id); if (i < 0) return false; posts.splice(i, 1); return true; },
  addComment: ({ postId, authorName, body }) => {
    if (!posts.find(x => x.id === postId)) throw new Error('Post not found: ' + postId);
    const c = { id: nextIds().comment, postId, authorName, body, createdAt: new Date().toISOString().slice(0, 10) };
    comments.push(c); commentEvents.emit('comment', c); return c;
  },
  createAuthor: ({ name, bio }) => {
    const a = { id: nextIds().author, name, bio: bio || '', email: '' }; authors.push(a); return a;
  },
};
// Field resolvers for nested types (Post.author uses the batching loader — the N+1 fix).
function resolveField(parent, field, ctx, args) {
  if (parent === 'ROOT') {
    const r = ctx.isMutation ? mutationResolvers[field.name] : rootResolvers[field.name];
    if (!r) throw new Error('Unknown field: ' + field.name);
    return r(args);
  }
  if (field.name === '__typename') return parent.__type || 'Post';
  if (field.name === 'author' && parent.authorId) return ctx.authorLoader.load(parent.authorId);
  if (field.name === 'comments' && parent.id) return comments.filter(c => c.postId === parent.id);
  if (field.name === 'posts' && parent.id) return posts.filter(p => p.authorId === parent.id).map(postShape);
  return parent[field.name] !== undefined ? parent[field.name] : null;
}
async function executeSelection(parent, fields, ctx, variables) {
  const out = {};
  for (const field of fields) {
    const key = field.alias || field.name;
    const args = {};
    for (const [k, v] of Object.entries(field.args)) args[k] = resolveVars(v, variables);
    try {
      let value = await resolveField(parent, field, ctx, args);
      if (value && field.selectionSet) {
        if (Array.isArray(value)) value = await Promise.all(value.map(v => executeSelection({ ...v, __type: v.authorId ? 'Post' : v.postId ? 'Comment' : 'Author' }, field.selectionSet, ctx, variables)));
        else value = await executeSelection({ ...value, __type: value.authorId ? 'Post' : value.postId ? 'Comment' : 'Author' }, field.selectionSet, ctx, variables);
      }
      out[key] = value;
    } catch (e) {
      out[key] = null;
      ctx.errors.push({ message: e.message, field: key });
    }
  }
  return out;
}
async function execute({ query, variables = {}, isMutation = false, user = null }) {
  const defs = new Parser(tokenize(query)).parseDocument();
  const def = defs[0];
  if (!def) throw new Error('Empty query');
  const mutation = def.op === 'mutation';
  if (mutation && !user) throw new Error('Mutations require authentication (Authorization: Bearer <token>)');
  const authorLoader = createAuthorLoader();
  const ctx = { isMutation: mutation, authorLoader, errors: [] };
  const data = await executeSelection('ROOT', def.selectionSet, ctx, variables);
  const result = { data };
  if (ctx.errors.length) result.errors = ctx.errors;
  result.extensions = { authorLoaderBatchCalls: authorLoader.batchCalls };
  return result;
}
module.exports = { execute, commentEvents, tokenize, Parser };
