#!/bin/bash

# GrowLoan Deployment Script
# Usage: bash deploy.sh

set -e  # Exit on error

echo "=========================================="
echo "GrowLoan Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Project directory
PROJECT_DIR="/var/www/growloan"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo -e "${GREEN}Step 1: Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Installing...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
else
    echo -e "${GREEN}✓ Node.js installed: $(node --version)${NC}"
fi

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 not found. Installing...${NC}"
    npm install -g pm2
else
    echo -e "${GREEN}✓ PM2 installed: $(pm2 --version)${NC}"
fi

# Check Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx not found. Installing...${NC}"
    apt update
    apt install -y nginx
else
    echo -e "${GREEN}✓ Nginx installed${NC}"
fi

echo ""
echo -e "${GREEN}Step 2: Creating project directory...${NC}"
mkdir -p $PROJECT_DIR
mkdir -p $BACKEND_DIR
mkdir -p $FRONTEND_DIR

echo ""
echo -e "${GREEN}Step 3: Backend Setup...${NC}"

if [ -d "$BACKEND_DIR" ] && [ "$(ls -A $BACKEND_DIR)" ]; then
    cd $BACKEND_DIR
    
    echo "Installing backend dependencies..."
    npm install
    
    # Check if .env exists
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        echo -e "${YELLOW}⚠ .env file not found. Creating template...${NC}"
        cat > $BACKEND_DIR/.env << EOF
MONGODB_URI=mongodb+srv://khuntakash1211_db_user:lZH3uGqPnScmNLJS@cluster0.ax0teyf.mongodb.net/growloan?retryWrites=true&w=majority
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
PORT=5000
NODE_ENV=production
FIREBASE_PROJECT_ID=growloan-bfa5a
EOF
        echo -e "${YELLOW}⚠ Please edit $BACKEND_DIR/.env and add your configuration${NC}"
    else
        echo -e "${GREEN}✓ .env file exists${NC}"
    fi
    
    # Start/restart backend with PM2
    echo "Starting backend with PM2..."
    pm2 delete growloan-backend 2>/dev/null || true
    pm2 start server.js --name growloan-backend
    pm2 save
    
    echo -e "${GREEN}✓ Backend started${NC}"
else
    echo -e "${RED}✗ Backend directory is empty. Please upload backend files first.${NC}"
fi

echo ""
echo -e "${GREEN}Step 4: Frontend Build...${NC}"

if [ -d "$FRONTEND_DIR" ] && [ "$(ls -A $FRONTEND_DIR)" ]; then
    cd $FRONTEND_DIR
    
    echo "Installing frontend dependencies..."
    npm install
    
    echo "Building frontend for production..."
    npm run build
    
    if [ -d "$FRONTEND_DIR/build" ]; then
        echo -e "${GREEN}✓ Frontend build created${NC}"
        
        # Set permissions
        chown -R www-data:www-data $FRONTEND_DIR/build
        chmod -R 755 $FRONTEND_DIR/build
        echo -e "${GREEN}✓ Permissions set${NC}"
    else
        echo -e "${RED}✗ Build failed. Check errors above.${NC}"
    fi
else
    echo -e "${RED}✗ Frontend directory is empty. Please upload frontend files first.${NC}"
fi

echo ""
echo -e "${GREEN}Step 5: Nginx Configuration...${NC}"

NGINX_CONFIG="/etc/nginx/sites-available/growwloan.online"

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "Creating Nginx configuration..."
    cat > $NGINX_CONFIG << 'EOF'
server {
    server_name growwloan.online www.growwloan.online 217.15.166.124;

    root /var/www/growloan/frontend/build;
    index index.html index.htm;

    # API routes - backend proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|otf)$ {
        root /var/www/growloan/frontend/build;
        try_files $uri =404;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        root /var/www/growloan/frontend/build;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    error_page 404 /index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    listen 80;
    listen [::]:80;
}
EOF
    echo -e "${GREEN}✓ Nginx config created${NC}"
else
    echo -e "${GREEN}✓ Nginx config exists${NC}"
fi

# Enable site
ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/growwloan.online
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
if nginx -t; then
    echo -e "${GREEN}✓ Nginx config test passed${NC}"
    systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
else
    echo -e "${RED}✗ Nginx config test failed. Please check the configuration.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================="
echo -e "Deployment Complete!${NC}"
echo -e "=========================================="
echo ""
echo "Next steps:"
echo "1. Check backend: pm2 logs growloan-backend"
echo "2. Check nginx: systemctl status nginx"
echo "3. Test website: http://217.15.166.124"
echo "4. Test API: curl http://217.15.166.124/api/auth/me"
echo ""
echo "PM2 Commands:"
echo "  pm2 status"
echo "  pm2 logs growloan-backend"
echo "  pm2 restart growloan-backend"
echo ""

