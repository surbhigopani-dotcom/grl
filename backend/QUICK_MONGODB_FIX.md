# Quick Fix for MongoDB Connection

## The Issue:
Your IP address is not whitelisted in MongoDB Atlas.

## Quick Solution (2 minutes):

### 1. Go to MongoDB Atlas:
https://cloud.mongodb.com/

### 2. Network Access:
- Click **"Network Access"** (left sidebar)
- Click **"Add IP Address"**
- Click **"Add Current IP Address"** (or enter `0.0.0.0/0` for all IPs)
- Click **"Confirm"**

### 3. Wait 1-2 minutes for changes to apply

### 4. Restart backend:
```bash
# Press Ctrl+C to stop
npm run dev
```

## Visual Guide:

```
MongoDB Atlas Dashboard
  └─ Network Access (left sidebar)
      └─ Add IP Address button
          └─ Add Current IP Address (or 0.0.0.0/0)
              └─ Confirm
                  └─ Wait 1-2 minutes
                      └─ Restart server ✅
```

## That's it! Your MongoDB should connect now. 🎉

