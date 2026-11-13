data "aws_ami" "amazon_linux" {
  most_recent = true; owners = ["amazon"]
  filter { name = "name"; values = ["al2023-ami-*-x86_64"] }
}
resource "aws_security_group" "web" {
  name = "${var.project}-${var.environment}-web"; vpc_id = aws_vpc.main.id
  ingress { from_port = 22; to_port = 22; protocol = "tcp"; cidr_blocks = [var.allowed_ssh_cidr]; description = "SSH" }
  ingress { from_port = 80; to_port = 80; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"]; description = "HTTP" }
  egress  { from_port = 0;  to_port = 0;  protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
  tags = { Name = "${var.project}-${var.environment}-web-sg" }
}
resource "aws_instance" "app" {
  ami = data.aws_ami.amazon_linux.id; instance_type = var.instance_type
  subnet_id = aws_subnet.public[0].id; vpc_security_group_ids = [aws_security_group.web.id]
  user_data = base64encode(file("${path.module}/user_data.sh"))
  tags = { Name = "${var.project}-${var.environment}-app", Environment = var.environment }
}
