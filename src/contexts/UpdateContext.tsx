import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Extend Window interface to include electronAPI
declare global {
  interface Window {
    electronAPI?: {
      onUpdateAvailable: (callback: (info: any) => void) => void;
      onUpdateNotAvailable: (callback: () => void) => void;
      onDownloadProgress: (callback: (progressObj: any) => void) => void;
      onUpdateDownloaded: (callback: (info: any) => void) => void;
      onUpdateError: (callback: (message: string) => void) => void;
      downloadUpdate: () => void;
      installUpdate: () => void;
    };
  }
}

interface UpdateContextType {
  isUpdateAvailable: boolean;
  isUpdateDownloaded: boolean;
  downloadProgress: any | null;
  updateError: string | null;
  downloadUpdate: () => void;
  installUpdate: () => void;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export const UpdateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isUpdateDownloaded, setIsUpdateDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<any | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onUpdateAvailable((info) => {
        console.log('Renderer: Update available', info);
        setIsUpdateAvailable(true);
        setIsUpdateDownloaded(false); // Reset if a new update is available
        setDownloadProgress(null);
        setUpdateError(null);
      });

      window.electronAPI.onUpdateNotAvailable(() => {
        console.log('Renderer: Update not available');
        setIsUpdateAvailable(false);
        setIsUpdateDownloaded(false);
        setDownloadProgress(null);
        setUpdateError(null);
      });

      window.electronAPI.onDownloadProgress((progressObj) => {
        console.log('Renderer: Download progress', progressObj);
        setDownloadProgress(progressObj);
      });

      window.electronAPI.onUpdateDownloaded((info) => {
        console.log('Renderer: Update downloaded', info);
        setIsUpdateDownloaded(true);
        setIsUpdateAvailable(true); // Still available, but now downloaded
        setDownloadProgress(null);
      });

      window.electronAPI.onUpdateError((message) => {
        console.error('Renderer: Update error', message);
        setUpdateError(message);
      });
    }
  }, []);

  const downloadUpdate = () => {
    if (window.electronAPI) {
      console.log('Renderer: Requesting update download');
      window.electronAPI.downloadUpdate();
    }
  };

  const installUpdate = () => {
    if (window.electronAPI) {
      console.log('Renderer: Requesting update installation');
      window.electronAPI.installUpdate();
    }
  };

  return (
    <UpdateContext.Provider
      value={{
        isUpdateAvailable,
        isUpdateDownloaded,
        downloadProgress,
        updateError,
        downloadUpdate,
        installUpdate,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
};

export const useUpdate = () => {
  const context = useContext(UpdateContext);
  if (context === undefined) {
    throw new Error('useUpdate must be used within an UpdateProvider');
  }
  return context;
};
