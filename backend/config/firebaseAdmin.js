const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
// You need to download service account key from Firebase Console
// and save it as serviceAccountKey.json in the config folder
// Or use environment variables

let serviceAccount;

// Try to load from file first
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (fs.existsSync(serviceAccountPath)) {
  try {
    const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
    serviceAccount = JSON.parse(fileContent);
    console.log('Firebase Admin: Loaded credentials from serviceAccountKey.json');
  } catch (error) {
    console.error('Firebase Admin: Error reading serviceAccountKey.json:', error.message);
    // Fall through to environment variables
  }
}

// If file loading failed or file doesn't exist, use environment variables
if (!serviceAccount) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const clientId = process.env.FIREBASE_CLIENT_ID;
  const clientX509CertUrl = process.env.FIREBASE_CLIENT_X509_CERT_URL;

  // Validate all required fields are present
  if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
    throw new Error(
      'Firebase Admin: FIREBASE_PROJECT_ID is missing or invalid. ' +
      'Please set it in your .env file or provide serviceAccountKey.json file.'
    );
  }

  if (!privateKeyId || typeof privateKeyId !== 'string' || privateKeyId.trim() === '') {
    throw new Error(
      'Firebase Admin: FIREBASE_PRIVATE_KEY_ID is missing or invalid. ' +
      'Please set it in your .env file or provide serviceAccountKey.json file.'
    );
  }

  if (!privateKey || typeof privateKey !== 'string' || privateKey.trim() === '') {
    throw new Error(
      'Firebase Admin: FIREBASE_PRIVATE_KEY is missing or invalid. ' +
      'Please set it in your .env file or provide serviceAccountKey.json file.'
    );
  }

  if (!clientEmail || typeof clientEmail !== 'string' || clientEmail.trim() === '') {
    throw new Error(
      'Firebase Admin: FIREBASE_CLIENT_EMAIL is missing or invalid. ' +
      'Please set it in your .env file or provide serviceAccountKey.json file.'
    );
  }

  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error(
      'Firebase Admin: FIREBASE_CLIENT_ID is missing or invalid. ' +
      'Please set it in your .env file or provide serviceAccountKey.json file.'
    );
  }

  serviceAccount = {
    type: "service_account",
    project_id: projectId.trim(),
    private_key_id: privateKeyId.trim(),
    private_key: privateKey.trim(),
    client_email: clientEmail.trim(),
    client_id: clientId.trim(),
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: clientX509CertUrl?.trim() || `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail.trim())}`
  };
  console.log('Firebase Admin: Loaded credentials from environment variables');
}

// Validate serviceAccount object has all required fields
if (!serviceAccount.project_id || typeof serviceAccount.project_id !== 'string') {
  throw new Error(
    'Firebase Admin: serviceAccount object is missing required "project_id" property. ' +
    'Please check your serviceAccountKey.json file or environment variables.'
  );
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin: Initialized successfully');
  } catch (error) {
    console.error('Firebase Admin: Initialization error:', error.message);
    throw error;
  }
}

const auth = admin.auth();

module.exports = { admin, auth };

