# Verify Nginx Fix - Step by Step

## Issue
Still seeing redirect loop errors (but these are OLD errors from before reload)

## Verification Steps

### 1. Check if build directory exists
```bash
ls -la /var/www/growloan/grl/frontend/build/
```

**Expected:** Should see `index.html` file

### 2. Check if index.html exists
```bash
ls -la /var/www/growloan/grl/frontend/build/index.html
```

**Expected:** File should exist

### 3. Verify current nginx config
```bash
cat /etc/nginx/sites-available/growwloan.online | grep -A 5 "location /"
```

**Expected:** Should see:
```
location / {
    root /var/www/growloan/grl/frontend/build;
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache";
}
```

**Should NOT see:** `error_page 404 /index.html;`

### 4. Restart nginx (not just reload)
```bash
systemctl restart nginx
```

### 5. Test with new request
```bash
# Clear old errors and watch for new ones
> /var/log/nginx/error.log
tail -f /var/log/nginx/error.log
```

Then in another terminal or browser, visit: `https://growwloan.online`

### 6. Check if index.html is accessible
```bash
curl -I https://growwloan.online/
```

**Expected:** Should return 200 OK, not redirect loop

### 7. Check file permissions
```bash
ls -la /var/www/growloan/grl/frontend/build/index.html
```

**Expected:** Should be readable by www-data or world-readable

---

## If Still Having Issues

### Check if index.html path is correct in config
```bash
grep -n "root" /etc/nginx/sites-available/growwloan.online
```

Should show: `root /var/www/growloan/grl/frontend/build;`

### Test if file is readable
```bash
cat /var/www/growloan/grl/frontend/build/index.html | head -20
```

Should show HTML content

### Check nginx process
```bash
ps aux | grep nginx
systemctl status nginx
```

---

## Quick Fix Commands

```bash
# 1. Verify build exists
ls -la /var/www/growloan/grl/frontend/build/index.html

# 2. Set correct permissions
chown -R www-data:www-data /var/www/growloan/grl/frontend/build
chmod -R 755 /var/www/growloan/grl/frontend/build

# 3. Restart nginx
systemctl restart nginx

# 4. Clear error log and test
> /var/log/nginx/error.log
curl -I https://growwloan.online/

# 5. Check for new errors
tail -10 /var/log/nginx/error.log
```

