# Fix 413 Error and File Upload Issues

## Issues Found:
1. **413 Request Entity Too Large** - Nginx and Express body size limits too small
2. **404 Not Found for uploaded files** - Files not being served correctly
3. **Mixed Content Error** - Already fixed (using relative paths)

## Fixes Applied:

### 1. Backend Express Configuration ✅
- Updated `backend/server.js` to increase body size limits to 100MB
- Both `express.json()` and `express.urlencoded()` now accept 100MB

### 2. Nginx Configuration Required (On Server)

**Edit nginx config:**
```bash
sudo nano /etc/nginx/sites-available/growwloan.online
```

**Add these lines:**

```nginx
server {
    server_name growwloan.online www.growwloan.online 217.15.166.124;
    
    # CRITICAL: Allow large file uploads (100MB)
    client_max_body_size 100m;
    
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
        
        # CRITICAL: Increase timeouts for large file uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # CRITICAL: Buffer settings for large uploads
        proxy_request_buffering off;
        proxy_buffering off;
    }
    
    # CRITICAL: Serve uploaded files from backend
    location /uploads {
        alias /var/www/growloan/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
        # Allow CORS if needed
        add_header Access-Control-Allow-Origin *;
    }

    # Static files (JS, CSS, images, fonts)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|otf|map)$ {
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

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/growwloan.online/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/growwloan.online/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}
```

**After editing:**
```bash
# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Restart backend (to apply Express changes)
cd /var/www/growloan/backend
pm2 restart growloan-backend
# OR if using systemd:
sudo systemctl restart growloan-backend
```

### 3. Verify Upload Directory Permissions

```bash
# Make sure uploads directory exists and has correct permissions
sudo mkdir -p /var/www/growloan/backend/uploads/documents
sudo chown -R www-data:www-data /var/www/growloan/backend/uploads
sudo chmod -R 755 /var/www/growloan/backend/uploads
```

### 4. Check Backend Upload Path

Make sure backend is saving files to:
```
/var/www/growloan/backend/uploads/documents/
```

## Summary of Changes:

✅ **Backend (server.js):**
- `express.json({ limit: '100mb' })`
- `express.urlencoded({ extended: true, limit: '100mb' })`

✅ **Nginx (Required on server):**
- `client_max_body_size 100m;`
- Increased proxy timeouts to 300s
- `proxy_request_buffering off;`
- Added `/uploads` location block

✅ **Frontend:**
- Already using relative paths (`/api`)
- No hardcoded HTTP URLs

## Testing:

After applying changes:
1. Try uploading a file (should work now)
2. Check browser console (no 413 errors)
3. Verify uploaded files are accessible

