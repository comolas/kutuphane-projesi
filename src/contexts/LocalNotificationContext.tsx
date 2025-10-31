import React, { createContext, useContext, useEffect, useRef } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

interface LocalNotificationContextType {
  scheduleNotifications: () => Promise<void>;
}

const LocalNotificationContext = createContext<LocalNotificationContextType>({
  scheduleNotifications: async () => {},
});

export const useLocalNotifications = () => useContext(LocalNotificationContext);

export const LocalNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const scheduleNotifications = async () => {
    if (!Capacitor.isNativePlatform() || !user) return;

    try {
      // Basit test bildirimi
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);

      await LocalNotifications.schedule({
        notifications: [{
          id: 1,
          title: '📚 Kütüphane Bildirimi',
          body: 'Bildirimler aktif!',
          schedule: { at: tomorrow },
        }]
      });
    } catch (error) {
      console.error('Schedule error:', error);
    }
  };

  const lastNotificationId = useRef<string | null>(null);

  useEffect(() => {
    const initNotifications = async () => {
      if (!Capacitor.isNativePlatform() || !user) return;

      try {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display !== 'granted') return;

        // Firestore bildirimlerini dinle
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          where('isRead', '==', false)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const notif = change.doc.data();
              const notifId = change.doc.id;

              // Aynı bildirimi tekrar gösterme
              if (lastNotificationId.current === notifId) return;
              lastNotificationId.current = notifId;

              // Local notification göster
              await LocalNotifications.schedule({
                notifications: [{
                  id: Date.now(),
                  title: notif.title || 'Bildirim',
                  body: notif.message || '',
                  schedule: { at: new Date(Date.now() + 1000) },
                  sound: 'default',
                  smallIcon: 'ic_stat_icon_config_sample',
                }]
              });
            }
          });
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Notification error:', error);
      }
    };

    if (user) {
      initNotifications();
    }
  }, [user]);

  return (
    <LocalNotificationContext.Provider value={{ scheduleNotifications }}>
      {children}
    </LocalNotificationContext.Provider>
  );
};
