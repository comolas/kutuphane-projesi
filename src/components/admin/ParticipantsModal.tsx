import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { Event } from '../../types';
import { X, Trash2, Users, Search } from 'lucide-react';

interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onRemoveParticipant: (eventId: string, userId: string) => Promise<void>;
}

interface User {
  id: string;
  displayName: string;
  email: string;
  studentClass: string;
  studentNumber: string;
}

const ParticipantsModal: React.FC<ParticipantsModalProps> = ({ isOpen, onClose, event, onRemoveParticipant }) => {
  const [participants, setParticipants] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const participantsPerPage = 10;

  const fetchParticipants = async () => {
    if (!event?.id) {
      return;
    }

    setLoading(true);
    try {
      const registrationsRef = collection(db, 'eventRegistrations');
      const q = query(registrationsRef, where('eventId', '==', event.id));
      const querySnapshot = await getDocs(q);
      const userIds = querySnapshot.docs.map(doc => doc.data().userId);

      if (userIds.length > 0) {
        const usersRef = collection(db, 'users');
        const fetchedUsers: User[] = [];
        
        for (let i = 0; i < userIds.length; i += 30) {
          const chunk = userIds.slice(i, i + 30);
          const usersQuery = query(usersRef, where(documentId(), 'in', chunk));
          const usersSnapshot = await getDocs(usersQuery);
          const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
          fetchedUsers.push(...users);
        }
        setParticipants(fetchedUsers);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error("Error fetching participants: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchParticipants();
    }
  }, [isOpen, event]);

  const handleRemoveParticipant = async (userId: string) => {
    if (!window.confirm('Bu kullanıcıyı etkinlikten kaldırmak istediğinizden emin misiniz?')) {
      return;
    }
    try {
      await onRemoveParticipant(event.id, userId);
      setParticipants(prev => prev.filter(p => p.id !== userId));
      alert('Katılımcı etkinlikten kaldırıldı.');
    } catch (error) {
      console.error('Error removing participant:', error);
      alert('Katılımcı kaldırılırken bir hata oluştu.');
    }
  };

  const filteredParticipants = participants.filter(participant => {
    const searchLower = searchQuery.toLowerCase();
    return (
      participant.displayName.toLowerCase().includes(searchLower) ||
      participant.email.toLowerCase().includes(searchLower) ||
      (participant.studentClass && participant.studentClass.toLowerCase().includes(searchLower)) ||
      (participant.studentNumber && participant.studentNumber.toLowerCase().includes(searchLower))
    );
  });

  const totalPages = Math.ceil(filteredParticipants.length / participantsPerPage);
  const paginatedParticipants = filteredParticipants.slice(
    (currentPage - 1) * participantsPerPage,
    currentPage * participantsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-2 sm:p-4">
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white truncate">'{event.name}' Katılımcıları</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all flex-shrink-0">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Katılımcı ara (Ad, email, sınıf, numara)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
            />
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-4 sm:pb-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Katılımcılar yükleniyor...</p>
              </div>
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Bu etkinliğe kayıtlı katılımcı bulunmamaktadır.</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Aramanızla eşleşen katılımcı bulunamadı.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-indigo-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ad Soyad</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Email</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sınıf</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">Numara</th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedParticipants.map(participant => (
                      <tr key={participant.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-colors">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900">{participant.displayName}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 hidden sm:table-cell">{participant.email}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">{participant.studentClass}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 hidden md:table-cell">{participant.studentNumber}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleRemoveParticipant(participant.id)}
                            className="text-red-600 hover:text-white hover:bg-red-600 p-2 rounded-full transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <p className="text-xs sm:text-sm text-gray-700 font-medium">
                    Sayfa <span className="font-bold text-indigo-600">{currentPage}</span> / <span className="font-bold text-indigo-600">{totalPages}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg min-h-[40px]"
                    >
                      Önceki
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg min-h-[40px]"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantsModal;