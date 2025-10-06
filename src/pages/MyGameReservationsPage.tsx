import React, { useState, useEffect } from 'react';
import { useGameReservations, GameReservation } from '../contexts/GameReservationContext';
import { useAuth } from '../contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';

const MyGameReservationsPage: React.FC = () => {
  const { user } = useAuth();
  const { getUserReservations, cancelReservation } = useGameReservations();
  const [reservations, setReservations] = useState<GameReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getUserReservations(user.uid).then(data => {
        setReservations(data);
        setLoading(false);
      });
    }
  }, [user, getUserReservations]);

  const handleCancelReservation = async (reservationId: string) => {
    if (window.confirm('Bu randevuyu iptal etmek istediğinizden emin misiniz?')) {
      try {
        await cancelReservation(reservationId);
        alert('Randevunuz başarıyla iptal edildi.');
        // Refresh the list
        if(user){
            getUserReservations(user.uid).then(setReservations);
        }
      } catch (error) {
        console.error('Error cancelling reservation:', error);
        alert('Randevu iptal edilirken bir hata oluştu.');
      }
    }
  };

  const now = new Date();
  const activeReservations = reservations.filter(r => r.endTime.toDate() > now && r.status === 'confirmed');
  const pastReservations = reservations.filter(r => r.endTime.toDate() <= now || r.status !== 'confirmed');

  const canCancel = (reservation: GameReservation) => {
    const oneHour = 60 * 60 * 1000; // milliseconds
    return (now.getTime() - reservation.createdAt.toDate().getTime()) < oneHour;
  }

  if (loading) {
    return <div className="text-center py-10">Randevularınız yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Oyun Randevularım</h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">Aktif Randevular</h2>
        {activeReservations.length > 0 ? (
          <div className="space-y-4">
            {activeReservations.map(res => (
              <div key={res.id} className="group bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 flex justify-between items-center border border-white/20">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <p className="font-bold text-xl text-gray-900">{res.gameName}</p>
                    <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-lg shadow-md">
                      Aktif
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm font-semibold text-gray-700">{res.startTime.toDate().toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-semibold text-gray-700">{res.startTime.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {res.endTime.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </div>
                {canCancel(res) && (
                  <button 
                    onClick={() => handleCancelReservation(res.id!)}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
                  >
                    Vazgeç
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-8 text-center border border-white/20">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-600 font-semibold">Aktif randevunuz bulunmamaktadır.</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent mb-4">Geçmiş Randevular</h2>
        {pastReservations.length > 0 ? (
          <div className="space-y-4">
            {pastReservations.map(res => (
              <div key={res.id} className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl shadow-md border border-white/20 opacity-80">
                <div className="flex items-center gap-3 mb-3">
                  <p className="font-bold text-lg text-gray-800">{res.gameName}</p>
                  <span className={`px-3 py-1 text-xs font-bold rounded-lg shadow-md ${
                    res.status === 'cancelled-by-user' 
                      ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white' 
                      : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                  }`}>
                    {res.status === 'cancelled-by-user' ? 'İptal Edildi' : 'Tamamlandı'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-600">{res.startTime.toDate().toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-600">{res.startTime.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {res.endTime.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-8 text-center border border-white/20">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 font-semibold">Geçmiş randevunuz bulunmamaktadır.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyGameReservationsPage;
