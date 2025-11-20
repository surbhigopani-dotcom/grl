# All Common Causes for INVALID_APP_CREDENTIAL Error

## 🔍 Complete List of Web Causes

### 1️⃣ Authorized Domains Missing ⚠️ CHECK FIRST

**Issue:** Firebase Console → Authentication → Settings → "Authorized domains" માં તમારી domain add નથી.

**Fix:**
1. Go to: https://console.firebase.google.com/project/growloan-bfa5a/authentication/settings
2. Scroll to "Authorized domains"
3. Click "Add domain"
4. Add your current domain (e.g., `localhost`, `10.104.182.147`, or your production domain)
5. Click "Add"

**Note:** જો તમે IP address use કરો છો (like `10.104.182.147:3000`), તો IP address પણ add કરો.

---

### 2️⃣ reCAPTCHA Domain Mismatch

**Issue:** `signInWithPhoneNumber()` માટે reCAPTCHA verifier required છે. જે domain reCAPTCHA માં configured નથી, તો credentials invalid આવશે.

**Fix:**
1. Make sure your domain is in Firebase authorized domains (see #1)
2. reCAPTCHA automatically uses authorized domains
3. If using IP address, add it to authorized domains

**Check:**
- Current domain: Check browser console for `window.location.hostname`
- Authorized domains: Firebase Console → Authentication → Settings

---

### 3️⃣ API Key Restrictions

**Issue:** GCP Console માં જો API key ને "HTTP referrers" થી restrict કર્યો હોય અને request કરતી domain allowed નથી, તો error આવે.

**Fix:**
1. Go to: https://console.cloud.google.com/apis/credentials?project=growloan-bfa5a
2. Find API key: `AIzaSyBCCCd_NoafkLMRtJOXgyZ-Vm9vSt_GE98`
3. Click on it
4. Under "Application restrictions":
   - For development: Set to **"None"**
   - For production: Add your domain to "HTTP referrers"
5. Under "API restrictions":
   - For development: Set to **"Don't restrict key"**
   - For production: Add "Identity Toolkit API" to allowed APIs
6. Click "Save"

---

### 4️⃣ Identity Toolkit API Not Enabled ⚠️ MOST COMMON

**Issue:** Identity Toolkit API enabled નથી. આ 99% cases માં main cause છે.

**Fix:**
1. Go to: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=growloan-bfa5a
2. Click the big blue **"Enable"** button
3. Wait 30 seconds
4. Refresh page - should show "API enabled" with green checkmark

**Verify:**
- Should see "API enabled" status
- If still shows "Enable" button, wait 1-2 minutes and check again

---

### 5️⃣ Using Admin SDK on Client

**Issue:** `firebase-admin` અથવા service-account key client-side થી use કરતા હોવ તો security error આવે.

**Fix:**
- ❌ **NEVER** use `firebase-admin` on client-side
- ❌ **NEVER** expose service account keys in frontend code
- ✅ Use Firebase Client SDK (`firebase/app`, `firebase/auth`) on client
- ✅ Use Admin SDK only on server-side (backend)

**Check your code:**
- Make sure you're using `firebase/app` and `firebase/auth` (not `firebase-admin`)
- Service account keys should only be in backend `.env` files (never in frontend)

---

### 6️⃣ App Check Enabled But Not Implemented

**Issue:** App Check enable કર્યો હોય, પણ web app માં token implement નથી, તો auth fail થઈ શકે.

**Fix Option 1 - Implement App Check:**
```javascript
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
  isTokenAutoRefreshEnabled: true
});
```

**Fix Option 2 - Disable App Check (for development):**
1. Go to: Firebase Console → App Check
2. Disable App Check for development
3. Re-enable for production after implementing

---

### 7️⃣ Wrong Firebase Config

**Issue:** `firebaseConfig` માં exact values જે તમારા Firebase project થી લેવા જોઈએ તે match નથી.

**Fix:**
1. Go to: https://console.firebase.google.com/project/growloan-bfa5a/settings/general
2. Scroll to "Your apps" section
3. Find your web app
4. Verify these values match your code:
   - ✅ `apiKey`: `AIzaSyBCCCd_NoafkLMRtJOXgyZ-Vm9vSt_GE98`
   - ✅ `authDomain`: `growloan-bfa5a.firebaseapp.com`
   - ✅ `projectId`: `growloan-bfa5a`
   - ✅ `appId`: `1:122156905232:web:9d615a4588e0495ba8eb95`

**Check your code:**
- File: `frontend/src/config/firebase.js`
- Make sure all values match Firebase Console

---

### 8️⃣ Blocked Third-Party Cookies or CSP

**Issue:** Browser settings અથવા CSP policy reCAPTCHA અથવા Firebase calls block કરે છે.

**Fix:**

**Browser Settings:**
1. Check browser settings: Allow third-party cookies
2. Chrome: Settings → Privacy and security → Cookies and other site data → Allow all cookies
3. Firefox: Settings → Privacy & Security → Cookies and Site Data → Accept cookies from sites

**CSP (Content Security Policy):**
If you have CSP headers, add these domains:
```
script-src 'self' https://www.gstatic.com https://www.google.com https://www.googleapis.com;
connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;
frame-src 'self' https://www.google.com;
```

**Test:**
- Try in incognito/private mode
- Try in different browser
- Check browser console for CSP errors

---

### 9️⃣ Time Skew / Server Clock (Rare for Web)

**Issue:** Server clock out of sync હોય તો (rare for pure client web, but if server signs something).

**Fix:**
- Usually not an issue for client-side Firebase Auth
- If using backend, check server clock is synchronized
- Use NTP to sync server time

---

## 📋 Quick Diagnostic Checklist

Print this and check each item:

- [ ] **Authorized domains** - Current domain added?
  - Current: `window.location.hostname`
  - Link: https://console.firebase.google.com/project/growloan-bfa5a/authentication/settings

- [ ] **reCAPTCHA domain** - Matches authorized domains?

- [ ] **API key restrictions** - Set to "None" (dev) or domain allowed (prod)?
  - Link: https://console.cloud.google.com/apis/credentials?project=growloan-bfa5a

- [ ] **Identity Toolkit API** - Enabled with green checkmark?
  - Link: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=growloan-bfa5a

- [ ] **Phone Authentication** - Enabled in Firebase Console?
  - Link: https://console.firebase.google.com/project/growloan-bfa5a/authentication/providers

- [ ] **Firebase config** - All values match Firebase Console?

- [ ] **Third-party cookies** - Allowed in browser?

- [ ] **CSP headers** - Allow Firebase/reCAPTCHA domains?

- [ ] **App Check** - Either implemented OR disabled?

- [ ] **Admin SDK** - NOT used on client-side?

---

## 🚨 Most Common Order of Fix

1. **Add authorized domain** (if using IP or custom domain)
2. **Enable Identity Toolkit API** (99% of cases)
3. **Remove API key restrictions** (for development)
4. **Enable Phone Authentication**
5. **Wait 2-3 minutes**
6. **Clear browser cache**
7. **Restart development server**
8. **Try again**

---

## 💡 Still Not Working?

1. **Check browser console** for exact error message
2. **Check Network tab** - see which request is failing
3. **Try in incognito mode** - rules out cache/cookie issues
4. **Check Firebase Console logs** - see if requests are reaching Firebase
5. **Wait 5-10 minutes** - API changes can take time to propagate

---

## 📞 Need More Help?

The error modal in the app will show direct links to fix each issue. Follow the links and complete each step in order.

