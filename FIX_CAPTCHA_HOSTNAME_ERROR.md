# Fix Firebase CAPTCHA Hostname Error

## Error: `auth/captcha-check-failed` - "Hostname match not found"

This error occurs when your app is running on a domain/IP that is not authorized in Firebase Console.

## Current Issue

Your app is running on: `http://10.104.182.147:3000`

This IP address is **not authorized** in Firebase Console, so reCAPTCHA fails.

## Quick Fix Options

### Option 1: Add IP to Authorized Domains (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **growloan-bfa5a**
3. Navigate to **Authentication** > **Settings**
4. Scroll to **Authorized domains** section
5. Click **"Add domain"** button
6. Enter: `10.104.182.147`
7. Click **Add**
8. Wait 1-2 minutes
9. Try again

### Option 2: Use localhost Instead (Easier)

If you're testing locally, use `localhost` instead:

1. Access your app via: `http://localhost:3000`
2. `localhost` is already authorized by default
3. No additional configuration needed

### Option 3: Add Port-Specific Domain

If you need the IP address, add it with port:

1. In Firebase Console > Authentication > Settings
2. Add domain: `10.104.182.147:3000`
3. Or just: `10.104.182.147` (works for all ports)

## Step-by-Step: Add Domain to Firebase

1. **Go to Firebase Console:**
   - Link: https://console.firebase.google.com/project/growloan-bfa5a/authentication/settings

2. **Scroll to "Authorized domains"**

3. **Click "Add domain"**

4. **Enter your domain/IP:**
   - For IP: `10.104.182.147`
   - For localhost: `localhost` (usually already there)

5. **Click "Add"**

6. **Wait 1-2 minutes** for changes to propagate

7. **Refresh your app** and try again

## Current Authorized Domains

Based on your OAuth client config, these should be authorized:
- ✅ `localhost`
- ✅ `localhost:3000`
- ✅ `localhost:4000`
- ✅ `growloan-bfa5a.firebaseapp.com`
- ❌ `10.104.182.147` (needs to be added)

## Why This Happens

Firebase reCAPTCHA checks if the domain where your app is running is in the authorized domains list. If not, it blocks the request for security.

## Quick Test

After adding the domain:
1. Wait 1-2 minutes
2. Clear browser cache
3. Refresh the page
4. Try sending OTP again

## Alternative: Use localhost

If you're on the same machine:
- Instead of `http://10.104.182.147:3000`
- Use `http://localhost:3000`
- This is already authorized ✅

## Summary

**Quick Fix:**
1. Add `10.104.182.147` to Firebase authorized domains
2. OR use `localhost:3000` instead
3. Wait 1-2 minutes
4. Try again

That's it! 🎉

