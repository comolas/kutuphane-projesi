
import React, { createContext, useContext, ReactNode } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'question';

interface AlertContextType {
  showAlert: (title: string, text: string, icon: AlertType) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const MySwal = withReactContent(Swal);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const showAlert = (title: string, text: string, icon: AlertType) => {
    MySwal.fire({
      title: title,
      text: text,
      icon: icon,
      confirmButtonColor: '#4F46E5', // indigo-600
      confirmButtonText: 'Tamam',
    });
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
