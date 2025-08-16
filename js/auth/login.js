import { db } from "../firebase/firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { logAction } from "../utils/logger.js";
import { showAlert } from "../utils/alerts.js";

/**
 * @param {object} auth
 * @param {string} email
 * @param {string} password
 */
export async function loginUser(auth, email, password) {
  try {
    // Try normal login
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    if (!user) {
      showAlert("Incorrect email or password", "danger");
      return;
    }

    const userDataRef = doc(db, "users", user.uid);
    const userData = await getDoc(userDataRef);
    const userDoc = userData.data();

    // Student status check
    if (
      userDoc &&
      userDoc.role === "student" &&
      userDoc.status !== "approved"
    ) {
      showAlert(
        "Student account is not active. Please contact the admin",
        "danger",
        5000
      );
      return;
    }

    logAction("Login successful", user.uid);
    await redirectByRole(user.uid);
  } catch (error) {
    // If normal login fails, check teacher pending status
    if (error.code === "auth/invalid-credential") {
      const teacherDoc = await findPendingTeacherByEmail(email);
      if (teacherDoc) {
        // Redirect to activation page with email in query param
        window.location.href = `teacher-activation.html?email=${encodeURIComponent(
          email
        )}`;
        return;
      }
    }

    console.error(error);
    showAlert("Login failed: " + error.message, "danger");
    logAction("Login failed", "unknown");
  }
}

/**
 * Query teachers collection for a pending teacher by email.
 */
export async function findPendingTeacherByEmail(email) {
  if (!email) return null;

  const teachersCol = collection(db, "teachers");
  const q = query(
    teachersCol,
    where("email", "==", email.trim().toLowerCase()),
    where("status", "==", "pending"),
    limit(1)
  );

  const snap = await getDocs(q);
  if (!snap.empty) {
    const docSnap = snap.docs[0];
    return { id: docSnap.id, data: docSnap.data() };
  }
  return null;
}

/**
 * @param {string} uid
 */
export async function redirectByRole(uid) {
  const key = doc(db, "users", uid);
  const userDoc = await getDoc(key);
  const { role } = userDoc.data();
  switch (role) {
    case "admin":
      window.location.href = "admin-dashboard.html";
      break;
    case "teacher":
      window.location.href = "teacher-dashboard.html";
      break;
    case "student":
      window.location.href = "student-dashboard.html";
      break;
    default:
      showAlert("Invalid role", "danger");
      window.location.href = "index.html";
      break;
  }
  logAction(`Redirected to ${role} dashboard`);
}
