import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD8YMDfxMgJkIyTI9WCtZRfXthUUpP5vPM",
  authDomain: "data-49543.firebaseapp.com",
  projectId: "data-49543",
  storageBucket: "data-49543.firebasestorage.app",
  messagingSenderId: "172190505514",
  appId: "1:172190505514:web:4b222b7ce52dbaeddb0153"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);