import { db } from '../firebase/firebase-config.js';
import {signInWithEmailAndPassword} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import {doc, getDoc} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';
import { logAction } from '../utils/logger.js';
import { showAlert } from '../utils/alerts.js';

/**
 * 
 * @param {object} auth
 * @param {string} email 
 * @param {string} password 
 */
export async function loginUser(auth, email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        logAction("Login successful", user.uid);
        await redirectByRole(user.uid);
    } catch (error) {
        console.error(error);
        // alert("Login failed: " + error.message);
        showAlert("Login failed: " + error.message, "danger");
        logAction("Login failed", "unknown");
    }
}

/**
 * 
 * @param {string} uid 
 */
export async function redirectByRole(uid) {
    const key = doc(db, "users", uid);
    const userDoc = await getDoc(key);
    console.log(userDoc);
    const {role} = userDoc.data()
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
            // alert("Invalid role");
            showAlert("Invalid role", "danger");
            window.location.href = "index.html";
            break;
    }
    logAction(`Redirected to ${role} dashboard`);
}