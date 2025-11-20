import React, { useState } from 'react';
import { firebaseConfig } from '../config/firebase';
import Button from './ui/Button';

const FirebaseDiagnostic = () => {
  const [results, setResults] = useState({});

  const checkAPIStatus = async () => {
    const checks = {
      identityToolkit: false,
      firebaseAuth: false,
      phoneAuth: false,
      apiKey: false,
    };

    // Check Identity Toolkit API
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${firebaseConfig.projectId}?key=${firebaseConfig.apiKey}`,
        { method: 'GET', mode: 'no-cors' }
      );
      checks.identityToolkit = true;
    } catch (error) {
      console.log('Identity Toolkit API check:', error);
    }

    setResults(checks);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Firebase Configuration Diagnostic</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Manual Verification Required</h3>
          <p className="text-sm text-yellow-700">
            This error requires manual configuration in Google Cloud Console and Firebase Console.
            The diagnostic below will help you verify each step.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-3 border rounded">
            <h4 className="font-semibold mb-2">Step 1: Verify Identity Toolkit API</h4>
            <p className="text-sm text-gray-600 mb-2">
              This is the MOST COMMON cause of the error.
            </p>
            <a
              href={`https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=${firebaseConfig.projectId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              → Open Identity Toolkit API Page
            </a>
            <p className="text-xs text-gray-500 mt-1">
              Look for "API enabled" with a green checkmark. If you see "Enable" button, click it.
            </p>
          </div>

          <div className="p-3 border rounded">
            <h4 className="font-semibold mb-2">Step 2: Check API Key Restrictions</h4>
            <a
              href={`https://console.cloud.google.com/apis/credentials?project=${firebaseConfig.projectId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              → Open API Credentials Page
            </a>
            <p className="text-xs text-gray-500 mt-1">
              Find API key: <code className="bg-gray-100 px-1">{firebaseConfig.apiKey.substring(0, 20)}...</code>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Application restrictions: Should be "None" (for dev)
            </p>
            <p className="text-xs text-gray-500">
              API restrictions: Should be "Don't restrict key" (for dev)
            </p>
          </div>

          <div className="p-3 border rounded">
            <h4 className="font-semibold mb-2">Step 3: Verify Phone Authentication</h4>
            <a
              href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              → Open Firebase Authentication Providers
            </a>
            <p className="text-xs text-gray-500 mt-1">
              Phone provider should be enabled (toggle ON)
            </p>
          </div>

          <div className="p-3 border rounded">
            <h4 className="font-semibold mb-2">Step 4: Check Authorized Domains</h4>
            <a
              href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              → Open Firebase Authentication Settings
            </a>
            <p className="text-xs text-gray-500 mt-1">
              Make sure "localhost" is in the authorized domains list
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-semibold text-blue-800 mb-2">After Making Changes:</h4>
          <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
            <li>Wait 2-3 minutes for changes to propagate</li>
            <li>Clear browser cache (Ctrl+Shift+Delete)</li>
            <li>Restart development server</li>
            <li>Try sending OTP again</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default FirebaseDiagnostic;

