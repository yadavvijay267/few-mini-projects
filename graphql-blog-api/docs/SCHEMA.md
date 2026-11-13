# GraphQL Blog API — Schema

Endpoint: `POST /graphql` — body `{ "query": "...", "variables": {...} }`.
Subscriptions: `GET /subscriptions/new-comments` (Server-Sent Events stream of new comments).

## Types
```graphql
type Author  { id: ID!, name: String!, bio: String, posts: [Post!]! }
type Post    { id: ID!, title: String!, body: String, tags: [String!]!, published: Boolean!,
               author: Author, comments: [Comment!]!, createdAt: String }
type Comment { id: ID!, postId: ID!, authorName: String!, body: String!, createdAt: String }

type Query {
  posts(first: Int, tag: String, published: Boolean): [Post!]!
  post(id: ID!): Post
  authors: [Author!]!
  author(id: ID!): Author
  search(term: String!): [Post!]!
}
type Mutation {
  createPost(input: PostInput!): Post!
  updatePost(id: ID!, input: PostInput!): Post!
  deletePost(id: ID!): Boolean!
  addComment(postId: ID!, authorName: String!, body: String!): Comment!
  createAuthor(name: String!, bio: String): Author!
}
input PostInput { title: String, body: String, tags: [String!], published: Boolean, authorId: ID }
```

## Auth
Mutations require `Authorization: Bearer demo-token` (demo token; set `API_TOKEN` env var to change it). Production path: JWT verification + auth directives, Apollo Server + Prisma + PostgreSQL.

## Example queries
```graphql
{ posts(first: 2, published: true) { id title author { name } comments { authorName body } } }
{ post(id: "1") { title tags } }
mutation { addComment(postId: "1", authorName: "Ada", body: "Great post!") { id } }
```

## N+1 fix (DataLoader pattern)
`Post.author` is resolved through a batching loader (`src/store.js` `createAuthorLoader`): all author ids requested in one execution tick are fetched in a single pass. Measured on the seed data — 3 posts, 2 distinct authors:

| Approach | Author lookups for `posts { author { name } }` |
|---|---|
| Naive (one lookup per post) | 3 |
| Batched loader (this repo) | 1 |

The count is returned in every response as `extensions.authorLoaderBatchCalls` and asserted in `tests/test.js`.
