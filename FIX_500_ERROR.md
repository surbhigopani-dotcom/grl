# Fix 500 Internal Server Error

## Problem
500 Internal Server Error આવે છે કારણ કે nginx config માં `/api` location block missing છે.

## Complete Fixed Config

તમારા nginx config file માં આ complete configuration use કરો:

```nginx
server {
    server_name growwloan.online www.growwloan.online 217.15.166.124;

    root /var/www/growloan/frontend/build;
    index index.html index.htm;

    # API routes - backend ને proxy કરે છે (IMPORTANT! આ missing હતું)
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
        root /var/www/growloan/frontend/build;
        try_files $uri =404;
        access_log off;
        expires 30d;
    }

    # SPA fallback
    location / {
        root /var/www/growloan/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    error_page 404 /index.html;

    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/growwloan.online/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/growwloan.online/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.growwloan.online) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = growwloan.online) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    listen [::]:80;
    server_name growwloan.online www.growwloan.online 217.15.166.124;
    return 404; # managed by Certbot
}
```

## Key Fix

**Added `/api` location block** - આ missing હતું અને એથી 500 error આવતી હતી:

```nginx
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
```

## Step-by-Step Fix

### Step 1: SSH into Server
```bash
ssh root@217.15.166.124
```

### Step 2: Edit Config File
```bash
sudo nano /etc/nginx/sites-available/growwloan.online
# અથવા
sudo nano /etc/nginx/sites-enabled/growwloan.online
```

### Step 3: Replace Config
- Old config delete કરો
- New config (ઉપરનું) paste કરો
- Save: `Ctrl + O`, `Enter`
- Exit: `Ctrl + X`

### Step 4: Test Config
```bash
sudo nginx -t
```

Should show: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

### Step 5: Reload Nginx
```bash
sudo systemctl reload nginx
```

### Step 6: Test
1. Visit: `https://growwloan.online/admin/login`
2. Should work without 500 error! ✅

## Verify Backend is Running

```bash
# Check backend status
curl http://localhost:5000/api/auth/me

# જો backend નથી running તો
cd /path/to/backend
node server.js
# અથવા
pm2 start server.js
```

## Check Error Logs

```bash
# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Backend logs (જો pm2 use કરો છો)
pm2 logs
```

## Common Issues

### Issue 1: Backend Not Running
**Error:** 500 error on API calls

**Fix:**
```bash
# Check if backend is running
ps aux | grep node

# Start backend
cd /var/www/growloan/backend
node server.js
# અથવા
pm2 start server.js --name growloan-backend
```

### Issue 2: Wrong Backend Port
**Error:** 500 error, connection refused

**Fix:**
- Check backend port in config: `proxy_pass http://localhost:5000;`
- Update if backend runs on different port

### Issue 3: File Permissions
**Error:** 403 or 500 error

**Fix:**
```bash
sudo chown -R www-data:www-data /var/www/growloan/frontend/build
sudo chmod -R 755 /var/www/growloan/frontend/build
```

## Quick Test Commands

```bash
# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check nginx status
sudo systemctl status nginx

# Test API endpoint
curl http://localhost:5000/api/auth/me

# Check error logs
sudo tail -50 /var/log/nginx/error.log
```

## Complete Checklist

- [ ] `/api` location block added to config
- [ ] Config file saved
- [ ] `sudo nginx -t` passed
- [ ] Nginx reloaded
- [ ] Backend is running on port 5000
- [ ] Tested admin login page
- [ ] No 500 error

## Important Notes

1. **`/api` location block is CRITICAL** - આ વગર API calls fail થશે અને 500 error આવશે
2. **Backend must be running** - `http://localhost:5000` પર backend running હોવું જોઈએ
3. **Check backend port** - જો backend જુદા port પર હોય તો config માં update કરો



