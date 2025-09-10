import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, arrayUnion, arrayRemove, getDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { Event, Survey, Announcement } from '../types';

// Define the shape of the context
interface EventContextType {
  allItems: (Event | Survey | Announcement)[];
  joinedEvents: string[];
  fetchAllItems: () => Promise<void>;
  fetchJoinedEvents: () => Promise<void>;
  joinEvent: (eventId: string) => Promise<void>;
  leaveEvent: (eventId: string) => Promise<void>;
  setAllItems: React.Dispatch<React.SetStateAction<(Event | Survey | Announcement)[]>>;
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'type'>) => Promise<Announcement>;
  updateAnnouncement: (announcement: Announcement) => Promise<void>;
  addSurvey: (survey: Omit<Survey, 'id' | 'type'>) => Promise<Survey>;
  updateSurvey: (survey: Survey) => Promise<void>;
}

// Create the context
const EventContext = createContext<EventContextType | undefined>(undefined);

// Create the provider component
export const EventProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [allItems, setAllItems] = useState<(Event | Survey | Announcement)[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<string[]>([]);

  const fetchAllItems = useCallback(async () => {
    try {
      const eventsCollectionRef = collection(db, 'events');
      const surveysCollectionRef = collection(db, 'surveys');
      const announcementsCollectionRef = collection(db, 'announcements');

      const [eventsSnapshot, surveysSnapshot, announcementsSnapshot] = await Promise.all([
        getDocs(eventsCollectionRef),
        getDocs(surveysCollectionRef),
        getDocs(announcementsCollectionRef),
      ]);

      const eventsData = eventsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'event' })) as Event[];
      const surveysData = surveysSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'survey' })) as Survey[];
      const announcementsData = announcementsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'announcement' })) as Announcement[];
      
      setAllItems([...eventsData, ...surveysData, ...announcementsData]);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  }, []);

  const fetchJoinedEvents = useCallback(async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setJoinedEvents(userDoc.data().joinedEvents || []);
      }
    } catch (error) {
      console.error("Error fetching joined events:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchJoinedEvents();
    }
  }, [user, fetchJoinedEvents]);

  const joinEvent = async (eventId: string) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        joinedEvents: arrayUnion(eventId)
      });

      // Add a document to eventRegistrations collection
      await addDoc(collection(db, 'eventRegistrations'), {
        eventId: eventId,
        userId: user.uid,
        joinedAt: serverTimestamp()
      });

      setJoinedEvents(prev => [...prev, eventId]);
    } catch (error) {
      console.error("Error joining event:", error);
    }
  };

  const leaveEvent = async (eventId: string) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        joinedEvents: arrayRemove(eventId)
      });

      // Remove the document from eventRegistrations collection
      const registrationsRef = collection(db, 'eventRegistrations');
      const q = query(registrationsRef, where('eventId', '==', eventId), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      setJoinedEvents(prev => prev.filter(id => id !== eventId));
    } catch (error) {
      console.error("Error leaving event:", error);
    }
  };

  const addAnnouncement = async (announcement: Omit<Announcement, 'id' | 'type'>): Promise<Announcement> => {
    const newAnnouncementRef = await addDoc(collection(db, 'announcements'), {
      ...announcement,
      createdAt: serverTimestamp(),
    });
    const newAnnouncement = { ...announcement, type: 'announcement' as const, id: newAnnouncementRef.id };
    setAllItems(prev => [...prev, newAnnouncement]);
    return newAnnouncement;
  };

  const updateAnnouncement = async (announcement: Announcement) => {
    const { id, ...announcementData } = announcement;
    const announcementRef = doc(db, 'announcements', id);
    await updateDoc(announcementRef, announcementData);
    setAllItems(prev => prev.map(ann => ann.id === id ? { ...ann, ...announcementData } : ann));
  };

  const addSurvey = async (survey: Omit<Survey, 'id' | 'type'>): Promise<Survey> => {
    const newSurveyRef = await addDoc(collection(db, 'surveys'), {
      ...survey,
      createdAt: serverTimestamp(),
    });
    const newSurvey = { ...survey, type: 'survey' as const, id: newSurveyRef.id };
    setAllItems(prev => [...prev, newSurvey]);
    return newSurvey;
  };

  const updateSurvey = async (survey: Survey) => {
    const { id, ...surveyData } = survey;
    const surveyRef = doc(db, 'surveys', id);
    await updateDoc(surveyRef, surveyData);
    setAllItems(prev => prev.map(s => s.id === id ? { ...s, ...surveyData } : s));
  };


  const value = {
    allItems,
    joinedEvents,
    fetchAllItems,
    fetchJoinedEvents,
    joinEvent,
    leaveEvent,
    setAllItems,
    addAnnouncement,
    updateAnnouncement,
    addSurvey,
    updateSurvey,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};

// Create a custom hook to use the Event context
export const useEvents = () => {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};
