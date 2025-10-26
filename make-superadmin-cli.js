// Firebase CLI kullanarak süper admin yapma scripti
// Kullanım: node make-superadmin-cli.js YOUR_EMAIL@example.com

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const email = process.argv[2];

if (!email) {
  console.error('❌ Hata: E-posta adresi belirtilmedi');
  console.log('Kullanım: node make-superadmin-cli.js YOUR_EMAIL@example.com');
  process.exit(1);
}

async function makeSuperAdmin() {
  try {
    // Firestore'da güncelle
    const usersRef = doc(db, 'users', email);
    await updateDoc(usersRef, {
      role: 'superadmin',
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ ${email} Firestore'da süper admin yapıldı!`);
    console.log('⚠️  Custom claims için Firebase Console kullanın veya Admin SDK gerekli.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

makeSuperAdmin();
