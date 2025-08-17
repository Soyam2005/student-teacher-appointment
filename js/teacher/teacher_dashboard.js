import { auth, db } from "../firebase/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { globalLoader } from "../utils/loader.js";
import { showAlert } from "../utils/alerts.js";
import { logAction } from "../utils/logger.js";

document.addEventListener("DOMContentLoaded", () => {
  // Auth check
      let teacherId;
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    const teacherQuery = query(
      collection(db, "teachers"),
      where("userId", "==", user.uid)
    );
    const teacherSnapshot = await getDocs(teacherQuery);
    if (teacherSnapshot.empty) {
      console.log("No teacher found.");
      window.location.href = "index.html";
      return;
    }
    const teacher = teacherSnapshot.docs[0].data();
    teacherId = teacherSnapshot.docs[0].id;

    // Update welcome text
    document.getElementById("welcomeText").textContent =
      teacher?.fullName || user.email.split("@")[0];

    globalLoader.show("Loading dashboard...");
    try {
      await loadAppointments(teacherId);
      await loadMessages(teacherId);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      showAlert(
        "Failed to load dashboard data. Please refresh the page.",
        "danger"
      );
    } finally {
      globalLoader.hide();
    }
  });

  // Load teacher's appointments
  async function loadAppointments(teacherId) {
    globalLoader.show("Loading appointments...");
    try {
      const appointmentsRef = collection(db, "appointments");
      const q = query(
        appointmentsRef,
        where("teacherId", "==", teacherId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const container = document.getElementById("appointmentsList");
      container.innerHTML = "";

      if (snapshot.empty) {
        console.log("No appointments yet.");
        container.innerHTML = `
          <div class="list-group-item text-muted">
            No appointments yet.
          </div>
        `;
        updateStats({ pending: 0, approved: 0, rejected: 0 });
        return;
      }

      // Collect student IDs to fetch names
      const studentIds = new Set();
      const appointments = [];
      const stats = { pending: 0, approved: 0, rejected: 0 };

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        appointments.push({ id: docSnap.id, ...data });
        studentIds.add(data.studentId);

        // Count stats
        if (data.status === "pending") stats.pending++;
        else if (data.status === "approved") stats.approved++;
        else if (data.status === "rejected") stats.rejected++;
      });

      // Update stats
      updateStats(stats);

      // Fetch student names
      const studentMap = {};
      for (const studentId of studentIds) {
        try {
          const studentDoc = await getDocs(
            query(collection(db, "users"), where("__name__", "==", studentId))
          );
          studentDoc.forEach((doc) => {
            studentMap[doc.id] = doc.data().fullName || "Unknown Student";
          });
        } catch (error) {
          console.error("Error fetching student name:", error);
          studentMap[studentId] = "Unknown Student";
        }
      }

      // Render appointments
      appointments.forEach((appointment) => {
        const studentName =
          studentMap[appointment.studentId] || "Unknown Student";
        const item = document.createElement("div");
        item.className = "list-group-item appointment-item";

        const statusClass =
          appointment.status === "approved"
            ? "approved"
            : appointment.status === "rejected"
            ? "rejected"
            : "pending";

        const statusText =
          appointment.status === "approved"
            ? "✅ Approved"
            : appointment.status === "rejected"
            ? "❌ Rejected"
            : "⏳ Pending";

        item.innerHTML = `
          <div class="appointment-header">
            <h6>${studentName}</h6>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </div>
          <div class="appointment-details">
            <p><strong>Date:</strong> ${appointment.date}</p>
            <p><strong>Requested:</strong> ${new Date(
              appointment.createdAt
            ).toLocaleString()}</p>
          </div>
          ${
            appointment.status === "pending"
              ? `
            <div class="appointment-actions">
              <button class="btn btn-success btn-sm" onclick="updateAppointmentStatus('${appointment.id}', 'approved')">
                Approve
              </button>
              <button class="btn btn-danger btn-sm" onclick="updateAppointmentStatus('${appointment.id}', 'rejected')">
                Reject
              </button>
            </div>
          `
              : ""
          }
        `;
        container.appendChild(item);
      });
    } catch (error) {
      console.error("Error loading appointments:", error);
      showAlert("Failed to load appointments. Please try again.", "danger");
    } finally {
      globalLoader.hide();
    }
  }

  // Load teacher's messages
  async function loadMessages(teacherId) {
    globalLoader.show("Loading messages...");
    try {
      const messagesRef = collection(db, "messages");
      const q = query(
        messagesRef,
        where("toTeacher", "==", teacherId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const container = document.getElementById("messagesList");
      container.innerHTML = "";

      if (snapshot.empty) {
        container.innerHTML = `
          <div class="list-group-item text-muted">
            No messages yet.
          </div>
        `;
        updateMessageCount(0);
        return;
      }

      // Collect student IDs to fetch names
      const studentIds = new Set();
      const messages = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        messages.push({ id: docSnap.id, ...data });
        studentIds.add(data.fromStudent);
      });

      // Update message count
      updateMessageCount(messages.length);

      // Fetch student names
      const studentMap = {};
      for (const studentId of studentIds) {
        try {
          const studentDoc = await getDocs(
            query(collection(db, "users"), where("__name__", "==", studentId))
          );
          studentDoc.forEach((doc) => {
            studentMap[doc.id] = doc.data().fullName || "Unknown Student";
          });
        } catch (error) {
          console.error("Error fetching student name:", error);
          studentMap[studentId] = "Unknown Student";
        }
      }

      // Render messages
      messages.forEach((message) => {
        const studentName =
          studentMap[message.fromStudent] || "Unknown Student";
        const item = document.createElement("div");
        item.className = "list-group-item message-item";
        item.innerHTML = `
          <div class="message-header">
            <h6>From: ${studentName}</h6>
            <span class="message-time">${new Date(
              message.createdAt
            ).toLocaleString()}</span>
          </div>
          <div class="message-content">
            <p>${message.message}</p>
          </div>
        `;
        container.appendChild(item);
      });
    } catch (error) {
      console.error("Error loading messages:", error);
      showAlert("Failed to load messages. Please try again.", "danger");
    } finally {
      globalLoader.hide();
    }
  }

  // Update stats function
  function updateStats(stats) {
    document.getElementById("pendingCount").textContent = stats.pending || 0;
    document.getElementById("approvedCount").textContent = stats.approved || 0;
    document.getElementById("rejectedCount").textContent = stats.rejected || 0;
  }

  // Update message count
  function updateMessageCount(count) {
    document.getElementById("messageCount").textContent = count || 0;
  }

  // Update appointment status
  window.updateAppointmentStatus = async (appointmentId, status) => {
    const statusText = status === "approved" ? "approve" : "reject";
    if (!confirm(`Are you sure you want to ${statusText} this appointment?`)) {
      return;
    }

    globalLoader.show(
      `${
        statusText.charAt(0).toUpperCase() + statusText.slice(1)
      }ing appointment...`
    );
    try {
      const appointmentRef = doc(db, "appointments", appointmentId);
      await updateDoc(appointmentRef, {
        status,
        updatedAt: Date.now(),
      });

      showAlert(`Appointment ${statusText}ed successfully!`, "success");
      logAction(`Appointment ${statusText}ed`, appointmentId);

      // Reload appointments to show updated status and stats
      await loadAppointments(teacherId);
    } catch (error) {
      console.error("Error updating appointment:", error);
      showAlert(
        `Failed to ${statusText} appointment. Please try again.`,
        "danger"
      );
    } finally {
      globalLoader.hide();
    }
  };

  // Logout function
  window.confirmLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      globalLoader.show("Logging out...");
      signOut(auth)
        .then(() => {
          showAlert("Logged out successfully!", "success");
          window.location.href = "index.html";
        })
        .catch((error) => {
          console.error("Error logging out:", error);
          showAlert("Logout failed. Please try again.", "danger");
        })
        .finally(() => {
          globalLoader.hide();
        });
    }
  };
});
