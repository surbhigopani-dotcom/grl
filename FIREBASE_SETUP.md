# Firebase Setup Guide for GrowLoan

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Follow the setup wizard

## Step 2: Enable Phone Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Phone** provider
3. Add your app domain to authorized domains if needed

## Step 3: Get Frontend Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click on Web app icon (`</>`) or add new web app
4. Copy the Firebase configuration object

## Step 4: Update Frontend Config

Edit `frontend/src/config/firebase.js` and replace with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 5: Setup Firebase Admin SDK (Backend)

### Option A: Using Service Account Key File (Recommended for Development)

1. In Firebase Console, go to **Project Settings** > **Service accounts**
2. Click **Generate new private key**
3. Download the JSON file
4. Save it as `backend/config/serviceAccountKey.json`
5. **Important**: Add `serviceAccountKey.json` to `.gitignore`

### Option B: Using Environment Variables (Recommended for Production)

1. Download the service account key JSON file
2. Extract the following values:
   - `project_id`
   - `private_key_id`
   - `private_key`
   - `client_email`
   - `client_id`
   - `client_x509_cert_url`
3. Add them to your `.env` file (see `.env.example`)

## Step 6: Configure reCAPTCHA

Firebase Phone Auth uses invisible reCAPTCHA. It's automatically handled, but make sure:

1. Your domain is authorized in Firebase Console
2. For localhost, it works automatically
3. For production, add your domain to authorized domains

## Step 7: Test Phone Authentication

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm start`
3. Try logging in with a phone number
4. You'll receive OTP via SMS (Firebase handles this)

## Important Notes

- **Development**: Firebase allows testing with phone numbers you add to test numbers in Firebase Console
- **Production**: You need to enable billing in Firebase for phone authentication
- **Rate Limits**: Free tier has limits on phone authentication
- **Security**: Never commit `serviceAccountKey.json` to git

## Troubleshooting

### "reCAPTCHA verification failed"
- Make sure your domain is authorized
- Check browser console for errors
- Try clearing browser cache

### "Invalid phone number format"
- Use format: +91XXXXXXXXXX (with country code)
- Make sure phone number is 10 digits after +91

### "Firebase Admin SDK initialization error"
- Check if service account key file exists
- Verify environment variables are set correctly
- Make sure private key is properly formatted (with \n)

### "OTP not received"
- Check Firebase Console > Authentication > Users (should show verification attempts)
- Verify phone number is correct
- Check Firebase project billing status
- For testing, add phone number to test numbers in Firebase Console

