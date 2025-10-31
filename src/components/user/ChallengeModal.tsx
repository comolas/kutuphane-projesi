import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { ChallengeType, ChallengeDuration } from '../../types';
import { X, Trophy, Users, Clock, Target } from 'lucide-react';
import Swal from 'sweetalert2';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponentId?: string;
  opponentName?: string;
}

const ChallengeModal: React.FC<ChallengeModalProps> = ({ isOpen, onClose, opponentId, opponentName }) => {
  const { user, userData } = useAuth();
  const [classmates, setClassmates] = useState<any[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState(opponentId || '');
  const [challengeType, setChallengeType] = useState<ChallengeType>('book-count');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState<ChallengeDuration>('week');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userData?.studentClass) {
      loadClassmates();
    }
  }, [isOpen, userData?.studentClass]);

  const loadClassmates = async () => {
    if (!userData?.campusId || !userData?.studentClass) return;
    const q = query(
      collection(db, 'users'),
      where('campusId', '==', userData.campusId),
      where('studentClass', '==', userData.studentClass),
      where('role', '==', 'user')
    );
    const snapshot = await getDocs(q);
    const users = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(u => u.id !== user?.uid);
    setClassmates(users);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpponent || !user?.uid || !userData) return;

    setLoading(true);
    try {
      const opponent = classmates.find(c => c.id === selectedOpponent);
      const durationDays = duration === 'week' ? 7 : duration === '2weeks' ? 14 : 30;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      await addDoc(collection(db, 'challenges'), {
        creatorId: user.uid,
        creatorName: userData.displayName,
        opponentId: selectedOpponent,
        opponentName: opponent.displayName,
        type: challengeType,
        category: challengeType === 'category-books' ? category : null,
        duration,
        startDate: Timestamp.now(),
        endDate: Timestamp.fromDate(endDate),
        status: 'pending',
        creatorScore: 0,
        opponentScore: 0,
        campusId: userData.campusId,
        studentClass: userData.studentClass,
        createdAt: Timestamp.now()
      });

      Swal.fire('Başarılı!', 'Meydan okuma gönderildi!', 'success');
      onClose();
    } catch (error) {
      Swal.fire('Hata!', 'Meydan okuma gönderilemedi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const challengeLabels = {
    'book-count': 'Kitap Sayısı',
    'category-books': 'Kategori Bazlı Kitap',
    'page-count': 'Sayfa Sayısı',
    'reviews': 'Yorum Sayısı',
    'blog-posts': 'Blog Yazısı Sayısı'
  };

  const durationLabels = {
    week: '1 Hafta',
    '2weeks': '2 Hafta',
    month: '1 Ay'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 animate-fadeIn" onClick={onClose}>
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl w-full h-full flex flex-col transform transition-all duration-300 animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 rounded-t-2xl sm:rounded-t-3xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-bold text-white">Meydan Okuma</h3>
                <p className="text-xs sm:text-sm text-white/80">Arkadaşınla yarış, kupon kazan!</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 flex-shrink-0">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Rakip Seç <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedOpponent}
                onChange={(e) => setSelectedOpponent(e.target.value)}
                className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                required
                disabled={!!opponentId}
              >
                <option value="">Sınıf arkadaşı seç...</option>
                {classmates.map(mate => (
                  <option key={mate.id} value={mate.id}>{mate.displayName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                Meydan Okuma Türü <span className="text-red-500">*</span>
              </label>
              <select
                value={challengeType}
                onChange={(e) => setChallengeType(e.target.value as ChallengeType)}
                className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base font-medium"
                required
              >
                {Object.entries(challengeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {challengeType === 'category-books' && (
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-600" />
                  Kategori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Örn: Korku, Bilim Kurgu"
                  className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Süre <span className="text-red-500">*</span>
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as ChallengeDuration)}
                className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base font-medium"
                required
              >
                {Object.entries(durationLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-r-xl shadow-sm">
              <p className="text-xs sm:text-sm text-green-800 font-medium">
                <strong>🎁 Ödül:</strong> Kazanan 1 kupon kazanır!
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 sm:px-6 py-2 sm:py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold text-sm sm:text-base touch-manipulation min-h-[44px]"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-sm sm:text-base touch-manipulation min-h-[44px] disabled:opacity-50"
              >
                {loading ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
};

export default ChallengeModal;
