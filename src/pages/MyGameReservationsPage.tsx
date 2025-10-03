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
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Oyun Randevularım</h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Aktif Randevular</h2>
        {activeReservations.length > 0 ? (
          <div className="space-y-4">
            {activeReservations.map(res => (
              <div key={res.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">{res.gameName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tarih: {res.startTime.toDate().toLocaleDateString('tr-TR')}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Saat: {res.startTime.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {res.endTime.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {canCancel(res) && (
                  <button 
                    onClick={() => handleCancelReservation(res.id!)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Vazgeç
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>Aktif randevunuz bulunmamaktadır.</p>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Geçmiş Randevular</h2>
        {pastReservations.length > 0 ? (
          <div className="space-y-4">
            {pastReservations.map(res => (
              <div key={res.id} className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm opacity-70">
                <p className="font-bold">{res.gameName} ({res.status === 'cancelled-by-user' ? 'İptal Edildi' : 'Tamamlandı'})</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tarih: {res.startTime.toDate().toLocaleDateString('tr-TR')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Saat: {res.startTime.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {res.endTime.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>Geçmiş randevunuz bulunmamaktadır.</p>
        )}
      </div>
    </div>
  );
};

export default MyGameReservationsPage;
