import { useEffect } from 'react';

export const useContentNotifications = () => {
  useEffect(() => {
    // Şimdilik devre dışı - test için
    console.log('Content notifications disabled for testing');
  }, []);
};
