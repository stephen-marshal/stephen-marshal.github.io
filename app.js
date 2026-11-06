import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, signOut,
  GoogleAuthProvider, GithubAuthProvider, OAuthProvider,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, runTransaction, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Providers shown on the sign-in screen. Turn one on once it is enabled in Firebase.
const ENABLED = { google: true, microsoft: false, github: false };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);

function providerFor(name) {
  if (name === "google") return new GoogleAuthProvider();
  if (name === "github") {
    const p = new GithubAuthProvider();
    p.addScope("user:email");
    return p;
  }
  if (name === "microsoft") return new OAuthProvider("microsoft.com");
}

document.querySelectorAll(".provider").forEach((btn) => {
  const name = btn.dataset.provider;
  btn.hidden = !ENABLED[name];
  btn.addEventListener("click", async () => {
    $("error").hidden = true;
    try {
      await signInWithPopup(auth, providerFor(name));
    } catch (e) {
      if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") return;
      $("error").textContent = e.code === "auth/account-exists-with-different-credential"
        ? "You've signed in here before with a different method using this email. Please use that one."
        : "Sign-in failed. Please try again.";
      $("error").hidden = false;
    }
  });
});

$("signout").addEventListener("click", () => signOut(auth));

// One record per visitor: first visit, last visit and number of visits.
async function recordVisit(user) {
  const ref = doc(db, "visitors", user.uid);
  const info = {
    name: user.displayName || "",
    email: user.email || user.providerData.find((p) => p.email)?.email || "",
    provider: user.providerData[0]?.providerId || "",
    lastSeen: serverTimestamp(),
  };
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      tx.update(ref, { ...info, visits: (snap.data().visits || 0) + 1 });
    } else {
      tx.set(ref, { ...info, firstSeen: serverTimestamp(), visits: 1 });
    }
  });
}

// Build the sticky section nav from the CV's <h2> headings, and highlight the one in view.
let spy;
function buildNav() {
  const nav = $("cvnav");
  nav.innerHTML = "";
  spy?.disconnect();
  const sections = [...$("cv").querySelectorAll("section")].filter((s) => s.querySelector("h2"));
  sections.forEach((s) => {
    const label = s.querySelector("h2").textContent.trim();
    s.id = s.id || label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const a = document.createElement("a");
    a.href = `#${s.id}`;
    a.textContent = label;
    nav.appendChild(a);
  });
  nav.hidden = sections.length === 0;
  spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      nav.querySelectorAll("a").forEach((a) => a.classList.toggle("active", a.hash === `#${e.target.id}`));
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  sections.forEach((s) => spy.observe(s));
}

onAuthStateChanged(auth, async (user) => {
  $("loading").hidden = true;
  document.body.classList.toggle("signed-in", !!user);
  // Tell the homepage terminal (terminal.js) who is signed in.
  window.dispatchEvent(new CustomEvent("cv:auth", { detail: { user: user ? (user.email || user.displayName || "you") : null } }));
  if (!user) {
    $("cvnav").hidden = true;
    $("gate").hidden = false;
    $("cv").hidden = true;
    $("session").hidden = true;
    $("actions").hidden = true;
    $("cv").innerHTML = "";
    return;
  }
  $("gate").hidden = true;
  $("who").textContent = user.email || user.displayName || "you";
  $("session").hidden = false;
  try {
    // Count one visit per browser session, not every page refresh.
    if (!sessionStorage.getItem("visit-recorded")) {
      await recordVisit(user);
      sessionStorage.setItem("visit-recorded", "1");
    }
  } catch (e) {
    console.warn("Could not record visit", e);
  }
  try {
    const snap = await getDoc(doc(db, "cv", "content"));
    $("cv").innerHTML = snap.exists() ? snap.data().html : '<p class="loading">CV coming soon.</p>';
    $("cv").hidden = false;
    $("actions").hidden = false;
    buildNav();
    if (snap.exists()) window.dispatchEvent(new CustomEvent("cv:ready"));
  } catch (e) {
    $("cv").innerHTML = '<p class="loading">Could not load the CV. Please refresh.</p>';
    $("cv").hidden = false;
  }
});
