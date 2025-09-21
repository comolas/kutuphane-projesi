import React from 'react';
import { useUpdate } from '../../contexts/UpdateContext';

const UpdateButton: React.FC = () => {
  const { isUpdateAvailable, isUpdateDownloaded, downloadProgress, downloadUpdate, installUpdate } = useUpdate();

  let buttonText = 'Uygulamayı Güncelle';
  let buttonColorClass = 'bg-blue-500 hover:bg-blue-700'; // Default blue

  if (isUpdateAvailable && !isUpdateDownloaded) {
    buttonText = 'Güncelleme Mevcut';
    buttonColorClass = 'bg-green-500 hover:bg-green-700'; // Green for available update
    if (downloadProgress && downloadProgress.percent) {
      buttonText = `İndiriliyor... %${Math.round(downloadProgress.percent)}`;
      buttonColorClass = 'bg-yellow-500 hover:bg-yellow-600'; // Yellow for downloading
    }
  } else if (isUpdateDownloaded) {
    buttonText = 'Kurulum İçin Yeniden Başlat';
    buttonColorClass = 'bg-green-600 hover:bg-green-800'; // Darker green for downloaded
  } else { // Added this else block for when no update is available or downloaded
    buttonText = 'Uygulama Güncel'; // Or 'Güncelleme Yok'
    buttonColorClass = 'bg-gray-500 hover:bg-gray-600'; // Gray for up-to-date
  }

  const handleClick = () => {
    if (isUpdateDownloaded) {
      installUpdate();
    } else if (isUpdateAvailable) {
      downloadUpdate();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`relative px-4 py-2 text-white font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonColorClass}`}
      disabled={isUpdateAvailable && !isUpdateDownloaded && downloadProgress && downloadProgress.percent > 0}
    >
      {buttonText}
      {isUpdateAvailable && !isUpdateDownloaded && (
        <span className="absolute top-0 right-0 -mt-2 -mr-2 px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
          1
        </span>
      )}
    </button>
  );
};

export default UpdateButton;
