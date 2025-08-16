import { db } from "../firebase/firebase-config.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { showAlert } from "../utils/alerts.js";
import { logAction } from "../utils/logger.js";

/**
 * Initialize pending student registration listener & UI
 */
export function initRegistrations() {
  const pendingBody = document.getElementById("pendingStudentsBody");

  // Listen to all users where role == 'student'
  // We'll filter client-side for those not yet approved (approved !== true)
  const q = query(
    collection(db, "users"),
    where("role", "==", "student"),
    where("status", "==", "pending")
    // orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snap) => {
    pendingBody.innerHTML = "";
    snap.forEach((docSnap) => {
      const u = docSnap.data();
      const uid = docSnap.id;

      // treat as pending if approved !== true
      if (u.approved === true) return;

      const tr = document.createElement("tr");

      const createdAt = new Date(u.createdAt).toLocaleString()

      tr.innerHTML = `
        <td>${escapeHtml(u.fullName || u.name || "-")}</td>
        <td>${escapeHtml(u.email || "-")}</td>
        <td>${escapeHtml(createdAt)}</td>
        <td>
          <button class="btn btn-sm btn-success me-1" data-action="approve" data-uid="${uid}">Approve</button>
          <button class="btn btn-sm btn-outline-danger" data-action="reject" data-uid="${uid}">Reject</button>
        </td>
      `;
      pendingBody.appendChild(tr);
    });

    if (!pendingBody.children.length) {
      pendingBody.innerHTML = `<tr><td colspan="4" class="text-muted text-center small">No pending registrations</td></tr>`;
    }
  });

  // delegation for approve/reject
  pendingBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const uid = btn.dataset.uid;
    if (!action || !uid) return;

    if (action === "approve") {
      try {
        await updateDoc(doc(db, "users", uid), {
          approved: true,
          status: "approved",
          approvedAt: serverTimestamp(),
        });
        showAlert("Student approved.", "success");
        logAction("Approve student registration", uid);
      } catch (err) {
        console.error(err);
        showAlert("Approve failed: " + err.message, "danger");
      }
    }

    if (action === "reject") {
      // mark rejected (do not delete by default)
      if (
        !confirm(
          "Reject this registration? The student's record will be marked rejected."
        )
      )
        return;
      try {
        await updateDoc(doc(db, "users", uid), {
          approved: false,
          status: "rejected",
          rejectedAt: serverTimestamp(),
        });
        showAlert("Student rejected.", "warning");
        logAction("Reject student registration", uid);
      } catch (err) {
        console.error(err);
        showAlert("Reject failed: " + err.message, "danger");
      }
    }
  });
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
