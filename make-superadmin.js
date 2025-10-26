// Bir kullanıcıyı süper admin yapmak için bu scripti çalıştırın
// Kullanım: node make-superadmin.js YOUR_EMAIL@example.com

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = process.argv[2];

if (!email) {
  console.error('❌ Hata: E-posta adresi belirtilmedi');
  console.log('Kullanım: node make-superadmin.js YOUR_EMAIL@example.com');
  process.exit(1);
}

async function makeSuperAdmin() {
  try {
    // Kullanıcıyı e-posta ile bul
    const user = await admin.auth().getUserByEmail(email);
    
    // Custom claims ayarla
    await admin.auth().setCustomUserClaims(user.uid, { role: 'superadmin' });
    
    // Firestore'da güncelle
    await admin.firestore().collection('users').doc(user.uid).update({
      role: 'superadmin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ ${email} başarıyla süper admin yapıldı!`);
    console.log('⚠️  Değişikliklerin etkili olması için çıkış yapıp tekrar giriş yapın.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

makeSuperAdmin();
