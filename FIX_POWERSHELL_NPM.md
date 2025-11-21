# Fix PowerShell NPM Error - Execution Policy

## Problem
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
```

## Solution

### Option 1: Run PowerShell as Administrator (Recommended)

1. **Open PowerShell as Administrator:**
   - Press `Windows Key + X`
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"
   - Click "Yes" on UAC prompt

2. **Set Execution Policy:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Verify:**
   ```powershell
   Get-ExecutionPolicy
   ```
   Should show: `RemoteSigned`

4. **Now try npm:**
   ```powershell
   cd E:\growloan\frontend
   npm install
   ```

### Option 2: Use Command Prompt (CMD) Instead

If you don't want to change PowerShell settings:

1. **Open Command Prompt (CMD):**
   - Press `Windows Key + R`
   - Type `cmd` and press Enter

2. **Run npm commands:**
   ```cmd
   cd E:\growloan\frontend
   npm install
   ```

### Option 3: Bypass for Current Session Only

If you want to run npm just once without changing policy:

```powershell
powershell -ExecutionPolicy Bypass -Command "cd E:\growloan\frontend; npm install"
```

## Execution Policy Options

- **RemoteSigned** (Recommended): Allows local scripts, requires signed remote scripts
- **Unrestricted**: Allows all scripts (less secure)
- **Bypass**: No restrictions (only for current session)

## Quick Fix Command

Run this in PowerShell (as Administrator):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try:
```powershell
cd E:\growloan\frontend
npm install
```

---

**Note:** After setting the policy, you can use npm normally in PowerShell.

