# Firebase Configuration Verification Checklist

## ⚠️ CRITICAL: This error requires manual configuration in Google Cloud Console and Firebase Console

The `auth/invalid-app-credential` error means Firebase cannot validate your app credentials. This is **NOT a code issue** - it's a configuration issue that must be fixed in the Firebase/Google Cloud Console.

## ✅ Step-by-Step Verification

### Step 1: Verify Identity Toolkit API is Enabled (MOST IMPORTANT!)

**This is the #1 cause of this error!**

1. **Open this link:** https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=growloan-bfa5a

2. **Check the status:**
   - ✅ **If you see "API enabled"** with a green checkmark → API is enabled, move to Step 2
   - ❌ **If you see a blue "Enable" button** → Click it, wait 30 seconds, then continue

3. **Verify it's enabled:**
   - Refresh the page
   - You should see "API enabled" with a green checkmark
   - If not, wait 1-2 minutes and check again

### Step 2: Verify Firebase Authentication API is Enabled

1. **Open this link:** https://console.cloud.google.com/apis/library/firebase.googleapis.com?project=growloan-bfa5a

2. **Check the status:**
   - ✅ **If you see "API enabled"** → Move to Step 3
   - ❌ **If you see "Enable" button** → Click it, wait 30 seconds

### Step 3: Check API Key Restrictions

1. **Open this link:** https://console.cloud.google.com/apis/credentials?project=growloan-bfa5a

2. **Find your API key:**
   - Look for: `AIzaSyBCCCd_NoafkLMRtJOXgyZ-Vm9vSt_GE98`
   - Click on it to edit

3. **Check Application restrictions:**
   - Should be set to: **"None"** (for development)
   - If it's set to "HTTP referrers" or "IP addresses", change it to "None"
   - Click "Save"

4. **Check API restrictions:**
   - Should be set to: **"Don't restrict key"** (for development)
   - OR if restricted, make sure "Identity Toolkit API" is in the allowed list
   - Click "Save"

### Step 4: Verify Phone Authentication is Enabled

1. **Open this link:** https://console.firebase.google.com/project/growloan-bfa5a/authentication/providers

2. **Check Phone provider:**
   - Click on "Phone" provider
   - Toggle "Enable" should be **ON** (green/enabled)
   - If it's OFF, toggle it ON and click "Save"

### Step 5: Verify Authorized Domains

1. **Open this link:** https://console.firebase.google.com/project/growloan-bfa5a/authentication/settings

2. **Check Authorized domains:**
   - Scroll to "Authorized domains" section
   - Make sure `localhost` is in the list
   - If not, click "Add domain" and add `localhost`
   - If you're using an IP address (like `10.104.182.147`), add that too

### Step 6: Wait and Test

1. **Wait 2-3 minutes** for all changes to propagate
2. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "Cached images and files"
   - Click "Clear data"
3. **Restart development server:**
   - Stop the server (Ctrl+C)
   - Run `npm start` again
4. **Try sending OTP again**

## 🔍 Quick Diagnostic

If you're still getting the error after following all steps:

1. **Double-check Identity Toolkit API:**
   - Go to: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=growloan-bfa5a
   - Must show "API enabled" with green checkmark
   - If not, enable it and wait 5 minutes

2. **Check API key restrictions:**
   - Go to: https://console.cloud.google.com/apis/credentials?project=growloan-bfa5a
   - Application restrictions: Must be "None"
   - API restrictions: Must be "Don't restrict key" OR include "Identity Toolkit API"

3. **Verify billing (if required):**
   - Go to: https://console.firebase.google.com/project/growloan-bfa5a/usage
   - Some Firebase features require billing to be enabled
   - For development, free tier with billing enabled is usually enough

4. **Check project settings:**
   - Go to: https://console.firebase.google.com/project/growloan-bfa5a/settings/general
   - Verify project ID matches: `growloan-bfa5a`

## 📋 Complete Checklist

Print this checklist and check each item:

- [ ] **Identity Toolkit API is enabled** (green checkmark)
  - Link: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=growloan-bfa5a

- [ ] **Firebase Authentication API is enabled** (green checkmark)
  - Link: https://console.cloud.google.com/apis/library/firebase.googleapis.com?project=growloan-bfa5a

- [ ] **API key has no application restrictions** (set to "None")
  - Link: https://console.cloud.google.com/apis/credentials?project=growloan-bfa5a

- [ ] **API key has no API restrictions** (set to "Don't restrict key")
  - Or Identity Toolkit API is in allowed list

- [ ] **Phone Authentication is enabled** (toggle ON)
  - Link: https://console.firebase.google.com/project/growloan-bfa5a/authentication/providers

- [ ] **localhost is in authorized domains**
  - Link: https://console.firebase.google.com/project/growloan-bfa5a/authentication/settings

- [ ] **Waited 2-3 minutes** after making changes

- [ ] **Cleared browser cache**

- [ ] **Restarted development server**

- [ ] **Tried sending OTP again**

## 🚨 Most Common Mistakes

1. **Not waiting long enough** - API changes can take 2-5 minutes to propagate
2. **Not clearing browser cache** - Old cached responses can cause issues
3. **API key still restricted** - Must be set to "None" for development
4. **Identity Toolkit API not enabled** - This is the #1 cause!

## 💡 Still Not Working?

If you've checked everything and it's still not working:

1. **Take a screenshot** of:
   - Identity Toolkit API page (showing enabled status)
   - API key settings (showing restrictions)
   - Phone Authentication settings (showing enabled status)

2. **Check the browser console** for the exact error message

3. **Try in incognito/private mode** to rule out cache issues

4. **Wait 10 minutes** - Sometimes changes take longer to propagate

## 📞 Need Help?

The error message in the console will show direct links to fix each issue. Follow those links and complete each step.

Remember: **This is a configuration issue, not a code issue.** The code is working correctly - Firebase just needs to be configured properly in the console.

