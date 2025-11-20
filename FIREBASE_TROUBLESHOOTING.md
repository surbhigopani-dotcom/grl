# Firebase INVALID_APP_CREDENTIAL Error - Troubleshooting Guide

## Error: INVALID_APP_CREDENTIAL (400)

This error occurs when Firebase cannot validate your app credentials. Here's how to fix it:

## Step 1: Verify Firebase Console Settings

### 1.1 Enable Phone Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **growloan-bfa5a**
3. Navigate to **Authentication** > **Sign-in method**
4. Find **Phone** provider
5. Click on it and **Enable** it
6. Save changes

### 1.2 Check Authorized Domains
1. In Firebase Console, go to **Authentication** > **Settings**
2. Scroll to **Authorized domains**
3. Make sure these domains are added:
   - `localhost` (for development)
   - Your production domain (if deployed)
   - `growloan-bfa5a.firebaseapp.com`

### 1.3 Verify API Key Restrictions
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **growloan-bfa5a**
3. Navigate to **APIs & Services** > **Credentials**
4. Find your API key: `AIzaSyBCCCd_NoafkLMRtJOXgyZ-Vm9vSt_GE98`
5. Click on it to edit
6. Check **Application restrictions**:
   - If set to "HTTP referrers", add your domains
   - If set to "None", it should work
   - For development, you can set to "None" temporarily
7. Check **API restrictions**:
   - Make sure "Identity Toolkit API" is enabled
   - Make sure "Firebase Authentication API" is enabled

## Step 2: Enable Required APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **growloan-bfa5a**
3. Navigate to **APIs & Services** > **Library**
4. Enable these APIs:
   - **Identity Toolkit API**
   - **Firebase Authentication API**
   - **Firebase Installations API**

## Step 3: Verify Firebase Project Settings

1. Go to Firebase Console > **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Verify your web app configuration matches `frontend/src/config/firebase.js`
4. Check that all values are correct:
   - apiKey
   - authDomain
   - projectId
   - appId

## Step 4: Check Browser Console

Open browser DevTools (F12) and check:
1. **Console tab**: Look for any Firebase initialization errors
2. **Network tab**: Check if Firebase API calls are being made
3. **Application tab**: Check if Firebase is storing tokens

## Step 5: Test with Firebase Test Numbers

For testing without real SMS:
1. Go to Firebase Console > **Authentication** > **Sign-in method** > **Phone**
2. Scroll to **Phone numbers for testing**
3. Add test numbers (format: +91XXXXXXXXXX)
4. These numbers will receive OTP: 123456

## Step 6: Common Issues and Solutions

### Issue: API Key is Restricted
**Solution**: 
- Go to Google Cloud Console > Credentials
- Edit your API key
- Set Application restrictions to "None" (for development)
- Or add your domain to HTTP referrers

### Issue: Phone Authentication Not Enabled
**Solution**:
- Enable Phone provider in Firebase Console
- Wait a few minutes for changes to propagate

### Issue: Domain Not Authorized
**Solution**:
- Add your domain to authorized domains in Firebase Console
- For localhost, it should work automatically

### Issue: Billing Not Enabled
**Solution**:
- Firebase Phone Auth requires billing to be enabled
- Go to Firebase Console > Usage and billing
- Enable billing (Blaze plan required for production)

## Step 7: Verify Configuration File

Check `frontend/src/config/firebase.js`:
- All values should match Firebase Console
- No typos in API key or project ID
- App ID should match your web app

## Step 8: Clear Browser Cache

Sometimes cached credentials cause issues:
1. Clear browser cache
2. Clear localStorage: `localStorage.clear()`
3. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## Step 9: Check Network/Firewall

- Ensure Firebase APIs are not blocked
- Check if corporate firewall is blocking requests
- Try from different network

## Still Not Working?

1. **Double-check Firebase Console**:
   - Phone Authentication: Enabled ✓
   - Authorized domains: localhost added ✓
   - API restrictions: None or correct domains ✓

2. **Verify API Key**:
   - Copy fresh API key from Firebase Console
   - Update `frontend/src/config/firebase.js`
   - Restart development server

3. **Check Firebase Project Status**:
   - Ensure project is active
   - Check for any project-level restrictions
   - Verify billing is enabled (if needed)

4. **Contact Support**:
   - Firebase Support: https://firebase.google.com/support
   - Check Firebase Status: https://status.firebase.google.com/

## Quick Checklist

- [ ] Phone Authentication enabled in Firebase Console
- [ ] Domain added to authorized domains
- [ ] API key restrictions configured correctly
- [ ] Identity Toolkit API enabled
- [ ] Firebase Authentication API enabled
- [ ] Configuration file matches Firebase Console
- [ ] Browser cache cleared
- [ ] Development server restarted

