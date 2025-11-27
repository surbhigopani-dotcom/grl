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

**Frontend `.env` file** (optional):

Create `.env` file in `frontend` folder:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Or use the proxy (default - no .env needed).

**Backend `.env` file** (required for WhatsApp OTP):

Create `.env` file in `backend` folder:

```env
# JWT Secret
JWT_SECRET=your_jwt_secret_here

# WhatsApp API Configuration (for OTP)
WHATSAPP_API_KEY=c266a3f87bae4e209050834b27d669ba
WHATSAPP_COUNTRY_CODE=IN

# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string

# Other environment variables...
```

See `WHATSAPP_OTP_SETUP.md` for detailed WhatsApp OTP configuration.

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

