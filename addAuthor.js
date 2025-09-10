import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD8YMDfxMgJkIyTI9WCtZRfXthUUpP5vPM",
  authDomain: "data-49543.firebaseapp.com",
  projectId: "data-49543",
  storageBucket: "data-49543.firebasestorage.app",
  messagingSenderId: "172190505514",
  appId: "1:172190505514:web:4b222b7ce52dbaeddb0153"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addAuthor() {
  try {
    const docRef = await addDoc(collection(db, "authors"), {
      name: "Sabahattin Ali",
      biography: "Sabahattin Ali (25 Şubat 1907 - 2 Nisan 1948), Türk yazar, şair ve gazeteci. Edebi kişiliğiyle toplumcu gerçekçi bir çizgide yer alan, eserlerinde insanların görünmeyen yüzlerini ortaya çıkaran ve Anadolu insanının yaşamını tüm çıplaklığıyla yansıtan bir yazar olarak tanınır.",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Sabahattin_Ali.jpg/800px-Sabahattin_Ali.jpg",
      featured: false
    });
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
  // In Node.js, the process will exit automatically when there are no more pending asynchronous operations.
  // If you want to explicitly exit, you can call process.exit()
  // For this script, it's not strictly necessary, but it's good practice to manage the process lifecycle.
  // We'll let it exit naturally.
}

addAuthor();
