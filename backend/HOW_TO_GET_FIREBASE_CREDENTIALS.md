# How to Get Firebase Admin SDK Credentials

This guide will help you find all the values needed for your `.env` file.

## Step 1: Go to Firebase Console

1. Open your browser and go to: https://console.firebase.google.com/
2. Select your project: **growloan-bfa5a**

## Step 2: Get Service Account Key (EASIEST METHOD)

### Option A: Download JSON File (Recommended)

1. In Firebase Console, click the **gear icon (⚙️)** next to "Project Overview"
2. Select **"Project settings"**
3. Go to the **"Service accounts"** tab
4. Click **"Generate new private key"** button
5. A popup will appear - click **"Generate key"**
6. A JSON file will download automatically (e.g., `growloan-bfa5a-firebase-adminsdk-xxxxx.json`)

### What to do with the downloaded file:

**EASIEST WAY:**
- Rename the downloaded file to: `serviceAccountKey.json`
- Copy it to: `F:\growloan\backend\config\serviceAccountKey.json`
- That's it! The backend will automatically use this file.

**OR if you want to use .env file:**
- Open the downloaded JSON file
- You'll see values like this:
```json
{
  "type": "service_account",
  "project_id": "growloan-bfa5a",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@growloan-bfa5a.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40growloan-bfa5a.iam.gserviceaccount.com"
}
```

### Mapping JSON to .env file:

Copy these values from the JSON file to your `.env` file:

```env
# From JSON: "project_id"
FIREBASE_PROJECT_ID=growloan-bfa5a

# From JSON: "private_key_id"
FIREBASE_PRIVATE_KEY_ID=abc123... (copy the value)

# From JSON: "private_key" (keep the \n characters)
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# From JSON: "client_email"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@growloan-bfa5a.iam.gserviceaccount.com

# From JSON: "client_id"
FIREBASE_CLIENT_ID=123456789 (copy the number)

# From JSON: "client_x509_cert_url"
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40growloan-bfa5a.iam.gserviceaccount.com
```

## Step 3: Create Your .env File

1. Go to `F:\growloan\backend\` folder
2. Copy `env.example.txt` and rename it to `.env`
   - Or create a new file named `.env`
3. Open the `.env` file in a text editor
4. Fill in the values:

### Already Set (No changes needed):
```env
MONGODB_URI=mongodb+srv://khuntakash1211_db_user:lZH3uGqPnScmNLJS@cluster0.ax0teyf.mongodb.net/growloan?retryWrites=true&w=majority
PORT=5000
NODE_ENV=development
FIREBASE_PROJECT_ID=growloan-bfa5a
```

### You Need to Fill:
```env
# Generate a random string (can use: https://randomkeygen.com/)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Get from downloaded service account JSON file (see above)
FIREBASE_PRIVATE_KEY_ID=your-private-key-id-from-json
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account-email-from-json
FIREBASE_CLIENT_ID=your-client-id-from-json
FIREBASE_CLIENT_X509_CERT_URL=your-cert-url-from-json
```

## Quick Setup (Recommended Method)

**Instead of using .env file, use the JSON file directly:**

1. Download the service account JSON from Firebase Console
2. Rename it to `serviceAccountKey.json`
3. Place it in: `F:\growloan\backend\config\serviceAccountKey.json`
4. Create a simple `.env` file with just:
```env
MONGODB_URI=mongodb+srv://khuntakash1211_db_user:lZH3uGqPnScmNLJS@cluster0.ax0teyf.mongodb.net/growloan?retryWrites=true&w=majority
JWT_SECRET=your_random_secret_key_here
PORT=5000
NODE_ENV=development
```

The backend will automatically use the JSON file if it exists in the config folder!

## Visual Guide

### Firebase Console Navigation:
```
Firebase Console
  └─ Project: growloan-bfa5a
      └─ ⚙️ Project Settings (gear icon)
          └─ Service accounts tab
              └─ Generate new private key button
                  └─ Download JSON file
```

## Important Notes

1. **Never commit** the `serviceAccountKey.json` or `.env` file to git (they're in .gitignore)
2. The **private_key** in JSON already has `\n` characters - keep them when copying to .env
3. Wrap the **FIREBASE_PRIVATE_KEY** value in quotes in .env file
4. The **client_x509_cert_url** has `%40` which is URL encoding for `@` - keep it as is

## Troubleshooting

### If you can't find "Service accounts" tab:
- Make sure you're the project owner/admin
- Try refreshing the page
- Check if you're in the correct project

### If download doesn't work:
- Try a different browser
- Check browser popup blocker settings
- Make sure you have permission to download files

### If you get errors after setup:
- Make sure the JSON file is in `backend/config/` folder
- Check that file name is exactly `serviceAccountKey.json`
- Verify all values in .env are correct (no extra spaces)

