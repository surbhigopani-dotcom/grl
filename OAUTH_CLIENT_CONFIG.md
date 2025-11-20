# OAuth Client Configuration

## OAuth 2.0 Client Credentials

**Client ID:** `122156905232-aahdo189pqkbjgcbmb65hkok1pjshn1a.apps.googleusercontent.com`

**Client Secret:** `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`

⚠️ **IMPORTANT:** Never commit client secrets to version control!

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

