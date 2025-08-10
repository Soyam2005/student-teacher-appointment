import { auth, db } from "../firebase/firebase-config.js";
import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { logAction } from "../utils/logger.js";
import { showAlert } from "../utils/alerts.js";

/**
 * 
 * @param {string} email 
 * @param {string} password 
 * @param {Role} role - admin, teacher, student
 * @param {string} fullName 
 */
async function registerUser(email, password, role, fullName) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    const userDoc = doc(db, "users", uid);
    await setDoc(userDoc, {
      email,
      fullName,
      role,
      createdAt: Date.now()
    });

    logAction(`Registered: ${email}`, uid);
    // alert("Registration successful!");
    showAlert("Registration successful!", "success");
    window.location.href = "index.html";
  } catch (err) {
    // alert("Registration failed: " + err.message);
    showAlert("Registration failed: " + err.message, "danger");
    logAction("Registration failed: " + err.message, "unknown");
  }
}


document.addEventListener('DOMContentLoaded', async() => {
    const registerForm = document.getElementById('registerForm');
    if(registerForm){
        registerForm.addEventListener('submit', async(e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const role = document.getElementById('role').value.trim();
            const fullName = document.getElementById('name').value.trim();
            if(!email || !password || !role || !fullName){
                // alert("Please fill in all fields");
                showAlert("Please fill in all fields", "danger");
                return;
            }
            await registerUser(email, password, role, fullName);
        })
    }
})
