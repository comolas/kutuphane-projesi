import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: any;
}

const GlobalSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('settings');
  
  // Ayarlar state'leri
  const [settings, setSettings] = useState({
    dailyFineAmount: 0,
    maxBorrowDuration: 14,
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Duyuru state'leri
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const settingsDocRef = doc(db, 'settings', 'global');
  const announcementsColRef = collection(db, 'announcements');

  // Ayarları Yükle
  useEffect(() => {
    if (activeTab === 'settings') {
      const fetchSettings = async () => {
        setLoadingSettings(true);
        try {
          const docSnap = await getDoc(settingsDocRef);
          if (docSnap.exists()) {
            setSettings(docSnap.data() as any);
          }
        } catch (error) {
          console.error("Ayarlar çekilirken hata:", error);
        } finally {
          setLoadingSettings(false);
        }
      };
      fetchSettings();
    }
  }, [activeTab]);

  // Duyuruları Yükle
  useEffect(() => {
    if (activeTab === 'announcements') {
      const fetchAnnouncements = async () => {
        setLoadingAnnouncements(true);
        try {
          const q = query(announcementsColRef, where('isGlobal', '==', true), orderBy('createdAt', 'desc'));
          const querySnapshot = await getDocs(q);
          const fetchedAnnouncements = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
          setAnnouncements(fetchedAnnouncements);
        } catch (error) {
          console.error("Duyurular çekilirken hata:", error);
        } finally {
          setLoadingAnnouncements(false);
        }
      };
      fetchAnnouncements();
    }
  }, [activeTab]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await setDoc(settingsDocRef, settings, { merge: true });
      alert('Ayarlar başarıyla kaydedildi!');
    } catch (error) {
      alert('Ayarlar kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      alert('Başlık ve içerik boş olamaz.');
      return;
    }
    setIsPublishing(true);
    try {
      const docRef = await addDoc(announcementsColRef, {
        ...newAnnouncement,
        isGlobal: true,
        authorId: user?.uid,
        authorName: user?.displayName || 'Süper Admin',
        createdAt: serverTimestamp(),
      });
      setAnnouncements(prev => [{ id: docRef.id, ...newAnnouncement, authorName: user?.displayName || 'Süper Admin', createdAt: new Date() }, ...prev]);
      setNewAnnouncement({ title: '', content: '' });
      alert('Duyuru başarıyla yayınlandı!');
    } catch (error) {
      alert('Duyuru yayınlanamadı.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-6 sm:mb-8">Genel Ayarlar ve Duyurular</h1>

      <div className="mb-4 sm:mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-4 sm:gap-8 overflow-x-auto" aria-label="Tabs">
          <button onClick={() => setActiveTab('settings')} className={`${activeTab === 'settings' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm`}>Genel Ayarlar</button>
          <button onClick={() => setActiveTab('announcements')} className={`${activeTab === 'announcements' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm`}>Global Duyurular</button>
        </nav>
      </div>

      {activeTab === 'settings' && (
        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow-lg max-w-2xl">
          {loadingSettings ? <p>Ayarlar yükleniyor...</p> : (
            <div className="space-y-6">
              <div>
                <label htmlFor="dailyFineAmount" className="block text-sm font-medium text-gray-700">Günlük Gecikme Cezası (TL)</label>
                <input type="number" name="dailyFineAmount" id="dailyFineAmount" value={settings.dailyFineAmount} onChange={(e) => setSettings(prev => ({ ...prev, dailyFineAmount: Number(e.target.value) }))} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="maxBorrowDuration" className="block text-sm font-medium text-gray-700">Maksimum Ödünç Alma Süresi (gün)</label>
                <input type="number" name="maxBorrowDuration" id="maxBorrowDuration" value={settings.maxBorrowDuration} onChange={(e) => setSettings(prev => ({ ...prev, maxBorrowDuration: Number(e.target.value) }))} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div className="text-right">
                <button onClick={handleSaveSettings} disabled={isSaving} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400">{isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-1 bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow-lg">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Yeni Duyuru Yayınla</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Başlık</label>
                <input type="text" name="title" id="title" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">İçerik</label>
                <textarea name="content" id="content" value={newAnnouncement.content} onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})} rows={6} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
              </div>
              <div className="text-right">
                <button onClick={handlePublishAnnouncement} disabled={isPublishing} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400">{isPublishing ? 'Yayınlanıyor...' : 'Duyuruyu Yayınla'}</button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Geçmiş Duyurular</h2>
            {loadingAnnouncements ? <p>Duyurular yükleniyor...</p> : (
              <div className="space-y-4">
                {announcements.length > 0 ? announcements.map(ann => (
                  <div key={ann.id} className="bg-white p-4 sm:p-5 rounded-lg shadow">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-gray-800">{ann.title}</h3>
                      <span className="text-xs text-gray-500">{ann.createdAt?.toDate().toLocaleDateString('tr-TR')}</span>
                    </div>
                    <p className="text-gray-700 mt-2 whitespace-pre-wrap">{ann.content}</p>
                    <p className="text-right text-xs text-gray-500 mt-3">Yayınlayan: {ann.authorName}</p>
                  </div>
                )) : <p className="text-gray-500">Henüz global bir duyuru yapılmamış.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSettingsPage;
