// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update, runTransaction, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDq6FUpyx4BlveUerFSWEXFxuSl9WGkeQ4",
  authDomain: "flutter-ai-playground-d60af.firebaseapp.com",
  databaseURL: "https://flutter-ai-playground-d60af-default-rtdb.firebaseio.com",
  projectId: "flutter-ai-playground-d60af",
  storageBucket: "flutter-ai-playground-d60af.firebasestorage.app",
  messagingSenderId: "563635038094",
  appId: "1:563635038094:web:47f98ca0ba4d7214a926df"
};

import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { 
  app, db, auth, storage,
  ref, set, push, onValue, remove, update, runTransaction, get, query, orderByChild, equalTo,
  sRef, uploadBytes, getDownloadURL
};
