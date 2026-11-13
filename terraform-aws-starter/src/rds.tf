resource "aws_db_subnet_group" "main" { count = var.enable_rds ? 1 : 0
  name = "${var.project}-${var.environment}"; subnet_ids = aws_subnet.private[*].id }
resource "aws_security_group" "db" { count = var.enable_rds ? 1 : 0
  name = "${var.project}-${var.environment}-db"; vpc_id = aws_vpc.main.id
  ingress { from_port = 5432; to_port = 5432; protocol = "tcp"; security_groups = [aws_security_group.web.id] } }
resource "aws_db_instance" "main" { count = var.enable_rds ? 1 : 0
  identifier = "${var.project}-${var.environment}"
  engine = "postgres"; engine_version = "16.3"; instance_class = "db.t3.micro"
  allocated_storage = 20; storage_type = "gp2"
  db_name = "appdb"; username = "appuser"; password = var.db_password
  db_subnet_group_name = aws_db_subnet_group.main[0].name
  vpc_security_group_ids = [aws_security_group.db[0].id]
  publicly_accessible = false; skip_final_snapshot = true; deletion_protection = false
  tags = { Name = "${var.project}-${var.environment}-db" } }
