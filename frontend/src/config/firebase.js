import { initializeApp, getApps } from 'firebase/app';
import { getAuth, RecaptchaVerifier } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBCCCd_NoafkLMRtJOXgyZ-Vm9vSt_GE98",
  authDomain: "growloan-bfa5a.firebaseapp.com",
  projectId: "growloan-bfa5a",
  storageBucket: "growloan-bfa5a.firebasestorage.app",
  messagingSenderId: "122156905232",
  appId: "1:122156905232:web:9d615a4588e0495ba8eb95",
  measurementId: "G-0QE7R44L6B"
};

// Initialize Firebase (only if not already initialized)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Export config for logging
export { firebaseConfig };

// Setup reCAPTCHA verifier
export const setupRecaptcha = (elementId) => {
  console.log('=== setupRecaptcha START ===');
  console.log('Element ID:', elementId);
  console.log('Auth object:', auth);
  console.log('Auth app:', auth?.app);
  console.log('Auth app options:', auth?.app?.options);
  
  // Check if element exists - try multiple times
  let element = document.getElementById(elementId);
  console.log('Element found (first check):', !!element);
  
  if (!element) {
    // Wait a bit and try again
    console.log('Element not found, waiting and retrying...');
    // Try to find it in the DOM
    element = document.querySelector(`#${elementId}`);
    console.log('Element found (querySelector):', !!element);
  }
  
  if (!element) {
    // Create element if still not found
    console.log('Creating element as fallback...');
    element = document.createElement('div');
    element.id = elementId;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.width = '1px';
    element.style.height = '1px';
    element.style.overflow = 'hidden';
    element.style.visibility = 'hidden';
    document.body.appendChild(element);
    console.log('Element created and appended');
  }
  
  // Final verification - ensure element is valid and has style property
  if (!element) {
    console.error('Element not found!');
    throw new Error(`reCAPTCHA container element with id "${elementId}" not found`);
  }
  
  // Ensure element has style property (it should, but double check)
  if (!element.style) {
    console.error('Element exists but has no style property!');
    // Try to add style property
    if (!element.hasAttribute('style')) {
      element.setAttribute('style', '');
    }
  }
  
  // Ensure element is in DOM
  if (!element.parentElement) {
    console.log('Element not in DOM, appending to body...');
    document.body.appendChild(element);
  }
  
  console.log('Element verified:', {
    exists: !!element,
    hasStyle: !!element.style,
    id: element.id,
    parent: element.parentElement?.tagName,
    inDOM: !!element.parentElement
  });

  // Clear existing verifier if any - with safety checks
  if (window.recaptchaVerifier) {
    console.log('Clearing existing verifier');
    try {
      // Check if element still exists before clearing
      const existingElement = document.getElementById(elementId);
      if (existingElement && window.recaptchaVerifier.clear) {
        window.recaptchaVerifier.clear();
      } else {
        console.warn('Element not found or verifier already cleared, skipping clear()');
      }
    } catch (error) {
      console.warn('Error clearing existing reCAPTCHA verifier (non-critical):', error);
      // Continue anyway - the new verifier will replace it
    }
    window.recaptchaVerifier = null;
  }

  try {
    console.log('Creating new RecaptchaVerifier...');
    console.log('Auth:', auth);
    console.log('Element ID:', elementId);
    console.log('Config:', {
      size: 'invisible',
      auth: auth?.app?.name,
      projectId: auth?.app?.options?.projectId
    });
    
    window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      size: 'invisible',
      callback: (response) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber
        console.log('reCAPTCHA verified - callback called');
        console.log('Response:', response);
      },
      'expired-callback': () => {
        // Response expired, ask user to solve reCAPTCHA again
        console.log('reCAPTCHA expired');
        // Clear verifier on expiry - with safety checks
        if (window.recaptchaVerifier) {
          try {
            const expiredElement = document.getElementById(elementId);
            if (expiredElement && window.recaptchaVerifier.clear) {
              window.recaptchaVerifier.clear();
            }
          } catch (error) {
            console.warn('Error clearing expired reCAPTCHA (non-critical):', error);
          }
          window.recaptchaVerifier = null;
        }
      }
    });
    
    console.log('RecaptchaVerifier created successfully');
    console.log('Verifier object:', window.recaptchaVerifier);
    console.log('=== setupRecaptcha SUCCESS ===');
  } catch (error) {
    console.error('=== setupRecaptcha ERROR ===');
    console.error('Error creating reCAPTCHA verifier:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    console.error('=== setupRecaptcha ERROR END ===');
    throw error;
  }
};

export default app;
