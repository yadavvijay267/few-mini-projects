# Architecture

```
billing.csv (Cost Explorer export) ─┐
resources.csv (inventory export)   ─┼─> analyzer.py ─> data/report.json ─> dashboard
```

Rules are deliberately simple and explainable (no black box): stopped
instances, CPU < 10%, unattached volumes, unused IPs, old snapshots. Each
recommendation carries the action, not just the number.

## Production needs

- Real data: AWS Cost Explorer API (`GetCostAndUsage`) or a CUR export to S3.
- Resource inventory: `aws ec2 describe-instances/volumes/addresses` on a schedule.
- Rightsizing: use CloudWatch CPU/memory percentiles over 30 days, not a point sample.
- Tagging policy: every resource tagged `owner`/`project`, or spend cannot be attributed.
