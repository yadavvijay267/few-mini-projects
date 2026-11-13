terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    # Fill these in after creating the state bucket (see docs/ARCHITECTURE.md).
    # bucket = "clamor-tfstate"
    # key    = "terraform-aws-starter/terraform.tfstate"
    # region = "ap-south-1"
    # dynamodb_table = "clamor-tf-lock"
  }
}
