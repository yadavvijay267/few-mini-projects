# Cost Report — "This API costs $0/month at current usage"

## Cloudflare Workers (free tier)

| Resource | Free allowance | This API's usage | Cost |
|----------|---------------|------------------|------|
| Requests | 100,000 / day | ~50 / day (dev + tests) | $0 |
| CPU time | 10 ms / request | ~1–2 ms (in-memory, no DB) | $0 |
| KV reads/writes | 100,000 / day | not used yet (in-memory store) | $0 |
| Cron triggers | included | 1 / day | $0 |

**Total: $0/month.** The first paid tier ($5/month) only kicks in past
10 million requests/month.

## AWS Lambda (free tier)

| Resource | Free allowance | This API's usage | Cost |
|----------|---------------|------------------|------|
| Requests | 1,000,000 / month | ~1,500 / month | $0 |
| Compute | 400,000 GB-seconds / month | ~a few hundred | $0 |
| API Gateway | 1,000,000 calls / month (12 months) | ~1,500 / month | $0 |

**Total: $0/month** within the free tier (and $0 afterwards at this volume
— roughly $0.20 per million requests).

## What would cost money

- A managed database (DynamoDB on-demand ~$0 at this volume; RDS would be
  the first real cost).
- Outbound email for the daily summary (SES: $0.10 per 1,000 emails).
- Nothing else: no servers, no load balancers, no always-on anything.
