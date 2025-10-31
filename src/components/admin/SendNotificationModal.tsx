import React, { useState, useEffect } from 'react';
import { X, Send, Users, User, GraduationCap } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../../contexts/AuthContext';
import Swal from 'sweetalert2';

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SendNotificationModal: React.FC<SendNotificationModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [targetType, setTargetType] = useState<'all' | 'class' | 'user'>('all');
  const [targetValue, setTargetValue] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [icon, setIcon] = useState('📢');
  const [actionUrl, setActionUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [classSearch, setClassSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
  }, [isOpen, user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
      const campusId = userDoc.docs[0]?.data()?.campusId;

      if (!campusId) return;

      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), where('campusId', '==', campusId))
      );

      const classSet = new Set<string>();
      const usersList: any[] = [];

      usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.studentClass) classSet.add(data.studentClass);
        usersList.push({ id: doc.id, name: data.displayName, class: data.studentClass });
      });

      setClasses(Array.from(classSet).sort());
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    setLoading(true);
    try {
      const sendBulkNotification = httpsCallable(functions, 'sendBulkNotification');
      const result = await sendBulkNotification({
        targetType,
        targetValue: targetType === 'all' ? null : targetValue,
        title,
        message,
        icon,
        actionUrl: actionUrl || null,
      });

      const data = result.data as any;
      await Swal.fire({
        icon: 'success',
        title: 'Başarılı!',
        text: `${data.count} kullanıcıya bildirim gönderildi!`,
        confirmButtonColor: '#4F46E5',
      });
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error sending notification:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Hata!',
        text: 'Bildirim gönderilemedi: ' + error.message,
        confirmButtonColor: '#4F46E5',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTargetType('all');
    setTargetValue('');
    setTitle('');
    setMessage('');
    setIcon('📢');
    setActionUrl('');
    setClassSearch('');
    setUserSearch('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 animate-fadeIn" onClick={onClose}>
      <div className="bg-gradient-to-br from-white to-indigo-50 w-full h-full overflow-y-auto flex flex-col transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3">
                <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-bold text-white">Toplu Bildirim Gönder</h3>
                <p className="text-xs sm:text-sm text-white/80">Kullanıcılara bildirim gönderin</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Hedef Seçimi */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-3">
              Kime Gönderilsin?
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTargetType('all');
                  setTargetValue('');
                  setClassSearch('');
                  setUserSearch('');
                }}
                className={`px-4 py-2 rounded-xl border-2 transition-all min-h-[44px] flex flex-col items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation ${
                  targetType === 'all'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-300'
                }`}
              >
                <Users className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-medium">Tüm Kampüs</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetType('class');
                  setTargetValue('');
                  setUserSearch('');
                }}
                className={`px-4 py-2 rounded-xl border-2 transition-all min-h-[44px] flex flex-col items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation ${
                  targetType === 'class'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-300'
                }`}
              >
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-medium">Belirli Sınıf</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetType('user');
                  setTargetValue('');
                  setClassSearch('');
                }}
                className={`px-4 py-2 rounded-xl border-2 transition-all min-h-[44px] flex flex-col items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation ${
                  targetType === 'user'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-300'
                }`}
              >
                <User className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-medium">Tek Kullanıcı</p>
              </button>
            </div>
          </div>

          {/* Sınıf Seçimi */}
          {targetType === 'class' && (
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Sınıf Seç {targetValue && <span className="text-indigo-600">✓ Seçildi: {targetValue}</span>}
              </label>
              <input
                type="text"
                placeholder="Sınıf ara... (örn: 9-A)"
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 mb-2 border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
              />
              <select
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all text-sm sm:text-base ${
                  targetValue ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}
                required
                size={5}
              >
                <option value="">Sınıf seçin...</option>
                {classes
                  .filter(cls => cls.toLowerCase().includes(classSearch.toLowerCase()))
                  .map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {classes.filter(cls => cls.toLowerCase().includes(classSearch.toLowerCase())).length} sınıf bulundu
              </p>
            </div>
          )}

          {/* Kullanıcı Seçimi */}
          {targetType === 'user' && (
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Kullanıcı Seç {targetValue && (
                  <span className="text-indigo-600">✓ Seçildi: {users.find(u => u.id === targetValue)?.name}</span>
                )}
              </label>
              <input
                type="text"
                placeholder="Kullanıcı ara... (isim veya sınıf)"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 mb-2 border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
              />
              <select
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all text-sm sm:text-base ${
                  targetValue ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}
                required
                size={8}
              >
                <option value="">Kullanıcı seçin...</option>
                {users
                  .filter(u => 
                    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                    (u.class && u.class.toLowerCase().includes(userSearch.toLowerCase()))
                  )
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.class ? `(${u.class})` : ''}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {users.filter(u => 
                  u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                  (u.class && u.class.toLowerCase().includes(userSearch.toLowerCase()))
                ).length} kullanıcı bulundu
              </p>
            </div>
          )}

          {/* İkon */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
              İkon (Emoji)
            </label>
            <div className="flex gap-2 flex-wrap">
              {['📢', '📣', '🔔', '⚠️', '✅', '📚', '🎉', '💡'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`text-2xl p-2 rounded-xl border-2 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation ${
                    icon === emoji
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Başlık */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
              Başlık <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
              placeholder="Bildirim başlığı..."
              required
              maxLength={100}
            />
          </div>

          {/* Mesaj */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
              Mesaj <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
              placeholder="Bildirim mesajı..."
              rows={4}
              required
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{message.length}/500</p>
          </div>

          {/* Action URL */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
              Yönlendirme Linki (Opsiyonel)
            </label>
            <input
              type="text"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
              placeholder="/catalog, /blog, vb..."
            />
          </div>

          {/* Buttons */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || !title || !message}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:scale-105 touch-manipulation"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Gönder
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendNotificationModal;
