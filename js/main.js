// handles login and redirect according to user role
import { auth } from "./firebase/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { redirectByRole, loginUser } from "./auth/login.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");

  // Password show/hide toggle
  togglePassword.addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    togglePassword.innerHTML =
      type === "password"
        ? '<i class="bi bi-eye"></i>'
        : '<i class="bi bi-eye-slash"></i>';
  });

  if (loginForm) {
    // Handle login form submit
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = passwordInput.value.trim();

      if (!email || !password) {
        showAlert("Please enter both email and password.", "danger");
        return;
      }

      await loginUser(auth, email, password);
    });
  }

  // enable this when app is ready
  // onAuthStateChanged(auth, async (user) => {
  //   if (user) {
  //     redirectByRole(user.uid);
  //   }
  // });
});
