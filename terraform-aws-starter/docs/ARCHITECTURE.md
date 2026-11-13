# Architecture

```
                Internet
                   |
            Internet Gateway
                   |
   VPC 10.0.0.0/16 (2 AZs)
   +----------------+----------------+
   | public subnets | private subnets|
   | EC2 t2.micro   | RDS db.t3.micro|
   +----------------+----------------+
   S3 bucket (versioned, encrypted, private)
```

## Remote state

Create the state bucket + lock table once, by hand or with the bootstrap
snippet in `docs/BOOTSTRAP.md`, then uncomment the `backend "s3"` block in
`src/versions.tf` and run `terraform init -migrate-state`.

## Production needs

- Real secrets in AWS Secrets Manager (never in `.tfvars`).
- NAT gateway (or VPC endpoints) if private subnets need outbound internet.
- RDS Multi-AZ + automated backups, CloudWatch alarms, WAF in front of EC2.
- `terraform plan` in CI on every PR (see `.github/workflows/plan.yml`).
