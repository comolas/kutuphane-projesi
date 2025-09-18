import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Award } from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  name: string;
  count: number;
}

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const leaderboardDocRef = doc(db, 'leaderboards', 'monthly');
        const docSnap = await getDoc(leaderboardDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setLeaderboard(data.leaderboard || []);
        } else {
          console.log("Lider tablosu verisi bulunamadı.");
          setLeaderboard([]);
        }
      } catch (error) {
        console.error("Lider tablosu verisi çekilirken hata:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const topTen = leaderboard.slice(0, 10);

  const currentUserRank = useMemo(() => {
    if (!currentUser || leaderboard.length === 0) return null;
    const rank = leaderboard.findIndex(entry => entry.userId === currentUser.uid) + 1;
    if (rank === 0) return { rank: '-', count: 0 }; // Kullanıcı listede yok
    const userEntry = leaderboard[rank - 1];
    return { rank, count: userEntry.count };
  }, [leaderboard, currentUser]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bu Ayın Kitap Kurtları</h3>
        <p className="text-gray-500">Lider tablosu yükleniyor...</p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return null; // Eğer veri yoksa bileşeni hiç gösterme
  }

  const getMedalColor = (index: number) => {
    if (index === 0) return 'text-yellow-500';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-yellow-700';
    return 'text-gray-300';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center">
          <Trophy className="w-6 h-6 mr-2 text-indigo-600" />
          Bu Ayın Kitap Kurtları
        </h3>
      </div>
      <div className="p-6 space-y-4">
        {topTen.map((user, index) => (
          <div key={user.userId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div className="flex items-center">
              <span className={`font-bold text-lg w-8 ${getMedalColor(index)}`}>{index + 1}</span>
              <p className={`font-medium text-gray-800 ${user.userId === currentUser?.uid ? 'font-bold text-indigo-600' : ''}`}>
                {user.name}
              </p>
            </div>
            <p className="font-bold text-gray-800">{user.count} Kitap</p>
          </div>
        ))}
      </div>
      {currentUserRank && currentUserRank.rank !== '-' && (
        <div className="p-6 border-t border-gray-200 bg-indigo-50 rounded-b-xl">
            <div className="flex items-center">
                <Award className="w-6 h-6 mr-3 text-indigo-600"/>
                <div>
                    <p className="font-semibold text-indigo-900">Sizin Sıralamanız</p>
                    <p className="text-sm text-gray-700">
                        Bu ay <span className="font-bold">{currentUserRank.count}</span> kitap okuyarak <span className="font-bold">{currentUserRank.rank}.</span> sıradasınız. Harika gidiyorsun!
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;