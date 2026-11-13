# Cost note — free tier only

| Resource | Free tier | This stack | Est. cost |
|---|---|---|---|
| EC2 t2.micro | 750 h/month, 12 months | 1 x ~730 h | $0 |
| RDS db.t3.micro | 750 h/month, 12 months | 1 x ~730 h | $0 |
| S3 | 5 GB storage | ~5 GB | ~$0.12 |
| EBS gp2 | 30 GB | 8 GB root | $0 |
| **Total** | | | **~$0.12–$0.76/month** |

Run `python3 scripts/cost_estimate.py` before every apply. After the 12-month
free tier ends, EC2+RDS alone cost ~$21/month — destroy the stack
(`terraform destroy`) if you do not need it.
