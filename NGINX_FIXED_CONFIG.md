# Fixed Nginx Configuration - Redirect Loop Fix

## Problem
Nginx error log shows: `rewrite or internal redirection cycle while internally redirecting to "/index.html"`

This happens because `error_page 404 /index.html;` conflicts with `try_files $uri $uri/ /index.html;` in the location block.

## Solution
Remove `error_page 404 /index.html;` - the `try_files` directive already handles 404s properly for SPA routing.

---

## Complete Fixed Nginx Config

**File:** `/etc/nginx/sites-available/growwloan.online`

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

    # Static files (JS, CSS, images, fonts)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|otf|map)$ {
        root /var/www/growloan/grl/frontend/build;
        try_files $uri =404;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - React Router માટે
    # આ try_files directive automatically 404s handle કરે છે
    location / {
        root /var/www/growloan/grl/frontend/build;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # SSL Configuration (Certbot managed)
    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/growwloan.online/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/growwloan.online/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

# HTTP to HTTPS redirect
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

---

## Quick Fix Commands

```bash
# 1. Edit nginx config
nano /etc/nginx/sites-available/growwloan.online

# 2. Remove this line (if present):
#    error_page 404 /index.html;

# 3. Make sure root path is correct:
#    root /var/www/growloan/grl/frontend/build;

# 4. Test config
nginx -t

# 5. Reload nginx
systemctl reload nginx

# 6. Check error log (should be clean now)
tail -f /var/log/nginx/error.log
```

---

## Key Changes

1. **Removed:** `error_page 404 /index.html;` - This was causing the redirect loop
2. **Kept:** `try_files $uri $uri/ /index.html;` - This properly handles SPA routing
3. **Updated:** Root path to `/var/www/growloan/grl/frontend/build`
4. **Added:** Static files location block with proper caching

---

## How It Works

- **Static files** (JS, CSS, images): Served directly with caching
- **API calls** (`/api/*`): Proxied to backend on port 5000
- **All other routes**: `try_files` checks if file exists, if not serves `/index.html` for React Router
- **No redirect loop**: `try_files` handles 404s internally without triggering error_page

---

## Verification

After applying the fix:

```bash
# Test config
nginx -t

# Reload
systemctl reload nginx

# Check website
curl -I https://growwloan.online

# Check error log (should be clean)
tail -20 /var/log/nginx/error.log
```

**Expected:** No more "redirect cycle" errors! ✅

