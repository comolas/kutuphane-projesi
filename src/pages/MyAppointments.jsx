import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameReservations } from '../contexts/GameReservationContext';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';

const ITEMS_PER_PAGE = 5;

const MyAppointments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getUserReservations, cancelReservation } = useGameReservations();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (user) {
      getUserReservations(user.uid).then(data => {
        setReservations(data);
        setLoading(false);
      });
    }
  }, [user, getUserReservations]);

  const handleCancelReservation = async (reservationId) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu randevuyu iptal etmek istediğinizden emin misiniz?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Evet, iptal et!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await cancelReservation(reservationId);
          Swal.fire(
            'İptal Edildi!',
            'Randevunuz başarıyla iptal edildi.',
            'success'
          )
          if (user) {
            getUserReservations(user.uid).then(setReservations);
          }
        } catch (error) {
          console.error('Error cancelling reservation:', error);
          Swal.fire(
            'Hata!',
            'Randevu iptal edilirken bir hata oluştu.',
            'error'
          )
        }
      }
    });
  };

  const canCancel = (reservation) => {
    const oneHour = 60 * 60 * 1000; // milliseconds
    return (new Date().getTime() - reservation.createdAt.toDate().getTime()) < oneHour;
  };

  const sortedAndFilteredReservations = useMemo(() => {
    const now = new Date();
    let filtered = reservations;

    if (filterStatus !== 'all') {
        filtered = reservations.filter(r => {
            const isPast = r.endTime.toDate() <= now;
            const isActive = r.endTime.toDate() > now && r.status === 'confirmed';
            const isCancelled = r.status !== 'confirmed';

            if (filterStatus === 'active') return isActive;
            if (filterStatus === 'past') return isPast && !isCancelled;
            if (filterStatus === 'cancelled') return isCancelled;
            return true;
        });
    }

    return [...filtered].sort((a, b) => {
      const dateA = a.startTime.toDate().getTime();
      const dateB = b.startTime.toDate().getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [reservations, sortOrder, filterStatus]);

  const totalPages = Math.ceil(sortedAndFilteredReservations.length / ITEMS_PER_PAGE);
  const paginatedReservations = sortedAndFilteredReservations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return <div className="text-center py-10">Randevularınız yükleniyor...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <ArrowLeft className="w-6 h-6 text-gray-800 dark:text-white" />
        </button>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Oyun Randevularım</h1>
      </div>

      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filtrele:</span>
            <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
            >
                <option value="all">Tümü</option>
                <option value="active">Aktif</option>
                <option value="past">Geçmiş</option>
                <option value="cancelled">İptal Edilenler</option>
            </select>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sırala:</span>
            <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
            >
                <option value="desc">Yeniye Göre</option>
                <option value="asc">Eskiye Göre</option>
            </select>
        </div>
      </div>

      {paginatedReservations.length > 0 ? (
        <div className="space-y-4">
          {paginatedReservations.map(res => (
            <div key={res.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">{res.gameName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tarih: {res.startTime.toDate().toLocaleDateString('tr-TR')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Saat: {res.startTime.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {res.endTime.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className={`text-sm font-semibold ${res.status === 'confirmed' && res.endTime.toDate() > new Date() ? 'text-green-600' : 'text-gray-500'}`}>
                    Durum: {res.status === 'confirmed' && res.endTime.toDate() > new Date() ? 'Aktif' : (res.status === 'cancelled-by-user' ? 'İptal Edildi' : 'Tamamlandı')}
                </p>
              </div>
              {res.status === 'confirmed' && res.endTime.toDate() > new Date() && canCancel(res) && (
                <button 
                  onClick={() => handleCancelReservation(res.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Vazgeç
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center py-10">Gösterilecek randevu bulunmamaktadır.</p>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center space-x-2">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button 
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-4 py-2 rounded-lg ${currentPage === page ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>
              {page}
            </button>
          ))}
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MyAppointments;