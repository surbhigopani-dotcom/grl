# Nginx Configuration Fix for Large File Uploads (413 Error)

## Problem
Getting 413 "Request Entity Too Large" error when uploading files. This happens because nginx has a default client_max_body_size limit of 1MB.

## Solution
Add `client_max_body_size 100m;` to nginx configuration.

## Steps to Fix

1. **Edit nginx config:**
```bash
sudo nano /etc/nginx/sites-available/growwloan.online
```

2. **Add this line inside the `server` block (at the top, after server_name):**
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
    
    # Serve uploaded files
    location /uploads {
        alias /var/www/growloan/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
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

3. **Test nginx config:**
```bash
sudo nginx -t
```

4. **Reload nginx:**
```bash
sudo systemctl reload nginx
```

## Key Changes:
- `client_max_body_size 100m;` - Allows 100MB file uploads
- Increased proxy timeouts to 300s (5 minutes)
- `proxy_request_buffering off;` - Better for large uploads
- Added `/uploads` location to serve uploaded files

## Verify:
After making changes, test file upload again. The 413 error should be resolved.

