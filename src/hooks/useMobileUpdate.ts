import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { checkMobileUpdate } from '../utils/mobileUpdate';

export const useMobileUpdate = () => {
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    downloadUrl: string;
    forceUpdate: boolean;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkUpdate = async () => {
      const update = await checkMobileUpdate();
      if (update) {
        setUpdateInfo(update);
        setShowModal(true);
      }
    };

    if (Capacitor.isNativePlatform()) {
      checkUpdate();
    }
  }, []);

  const handleUpdate = async () => {
    if (updateInfo?.downloadUrl) {
      await Browser.open({ url: updateInfo.downloadUrl });
    }
  };

  const handleClose = () => {
    if (!updateInfo?.forceUpdate) {
      setShowModal(false);
    }
  };

  return {
    updateInfo,
    showModal,
    handleUpdate,
    handleClose,
  };
};
