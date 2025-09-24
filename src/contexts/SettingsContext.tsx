
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface Settings {
  finePerDay: number;
}

interface SettingsContextType extends Settings {
  setFinePerDay: (rate: number) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [finePerDay, setFinePerDayState] = useState<number>(5); // Default value
  const [loading, setLoading] = useState<boolean>(true);
  const settingsDocRef = doc(db, 'settings', 'library');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.finePerDay !== undefined) {
            setFinePerDayState(data.finePerDay);
          }
        } else {
          // If settings doc doesn't exist, create it with the default value
          await setDoc(settingsDocRef, { finePerDay: 5 });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const setFinePerDay = async (rate: number) => {
    if (rate < 0) return;
    try {
      await setDoc(settingsDocRef, { finePerDay: rate }, { merge: true });
      setFinePerDayState(rate);
    } catch (error) {
      console.error("Error updating fine rate:", error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ finePerDay, setFinePerDay, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
