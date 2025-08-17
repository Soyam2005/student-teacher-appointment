import { auth, db } from "../firebase/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { initTeachers } from "./teachers.js";
import { initRegistrations } from "./registrations.js";
import { showAlert } from "../utils/alerts.js";
import { globalLoader } from "../utils/loader.js";

document.addEventListener("DOMContentLoaded", () => {
  // Basic auth guard: ensure logged-in user is admin
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showAlert("Please login first.", "danger");
      setTimeout(() => (window.location.href = "index.html"), 800);
      return;
    }

    try {
      globalLoader.show("Verifying admin access...");
      const userDocRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userDocRef);
      const data = userSnapshot.exists() ? userSnapshot.data() : null;

      if (!data || data.role !== "admin") {
        showAlert("Access denied: admin only.", "danger");
        await signOut(auth);
        setTimeout(() => (window.location.href = "index.html"), 900);
        return;
      }

      // initialize admin modules
      initTeachers();
      initRegistrations();
    } catch (err) {
      console.error(err);
      showAlert("Failed to initialize admin dashboard.", "danger");
    } finally {
      globalLoader.hide();
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    globalLoader.show("Logging out...");
    try {
      await signOut(auth);
      showAlert("Logged out.", "success");
      window.location.href = "index.html";
    } catch (err) {
      console.error(err);
      showAlert("Logout failed.", "danger");
    } finally {
      globalLoader.hide();
    }
  });
});
