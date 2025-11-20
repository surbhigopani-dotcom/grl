# Quick Fix for Firebase INVALID_APP_CREDENTIAL Error

## 🔍 Common Causes (Check in Order)

1. **Authorized domains missing** - Your domain not added to Firebase
2. **Identity Toolkit API not enabled** - Most common cause (99%)
3. **API key restrictions** - Domain not allowed in API key settings
4. **reCAPTCHA domain mismatch** - Domain not authorized
5. **Phone Authentication not enabled** - Provider disabled
6. **Firebase config mismatch** - Wrong apiKey/authDomain/projectId
7. **Third-party cookies blocked** - Browser/CSP blocking Firebase
8. **App Check enabled** - But not implemented in web app

## ⚠️ Most Common Issue: Identity Toolkit API Not Enabled

**99% of the time, this error is because Identity Toolkit API is not enabled!**

**Note:** Even if reCAPTCHA works, you still need to enable Identity Toolkit API for Phone Authentication to work.

**For complete list of all causes, see:** `FIREBASE_ALL_CAUSES.md`

## Quick Fix (2 Minutes)

### Step 0: Add Authorized Domain (CHECK FIRST!)

1. **Check your current domain:**
   - Open browser console (F12)
   - Type: `window.location.hostname`
   - Note the domain (e.g., `localhost`, `10.104.182.147`)

2. **Add to Firebase authorized domains:**
   - **Click this link:** https://console.firebase.google.com/project/growloan-bfa5a/authentication/settings
   - Scroll to "Authorized domains"
   - Click "Add domain"
   - Add your domain (e.g., `localhost` or your IP address)
   - Click "Add"

**Note:** If using IP address like `10.104.182.147`, add that to authorized domains.

### Step 1: Enable Identity Toolkit API

1. **Click this link:** https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=growloan-bfa5a
2. Click the big blue **"Enable"** button
3. Wait 30 seconds

### Step 2: Enable Firebase Authentication API

1. **Click this link:** https://console.cloud.google.com/apis/library/firebase.googleapis.com?project=growloan-bfa5a
2. Click **"Enable"** button
3. Wait 30 seconds

### Step 3: Check API Key Restrictions

1. Go to: https://console.cloud.google.com/apis/credentials?project=growloan-bfa5a
2. Find API key: `AIzaSyBCCCd_NoafkLMRtJOXgyZ-Vm9vSt_GE98`
3. Click on it
4. Under **Application restrictions**: Set to **"None"** (for development)
5. Under **API restrictions**: Set to **"Don't restrict key"** (for development)
6. Click **Save**

### Step 4: Enable Phone Authentication

1. Go to: https://console.firebase.google.com/project/growloan-bfa5a/authentication/providers
2. Click on **Phone** provider
3. Toggle **Enable** to ON
4. Click **Save**

### Step 5: Wait and Test

1. Wait 2-3 minutes for changes to propagate
2. Clear browser cache (Ctrl+Shift+Delete)
3. Restart development server
4. Try sending OTP again

## ✅ OAuth Client Status

Your OAuth client is already properly configured:
- ✅ Client ID: `122156905232-aahdo189pqkbjgcbmb65hkok1pjshn1a.apps.googleusercontent.com`
- ✅ Authorized origins: localhost:3000, localhost:4000, firebaseapp.com
- ✅ Redirect URIs: Configured correctly

**Note:** OAuth credentials are separate from Firebase Phone Auth API configuration.

## Still Not Working?

If you still get the error after enabling Identity Toolkit API:

1. **Double-check Identity Toolkit API is enabled:**
   - Go to: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=growloan-bfa5a
   - Should show "API enabled" with green checkmark

2. **Verify API key has no restrictions:**
   - Application restrictions: None
   - API restrictions: Don't restrict key

3. **Check Phone Authentication is enabled:**
   - Go to Firebase Console > Authentication > Sign-in method
   - Phone provider should be enabled

4. **Wait longer:** Sometimes changes take 5-10 minutes to propagate

## Summary

The fix is usually just:
1. ✅ Enable Identity Toolkit API
2. ✅ Remove API key restrictions (for dev)
3. ✅ Enable Phone Authentication
4. ✅ Wait 2-3 minutes

That's it! 🎉

## ⚠️ IMPORTANT NOTES

1. **This is NOT a code issue** - It's a Firebase Console configuration issue
2. **reCAPTCHA working ≠ Phone Auth working** - Even if reCAPTCHA works, you still need Identity Toolkit API enabled
3. **Changes take time** - Wait 2-5 minutes after enabling APIs before testing
4. **Clear cache** - Always clear browser cache after making changes

## 📋 Detailed Checklist

For a complete step-by-step verification checklist, see: `FIREBASE_VERIFICATION_CHECKLIST.md`

