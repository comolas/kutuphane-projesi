import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD8YMDfxMgJkIyTI9WCtZRfXthUUpP5vPM",
  authDomain: "data-49543.firebaseapp.com",
  projectId: "data-49543",
  storageBucket: "data-49543.appspot.com",
  messagingSenderId: "172190505514",
  appId: "1:172190505514:web:4b222b7ce52dbaeddb0153"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);