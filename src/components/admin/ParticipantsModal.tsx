import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { Event } from '../../types';
import { X, Trash2 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-xl font-bold">'{event.name}' Etkinliği Katılımcıları</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="mt-4">
          <input
            type="text"
            placeholder="Katılımcı ara (Ad, email, sınıf, numara)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="mt-4">
          {loading ? (
            <p>Katılımcılar yükleniyor...</p>
          ) : participants.length === 0 ? (
            <p>Bu etkinliğe kayıtlı katılımcı bulunmamaktadır.</p>
          ) : filteredParticipants.length === 0 ? (
            <p>Aramanızla eşleşen katılımcı bulunamadı.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Okul Numarası</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedParticipants.map(participant => (
                      <tr key={participant.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{participant.displayName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.studentClass}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.studentNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleRemoveParticipant(participant.id)}
                            className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Sayfa {currentPage} / {totalPages}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Önceki
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
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