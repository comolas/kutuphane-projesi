import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

interface Request {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: Date;
  userId: string;
  response?: string;
  responseDate?: Date;
  userData?: {
    displayName: string;
    studentClass: string;
    studentNumber: string;
  };
}

interface RequestContextType {
  requests: Request[];
  loading: boolean;
  sendResponse: (requestId: string, responseText: string) => Promise<void>;
  updateRequestStatus: (requestId: string, status: 'pending' | 'in-progress' | 'completed') => Promise<void>;
}

const RequestContext = createContext<RequestContextType | undefined>(undefined);

export const useRequests = () => {
  const context = useContext(RequestContext);
  if (!context) {
    throw new Error('useRequests must be used within a RequestProvider');
  }
  return context;
};

export const RequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSuperAdmin, campusId } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const requestsRef = collection(db, 'requests');
      const requestsQuery = isSuperAdmin ? requestsRef : query(requestsRef, where('campusId', '==', campusId));
      const requestsSnapshot = await getDocs(requestsQuery);
      
      const requestsData: Request[] = [];
      
      for (const doc of requestsSnapshot.docs) {
        const data = doc.data();
        
        const userDoc = await getDocs(query(
          collection(db, 'users'),
          where('uid', '==', data.userId)
        ));
        
        const userData = userDoc.docs[0]?.data();
        
        requestsData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          responseDate: data.responseDate?.toDate(),
          userData: userData ? {
            displayName: userData.displayName,
            studentClass: userData.studentClass,
            studentNumber: userData.studentNumber
          } : undefined
        } as Request);
      }
      
      setRequests(requestsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
    setLoading(false);
  }, [isSuperAdmin, campusId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const sendResponse = async (requestId: string, responseText: string) => {
    try {
      const requestRef = doc(db, 'requests', requestId);
      await updateDoc(requestRef, {
        status: 'completed',
        response: responseText,
        responseDate: Timestamp.now()
      });
      fetchRequests(); // Refetch requests to get the latest data
    } catch (error) {
      console.error('Error sending response:', error);
      throw error;
    }
  };

  const updateRequestStatus = async (requestId: string, status: 'pending' | 'in-progress' | 'completed') => {
    try {
      const requestRef = doc(db, 'requests', requestId);
      await updateDoc(requestRef, { status });
      fetchRequests(); // Refetch requests to get the latest data
    } catch (error) {
      console.error('Error updating request status:', error);
      throw error;
    }
  };

  return (
    <RequestContext.Provider value={{ requests, loading, sendResponse, updateRequestStatus }}>
      {children}
    </RequestContext.Provider>
  );
};