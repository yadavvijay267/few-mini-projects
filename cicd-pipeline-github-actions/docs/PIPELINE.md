# Pipeline Documentation

## Jobs

| Job | Runs on | What it does |
|-----|---------|--------------|
| `test` | every PR + push | `npm ci`, `npm run lint`, `npm test`. **Merge is blocked while this fails** (branch protection on `main` requires the `test` check). |
| `build` | push to `main` / tags | Builds the Docker image and pushes it to GitHub Container Registry (`ghcr.io/<owner>/<repo>/demo-app:<sha>`, plus `latest` on main and the version on tags). |
| `deploy-staging` | merge to `main` | Deploys the freshly built image to staging automatically. |
| `deploy-production` | release tag `v*` | Deploys to production **only after a manual approval** — the `production` environment has "Required reviewers" set in repo settings. |

```
PR ──> test + lint ──(fail: merge blocked)──> merge to main
                                                        │
                                              build + push image
                                                        │
                                              deploy to staging (auto)
                                                        │
                              git tag v1.2.0 ──> deploy to production (manual approval)
```

## Status badge

Add to the README (replace `<owner>/<repo>`):

```md
[![CI/CD](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)](https://github.com/<owner>/<repo>/actions/workflows/ci.yml)
```

## Deployment history

Every deploy appends an entry to [`docs/DEPLOYMENT_HISTORY.md`](DEPLOYMENT_HISTORY.md)
via `scripts/deploy.sh`. The script is a placeholder for the real host call —
swap the `echo` block for a Render deploy hook, Vercel CLI, or `ssh` + `docker pull`.

## Local verification (no GitHub needed)

```bash
npm run lint        # same lint step CI runs
npm test            # same test step CI runs
docker build -t demo-app . && docker run -p 3000:3000 demo-app
bash scripts/deploy.sh staging demo-app:local   # appends a history entry
```

## Setting up the approval gate

Repo → Settings → Environments → New environment `production` →
check "Required reviewers" → add yourself / the team. The `deploy-production`
job then pauses until a reviewer approves it in the Actions run.
