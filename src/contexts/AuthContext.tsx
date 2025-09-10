import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLogin: Date;
  studentClass: string;
  studentNumber: string;
  hasCompletedOnboarding?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  userData: UserData | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  userData: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      
      if (user) {
        // Check if user is admin
        const isAdminUser = user.email === 'datakolejikutuphane@gmail.com';
        setIsAdmin(isAdminUser);

        // Get or create user document
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          // Create new user document with default values for studentClass and studentNumber
          const newUserData: UserData = {
            uid: user.uid,
            email: user.email!,
            displayName: user.displayName ?? '',
            role: isAdminUser ? 'admin' : 'user',
            createdAt: new Date(),
            lastLogin: new Date(),
            studentClass: '', // Default empty string
            studentNumber: '', // Default empty string
          };
          
          await setDoc(userRef, newUserData);
          setUserData(newUserData);
        } else {
          // Update last login and get existing data
          const existingData = userDoc.data() as UserData;
          await setDoc(userRef, { 
            ...existingData, 
            lastLogin: new Date(),
            role: isAdminUser ? 'admin' : existingData.role, // Ensure admin role is set
            studentClass: existingData.studentClass || '', // Ensure studentClass exists
            studentNumber: existingData.studentNumber || '', // Ensure studentNumber exists
          }, { merge: true });
          setUserData({
            ...existingData,
            studentClass: existingData.studentClass || '',
            studentNumber: existingData.studentNumber || '',
          } as UserData);
        }
      } else {
        setUserData(null);
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    isAdmin,
    loading,
    userData,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};