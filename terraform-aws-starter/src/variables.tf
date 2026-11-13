variable "aws_region"   { description = "AWS region"; type = string; default = "ap-south-1" }
variable "environment"  { description = "Environment name (dev/staging)"; type = string; default = "dev"
  validation { condition = contains(["dev", "staging"], var.environment); error_message = "Must be dev or staging." } }
variable "project"      { description = "Project tag prefix"; type = string; default = "terraform-aws-starter" }
variable "vpc_cidr"     { description = "VPC CIDR block"; type = string; default = "10.0.0.0/16" }
variable "instance_type"{ description = "EC2 instance type (free-tier eligible)"; type = string; default = "t2.micro" }
variable "db_password"  { description = "RDS master password (use a secret, never commit)"; type = string; sensitive = true }
variable "allowed_ssh_cidr" { description = "CIDR allowed to SSH"; type = string; default = "0.0.0.0/0" }
variable "enable_rds"   { description = "Create the RDS instance"; type = bool; default = true }
