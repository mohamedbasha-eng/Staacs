// firebase-config.js
// IMPORT FIREBASE REALTIME DATABASE MODULES (Using ES Modules natively)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

/* =========================================================================
   EXPLANATION: WHERE TO PUT FIREBASE CONFIG CODE 
   =========================================================================
   1. Go to Firebase Console -> Project Settings.
   2. Copy the "firebaseConfig" object below this exact block.
   3. CRITICAL FOR REALTIME DATABASE: Ensure you have "databaseURL" included!
      It usually looks like: "https://<PROJECT_ID>-default-rtdb.firebaseio.com"
============================================================================= */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  // ADD THIS LINE IF MISSING! IT CONNECTS TO THE REALTIME DATABASE
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com", 
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize the Firebase Application
const app = initializeApp(firebaseConfig);

// Initialize Firebase Realtime Database
const db = getDatabase(app);

// Export db and necessary functions so other JS files can use them easily
export { db, ref, push, remove, onValue };
