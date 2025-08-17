import { db } from "../firebase/firebase-config.js";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { showAlert } from "../utils/alerts.js";
import { logAction } from "../utils/logger.js";
import { globalLoader } from "../utils/loader.js";

export function initTeachers() {
  const teachersTableBody = document.getElementById("teachersTableBody");
  const openAddBtn = document.getElementById("openAddTeacherBtn");

  const teacherModalEl = document.getElementById("teacherModal");
  const teacherModal = new bootstrap.Modal(teacherModalEl);
  const teacherForm = document.getElementById("teacherForm");
  const modalTitle = document.getElementById("teacherModalLabel");

  const idInput = document.getElementById("teacherId");
  const nameInput = document.getElementById("teacherName");
  const deptInput = document.getElementById("teacherDepartment");
  const subjectsInput = document.getElementById("teacherSubjects");
  const emailInput = document.getElementById("teacherEmail");
  const phoneInput = document.getElementById("teacherPhone");

  let editingId = null;

  // Open modal for Add
  openAddBtn.addEventListener("click", () => {
    editingId = null;
    idInput.value = "";
    modalTitle.textContent = "Add Teacher";
    teacherForm.reset();
    teacherModal.show();
  });

  // Submit (Add or Edit)
  teacherForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const department = deptInput.value.trim();
    const subjectsRaw = subjectsInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name || !department) {
      showAlert("Name and Department are required.", "danger");
      return;
    }

    if (!editingId && (!email || !email.includes("@"))) {
      showAlert("Valid email is required for new teachers.", "danger");
      return;
    }

    const subjects = subjectsRaw
      ? subjectsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    try {
      globalLoader.show(
        editingId ? "Updating teacher..." : "Adding teacher..."
      );
      if (!editingId) {
        // Only add to "teachers" collection
        const docRef = await addDoc(collection(db, "teachers"), {
          fullName: name,
          department,
          subjects,
          email: email?.toLowerCase(),
          phone: phone || null,
          status: "pending",
          createdAt: serverTimestamp(),
        });

        showAlert("Teacher added to teachers collection (pending).", "success");
        logAction("Add teacher", docRef.id);
      } else {
        // Update existing teacher
        await updateDoc(doc(db, "teachers", editingId), {
          fullName: name,
          department,
          subjects,
          email: email || null,
          phone: phone || null,
          updatedAt: serverTimestamp(),
        });

        showAlert("Teacher updated successfully.", "success");
        logAction("Update teacher", editingId);
      }
      teacherModal.hide();
    } catch (err) {
      console.error(err);
      showAlert("Failed to save teacher: " + err.message, "danger");
    } finally {
      globalLoader.hide();
    }
  });

  // Render teachers
  function renderTeachers(snapshot) {
    teachersTableBody.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const t = docSnap.data();
      const id = docSnap.id;
      const subjectsText = Array.isArray(t.subjects)
        ? t.subjects.join(", ")
        : t.subjects || "";
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${escapeHtml(t.fullName || "")}</td>
        <td>${escapeHtml(t.department || "")}</td>
        <td>${escapeHtml(subjectsText)}</td>
        <td>${escapeHtml(t.email || "")}</td>
        <td>${escapeHtml(t.status || "")}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" data-action="edit" data-id="${id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${id}"><i class="bi bi-trash"></i></button>
        </td>
      `;
      teachersTableBody.appendChild(tr);
    });
  }

  // Edit/Delete
  teachersTableBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!action || !id) return;

    if (action === "edit") {
      globalLoader.show("Loading teacher data...");
      try {
        const docSnap = await getDoc(doc(db, "teachers", id));
        if (!docSnap.exists()) {
          showAlert("Teacher not found.", "danger");
          return;
        }
        const t = docSnap.data();
        editingId = id;
        idInput.value = id;
        modalTitle.textContent = "Edit Teacher";
        nameInput.value = t.fullName || "";
        deptInput.value = t.department || "";
        subjectsInput.value = Array.isArray(t.subjects)
          ? t.subjects.join(", ")
          : t.subjects || "";
        emailInput.value = t.email || "";
        phoneInput.value = t.phone || "";
        teacherModal.show();
      } catch (err) {
        console.error(err);
        showAlert("Could not fetch teacher: " + err.message, "danger");
      } finally {
        globalLoader.hide();
      }
    }

    if (action === "delete") {
      if (!confirm("Delete this teacher profile?")) return;
      globalLoader.show("Deleting teacher...");
      try {
        await deleteDoc(doc(db, "teachers", id));
        showAlert("Teacher deleted.", "success");
        logAction("Delete teacher", id);
      } catch (err) {
        console.error(err);
        showAlert("Delete failed: " + err.message, "danger");
      } finally {
        globalLoader.hide();
      }
    }
  });

  // Listen to teachers collection
  const q = query(collection(db, "teachers"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    renderTeachers(snap);
  });
}

// Escape HTML
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
