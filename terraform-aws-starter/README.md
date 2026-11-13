# 83. Infrastructure as Code — Terraform AWS Starter

Provision a small AWS stack (VPC, EC2 free-tier, S3, RDS) entirely with
Terraform, with remote state in S3 + DynamoDB locking. Nothing in this repo
provisions real cloud resources by itself — you must run `terraform apply`
with your own AWS account (see [docs/COSTS.md](docs/COSTS.md)).

## Features

- VPC with public/private subnets across two AZs, NAT-free by default (free-tier friendly)
- EC2 `t2.micro` / `t3.micro` (free tier) with a hardened security group
- Private S3 bucket with versioning + encryption, public access blocked
- RDS PostgreSQL `db.t3.micro` (free-tier eligible) in private subnets
- Remote state in S3 with DynamoDB state locking
- Variables for `dev` / `staging` environments (`terraform.tfvars.example`)
- Cost-estimate script + CI step that comments the expected monthly bill on every PR

## Tech stack

Terraform (>= 1.5), AWS provider (~> 5.0), GitHub Actions

## How to run

```bash
cd src
cp terraform.tfvars.example terraform.tfvars   # edit: region, environment
terraform init
terraform fmt -check && terraform validate
terraform plan -out=tfplan
python3 ../scripts/cost_estimate.py            # free-tier cost estimate
terraform apply tfplan
terraform destroy   # tear it all down when done — never leave it running
```

Validate without AWS credentials:

```bash
python3 tests/test_terraform.py
```

## Cost

Designed to stay inside the AWS Free Tier for 12 months (see `docs/COSTS.md`).
Estimated **$0–$8/month** in `dev` if you stay in free-tier limits; the CI
cost step prints the estimate on every pull request.

## Screenshots

See [`screenshots/`](screenshots/).

## License

MIT — see [LICENSE](LICENSE).
