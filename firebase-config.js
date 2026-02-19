/* ============================================================
   Firebase Configuration
   ============================================================
   SETUP INSTRUCTIONS:
   1. Go to https://console.firebase.google.com
   2. Click "Add project" and name it (e.g. "twc-website")
   3. In Project Settings > General, scroll to "Your apps"
   4. Click the </> web icon to register a web app
   5. Copy the firebaseConfig object values below
   6. In Firebase console:
      - Enable Firestore Database (start in production mode)
      - Enable Storage
      - Enable Authentication > Email/Password
      - Create your admin account under Authentication > Users
   ============================================================ */

export const firebaseConfig = {
  apiKey:            "AIzaSyBEogazntklSEFaEy7A0rT4Hq3r7sM6Tb4",
  authDomain:        "twc-website-a18fd.firebaseapp.com",
  projectId:         "twc-website-a18fd",
  storageBucket:     "twc-website-a18fd.firebasestorage.app",
  messagingSenderId: "277641241022",
  appId:             "1:277641241022:web:f04a5cec8cffc91188d9ef"
};

export const FIREBASE_ENABLED = true;
