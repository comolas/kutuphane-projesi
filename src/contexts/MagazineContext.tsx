import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, addDoc, serverTimestamp, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { Magazine } from '../types';
import { useAuth } from './AuthContext';

interface MagazineContextType {
  magazines: Magazine[];
  fetchMagazines: () => Promise<void>;
  addMagazine: (magazine: Omit<Magazine, 'id' | 'addedAt'>) => Promise<void>;
  updateMagazine: (magazine: Magazine) => Promise<void>;
  deleteMagazine: (magazineId: string) => Promise<void>;
}

const MagazineContext = createContext<MagazineContextType | undefined>(undefined);

export const useMagazines = () => {
  const context = useContext(MagazineContext);
  if (!context) {
    throw new Error('useMagazines must be used within a MagazineProvider');
  }
  return context;
};

export const MagazineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const { user, isSuperAdmin, campusId } = useAuth();

  const fetchMagazines = useCallback(async () => {
    if (!user) {
      console.warn("User not authenticated, skipping magazine fetch.");
      return;
    }
    try {
      const magazinesCollectionRef = collection(db, "magazines");
      const magazinesQuery = isSuperAdmin ? magazinesCollectionRef : query(magazinesCollectionRef, where('campusId', '==', campusId));
      const reviewsCollectionRef = collection(db, "reviews");
      const approvedReviewsQuery = isSuperAdmin
        ? query(reviewsCollectionRef, where("status", "==", "approved"))
        : query(reviewsCollectionRef, where("status", "==", "approved"), where('campusId', '==', campusId));

      const [magazinesSnapshot, reviewsSnapshot] = await Promise.all([
        getDocs(magazinesQuery),
        user ? getDocs(approvedReviewsQuery) : Promise.resolve({ docs: [] })
      ]);

      const reviewsData = reviewsSnapshot.docs.map(doc => doc.data());

      const magazinesData = magazinesSnapshot.docs.map(doc => {
        const magazine = { ...doc.data(), id: doc.id } as Magazine;
        const magazineReviews = reviewsData.filter(review => review.magazineId === magazine.id && review.status === 'approved');
        const reviewCount = magazineReviews.length;
        const averageRating = reviewCount > 0
          ? magazineReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
          : 0;

        return {
          ...magazine,
          averageRating: parseFloat(averageRating.toFixed(1)),
          reviewCount
        };
      }) as Magazine[];
      setMagazines(magazinesData);
    } catch (error) {
      console.error("Error fetching magazines:", error);
    }
  }, [user, isSuperAdmin, campusId]);

  useEffect(() => {
    if (user) {
      fetchMagazines();
    }
  }, [user, fetchMagazines]);

  const addMagazine = async (magazine: Omit<Magazine, 'id' | 'addedAt'>) => {
    try {
      await addDoc(collection(db, 'magazines'), {
        ...magazine,
        addedAt: serverTimestamp(),
      });

      fetchMagazines();
    } catch (error) {
      console.error('Error adding magazine:', error);
      throw error;
    }
  };

  const updateMagazine = async (magazine: Magazine) => {
    try {
      const magazineRef = doc(db, 'magazines', magazine.id);
      await updateDoc(magazineRef, {
        ...magazine,
      });

      fetchMagazines();
    } catch (error) {
      console.error('Error updating magazine:', error);
      throw error;
    }
  };

  const deleteMagazine = async (magazineId: string) => {
    try {
      // You might want to delete the cover image and PDF from storage as well
      // This requires getting the URLs from the magazine doc first
      const magazineToDelete = magazines.find(m => m.id === magazineId);
      if (magazineToDelete) {
        if (magazineToDelete.coverImageUrl) {
          try {
            const coverImageRef = ref(storage, magazineToDelete.coverImageUrl);
            await deleteObject(coverImageRef);
          } catch (e) {
            if (e.code !== 'storage/object-not-found') console.error("Error deleting cover image:", e);
          }
        }
        if (magazineToDelete.pdfUrl) {
          try {
            const pdfRef = ref(storage, magazineToDelete.pdfUrl);
            await deleteObject(pdfRef);
          } catch (e) {
            if (e.code !== 'storage/object-not-found') console.error("Error deleting PDF:", e);
          }
        }
      }

      await deleteDoc(doc(db, 'magazines', magazineId));
      fetchMagazines();
    } catch (error) {
      console.error('Error deleting magazine:', error);
      throw error;
    }
  };


  return (
    <MagazineContext.Provider value={{ magazines, fetchMagazines, addMagazine, updateMagazine, deleteMagazine }}>
      {children}
    </MagazineContext.Provider>
  );
};