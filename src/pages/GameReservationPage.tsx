import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGames } from '../contexts/GameContext';
import { useGameReservations } from '../contexts/GameReservationContext';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfToday } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import tr from 'date-fns/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ArrowLeft } from 'lucide-react';

const locales = {
  'tr': tr,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const breakTimes = [
  { start: '09:55', end: '10:05' },
  { start: '10:40', end: '10:50' },
  { start: '11:25', end: '11:35' },
  { start: '12:10', end: '12:20' },
  { start: '12:55', end: '13:40' },
  { start: '14:15', end: '14:25' },
  { start: '15:00', end: '15:10' },
  { start: '15:45', end: '15:50' },
];

const GameReservationPage: React.FC = () => {
  const { id: gameId } = useParams<{ id: string }>();
  const { games } = useGames();
  const { getReservationsForGame, createReservation, getUserActiveReservations, getUserLastReservationForGame } = useGameReservations();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    const foundGame = games.find(g => g.id === gameId);
    setGame(foundGame);
  }, [gameId, games]);

  useEffect(() => {
    if (game) {
      setLoadingSlots(true);
      setSelectedSlot(null); // Reset selection when date changes
      getReservationsForGame(game.id, selectedDate)
        .then(reservations => {
          const reservedStartTimes = reservations.map(r => {
            const d = r.startTime.toDate();
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          });

          const allSlots = breakTimes.map(bt => `${bt.start} - ${bt.end}`);
          
          const available = allSlots.filter(slot => {
            const startTime = slot.split(' - ')[0];
            return !reservedStartTimes.includes(startTime);
          });

          setAvailableSlots(available);
        })
        .catch(error => {
          console.error("Error fetching reservations: ", error);
          alert("Randevuları getirirken bir hata oluştu. Lütfen konsolu kontrol edin.");
        })
        .finally(() => {
          setLoadingSlots(false);
        });
    }
  }, [game, selectedDate, getReservationsForGame]);

  const handleCreateReservation = async () => {
    if (!selectedSlot || !user || !game) return;

    // Check for active reservations
    const activeReservations = await getUserActiveReservations(user.uid);
    if (activeReservations.length > 0) {
      alert('Zaten aktif bir oyun randevunuz bulunmaktadır.');
      return;
    }

    // Check for 24-hour cooldown
    const lastReservation = await getUserLastReservationForGame(user.uid, game.id);
    if (lastReservation) {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourFourHoursAgo.getHours() - 24);
      if (lastReservation.endTime.toDate() > twentyFourHoursAgo) {
        alert(`Bu oyun için son 24 saat içinde zaten bir randevu almışsınız. Yeni randevu için ${lastReservation.endTime.toDate().toLocaleString('tr-TR')} tarihinden 24 saat sonrasını beklemelisiniz.`);
        return;
      }
    }

    const [startTimeStr, endTimeStr] = selectedSlot.split(' - ');
    const startTime = new Date(selectedDate);
    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(selectedDate);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);
    endTime.setHours(endHour, endMinute, 0, 0);

    try {
      await createReservation({
        userId: user.uid,
        gameId: game.id,
        gameName: game.name,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        status: 'confirmed',
        createdAt: Timestamp.now(),
      });
      alert('Randevunuz başarıyla oluşturuldu!');
      // Refresh slots by re-triggering the effect
      setSelectedDate(new Date(selectedDate)); 
    } catch (error) {
      console.error("Error creating reservation:", error);
      alert('Randevu oluşturulurken bir hata oluştu.');
    }
  };

  const dayPropGetter = (date: Date) => {
    const today = startOfToday();
    if (date < today) {
      return {
        className: 'rbc-off-range-bg',
        style: {
          cursor: 'not-allowed',
        },
        disabled: true,
      };
    }
    return {};
  };

  if (!game) {
    return <div className="text-center py-10">Oyun bulunamadı.</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <ArrowLeft className="w-6 h-6 text-gray-800 dark:text-white" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{game.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">{game.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <Calendar
            localizer={localizer}
            events={[]}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            onSelectSlot={(slotInfo) => {
              if (slotInfo.start < startOfToday()) {
                alert("Geçmiş bir tarih için randevu alamazsınız.");
                return;
              }
              setSelectedDate(slotInfo.start)
            }}
            selectable
            dayPropGetter={dayPropGetter}
            messages={{
              today: 'Bugün',
              previous: 'Önceki',
              next: 'Sonraki',
              month: 'Ay',
              week: 'Hafta',
              day: 'Gün',
              agenda: 'Ajanda',
              date: 'Tarih',
              time: 'Saat',
              event: 'Etkinlik',
            }}
          />
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Uygun Saatler ({selectedDate.toLocaleDateString('tr-TR')})</h2>
          {loadingSlots ? (
            <p>Uygun saatler yükleniyor...</p>
          ) : (
            <div className="flex flex-col space-y-2">
              {availableSlots.length > 0 ? (
                availableSlots.map(slot => (
                  <div 
                    key={slot} 
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full text-left px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                      selectedSlot === slot 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-indigo-50 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {slot}
                  </div>
                ))
              ) : (
                <p>Bu tarih için uygun saat bulunmamaktadır.</p>
              )}
            </div>
          )}
          <div className="mt-6">
            <button 
              onClick={handleCreateReservation}
              disabled={!selectedSlot || loadingSlots}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
            >
              Randevu Al
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameReservationPage;