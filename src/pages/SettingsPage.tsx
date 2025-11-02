import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Bell, BellOff, User, Award, Calendar, Mail, GraduationCap, Hash, Clock, Target, CreditCard, Download, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGoals } from '../contexts/GoalsContext';
import ReadingGoalsModal from '../components/common/ReadingGoalsModal';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import html2canvas from 'html2canvas';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { monthlyGoal, yearlyGoal, fetchGoals } = useGoals();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [showReadingGoalsModal, setShowReadingGoalsModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [cardTemplate, setCardTemplate] = useState<any>(null);
  const [loadingCard, setLoadingCard] = useState(true);
  const [downloadingCard, setDownloadingCard] = useState(false);

  useEffect(() => {
    const checkNotificationStatus = async () => {
      if (Capacitor.isNativePlatform()) {
        setIsNative(true);
        const permission = await LocalNotifications.checkPermissions();
        setNotificationsEnabled(permission.display === 'granted');
      }
    };
    checkNotificationStatus();
    fetchGoals();
    loadLibraryCard();
  }, [fetchGoals]);

  const loadLibraryCard = async () => {
    if (!user?.uid) return;
    
    try {
      setLoadingCard(true);
      
      // QR kod oluştur
      const generateQR = httpsCallable(functions, 'generateLibraryCardQR');
      const result = await generateQR({ userId: user.uid }) as any;
      setQrCode(result.data.qrCode);
      
      // Şablon yükle
      const templateDoc = await getDoc(doc(db, 'cardTemplates', userData?.campusId || ''));
      if (templateDoc.exists()) {
        setCardTemplate(templateDoc.data());
      } else {
        // Varsayılan şablon
        setCardTemplate({
          primaryColor: '#6366f1',
          secondaryColor: '#8b5cf6',
          textColor: '#ffffff',
          logoUrl: 'https://r.resimlink.com/BJq8au6HpG.png',
          schoolName: 'Okul Kütüphanesi',
          showLogo: true,
          showPhoto: true
        });
      }
    } catch (error) {
      console.error('Kart yüklenemedi:', error);
    } finally {
      setLoadingCard(false);
    }
  };

  const downloadCard = async () => {
    const cardElement = document.getElementById('digital-library-card');
    if (!cardElement) return;

    setDownloadingCard(true);
    try {
      const canvas = await html2canvas(cardElement, { scale: 2 });
      const link = document.createElement('a');
      link.download = `${userData?.displayName}-kutuphane-karti.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Kart indirilemedi:', error);
    } finally {
      setDownloadingCard(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24"> 
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            {t('common.back')}
          </button>
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="mt-2 text-gray-600">
            {t('settings.description')}
          </p>
        </div>

        {/* Profil Kartı */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 sm:p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              {userData?.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt="Profil"
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white/30 shadow-xl object-cover"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white/30 shadow-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <User className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-indigo-900 rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg border-4 border-white shadow-lg">
                {userData?.level || 1}
              </div>
            </div>

            {/* Bilgiler */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {userData?.displayName || user?.email?.split('@')[0]}
              </h2>
              <p className="text-white/80 mb-4">{user?.email}</p>
              
              {/* XP Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/90 text-sm font-medium">{t('settings.levelProgress')}</span>
                  <span className="text-white font-bold">{userData?.totalXP || 0} XP</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div
                    className="bg-yellow-400 h-3 rounded-full transition-all duration-500 shadow-lg"
                    style={{ width: `${((userData?.totalXP || 0) % 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* İstatistikler */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center justify-center mb-2">
                    <Award className="w-5 h-5 text-yellow-400 mr-2" />
                    <span className="text-white/80 text-sm">{t('settings.level')}</span>
                  </div>
                  <p className="text-2xl font-bold text-white text-center">{userData?.level || 1}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center justify-center mb-2">
                    <Calendar className="w-5 h-5 text-blue-300 mr-2" />
                    <span className="text-white/80 text-sm">{t('settings.membership')}</span>
                  </div>
                  <p className="text-2xl font-bold text-white text-center">
                    {t('settings.daysCount', { count: userData?.createdAt ? Math.floor((Date.now() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hesap Bilgileri */}
        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden border border-white/20">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <User className="w-5 h-5 mr-2 text-indigo-600" />
              {t('settings.accountInfo')}
            </h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 rounded-lg p-4 shadow-sm">
                <p className="text-sm text-yellow-800">
                  <strong>{t('settings.note')}:</strong> {t('settings.profileNote')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 mr-2 text-indigo-600" />
                    {t('settings.fullName')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={userData?.displayName || ''}
                      disabled
                      className="block w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl shadow-sm bg-gradient-to-r from-gray-50 to-gray-100 transition-all group-hover:shadow-md"
                    />
                    <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="group">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 mr-2 text-indigo-600" />
                    {t('settings.email')}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="block w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl shadow-sm bg-gradient-to-r from-gray-50 to-gray-100 transition-all group-hover:shadow-md"
                    />
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="group">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <GraduationCap className="w-4 h-4 mr-2 text-indigo-600" />
                    {t('settings.class')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={userData?.studentClass || ''}
                      disabled
                      className="block w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl shadow-sm bg-gradient-to-r from-gray-50 to-gray-100 transition-all group-hover:shadow-md"
                    />
                    <GraduationCap className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="group">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Hash className="w-4 h-4 mr-2 text-indigo-600" />
                    {t('settings.studentNumber')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={userData?.studentNumber || ''}
                      disabled
                      className="block w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl shadow-sm bg-gradient-to-r from-gray-50 to-gray-100 transition-all group-hover:shadow-md"
                    />
                    <Hash className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="group">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
                    {t('settings.registrationDate')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('tr-TR') : ''}
                      disabled
                      className="block w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl shadow-sm bg-gradient-to-r from-gray-50 to-gray-100 transition-all group-hover:shadow-md"
                    />
                    <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="group">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 mr-2 text-indigo-600" />
                    {t('settings.lastLogin')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={userData?.lastLogin ? new Date(userData.lastLogin).toLocaleDateString('tr-TR') : ''}
                      disabled
                      className="block w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl shadow-sm bg-gradient-to-r from-gray-50 to-gray-100 transition-all group-hover:shadow-md"
                    />
                    <Clock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dijital Kütüphane Kartım */}
        <div className="mt-6 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden border border-white/20">
          <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-indigo-600" />
              {t('settings.digitalLibraryCard')}
            </h3>
            <button
              onClick={downloadCard}
              disabled={downloadingCard || loadingCard}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center disabled:opacity-50"
            >
              {downloadingCard ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {downloadingCard ? t('settings.downloading') : t('settings.downloadPNG')}
            </button>
          </div>
          <div className="p-4 sm:p-6">
            {loadingCard ? (
              <div className="flex justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="flex justify-center">
                <div 
                  id="digital-library-card"
                  className="relative w-[340px] h-[212px] rounded-2xl shadow-2xl p-4" 
                  style={{ background: `linear-gradient(to bottom right, ${cardTemplate?.primaryColor || '#6366f1'}, ${cardTemplate?.secondaryColor || '#8b5cf6'})` }}
                >
                  <div className="rounded-xl p-2 mb-3 flex items-center justify-center gap-2" style={{ background: `linear-gradient(to right, ${cardTemplate?.secondaryColor || '#8b5cf6'}, ${cardTemplate?.primaryColor || '#6366f1'})` }}>
                    {cardTemplate?.showLogo && cardTemplate?.logoUrl && (
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center p-0.5">
                        <img src={cardTemplate.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <h4 className="font-bold text-sm" style={{ color: cardTemplate?.textColor || '#ffffff' }}>{t('settings.libraryCard').toUpperCase()}</h4>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="bg-white rounded-xl p-2 flex items-center justify-center flex-shrink-0">
                      {qrCode ? (
                        <img src={qrCode} alt="QR" className="w-20 h-20" />
                      ) : (
                        <Loader className="w-20 h-20 animate-spin text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0" style={{ color: cardTemplate?.textColor || '#ffffff' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-sm truncate flex-1">{userData?.displayName}</p>
                        {cardTemplate?.showPhoto && userData?.photoURL && (
                          <img 
                            src={userData.photoURL} 
                            alt="Profil" 
                            className="w-10 h-10 rounded-full border-2 object-cover flex-shrink-0"
                            style={{ borderColor: cardTemplate?.textColor || '#ffffff' }}
                          />
                        )}
                      </div>
                      <p className="text-xs opacity-90">{t('settings.cardNumber')}: {userData?.studentNumber}</p>
                      <p className="text-xs opacity-90">{t('settings.cardClass')}: {userData?.studentClass}</p>
                      <p className="text-xs opacity-75 mt-2">{cardTemplate?.schoolName || 'Okul Kütüphanesi'}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>{t('settings.tips')}:</strong>
                  </p>
                  <ul className="mt-2 text-sm text-blue-700 space-y-1 ml-4 list-disc">
                    <li>{t('settings.cardTip1')}</li>
                    <li>{t('settings.cardTip2')}</li>
                    <li>{t('settings.cardTip3')}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Okuma Hedefim */}
        <div className="mt-6 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden border border-white/20">
          <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Target className="w-5 h-5 mr-2 text-indigo-600" />
              {t('settings.readingGoal')}
            </h3>
            <button
              onClick={() => setShowReadingGoalsModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              {t('common.edit')}
            </button>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-6">
              {monthlyGoal ? (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-lg font-semibold text-gray-800">
                      {t('settings.monthlyGoal', { count: monthlyGoal.goal })}
                    </p>
                    <p className="text-lg font-bold text-indigo-600">{`${monthlyGoal.progress} / ${monthlyGoal.goal}`}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-indigo-600 h-4 rounded-full"
                      style={{ width: `${Math.min((monthlyGoal.progress / monthlyGoal.goal) * 100, 100)}%` }}
                    ></div>
                  </div>
                  {monthlyGoal.progress >= monthlyGoal.goal && (
                    <div className="mt-2 text-sm text-green-600 font-medium">
                      {t('settings.monthlyGoalComplete')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p>{t('settings.noMonthlyGoal')}</p>
                </div>
              )}
              {yearlyGoal ? (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-lg font-semibold text-gray-800">
                      {t('settings.yearlyGoal', { count: yearlyGoal.goal })}
                    </p>
                    <p className="text-lg font-bold text-indigo-600">{`${yearlyGoal.progress} / ${yearlyGoal.goal}`}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-indigo-600 h-4 rounded-full"
                      style={{ width: `${Math.min((yearlyGoal.progress / yearlyGoal.goal) * 100, 100)}%` }}
                    ></div>
                  </div>
                  {yearlyGoal.progress >= yearlyGoal.goal && (
                    <div className="mt-2 text-sm text-green-600 font-medium">
                      {t('settings.yearlyGoalComplete')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p>{t('settings.noYearlyGoal')}</p>
                </div>
              )}
              {!monthlyGoal && !yearlyGoal && (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">{t('settings.noGoalsYet')}</p>
                  <button
                    onClick={() => setShowReadingGoalsModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {t('settings.createNow')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bildirim Ayarları */}
        {isNative && (
          <div className="mt-6 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden border border-white/20">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-indigo-600" />
                {t('settings.notificationSettings')}
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
                      <p className="font-medium text-gray-900">{t('settings.notifications')}</p>
                      <p className="text-sm text-gray-500">
                        {notificationsEnabled 
                          ? t('settings.notificationsActive') 
                          : t('settings.notificationsOff')}
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
                      <strong>{t('settings.tip')}:</strong> {t('settings.notificationsTip')}
                    </p>
                    <ul className="mt-2 text-sm text-blue-700 space-y-1 ml-4 list-disc">
                      <li>{t('settings.notificationTip1')}</li>
                      <li>{t('settings.notificationTip2')}</li>
                      <li>{t('settings.notificationTip3')}</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ReadingGoalsModal
        isOpen={showReadingGoalsModal}
        onClose={() => setShowReadingGoalsModal(false)}
        onGoalSaved={fetchGoals}
      />
    </div>
  );
};

export default SettingsPage;