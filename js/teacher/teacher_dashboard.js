import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

onAuthStateChanged(auth, async (user) => {
  if (user) {
    document.getElementById("welcomeText").textContent = `Welcome, ${
      user.email.split("@")[0]
    }!`;
    loadAppointments(user.email);
    loadMessages(user.email);
  } else {
    window.location.href = "index.html";
  }
});

async function loadAppointments(teacherEmail) {
  const ref = collection(db, "appointments");
  const q = query(ref, where("teacher", "==", teacherEmail));
  const snapshot = await getDocs(q);
  const container = document.getElementById("appointmentsList");
  container.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <strong>${data.student}</strong><br>
      Time: ${data.time}<br>
      Status: ${data.status || "pending"}<br>
      <button class="approve" onclick="updateStatus('${
        docSnap.id
      }', 'approved')">Approve</button>
      <button class="reject" onclick="updateStatus('${
        docSnap.id
      }', 'cancelled')">Cancel</button>
    `;
    container.appendChild(card);
  });
}

async function loadMessages(teacherEmail) {
  const ref = collection(db, "messages");
  const q = query(ref, where("to", "==", teacherEmail));
  const snapshot = await getDocs(q);
  const container = document.getElementById("messagesList");
  container.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <strong>${data.from}</strong><br>
      "${data.content}"
    `;
    container.appendChild(card);
  });
}

window.updateStatus = async (id, status) => {
  const ref = doc(db, "appointments", id);
  await updateDoc(ref, { status });
  alert(`Appointment ${status}`);
  location.reload();
};

window.confirmLogout = () => {
  if (confirm("Are you sure you want to logout?")) {
    signOut(auth).then(() => (window.location.href = "index.html"));
  }
};
