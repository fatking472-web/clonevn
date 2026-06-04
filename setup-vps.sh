#!/bin/bash
# ==============================================
# Script cài đặt môi trường VPS cho Node.js app
# Chạy: bash setup-vps.sh
# OS: Ubuntu 22.04 LTS
# ==============================================

set -e  # Dừng nếu có lỗi

echo ""
echo "========================================"
echo "  Cài đặt VPS - Cổng Dịch vụ công"
echo "========================================"
echo ""

# 1. Cập nhật hệ thống
echo "➤ Cập nhật hệ thống..."
apt update -y && apt upgrade -y

# 2. Cài build tools (BẮT BUỘC cho better-sqlite3)
echo "➤ Cài build-essential và python3..."
apt install -y build-essential python3 python3-pip git curl

# 3. Cài Node.js 20 LTS
echo "➤ Cài Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version
npm --version

# 4. Cài PM2
echo "➤ Cài PM2..."
npm install -g pm2

# 5. Cài Nginx
echo "➤ Cài Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# 6. Cài Certbot (SSL)
echo "➤ Cài Certbot..."
apt install -y certbot python3-certbot-nginx

# 7. Tạo thư mục app
echo "➤ Tạo thư mục /var/www/cdvc..."
mkdir -p /var/www/cdvc
chown -R www-data:www-data /var/www/

# 8. Cấu hình firewall
echo "➤ Cấu hình UFW Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "✅ Cài đặt môi trường hoàn tất!"
echo ""
echo "Bước tiếp theo:"
echo "  cd /var/www/cdvc"
echo "  git clone YOUR_REPO_URL ."
echo "  npm install"
echo "  cp .env.example .env && nano .env"
echo "  pm2 start server.js --name cdvc"
echo "  pm2 save && pm2 startup"
echo ""
