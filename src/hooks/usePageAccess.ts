import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export const usePageAccess = (pageId: string) => {
  const [hasAccess, setHasAccess] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const campusId = userDoc.data().campusId;
        if (!campusId) {
          setHasAccess(true);
          setLoading(false);
          return;
        }

        const accessDoc = await getDoc(doc(db, 'pageAccess', campusId));
        if (accessDoc.exists()) {
          const access = accessDoc.data()[pageId];
          setHasAccess(access !== false);
        } else {
          setHasAccess(true);
        }
      } catch (error) {
        console.error('Erişim kontrolü hatası:', error);
        setHasAccess(true);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [pageId]);

  return { hasAccess, loading };
};
