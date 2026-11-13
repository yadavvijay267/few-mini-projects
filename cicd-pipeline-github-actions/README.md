# CI/CD Pipeline from Scratch (GitHub Actions)

[![CI/CD](https://github.com/Clamor/cicd-pipeline-github-actions/actions/workflows/ci.yml/badge.svg)](https://github.com/Clamor/cicd-pipeline-github-actions/actions/workflows/ci.yml)

A complete CI/CD pipeline for a sample Node app: test, lint, build, and
deploy on every push — with a staging-vs-production flow and a manual
approval gate, the way real teams ship.

## How it works

| Trigger | Result |
|---------|--------|
| Every pull request | Test + lint run; **merge is blocked on failure** |
| Merge to `main` | Docker image built + pushed to GHCR, then **auto-deployed to staging** |
| Release tag (`v*`) | Image built, then **deployed to production after manual approval** |

## Key features

- Test + lint on every PR; branch protection blocks merge on failure
- Docker image build and push to GitHub Container Registry
- Automatic deploy to staging on merge, production on release tag
- Manual approval gate on the `production` environment (required reviewers)
- Pipeline status badge (above) and a deployment history page
  ([`docs/DEPLOYMENT_HISTORY.md`](docs/DEPLOYMENT_HISTORY.md))

## The demo app

A tiny Node app (`src/app.js`, built-ins only) with a health endpoint and an
`/api/add` endpoint, plus pure functions in `src/math.js` covered by unit
tests. The pipeline exists to ship this app — the app is deliberately small
so the pipeline is the star.

## Tech stack

GitHub Actions · Docker · Node.js · (deploy target: any free host — Render /
Vercel deploy hook, see `scripts/deploy.sh`)

## Try it locally

```bash
npm run lint        # same lint step CI runs
npm test            # same test step CI runs
docker build -t demo-app . && docker run -p 3000:3000 demo-app
bash scripts/deploy.sh staging demo-app:local
```

Full pipeline docs: [`docs/PIPELINE.md`](docs/PIPELINE.md).

## Screenshots

See [`screenshots/`](screenshots/SCREENSHOTS.md).

## License

MIT — see [LICENSE](LICENSE).
