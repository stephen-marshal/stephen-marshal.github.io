// Sign-in and player records for Cut the Knot (REQ-AUTH-1, REQ-STATS-1).
// The only module that talks to Firebase. ui.js imports it dynamically, so if the
// SDK is blocked the game can still explain what happened (REQ-AUTH-3).
// The e2e run swaps this file for a fake via DevTools interception (REQ-E2E-1),
// so keep the exported API small: onUser, signIn, signOut, loadPlayer, saveNight.
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, signOut as fbSignOut, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { firebaseConfig } from "../../../firebase-config.js";

const app = getApps()[0] ?? initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const COLLECTION = "ctk_players";

/** Calls back with { uid, name, email } or null whenever sign-in state changes. */
export function onUser(callback) {
  return onAuthStateChanged(auth, (u) => callback(u ? { uid: u.uid, name: u.displayName ?? "", email: u.email ?? "" } : null));
}

export const signIn = () => signInWithPopup(auth, new GoogleAuthProvider());
export const signOut = () => fbSignOut(auth);

/** Returns the player's saved record, creating an empty one on first sign-in. */
export async function loadPlayer(user) {
  const ref = doc(db, COLLECTION, user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  const fresh = {
    name: user.name.slice(0, 199), email: user.email, firstSeen: serverTimestamp(), lastSeen: serverTimestamp(),
    plays: 0, best: {}, answers: {},
  };
  await setDoc(ref, fresh);
  return fresh;
}

/** Merges one finished night (from engine.nightUpdate) into the player's record. */
export async function saveNight(user, update) {
  await setDoc(doc(db, COLLECTION, user.uid), {
    ...update, name: user.name.slice(0, 199), email: user.email, lastSeen: serverTimestamp(), plays: increment(1),
  }, { merge: true });
}
