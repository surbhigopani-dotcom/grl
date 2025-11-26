# Setup Instructions - Fix Connection Issues

## Backend Server Setup

### 1. Start Backend Server

```bash
cd backend
npm install
node server.js
```

The backend should start on port 5000.

### 2. Frontend Development Setup

For local development, the frontend is now configured to use:
- **Relative paths** (`/api`) - works with nginx proxy
- **Proxy** in package.json - proxies to `http://localhost:5000` during development

### 3. Environment Variables

Create `.env` file in `frontend` folder (optional):

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Or use the proxy (default - no .env needed).

### 4. Start Frontend

```bash
cd frontend
npm install
npm start
```

The frontend will run on `http://localhost:3000` and proxy API calls to `http://localhost:5000/api`.

## Production Setup

In production with nginx:
- Frontend uses relative paths (`/api`)
- Nginx proxies `/api/*` to backend server
- No hardcoded IPs needed

## Troubleshooting

### Connection Refused Error

1. **Check if backend is running:**
   ```bash
   cd backend
   node server.js
   ```

2. **Check backend port:**
   - Default: `http://localhost:5000`
   - Check console for: `Server running on port 5000`

3. **For remote server:**
   - Make sure backend is accessible
   - Check firewall settings
   - Use nginx proxy instead of direct IP

### Fix Applied

✅ Changed API URL to use relative paths (`/api`)
✅ Added proxy configuration in package.json
✅ Fixed document URLs to use relative paths
✅ Removed hardcoded IP addresses

Now the app will work with:
- Local development (with proxy)
- Production (with nginx)
- No hardcoded IPs needed

