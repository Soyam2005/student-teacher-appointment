import { auth, db } from "../firebase/firebase-config.js";
import {
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { logAction } from "../utils/logger.js";
import { showAlert } from "../utils/alerts.js";
import { globalLoader } from "../utils/loader.js";

document.addEventListener("DOMContentLoaded", () => {
  const studentName = document.getElementById("studentName");

  const teacherGrid = document.getElementById("teacherList");
  const teacherSearch = document.getElementById("teacherSearch");

  const appointmentsList = document.getElementById("appointmentsList");
  const messagesList = document.getElementById("messagesList");

  const logoutBtn = document.getElementById("logoutBtn");

  const appointmentModal = new bootstrap.Modal(
    document.getElementById("appointmentModal")
  );
  const messageModal = new bootstrap.Modal(
    document.getElementById("messageModal")
  );
  const confirmationModal = new bootstrap.Modal(
    document.getElementById("confirmationModal")
  );

  const modalTeacherName = document.getElementById("modalTeacherName");
  const messageTeacherName = document.getElementById("messageTeacherName");
  const messageForm = document.getElementById("messageForm");
  const messageText = document.getElementById("messageText");
  const confirmationMessage = document.getElementById("confirmationMessage");
  const confirmAppointmentBtn = document.getElementById(
    "confirmAppointmentBtn"
  );
  const bookAppointmentBtn = document.getElementById("bookAppointmentBtn");

  const calendarDays = document.getElementById("calendarDays");
  const currentMonthEl = document.getElementById("currentMonth");
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");

  let currentTeacherId = null;
  let currentDate = new Date();
  let selectedDate = null;
  let bookedDates = new Set();
  let pendingAppointmentDate = null;

  // Load teachers
  async function loadTeachers() {
    globalLoader.show("Loading teachers...");
    teacherGrid.innerHTML = "";

    try {
      const q = query(
        collection(db, "teachers"),
        where("status", "==", "approved")
      );
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        teacherGrid.innerHTML = `<p class="text-muted">No teachers available yet.</p>`;
        return;
      }

      querySnap.forEach((docSnap) => {
        const teacher = docSnap.data();
        const teacherId = docSnap.id;

        const card = document.createElement("div");
        card.className = "col-md-4 mb-3";

        card.innerHTML = `
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">${teacher.fullName}</h5>
            <p class="card-text mb-1"><strong>Department:</strong> ${
              teacher.department || "N/A"
            }</p>
            <p class="card-text mb-1"><strong>Email:</strong> ${
              teacher.email
            }</p>
            <p class="card-text mb-1"><strong>Subjects:</strong> ${
              teacher.subjects ? teacher.subjects.join(", ") : "N/A"
            }</p>
            <button class="btn btn-sm btn-primary mt-2 book-btn" data-id="${teacherId}" data-name="${
          teacher.fullName
        }">Book Appointment</button>
            <button class="btn btn-sm btn-success mt-2 message-btn" data-id="${teacherId}" data-name="${
          teacher.fullName
        }">Send Message</button>
          </div>
        </div>
      `;

        teacherGrid.appendChild(card);
      });

      // Bind buttons
      document.querySelectorAll(".book-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          currentTeacherId = e.target.dataset.id;
          modalTeacherName.textContent = e.target.dataset.name;
          selectedDate = null;
          appointmentModal.show();

          // Wait for modal to be fully shown before loading calendar
          setTimeout(async () => {
            await loadBookedDates(currentTeacherId);
          }, 300);
        });
      });

      document.querySelectorAll(".message-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          currentTeacherId = e.target.dataset.id;
          messageTeacherName.textContent = e.target.dataset.name;
          messageModal.show();
        });
      });
    } catch (error) {
      console.error("Error loading teachers:", error);
      showAlert("Failed to load teachers. Please try again.", "danger");
    } finally {
      globalLoader.hide();
    }
  }

  // Search filter
  teacherSearch.addEventListener("input", () => {
    const filter = teacherSearch.value.toLowerCase();
    const cards = teacherGrid.getElementsByClassName("col-md-4");
    Array.from(cards).forEach((card) => {
      card.style.display = card.textContent.toLowerCase().includes(filter)
        ? ""
        : "none";
    });
  });

  // Simple Calendar Functions
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
  }

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update month display
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    currentMonthEl.textContent = `${monthNames[month]} ${year}`;

    // Clear calendar
    calendarDays.innerHTML = "";

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "calendar-day other-month";
      calendarDays.appendChild(emptyDay);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement("div");
      dayElement.className = "calendar-day";
      dayElement.textContent = day;

      const currentDayDate = new Date(year, month, day);
      const dateStr = formatDate(currentDayDate);

      // Check if it's today
      if (currentDayDate.getTime() === today.getTime()) {
        dayElement.classList.add("today");
      }

      // Check if it's in the past
      if (currentDayDate < today) {
        dayElement.classList.add("disabled");
      } else {
        // Check if it's booked
        if (bookedDates.has(dateStr)) {
          dayElement.classList.add("booked");
          console.log("Marking as booked:", dateStr);
        } else {
          // Add click event for available dates
          dayElement.addEventListener("click", () =>
            selectDate(dateStr, dayElement)
          );
          console.log("Available date:", dateStr);
        }
      }

      calendarDays.appendChild(dayElement);
    }
  }

  function selectDate(dateStr, element) {
    // Remove previous selection
    document.querySelectorAll(".calendar-day.selected").forEach((el) => {
      el.classList.remove("selected");
    });

    // Add selection to current element
    element.classList.add("selected");
    selectedDate = dateStr;
    console.log("Selected date:", dateStr);
  }

  // Calendar navigation
  prevMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  nextMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // Load booked dates for teacher
  async function loadBookedDates(teacherId) {
    globalLoader.show("Loading availability...");

    try {
      bookedDates.clear();
      selectedDate = null; // Clear any previous selection

      // Get all appointments for this teacher
      const q = query(
        collection(db, "appointments"),
        where("teacherId", "==", teacherId)
      );
      const snap = await getDocs(q);

      snap.forEach((docSnap) => {
        const appointment = docSnap.data();
        // Include both approved and pending appointments as booked
        if (
          appointment.status === "approved" ||
          appointment.status === "pending"
        ) {
          bookedDates.add(appointment.date);
          console.log(
            "Added booked date:",
            appointment.date,
            "status:",
            appointment.status
          );
        }
      });

      console.log("All booked dates:", Array.from(bookedDates));

      // Render calendar with booked dates
      renderCalendar();
    } catch (error) {
      console.error("Error loading booked dates:", error);
      showAlert(
        "Failed to load teacher availability. Please try again.",
        "danger"
      );
    } finally {
      globalLoader.hide();
    }
  }

  // Book appointment button
  bookAppointmentBtn.addEventListener("click", async () => {
    if (!selectedDate || !currentTeacherId) {
      showAlert("Please select a date first.", "warning");
      return;
    }

    // Double-check if the date is still available
    console.log("Checking if date is available:", selectedDate);
    console.log("Booked dates:", Array.from(bookedDates));
    if (bookedDates.has(selectedDate)) {
      showAlert(
        "This date is no longer available. Please select another date.",
        "warning"
      );
      return;
    }

    // Real-time check from database
    globalLoader.show("Checking availability...");
    try {
      const q = query(
        collection(db, "appointments"),
        where("teacherId", "==", currentTeacherId),
        where("date", "==", selectedDate)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        showAlert(
          "This date is no longer available. Please select another date.",
          "warning"
        );
        // Refresh the calendar to show updated availability
        await loadBookedDates(currentTeacherId);
        return;
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      showAlert("Error checking availability. Please try again.", "danger");
      return;
    } finally {
      globalLoader.hide();
    }

    // Show confirmation dialog
    pendingAppointmentDate = selectedDate;
    confirmationMessage.textContent = `Are you sure you want to book an appointment on ${selectedDate}?`;
    confirmationModal.show();
  });

  // Confirm appointment booking
  confirmAppointmentBtn.addEventListener("click", async () => {
    if (!pendingAppointmentDate || !currentTeacherId) {
      showAlert("Invalid appointment data.", "danger");
      return;
    }

    globalLoader.show("Booking appointment...");

    try {
      await addDoc(collection(db, "appointments"), {
        studentId: auth.currentUser.uid,
        teacherId: currentTeacherId,
        date: pendingAppointmentDate,
        createdAt: Date.now(),
        status: "pending",
      });

      logAction(
        `Booked appointment with ${currentTeacherId} on ${pendingAppointmentDate}`,
        auth.currentUser.uid
      );

      showAlert(
        "Appointment booked successfully (pending approval).",
        "success"
      );

      // Refresh appointments list
      await loadAppointments();

      // Refresh calendar to show updated availability
      await loadBookedDates(currentTeacherId);

      // Close modals
      confirmationModal.hide();
      appointmentModal.hide();

      // Reset data
      selectedDate = null;
      pendingAppointmentDate = null;
    } catch (error) {
      console.error("Error booking appointment:", error);
      showAlert("Failed to book appointment. Please try again.", "danger");
    } finally {
      globalLoader.hide();
    }
  });

  // Send message
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = messageText.value.trim();
    if (!message || !currentTeacherId) {
      showAlert("Please enter a message.", "danger");
      return;
    }

    globalLoader.show("Sending message...");

    try {
      await addDoc(collection(db, "messages"), {
        fromStudent: auth.currentUser.uid,
        toTeacher: currentTeacherId,
        message,
        createdAt: Date.now(),
      });
      logAction(`Message sent to ${currentTeacherId}`, auth.currentUser.uid);
      showAlert("Message sent successfully!", "success");
      messageForm.reset();
      messageModal.hide();

      // Refresh messages list
      await loadMessages(auth.currentUser.uid);
    } catch (error) {
      console.error("Error sending message:", error);
      showAlert("Failed to send message. Please try again.", "danger");
    } finally {
      globalLoader.hide();
    }
  });

  // Load student's appointments
  async function loadAppointments() {
    globalLoader.show("Loading appointments...");

    try {
      appointmentsList.innerHTML = "";
      const q = query(
        collection(db, "appointments"),
        where("studentId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        appointmentsList.innerHTML = `<li class="list-group-item text-muted">No appointments yet.</li>`;
        return;
      }

      // Collect teacher IDs
      const teacherIds = new Set();
      const appointments = [];
      snap.forEach((docSnap) => {
        const a = docSnap.data();
        appointments.push(a);
        teacherIds.add(a.teacherId);
      });

      // Fetch teacher names
      const teacherMap = {};
      for (const id of teacherIds) {
        const teacherSnap = await getDocs(
          query(collection(db, "teachers"), where("__name__", "==", id))
        );
        teacherSnap.forEach((doc) => {
          teacherMap[doc.id] = doc.data().fullName || "Unknown Teacher";
        });
      }

      // Render appointments with teacher names
      appointments.forEach((a) => {
        const teacherName = teacherMap[a.teacherId] || a.teacherId;
        const item = document.createElement("li");
        item.className =
          "list-group-item d-flex justify-content-between align-items-center";

        const statusBadge =
          a.status === "approved"
            ? "success"
            : a.status === "rejected"
            ? "danger"
            : "warning";

        item.innerHTML = `
          <div>
            <strong>${teacherName}</strong><br>
            <small class="text-muted">Date: ${a.date}</small>
          </div>
          <span class="badge bg-${statusBadge}">${a.status}</span>
        `;
        appointmentsList.appendChild(item);
      });
    } catch (error) {
      console.error("Error loading appointments:", error);
      showAlert("Failed to load appointments. Please try again.", "danger");
    } finally {
      globalLoader.hide();
    }
  }

  // Load student's messages
  async function loadMessages(studentId) {
    globalLoader.show("Loading messages...");

    try {
      messagesList.innerHTML = "";

      const q = query(
        collection(db, "messages"),
        where("fromStudent", "==", studentId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        messagesList.innerHTML = `<li class="list-group-item text-muted">No messages yet.</li>`;
        return;
      }

      // Collect teacherIds
      const teacherIds = new Set();
      const messages = [];
      snap.forEach((docSnap) => {
        const m = docSnap.data();
        messages.push(m);
        teacherIds.add(m.toTeacher);
      });

      // Fetch teacher docs
      const teacherMap = {};
      for (const id of teacherIds) {
        const teacherSnap = await getDocs(
          query(collection(db, "teachers"), where("__name__", "==", id))
        );
        teacherSnap.forEach((doc) => {
          teacherMap[doc.id] = doc.data().fullName || "Unknown Teacher";
        });
      }

      // Render messages with teacher names
      messages.forEach((m) => {
        const teacherName = teacherMap[m.toTeacher] || m.toTeacher;
        const item = document.createElement("li");
        item.className = "list-group-item";
        item.textContent = `To: ${teacherName} | ${m.message}`;
        messagesList.appendChild(item);
      });
    } catch (error) {
      console.error("Error loading messages:", error);
      showAlert("Failed to load messages. Please try again.", "danger");
    } finally {
      globalLoader.hide();
    }
  }

  async function loadStudentName(userId) {
    try {
      const userDataRef = doc(db, "users", userId);
      const userData = await getDoc(userDataRef);
      const userDoc = userData.data();
      if (!userDoc) {
        studentName.textContent = "Student";
        return;
      }
      studentName.textContent = userDoc.fullName;
    } catch (error) {
      console.error("Error loading student name:", error);
      studentName.textContent = "Student";
    }
  }

  // Logout
  logoutBtn.addEventListener("click", async () => {
    globalLoader.show("Logging out...");
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (error) {
      console.error("Error logging out:", error);
      showAlert("Logout failed. Please try again.", "danger");
    } finally {
      globalLoader.hide();
    }
  });

  // Auth check
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      globalLoader.show("Loading dashboard...");
      try {
        await loadStudentName(user?.uid);
        await loadTeachers();
        await loadAppointments();
        await loadMessages(user?.uid);
      } catch (error) {
        console.error("Error loading dashboard:", error);
        showAlert(
          "Failed to load dashboard data. Please refresh the page.",
          "danger"
        );
      } finally {
        globalLoader.hide();
      }
    }
  });
});
