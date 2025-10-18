import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Capacitor } from '@capacitor/core';

export const checkMobileUpdate = async () => {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const versionDoc = await getDoc(doc(db, 'appInfo', 'mobileVersion'));
    if (!versionDoc.exists()) return null;

    const { version, downloadUrl, forceUpdate } = versionDoc.data();
    const currentVersion = '1.1.0'; // package.json'dan alın

    if (version > currentVersion) {
      return { version, downloadUrl, forceUpdate };
    }
    return null;
  } catch (error) {
    console.error('Update check failed:', error);
    return null;
  }
};
