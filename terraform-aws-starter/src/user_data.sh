#!/bin/bash
set -euo pipefail
dnf update -y
dnf install -y nginx
systemctl enable --now nginx
echo "<h1>terraform-aws-starter (dev)</h1>" > /usr/share/nginx/html/index.html
