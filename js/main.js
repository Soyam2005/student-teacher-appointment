// handles login and redirect according to user role
import { auth } from "./firebase/firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { redirectByRole, loginUser } from "./auth/login.js";

// handles login and redirect to page based on user role
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      await loginUser(auth, email, password);
    });
  }
  // enable this when app is ready
//   onAuthStateChanged(auth, async (user) => {
//     if (user) {
//       redirectByRole(user.uid);
//     }
//   });
});