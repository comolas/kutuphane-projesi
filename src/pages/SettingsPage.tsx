import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell, BellOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const checkNotificationStatus = async () => {
      if (Capacitor.isNativePlatform()) {
        setIsNative(true);
        const permission = await LocalNotifications.checkPermissions();
        setNotificationsEnabled(permission.display === 'granted');
      }
    };
    checkNotificationStatus();
  }, []);

  const toggleNotifications = async () => {
    if (!isNative) return;

    if (notificationsEnabled) {
      // Bildirimleri kapat (tüm planlananları iptal et)
      const pending = await LocalNotifications.getPending();
      await LocalNotifications.cancel({ notifications: pending.notifications });
      setNotificationsEnabled(false);
    } else {
      // Bildirimleri aç (izin iste)
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display === 'granted') {
        setNotificationsEnabled(true);
        // Sayfayı yenile (bildirimleri yeniden planla)
        window.location.reload();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24"> 
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Geri Dön
          </button>
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Ayarlar</h1>
          <p className="mt-2 text-gray-600">
            Hesap ayarlarınızı ve tercihlerinizi buradan yönetebilirsiniz.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Not:</strong> Profil bilgileriniz sistem yöneticisi tarafından yönetilmektedir. 
                  Değişiklik yapmak için kütüphane personeli ile iletişime geçiniz.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={userData?.displayName || ''}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  E-posta
                </label>
                <input
                  type="email"
                  name="email"
                  value={user?.email || ''}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sınıf
                </label>
                <input
                  type="text"
                  name="studentClass"
                  value={userData?.studentClass || ''}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Öğrenci Numarası
                </label>
                <input
                  type="text"
                  name="studentNumber"
                  value={userData?.studentNumber || ''}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kayıt Tarihi
                </label>
                <input
                  type="text"
                  value={userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : ''}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Son Giriş
                </label>
                <input
                  type="text"
                  value={userData?.lastLogin ? new Date(userData.lastLogin).toLocaleDateString() : ''}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bildirim Ayarları */}
        {isNative && (
          <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-indigo-600" />
                Bildirim Ayarları
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {notificationsEnabled ? (
                      <Bell className="w-6 h-6 text-green-600" />
                    ) : (
                      <BellOff className="w-6 h-6 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">Bildirimler</p>
                      <p className="text-sm text-gray-500">
                        {notificationsEnabled 
                          ? 'Kitap iade hatırlatmaları ve yeni içerik bildirimleri aktif' 
                          : 'Bildirimler kapalı'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleNotifications}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      notificationsEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {notificationsEnabled && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>İpucu:</strong> Bildirimler şunları içerir:
                    </p>
                    <ul className="mt-2 text-sm text-blue-700 space-y-1 ml-4 list-disc">
                      <li>Kitap iade tarihi hatırlatmaları (3 gün, 1 gün, iade günü)</li>
                      <li>Yeni kitap ekleme bildirimleri</li>
                      <li>Yeni duyuru, etkinlik ve anket bildirimleri</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;