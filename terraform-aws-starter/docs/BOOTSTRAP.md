# Bootstrap remote state (one-time)

```bash
aws s3api create-bucket --bucket clamor-tfstate --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1
aws s3api put-bucket-versioning --bucket clamor-tfstate \
  --versioning-configuration Status=Enabled
aws dynamodb create-table --table-name clamor-tf-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST --region ap-south-1
```

Then uncomment the backend block in `src/versions.tf`.
