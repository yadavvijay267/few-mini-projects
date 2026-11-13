output "vpc_id"        { value = aws_vpc.main.id }
output "public_subnets"{ value = aws_subnet.public[*].id }
output "private_subnets"{ value = aws_subnet.private[*].id }
output "ec2_public_ip" { value = aws_instance.app.public_ip }
output "s3_bucket"     { value = aws_s3_bucket.app.bucket }
output "rds_endpoint"  { value = var.enable_rds ? aws_db_instance.main[0].endpoint : "disabled"; sensitive = true }
