# OAuth Client Configuration

## OAuth 2.0 Client Credentials

> ⚠️ **IMPORTANT:** Never store real secrets in git history.  
> Use environment variables (`.env`, secret manager, etc.) instead.

**Client ID:** `YOUR_GOOGLE_OAUTH_CLIENT_ID`

**Client Secret:** `YOUR_GOOGLE_OAUTH_CLIENT_SECRET`

## Authorized JavaScript Origins

The following origins are configured:
- ✅ `http://localhost`
- ✅ `http://localhost:3000` (Frontend dev server)
- ✅ `http://localhost:4000` (Backend dev server)
- ✅ `https://growloan-bfa5a.firebaseapp.com` (Firebase hosting)

## Authorized Redirect URIs

- ✅ `https://growloan-bfa5a.firebaseapp.com/_/auth/handler`

## Configuration Status

✅ OAuth client is properly configured
✅ All required origins are authorized
✅ Redirect URI is set correctly

## Note

For Firebase Phone Authentication, these OAuth credentials are not directly used. The main requirements are:
1. Firebase API key (already configured)
2. Phone Authentication enabled in Firebase Console
3. Identity Toolkit API enabled in Google Cloud Console

## Security Reminders

- Keep client secret secure
- Never expose in frontend code
- Use environment variables for backend
- Rotate secrets periodically

