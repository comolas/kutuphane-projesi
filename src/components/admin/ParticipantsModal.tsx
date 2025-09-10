
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Event } from '../../types';
import { X } from 'lucide-react';

interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
}

interface User {
  id: string;
  displayName: string;
  email: string;
  studentClass: string;
  studentNumber: string;
}

const ParticipantsModal: React.FC<ParticipantsModalProps> = ({ isOpen, onClose, event }) => {
  const [participants, setParticipants] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchParticipants = async () => {
      if (!event?.id) return;

      setLoading(true);
      try {
        const registrationsRef = collection(db, 'eventRegistrations');
        const q = query(registrationsRef, where('eventId', '==', event.id));
        const querySnapshot = await getDocs(q);
        const userIds = querySnapshot.docs.map(doc => doc.data().userId);

        if (userIds.length > 0) {
          const usersRef = collection(db, 'users');
          const fetchedUsers: User[] = [];

          for (const userId of userIds) {
            const userDocRef = doc(usersRef, userId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              fetchedUsers.push({ id: userDoc.id, ...userDoc.data() } as User);
            }
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

    if (isOpen) {
      fetchParticipants();
    }
  }, [isOpen, event]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-xl font-bold">'{event.name}' Etkinliği Katılımcıları</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X size={24} />
          </button>
        </div>
        <div className="mt-4">
          {loading ? (
            <p>Katılımcılar yükleniyor...</p>
          ) : participants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Okul Numarası</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.map(participant => (
                    <tr key={participant.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{participant.displayName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.studentClass}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.studentNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Bu etkinliğe kayıtlı katılımcı bulunmamaktadır.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantsModal;
