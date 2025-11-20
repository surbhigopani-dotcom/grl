# Quick Setup Guide for Backend

## Easiest Method: Use JSON File

### Step 1: Get Firebase Service Account Key

1. Go to: https://console.firebase.google.com/
2. Select project: **growloan-bfa5a**
3. Click **⚙️ (gear icon)** → **Project settings**
4. Go to **Service accounts** tab
5. Click **"Generate new private key"**
6. Click **"Generate key"** in popup
7. JSON file will download

### Step 2: Save the File

1. Rename downloaded file to: `serviceAccountKey.json`
2. Copy it to: `F:\growloan\backend\config\serviceAccountKey.json`

### Step 3: Create .env File

Create a file named `.env` in `F:\growloan\backend\` folder with this content:

```env
MONGODB_URI=mongodb+srv://khuntakash1211_db_user:lZH3uGqPnScmNLJS@cluster0.ax0teyf.mongodb.net/growloan?retryWrites=true&w=majority
JWT_SECRET=change_this_to_a_random_string_at_least_32_characters_long
PORT=5000
NODE_ENV=development
```

### Step 4: Generate JWT Secret

You can use any random string generator or use this command:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as `JWT_SECRET` value.

### That's it!

The backend will automatically use the `serviceAccountKey.json` file for Firebase Admin SDK.

## File Structure Should Look Like:

```
backend/
├── config/
│   ├── firebaseAdmin.js
│   └── serviceAccountKey.json  ← Your downloaded file goes here
├── .env                         ← Create this file
├── server.js
└── ...
```

## Test It

1. Start backend: `cd backend && npm start`
2. You should see: "MongoDB Connected Successfully"
3. No Firebase errors = Success! ✅

