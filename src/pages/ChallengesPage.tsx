import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, updateDoc, doc, query, where, orderBy, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Challenge } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Clock, CheckCircle, XCircle, Plus, Zap, ArrowLeft } from 'lucide-react';
import ChallengeModal from '../components/user/ChallengeModal';
import Swal from 'sweetalert2';

const ChallengesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, userData } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all');

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    if (!user?.uid) return;
    setLoading(true);
    const q = query(
      collection(db, 'challenges'),
      where('campusId', '==', userData?.campusId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Challenge))
      .filter(c => c.creatorId === user.uid || c.opponentId === user.uid);
    setChallenges(data);
    setLoading(false);
  };

  const handleAccept = async (challenge: Challenge) => {
    await updateDoc(doc(db, 'challenges', challenge.id!), {
      status: 'active',
      startDate: Timestamp.now()
    });

    // Bitiş tarihini güncelle
    const durationDays = challenge.duration === 'week' ? 7 : challenge.duration === '2weeks' ? 14 : 30;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);
    await updateDoc(doc(db, 'challenges', challenge.id!), {
      endDate: Timestamp.fromDate(endDate)
    });

    Swal.fire(t('challenges.acceptedTitle'), t('challenges.acceptedText'), 'success');
    loadChallenges();
  };

  const handleReject = async (challenge: Challenge) => {
    await updateDoc(doc(db, 'challenges', challenge.id!), {
      status: 'rejected'
    });
    Swal.fire(t('challenges.rejectedTitle'), t('challenges.rejectedText'), 'info');
    loadChallenges();
  };

  const filteredChallenges = filter === 'all' 
    ? challenges 
    : challenges.filter(c => c.status === filter);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => window.history.back()}
          className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('challenges.backButton')}
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{t('challenges.title')}</h1>
            <p className="text-sm sm:text-base text-gray-600">{t('challenges.description')}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('challenges.newChallenge')}
          </button>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {['all', 'pending', 'active', 'completed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t(`challenges.filters.${f}`)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredChallenges.map(challenge => {
              const isCreator = challenge.creatorId === user?.uid;
              const myScore = isCreator ? challenge.creatorScore : challenge.opponentScore;
              const opponentScore = isCreator ? challenge.opponentScore : challenge.creatorScore;
              const opponentName = isCreator ? challenge.opponentName : challenge.creatorName;

              return (
                <div key={challenge.id} className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{t(`challenges.types.${challenge.type}`)}</h3>
                      {challenge.category && (
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{t('challenges.category')}: {challenge.category}</p>
                      )}
                    </div>
                    <span className={`px-2 sm:px-3 py-1 rounded text-xs font-semibold whitespace-nowrap ml-2 ${statusColors[challenge.status]}`}>
                      {t(`challenges.status.${challenge.status}`)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">{t('challenges.you')}</span>
                      <span className="text-xl sm:text-2xl font-bold text-indigo-600">{myScore}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-[150px]">{opponentName}</span>
                      <span className="text-xl sm:text-2xl font-bold text-purple-600">{opponentScore}</span>
                    </div>
                  </div>

                  {challenge.status === 'active' && (
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                      <Clock className="w-4 h-4 mr-1" />
                      {t('challenges.endDate')}: {challenge.endDate?.toDate().toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')}
                    </div>
                  )}

                  {challenge.status === 'pending' && challenge.opponentId === user?.uid && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleAccept(challenge)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center text-sm sm:text-base"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {t('challenges.accept')}
                      </button>
                      <button
                        onClick={() => handleReject(challenge)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center text-sm sm:text-base"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {t('challenges.reject')}
                      </button>
                    </div>
                  )}

                  {challenge.status === 'completed' && challenge.winnerId && (
                    <div className={`text-center py-2 rounded-lg ${
                      challenge.winnerId === user?.uid
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {challenge.winnerId === user?.uid ? t('challenges.won') : t('challenges.lost')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {filteredChallenges.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            {filter === 'all' ? t('challenges.noChallenges') : t('challenges.noFilteredChallenges')}
          </div>
        )}
      </div>

      <ChallengeModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
};

export default ChallengesPage;
