#!/usr/bin/env bash
# deploy.sh <staging|production> <image-tag>
# Simulates a deploy and appends an entry to the deployment history page.
# Replace the echo block with a real host call (Render deploy hook, Vercel CLI,
# ssh + docker pull, etc.). Exits non-zero on unknown environment.
set -euo pipefail
ENV="${1:-}"; IMAGE="${2:-}"
if [ "$ENV" != "staging" ] && [ "$ENV" != "production" ]; then
  echo "Usage: $0 <staging|production> <image-tag>" >&2; exit 1
fi
echo "Deploying $IMAGE to $ENV ..."
# --- real deploy goes here, e.g.: curl -sf -X POST "$DEPLOY_HOOK" ---
echo "Deployed $IMAGE to $ENV at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
mkdir -p docs
{
  echo ""
  echo "## $(date -u +%Y-%m-%dT%H:%M:%SZ) — $ENV"
  echo ""
  echo "- Image: \`$IMAGE\`"
  echo "- Trigger: ${GITHUB_SHA:-local} (${GITHUB_REF:-manual})"
  echo "- Status: deployed"
} >> docs/DEPLOYMENT_HISTORY.md
