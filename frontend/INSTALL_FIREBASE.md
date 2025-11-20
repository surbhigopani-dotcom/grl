# Firebase Installation Instructions

If you're getting "Module not found" errors for Firebase, follow these steps:

## Step 1: Install Firebase Package

Open terminal in the frontend directory and run:

```bash
cd frontend
npm install firebase
```

Or if you're in the root directory:

```bash
cd F:\growloan\frontend
npm install firebase
```

## Step 2: Verify Installation

After installation, check that `node_modules/firebase` exists:

```bash
ls node_modules/firebase
```

## Step 3: Restart Development Server

After installing, restart your React development server:

```bash
npm start
```

## Alternative: Install All Dependencies

If Firebase still doesn't work, reinstall all dependencies:

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Troubleshooting

If you still get errors:
1. Make sure you're in the `frontend` directory
2. Check that `package.json` has `"firebase": "^10.7.1"` in dependencies
3. Try clearing npm cache: `npm cache clean --force`
4. Delete `node_modules` and `package-lock.json`, then run `npm install` again

