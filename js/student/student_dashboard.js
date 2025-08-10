import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getAuth,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Search teacher
window.searchTeacher = async () => {
  const dept = document.getElementById("searchDept").value;
  const q = query(collection(db, "teachers"), where("department", "==", dept));
  const querySnapshot = await getDocs(q);
  const list = document.getElementById("teacherList");
  list.innerHTML = "";
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const li = document.createElement("li");
    li.innerText = `${data.name} (${data.subject}) - ${data.email}`;
    list.appendChild(li);
  });
};

// Book appointment
window.bookAppointment = async () => {
  const teacherEmail = document.getElementById("teacherId").value;
  const time = document.getElementById("timeSlot").value;
  const user = auth.currentUser;

  await addDoc(collection(db, "appointments"), {
    student: user.email,
    teacher: teacherEmail,
    time,
    status: "pending",
  });
  alert("Appointment Requested");
};

// Send message
window.sendMessage = async () => {
  const teacherEmail = document.getElementById("msgTeacherId").value;
  const message = document.getElementById("msgContent").value;
  const user = auth.currentUser;

  await addDoc(collection(db, "messages"), {
    from: user.email,
    to: teacherEmail,
    message,
    timestamp: new Date(),
  });
  alert("Message sent");
};

// Logout
window.logout = () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
};
