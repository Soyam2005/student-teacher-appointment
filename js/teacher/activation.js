import { auth, db } from "../firebase/firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { showAlert } from "../utils/alerts.js";
import { findPendingTeacherByEmail, redirectByRole } from "../auth/login.js";

const urlParams = new URLSearchParams(window.location.search);
const email = urlParams.get("email");
const emailDisplay = document.getElementById("teacherEmailDisplay");
const form = document.getElementById("activationForm");

if (email) {
  emailDisplay.textContent = `Email: ${email}`;
} else {
  showAlert("Missing email for activation", "danger");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = document.getElementById("password").value.trim();
  if (!password || password.length < 6) {
    showAlert("Password must be at least 6 characters", "danger");
    return;
  }

  try {
    // Verify teacher exists in pending state
    const pendingTeacher = await findPendingTeacherByEmail(email);
    if (!pendingTeacher || pendingTeacher.data.status !== "pending") {
      showAlert("Teacher record not found or already activated", "danger");
      return;
    }

    // Create Auth user
    const userCred = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const uid = userCred.user.uid;
    const userPayload = {
      name: pendingTeacher.data.name ?? "Teacher Role",
      email,
      role: "teacher",
      status: "approved",
      approved: true,
      createdAt: serverTimestamp(),
    };

    // Create in users collection
    await setDoc(doc(db, "users", uid), userPayload);
    const teacherRef = doc(db, "teachers", pendingTeacher.id);
    // Mark teacher as approved
    await updateDoc(teacherRef, { status: "approved", userId: uid });

    showAlert("Account activated successfully!", "success");
    await redirectByRole(uid);
  } catch (err) {
    console.error(err);
    showAlert("Activation failed: " + err.message, "danger");
  }
});
