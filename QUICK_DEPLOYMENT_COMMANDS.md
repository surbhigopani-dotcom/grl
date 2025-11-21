# Quick Deployment Commands - Quick Reference

## 🚀 Complete Fresh Deployment

### 1. Server Connect
```bash
ssh root@217.15.166.124
```

### 2. System Setup
```bash
apt update && apt upgrade -y
apt install -y curl wget git build-essential nginx
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g pm2
```

### 3. Project Setup
```bash
mkdir -p /var/www/growloan
cd /var/www/growloan
# Upload backend અને frontend folders here (SCP/FileZilla)
```

### 4. Backend Setup
```bash
cd /var/www/growloan/backend
npm install
nano .env  # Create .env file (see below)
pm2 start server.js --name growloan-backend
pm2 save
pm2 startup  # Run the command it shows
```

### 5. Frontend Build
```bash
cd /var/www/growloan/frontend
npm install
npm run build
chown -R www-data:www-data build
chmod -R 755 build
```

### 6. Nginx Config
```bash
nano /etc/nginx/sites-available/growwloan.online
# Paste nginx config (see COMPLETE_DEPLOYMENT_GUIDE.md)
ln -s /etc/nginx/sites-available/growwloan.online /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

---

## 📝 Backend .env File

```env
MONGODB_URI=mongodb+srv://khuntakash1211_db_user:lZH3uGqPnScmNLJS@cluster0.ax0teyf.mongodb.net/growloan?retryWrites=true&w=majority
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
PORT=5000
NODE_ENV=production
FIREBASE_PROJECT_ID=growloan-bfa5a
```

**JWT_SECRET Generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔄 Update Existing Deployment

### Backend Update
```bash
cd /var/www/growloan/backend
# Upload new files
npm install
pm2 restart growloan-backend
pm2 logs growloan-backend
```

### Frontend Update
```bash
cd /var/www/growloan/frontend
# Upload new files
npm install
npm run build
systemctl reload nginx
```

---

## 🛠️ Common Commands

### PM2
```bash
pm2 status
pm2 logs growloan-backend
pm2 restart growloan-backend
pm2 stop growloan-backend
pm2 start growloan-backend
pm2 delete growloan-backend
```

### Nginx
```bash
nginx -t                    # Test config
systemctl reload nginx      # Reload
systemctl restart nginx    # Restart
systemctl status nginx     # Status
```

### Logs
```bash
pm2 logs growloan-backend --lines 50
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Testing
```bash
# Backend test
curl http://localhost:5000/api/auth/me

# API through nginx
curl http://217.15.166.124/api/auth/me

# Check ports
netstat -tulpn | grep 5000
```

---

## 🔍 Troubleshooting

### 500 Error
```bash
# 1. Check backend
pm2 status
pm2 logs growloan-backend

# 2. Check nginx
tail -50 /var/log/nginx/error.log
nginx -t

# 3. Check backend manually
cd /var/www/growloan/backend
node server.js
```

### Permission Issues
```bash
chown -R www-data:www-data /var/www/growloan/frontend/build
chmod -R 755 /var/www/growloan/frontend/build
chown -R $USER:$USER /var/www/growloan/backend
```

### Port Issues
```bash
# Check if port 5000 is in use
netstat -tulpn | grep 5000
# Kill process if needed
kill -9 <PID>
```

---

## 📤 Upload Files from Local (Windows PowerShell)

```powershell
# Backend
scp -r E:\growloan\backend root@217.15.166.124:/var/www/growloan/

# Frontend
scp -r E:\growloan\frontend root@217.15.166.124:/var/www/growloan/

# Single file
scp E:\growloan\backend\.env root@217.15.166.124:/var/www/growloan/backend/
```

---

## ✅ Deployment Checklist

- [ ] Node.js installed
- [ ] PM2 installed
- [ ] Nginx installed
- [ ] Project files uploaded
- [ ] Backend .env created
- [ ] Backend dependencies installed
- [ ] Backend running in PM2
- [ ] Frontend dependencies installed
- [ ] Frontend build created
- [ ] Nginx config created
- [ ] Nginx config tested
- [ ] Nginx reloaded
- [ ] File permissions set
- [ ] Backend test successful
- [ ] Frontend accessible
- [ ] API calls working

---

## 🎯 Critical Points

1. **API URL:** Frontend uses `/api` (relative) in production ✅
2. **Nginx `/api` block:** Must exist for API to work
3. **PM2 auto-start:** Run `pm2 save` and `pm2 startup`
4. **Build path:** `/var/www/growloan/frontend/build`
5. **Backend port:** Must run on 5000

---

**For detailed steps, see: COMPLETE_DEPLOYMENT_GUIDE.md**

