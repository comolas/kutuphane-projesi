import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Award, Medal, Crown } from 'lucide-react';

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

  const topThree = topTen.slice(0, 3);
  const restOfList = topTen.slice(3);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 flex items-center">
          <Trophy className="w-6 h-6 mr-2 text-indigo-600" />
          Bu Ayın Kitap Kurtları
        </h3>
      </div>
      
      {/* Podium */}
      <div className="p-8">
        <div className="flex items-end justify-center gap-4 mb-8">
          {/* 2nd Place */}
          {topThree[1] && (
            <div className="flex flex-col items-center flex-1 hover:scale-105 transition-transform duration-300">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-gray-400 rounded-full blur-lg opacity-50"></div>
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-xl border-4 border-white/50">
                  <span className="text-4xl">🥈</span>
                </div>
              </div>
              <p className={`font-semibold text-gray-900 text-center text-sm mb-1 ${topThree[1].userId === currentUser?.uid ? 'text-indigo-600' : ''}`}>
                {topThree[1].name}
              </p>
              <p className="text-xs text-gray-600 font-medium">{topThree[1].count} Kitap</p>
              <div className="mt-3 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg w-full h-24 flex items-center justify-center shadow-lg">
                <span className="text-4xl font-bold text-white">2</span>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {topThree[0] && (
            <div className="flex flex-col items-center flex-1 hover:scale-105 transition-transform duration-300">
              <div className="relative mb-3 animate-pulse">
                <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-60"></div>
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-2xl border-4 border-white/50">
                  <span className="text-5xl">🥇</span>
                </div>
              </div>
              <p className={`font-bold text-gray-900 text-center mb-1 ${topThree[0].userId === currentUser?.uid ? 'text-indigo-600' : ''}`}>
                {topThree[0].name}
              </p>
              <p className="text-sm text-gray-600 font-semibold">{topThree[0].count} Kitap</p>
              <div className="mt-3 bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-lg w-full h-32 flex items-center justify-center shadow-xl">
                <span className="text-5xl font-bold text-white">1</span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {topThree[2] && (
            <div className="flex flex-col items-center flex-1 hover:scale-105 transition-transform duration-300">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-orange-500 rounded-full blur-lg opacity-50"></div>
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-xl border-4 border-white/50">
                  <span className="text-4xl">🥉</span>
                </div>
              </div>
              <p className={`font-semibold text-gray-900 text-center text-sm mb-1 ${topThree[2].userId === currentUser?.uid ? 'text-indigo-600' : ''}`}>
                {topThree[2].name}
              </p>
              <p className="text-xs text-gray-600 font-medium">{topThree[2].count} Kitap</p>
              <div className="mt-3 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg w-full h-20 flex items-center justify-center shadow-lg">
                <span className="text-4xl font-bold text-white">3</span>
              </div>
            </div>
          )}
        </div>

        {/* Rest of the list */}
        {restOfList.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-gray-700 mb-4">Diğer Sıralamalar</h4>
            {restOfList.map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-gray-600 text-lg w-8">{index + 4}</span>
                  <p className={`font-semibold text-gray-900 ${user.userId === currentUser?.uid ? 'text-indigo-600' : ''}`}>
                    {user.name}
                  </p>
                </div>
                <p className="font-bold text-gray-900">{user.count} Kitap</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {currentUserRank && currentUserRank.rank !== '-' && (
        <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
            <div className="flex items-center">
                <Award className="w-7 h-7 mr-3 text-indigo-600"/>
                <div>
                    <p className="font-bold text-gray-900 text-lg">Sizin Sıralamanız</p>
                    <p className="text-sm text-gray-700">
                        Bu ay <span className="font-bold text-indigo-600">{currentUserRank.count}</span> kitap okuyarak <span className="font-bold text-indigo-600">{currentUserRank.rank}.</span> sıradasınız. Harika gidiyorsun!
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;