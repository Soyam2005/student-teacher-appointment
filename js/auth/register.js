import { auth, db } from "../firebase/firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  setDoc,
  serverTimestamp,
  doc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { logAction } from "../utils/logger.js";
import { showAlert } from "../utils/alerts.js";

/**
 * Register user as STUDENT only. Admin must approve.
 * @param {string} email
 * @param {string} password
 * @param {string} fullName
 */
async function registerUser(email, password, fullName) {
  try {
    // create firebase auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const uid = userCredential.user.uid;

    // All registrations from this form are STUDENT and must be approved by admin
    const role = "student";
    const approved = false;
    const status = "pending";

    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, {
      email,
      fullName,
      role,
      approved,
      status,
      createdAt: serverTimestamp(),
    });

    logAction(`Student registered (pending approval): ${email}`, uid);
    showAlert(
      "Registration submitted. Waiting for admin approval.",
      "success",
      5000
    );
  } catch (err) {
    showAlert("Registration failed: " + err.message, "danger");
    logAction("Registration failed: " + err.message, "unknown");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      const fullName = document.getElementById("name").value.trim();

      if (!email || !password || !fullName) {
        showAlert("Please fill in all fields", "danger");
        return;
      }

      // Optionally: add password strength checks or email domain validation here

      await registerUser(email, password, fullName);
      // Clear the inputs
      email.value = "";
      password.value = "";
      fullName.value = "";
    });
  }
});
