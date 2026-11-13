#!/usr/bin/env python3
"""Free-tier cost estimate for terraform-aws-starter. Stdlib only.

Prints the expected monthly bill for the dev stack and exits non-zero if
the estimate exceeds the free-tier budget, so CI can fail the PR.
"""
import json, sys
FREE_TIER_HOURS = 750  # EC2 t2.micro + RDS db.t3.micro free-tier hours/month
PRICES = {"ec2_t2_micro": 0.0116, "rds_t3_micro": 0.017, "s3_gb_month": 0.023,
          "nat_gateway": 0.045, "ebs_gb_month": 0.08}
def estimate(env="dev", enable_rds=True, hours=730):
    ec2 = 0.0 if hours <= FREE_TIER_HOURS else (hours - FREE_TIER_HOURS) * PRICES["ec2_t2_micro"]
    rds = 0.0 if (enable_rds and hours <= FREE_TIER_HOURS) else (PRICES["rds_t3_micro"] * hours if enable_rds else 0.0)
    s3 = 5 * PRICES["s3_gb_month"]          # ~5 GB stored
    ebs = 8 * PRICES["ebs_gb_month"]        # 8 GB root volume
    total = round(ec2 + rds + s3 + ebs, 2)
    return {"environment": env, "ec2_usd": round(ec2, 2), "rds_usd": round(rds, 2),
            "s3_usd": round(s3, 2), "ebs_usd": round(ebs, 2), "total_usd_month": total,
            "free_tier": hours <= FREE_TIER_HOURS}
if __name__ == "__main__":
    est = estimate()
    print(json.dumps(est, indent=2))
    print(f"Estimated monthly bill: ${est['total_usd_month']:.2f} (free tier: {est['free_tier']})")
    sys.exit(0 if est["total_usd_month"] <= 10 else 1)
