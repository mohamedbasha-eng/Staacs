import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const form = document.getElementById('adminLoginForm');
const errorMsg = document.getElementById('errorMsg');
const loginBtn = document.getElementById('loginBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  
  loginBtn.innerText = 'Authenticating...';
  loginBtn.disabled = true;
  errorMsg.style.display = 'none';
  
  try {
    // Automatically attempts login with the provided credentials to Firebase
    await signInWithEmailAndPassword(auth, email, password);
    
    // If successful, navigate directly to admin page
    loginBtn.innerText = 'Success! Redirecting...';
    window.location.href = 'admin.html';
  } catch (error) {
    console.error("Login failed", error);
    loginBtn.innerText = 'Login to Dashboard';
    loginBtn.disabled = false;
    
    // Clean up Firebase error message to display
    const readableError = error.message.replace('Firebase: ', '');
    errorMsg.innerText = `Login Failed: ${readableError}`;
    errorMsg.style.display = 'block';
  }
});
