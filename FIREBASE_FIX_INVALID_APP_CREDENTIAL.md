# Fix Firebase INVALID_APP_CREDENTIAL Error

## Error: `auth/invalid-app-credential`

This error occurs when Firebase cannot validate your app credentials. Even though reCAPTCHA works, Firebase still needs proper configuration.

## ✅ OAuth Client Status

Your OAuth client is properly configured:
- **Client ID:** `122156905232-aahdo189pqkbjgcbmb65hkok1pjshn1a.apps.googleusercontent.com`
- **Authorized Origins:** localhost:3000, localhost:4000, firebaseapp.com ✅
- **Redirect URIs:** Configured correctly ✅

**Note:** OAuth credentials are separate from Firebase Phone Auth. The issue is with API configuration.

## Step-by-Step Fix

### Step 1: Enable Phone Authentication in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **growloan-bfa5a**
3. Navigate to **Authentication** > **Sign-in method**
4. Find **Phone** provider
5. Click on it
6. **Enable** it (toggle should be ON)
7. Click **Save**

### Step 2: Check API Key Restrictions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **growloan-bfa5a**
3. Navigate to **APIs & Services** > **Credentials**
4. Find your API key: `AIzaSyBCCCd_NoafkLMRtJOXgyZ-Vm9vSt_GE98`
5. Click on it to edit

#### Application Restrictions:
- **For Development**: Set to **None** (temporarily) ⚠️ **RECOMMENDED FOR TESTING**
- **For Production**: Add your domains:
  - `localhost` (for development)
  - `http://localhost:3000` (frontend)
  - `http://localhost:4000` (backend)
  - Your production domain

#### API Restrictions:
**⚠️ CRITICAL:** Choose one:
- **Option 1 (Recommended for Dev):** Set to **"Don't restrict key"**
- **Option 2:** If restricting, make sure these APIs are in the allowed list:
  - ✅ **Identity Toolkit API** (MUST BE ENABLED) - This is critical!
  - ✅ **Firebase Authentication API** (MUST BE ENABLED)
  - ✅ **Firebase Installations API**

### Step 3: Enable Required APIs (⚠️ MOST CRITICAL STEP!)

**This is the most common cause of `auth/invalid-app-credential` error!**

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Enable these APIs (click "Enable" for each):

   **🔴 Identity Toolkit API** - ⚠️ **THIS IS THE MAIN ONE!**
   - Direct link: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=growloan-bfa5a
   - Click "Enable" button
   - This API is REQUIRED for Firebase Phone Authentication
   
   **🟡 Firebase Authentication API**
   - Direct link: https://console.cloud.google.com/apis/library/firebase.googleapis.com?project=growloan-bfa5a
   - Click "Enable" button
   
   **🟢 Firebase Installations API**
   - Direct link: https://console.cloud.google.com/apis/library/firebaseinstallations.googleapis.com?project=growloan-bfa5a
   - Click "Enable" button

**⚠️ IMPORTANT:** If Identity Toolkit API is not enabled, you WILL get `auth/invalid-app-credential` error!

### Step 4: Verify Authorized Domains

1. In Firebase Console, go to **Authentication** > **Settings**
2. Scroll to **Authorized domains**
3. Make sure these are listed:
   - `localhost` (for development)
   - `growloan-bfa5a.firebaseapp.com`
   - Your production domain (if deployed)

### Step 5: Verify Firebase Project Settings

1. Go to Firebase Console > **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Find your web app
4. Verify all values match `frontend/src/config/firebase.js`:
   - ✅ apiKey: `AIzaSyBCCCd_NoafkLMRtJOXgyZ-Vm9vSt_GE98`
   - ✅ authDomain: `growloan-bfa5a.firebaseapp.com`
   - ✅ projectId: `growloan-bfa5a`
   - ✅ appId: `1:122156905232:web:9d615a4588e0495ba8eb95`

### Step 6: Check Billing Status

Firebase Phone Authentication requires billing to be enabled:
1. Go to Firebase Console > **Usage and billing**
2. If billing is not enabled, enable it (Blaze plan required for production)
3. For development/testing, you can use the free tier with billing enabled

### Step 7: Wait for Propagation

After making changes:
- Wait 2-3 minutes for changes to propagate
- Clear browser cache
- Restart development server

## Quick Checklist

- [ ] **Phone Authentication enabled** in Firebase Console (Authentication > Sign-in method > Phone > Enable)
- [ ] **Identity Toolkit API enabled** in Google Cloud Console ⚠️ **MOST IMPORTANT**
  - Direct link: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=growloan-bfa5a
- [ ] **Firebase Authentication API enabled** in Google Cloud Console
- [ ] **API key restrictions** set correctly:
  - Application restrictions: **None** (for dev) OR add `localhost`, `localhost:3000`
  - API restrictions: **Don't restrict key** (for dev) OR add Identity Toolkit API
- [ ] **Authorized domains** include `localhost` (Firebase Console > Authentication > Settings)
- [ ] **Billing enabled** (if required for production)
- [ ] **All config values** match Firebase Console
- [ ] **OAuth client** properly configured (already done ✅)

## Common Issues

### Issue 1: API Key is Restricted
**Solution**: 
- Go to Google Cloud Console > Credentials
- Edit API key
- Set Application restrictions to "None" (for development)
- Or add `localhost` to HTTP referrers

### Issue 2: APIs Not Enabled
**Solution**:
- Go to Google Cloud Console > APIs & Services > Library
- Enable: Identity Toolkit API, Firebase Authentication API

### Issue 3: Phone Auth Not Enabled
**Solution**:
- Go to Firebase Console > Authentication > Sign-in method
- Enable Phone provider

### Issue 4: Domain Not Authorized
**Solution**:
- Go to Firebase Console > Authentication > Settings
- Add `localhost` to authorized domains

## Test After Fix

1. Clear browser cache
2. Restart development server: `npm start`
3. Try sending OTP again
4. Check console for errors

## Still Not Working?

1. **Double-check all steps above**
2. **Verify API key is not restricted** (set to None temporarily)
3. **Check Firebase Console for any error messages**
4. **Try creating a new API key** in Google Cloud Console
5. **Verify billing is enabled** if using production

## Important Notes

- Changes in Firebase Console can take 2-3 minutes to propagate
- API restrictions can block requests - set to None for development
- Phone Authentication requires billing to be enabled (even on free tier)
- Make sure all required APIs are enabled in Google Cloud Console
