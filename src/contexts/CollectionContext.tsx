import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { StoryCollection } from '../types';
import { useAuth } from './AuthContext';

interface ICollectionContext {
  collections: StoryCollection[];
  isLoading: boolean;
  fetchCollections: () => void;
}

const CollectionContext = createContext<ICollectionContext | undefined>(undefined);

export const CollectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSuperAdmin, campusId } = useAuth();
  const [collections, setCollections] = useState<StoryCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = isSuperAdmin
        ? query(collection(db, 'collections'), where('isActive', '==', true), orderBy('order', 'asc'))
        : query(collection(db, 'collections'), where('isActive', '==', true), where('campusId', '==', campusId), orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);
      const collectionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoryCollection));
      setCollections(collectionsData);
    } catch (error) {
      console.error("Error fetching active collections: ", error);
      setCollections([]);
    } finally {
        setIsLoading(false);
    }
  }, [isSuperAdmin, campusId]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  return (
    <CollectionContext.Provider value={{ collections, isLoading, fetchCollections }}>
      {children}
    </CollectionContext.Provider>
  );
};

export const useCollections = (): ICollectionContext => {
  const context = useContext(CollectionContext);
  if (context === undefined) {
    throw new Error('useCollections must be used within a CollectionProvider');
  }
  return context;
};
