# OTP Configuration Guide

## How to Enable/Disable OTP Authentication

OTP authentication can be enabled or disabled using an environment variable.

### Step 1: Create `.env` file

Create a file named `.env` in the `frontend` folder:

```
frontend/.env
```

### Step 2: Add OTP Configuration

Add this line to the `.env` file:

```env
# OTP Configuration
# Set to true to enable OTP authentication, false to disable
REACT_APP_OTP_ENABLED=false
```

### Step 3: Set the Value

- **To DISABLE OTP** (current setting):
  ```env
  REACT_APP_OTP_ENABLED=false
  ```

- **To ENABLE OTP**:
  ```env
  REACT_APP_OTP_ENABLED=true
  ```

### Step 4: Restart Development Server

After changing the `.env` file, you **MUST** restart the development server:

1. Stop the server (Ctrl+C)
2. Start it again:
   ```bash
   npm start
   ```

**Important:** React environment variables are only loaded when the server starts. Changes to `.env` won't take effect until you restart.

## Current Status

- **OTP is currently DISABLED** (default)
- When disabled, the "Send OTP" button will be disabled
- A warning message will be shown to users
- Users cannot send OTP when disabled

## How It Works

1. The app checks `REACT_APP_OTP_ENABLED` environment variable
2. If `false` or not set → OTP is disabled
3. If `true` → OTP is enabled and works normally
4. The button and UI automatically adapt based on this setting

## Example `.env` File

```env
# OTP Configuration
REACT_APP_OTP_ENABLED=false

# Other environment variables can be added here
# REACT_APP_API_URL=http://localhost:5000
```

## Notes

- The `.env` file should be in the `frontend` folder (same level as `package.json`)
- Environment variables in React must start with `REACT_APP_`
- The `.env` file is typically not committed to git (already in `.gitignore`)
- Always restart the server after changing `.env` file

