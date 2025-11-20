# Fix MongoDB Connection Error

## Problem:
```
MongoDB connection error: Could not connect to any servers in your MongoDB Atlas cluster. 
One common reason is that you're trying to access the database from an IP that isn't whitelisted.
```

## Solution: Whitelist Your IP Address in MongoDB Atlas

### Step 1: Go to MongoDB Atlas
1. Open: https://cloud.mongodb.com/
2. Login to your account
3. Select your cluster: **cluster0**

### Step 2: Add IP Address to Whitelist
1. Click on **"Network Access"** in the left sidebar
2. Click **"Add IP Address"** button
3. You have two options:

   **Option A: Add Your Current IP (Recommended)**
   - Click **"Add Current IP Address"** button
   - This will automatically add your current IP
   - Click **"Confirm"**

   **Option B: Allow All IPs (For Development Only - Less Secure)**
   - Enter: `0.0.0.0/0`
   - Click **"Confirm"**
   - ⚠️ Warning: This allows access from anywhere. Only use for development!

### Step 3: Wait for Changes to Apply
- Changes usually apply within 1-2 minutes
- You'll see a green checkmark when it's active

### Step 4: Restart Your Backend Server
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

## Alternative: Check Your Connection String

If you still have issues, verify your connection string in `.env` file:
```env
MONGODB_URI=mongodb+srv://khuntakash1211_db_user:lZH3uGqPnScmNLJS@cluster0.ax0teyf.mongodb.net/growloan?retryWrites=true&w=majority
```

Make sure:
- Username is correct: `khuntakash1211_db_user`
- Password is correct
- Database name is correct: `growloan`

## Quick Fix (Allow All IPs for Development)

If you want to quickly test, you can allow all IPs:

1. MongoDB Atlas → Network Access
2. Add IP Address → Enter: `0.0.0.0/0`
3. Confirm
4. Wait 1-2 minutes
5. Restart backend server

⚠️ **Remember**: Change this to specific IPs in production!

