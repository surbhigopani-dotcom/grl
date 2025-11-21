# Complete Deployment Guide - GrowLoan Project
# સંપૂર્ણ Deployment Guide - Line by Line Commands

## Server Information
- **Server IP:** 217.15.166.124
- **Domain:** growwloan.online
- **Backend Port:** 5000
- **OS:** Ubuntu

---

## Step 1: Server પર Connect કરો

```bash
ssh root@217.15.166.124
```

---

## Step 2: System Update કરો

```bash
# System update
apt update && apt upgrade -y

# Essential tools install કરો
apt install -y curl wget git build-essential
```

---

## Step 3: Node.js Install કરો (જો ન હોય તો)

```bash
# Node.js 18.x install કરો
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Version check કરો
node --version
npm --version
```

**Expected Output:**
```
v18.x.x
9.x.x
```

---

## Step 4: PM2 Install કરો (Process Manager)

```bash
# PM2 globally install કરો
npm install -g pm2

# PM2 version check
pm2 --version
```

---

## Step 5: Nginx Install કરો (જો ન હોય તો)

```bash
# Nginx install
apt install -y nginx

# Nginx status check
systemctl status nginx

# Nginx start કરો (જો running ન હોય)
systemctl start nginx
systemctl enable nginx
```

---

## Step 6: Project Directory બનાવો

```bash
# Main directory બનાવો
mkdir -p /var/www/growloan

# Directory માં જાઓ
cd /var/www/growloan

# Current directory check
pwd
```

**Expected:** `/var/www/growloan`

---

## Step 7: Project Files Upload કરો

### Option A: Git Clone (જો Git repository હોય)

```bash
cd /var/www/growloan
git clone <your-repo-url> .
```

### Option B: Manual Upload (SCP/FileZilla)

**Local Machine પરથી (Windows PowerShell):**

```powershell
# Backend upload
scp -r E:\growloan\backend root@217.15.166.124:/var/www/growloan/grl/

# Frontend upload
scp -r E:\growloan\frontend root@217.15.166.124:/var/www/growloan/grl/
```

**અથવા FileZilla use કરો:**
- Host: `217.15.166.124`
- Username: `root`
- Password: (your password)
- Upload `backend` અને `frontend` folders to `/var/www/growloan/grl/`

### Option C: Zip Upload

**Local Machine પર:**
```powershell
# Zip બનાવો
Compress-Archive -Path E:\growloan\backend, E:\growloan\frontend -DestinationPath E:\growloan\project.zip
```

**Server પર:**
```bash
# Zip upload કરો (SCP થી)
# Local machine પરથી:
# scp E:\growloan\project.zip root@217.15.166.124:/tmp/

# Server પર unzip કરો
cd /var/www/growloan
unzip /tmp/project.zip -d .
```

---

## Step 8: Backend Setup

```bash
# Backend directory માં જાઓ
cd /var/www/growloan/grl/backend

# Dependencies install કરો
npm install

# .env file બનાવો
nano .env
```

### .env File Content:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://khuntakash1211_db_user:lZH3uGqPnScmNLJS@cluster0.ax0teyf.mongodb.net/growloan?retryWrites=true&w=majority

# JWT Secret (Generate કરો - નીચે જુઓ)
JWT_SECRET=your_super_secret_jwt_key_here_change_this

# Server Port
PORT=5000

# Environment
NODE_ENV=production

# Firebase (જો serviceAccountKey.json use કરો છો તો આ ન જોઈએ)
FIREBASE_PROJECT_ID=growloan-bfa5a
```

**Save:** `Ctrl + O`, `Enter`, `Ctrl + X`

### JWT Secret Generate કરો:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output copy કરીને `.env` file માં `JWT_SECRET` ની value માં paste કરો.

### Firebase Service Account Key:

```bash
# Firebase JSON file upload કરો (જો હોય તો)
# Local machine પરથી:
# scp E:\growloan\backend\config\serviceAccountKey.json root@217.15.166.124:/var/www/growloan/grl/backend/config/

# અથવા manually create કરો
mkdir -p /var/www/growloan/grl/backend/config
nano /var/www/growloan/grl/backend/config/serviceAccountKey.json
```

Firebase Console થી downloaded JSON file ની content paste કરો.

---

## Step 9: Backend Test કરો

```bash
cd /var/www/growloan/grl/backend

# Backend start કરો (test માટે)
node server.js
```

**Expected Output:**
```
MongoDB Connected Successfully
Server running on port 5000
API available at http://localhost:5000/api
```

**Stop કરો:** `Ctrl + C`

---

## Step 10: PM2 માં Backend Start કરો

```bash
cd /var/www/growloan/grl/backend

# PM2 માં start કરો
pm2 start server.js --name growloan-backend

# PM2 status check
pm2 status

# PM2 logs check
pm2 logs growloan-backend

# PM2 save (restart પછી auto-start માટે)
pm2 save

# PM2 startup script (system reboot પછી auto-start)
pm2 startup
# Output માં આવેલ command run કરો
```

**PM2 Commands:**
```bash
# Status
pm2 status

# Logs
pm2 logs growloan-backend

# Restart
pm2 restart growloan-backend

# Stop
pm2 stop growloan-backend

# Delete
pm2 delete growloan-backend
```

---

## Step 11: Frontend Build

```bash
# Frontend directory માં જાઓ
cd /var/www/growloan/grl/frontend

# Dependencies install કરો
npm install

# Production build બનાવો
npm run build
```

**Build complete થયા પછી:**
- `build` folder બનશે
- Check કરો: `ls -la build/`

---

## Step 12: Nginx Configuration

```bash
# Nginx config file બનાવો/Edit કરો
nano /etc/nginx/sites-available/growwloan.online
```

### Complete Nginx Config:

```nginx
server {
    server_name growwloan.online www.growwloan.online 217.15.166.124;

    root /var/www/growloan/grl/frontend/build;
    index index.html index.htm;

    # API routes - backend ને proxy કરે છે (CRITICAL!)
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|otf)$ {
        root /var/www/growloan/grl/frontend/build;
        try_files $uri =404;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - React Router માટે
    # try_files automatically handles 404s - NO error_page needed (causes redirect loop)
    location / {
        root /var/www/growloan/grl/frontend/build;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    listen 80;
    listen [::]:80;
}
```

**Save:** `Ctrl + O`, `Enter`, `Ctrl + X`

### SSL Configuration (જો SSL certificate હોય):

```bash
# SSL config add કરો (Certbot managed)
# જો SSL already setup હોય તો:
nano /etc/nginx/sites-available/growwloan.online
```

SSL section add કરો (Certbot automatically add કરશે):

```nginx
    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/growwloan.online/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/growwloan.online/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
```

### Enable Site:

```bash
# Symlink બનાવો
ln -s /etc/nginx/sites-available/growwloan.online /etc/nginx/sites-enabled/

# Default site disable કરો (જો જોઈએ)
rm /etc/nginx/sites-enabled/default

# Nginx config test કરો
nginx -t
```

**Expected Output:**
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Nginx Reload:

```bash
# Nginx reload કરો
systemctl reload nginx

# Nginx status check
systemctl status nginx
```

---

## Step 13: File Permissions

```bash
# Frontend build permissions
chown -R www-data:www-data /var/www/growloan/grl/frontend/build
chmod -R 755 /var/www/growloan/grl/frontend/build

# Backend permissions
chown -R $USER:$USER /var/www/growloan/grl/backend
chmod -R 755 /var/www/growloan/grl/backend
```

---

## Step 14: Firewall Configuration

```bash
# UFW firewall check
ufw status

# જો firewall enabled હોય તો ports allow કરો
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 5000/tcp  # Backend (optional, only if direct access જોઈએ)

# Firewall enable (જો ન હોય)
ufw enable
```

---

## Step 15: Testing

### Backend Test:

```bash
# Local test
curl http://localhost:5000/api/auth/me

# External test (જો port 5000 open હોય)
curl http://217.15.166.124:5000/api/auth/me
```

### Frontend Test:

```bash
# Browser માં open કરો:
# http://217.15.166.124
# અથવા
# https://growwloan.online
```

### API Test through Nginx:

```bash
# API endpoint test
curl http://217.15.166.124/api/auth/me
# અથવા
curl https://growwloan.online/api/auth/me
```

---

## Step 16: SSL Certificate (જો જોઈએ)

```bash
# Certbot install
apt install -y certbot python3-certbot-nginx

# SSL certificate obtain કરો
certbot --nginx -d growwloan.online -d www.growwloan.online

# Auto-renewal test
certbot renew --dry-run
```

---

## Step 17: Monitoring & Logs

### PM2 Logs:

```bash
# Real-time logs
pm2 logs growloan-backend

# Logs file location
pm2 logs --lines 100
```

### Nginx Logs:

```bash
# Error logs
tail -f /var/log/nginx/error.log

# Access logs
tail -f /var/log/nginx/access.log
```

### Backend Logs:

```bash
# PM2 logs
pm2 logs growloan-backend --lines 50
```

---

## Step 18: Update/Deploy New Version

### Backend Update:

```bash
# Code update કરો (git pull અથવા manual upload)

cd /var/www/growloan/grl/backend

# Dependencies update
npm install

# PM2 restart
pm2 restart growloan-backend

# Logs check
pm2 logs growloan-backend
```

### Frontend Update:

```bash
cd /var/www/growloan/grl/frontend

# Code update કરો

# Dependencies update
npm install

# New build
npm run build

# Nginx reload (જરૂર નથી, પણ safe માટે)
systemctl reload nginx
```

---

## Troubleshooting

### 500 Error Check:

```bash
# 1. Backend running check
pm2 status

# 2. Backend logs
pm2 logs growloan-backend

# 3. Nginx error logs
tail -50 /var/log/nginx/error.log

# 4. Port 5000 check
netstat -tulpn | grep 5000
# અથવા
ss -tulpn | grep 5000

# 5. Backend manual test
cd /var/www/growloan/grl/backend
node server.js
```

### Nginx Config Test:

```bash
# Config syntax check
nginx -t

# Config reload
systemctl reload nginx

# Nginx restart (જો reload ન કામ કરે)
systemctl restart nginx
```

### Permission Issues:

```bash
# Frontend build permissions
chown -R www-data:www-data /var/www/growloan/grl/frontend/build
chmod -R 755 /var/www/growloan/grl/frontend/build

# Backend permissions
chown -R $USER:$USER /var/www/growloan/grl/backend
```

### MongoDB Connection:

```bash
# Backend logs માં MongoDB connection check
pm2 logs growloan-backend | grep -i mongo
```

---

## Quick Reference Commands

```bash
# PM2
pm2 status
pm2 logs growloan-backend
pm2 restart growloan-backend
pm2 stop growloan-backend
pm2 start growloan-backend

# Nginx
nginx -t
systemctl reload nginx
systemctl restart nginx
systemctl status nginx

# Logs
pm2 logs growloan-backend --lines 50
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Directory
cd /var/www/growloan/grl/backend
cd /var/www/growloan/grl/frontend
```

---

## Complete Checklist

- [ ] Node.js installed
- [ ] PM2 installed
- [ ] Nginx installed
- [ ] Project files uploaded
- [ ] Backend dependencies installed
- [ ] Backend .env file created
- [ ] Firebase serviceAccountKey.json uploaded
- [ ] Backend running in PM2
- [ ] Frontend dependencies installed
- [ ] Frontend build created
- [ ] Nginx config created
- [ ] Nginx config tested
- [ ] Nginx reloaded
- [ ] File permissions set
- [ ] Firewall configured
- [ ] Backend test successful
- [ ] Frontend accessible
- [ ] API calls working
- [ ] SSL certificate (if needed)

---

## Important Notes

1. **API URL Fix:** Frontend માં `AuthContext.js` માં API_URL production માં `/api` use કરે છે (relative path) - આ already fixed છે ✅

2. **Nginx `/api` location block:** આ CRITICAL છે - આ વગર API calls fail થશે

3. **PM2 Auto-start:** `pm2 save` અને `pm2 startup` run કરો system reboot પછી auto-start માટે

4. **Build Path:** Frontend build path: `/var/www/growloan/grl/frontend/build`

5. **Backend Port:** Backend port 5000 પર run થવું જોઈએ

6. **MongoDB:** MongoDB connection string `.env` માં correct હોવું જોઈએ

---

## Support

જો કોઈ issue આવે તો:
1. PM2 logs check કરો: `pm2 logs growloan-backend`
2. Nginx error logs check કરો: `tail -50 /var/log/nginx/error.log`
3. Backend manual test: `cd /var/www/growloan/grl/backend && node server.js`

---

**Deployment Complete! 🎉**

